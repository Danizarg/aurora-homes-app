import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, type Region as MapRegion } from "react-native-maps";
import Supercluster from "supercluster";
import { colors, radius, shadow, typography } from "../../constants/theme";
import { coordsFor } from "../../lib/geo/cities";
import { boundsFromRegion, regionFromBounds, zoomFromRegion, type Region } from "../../lib/geo/bounds";
import { hasOwnCoordinates } from "../../lib/search/service";
import { registerMapController } from "../../lib/map/controller";
import { useDiscovery } from "../../lib/store/discovery";
import { priceParts } from "../../lib/listings/presentation";
import { haptic } from "../../lib/ui/haptics";
import type { Listing } from "../../types";
import type { GeoBounds, GeoPoint } from "../../types/search";

const SPAIN: Region = { latitude: 40.0, longitude: -3.7, latitudeDelta: 9, longitudeDelta: 9 };

type PointProps = { id: string; price: string };
type ClusterProps = { cluster: true; cluster_id: number; point_count: number };

interface DiscoveryMapProps {
  listings: Listing[];
  /** Listings shown in list mode but not pinned (no own coordinates). */
  onUnpinnedCount?: (n: number) => void;
}

/**
 * The main map. Every published listing with real coordinates is a price
 * pill; dense areas collapse into count clusters (supercluster) that split
 * as you zoom. Panning updates the search viewport (debounced upstream),
 * the camera is remembered, and Suza drives it through the map controller.
 */
export function DiscoveryMap({ listings, onUnpinnedCount }: DiscoveryMapProps) {
  const mapRef = useRef<MapView>(null);
  const camera = useDiscovery((s) => s.camera);
  const target = useDiscovery((s) => s.criteria.target);
  const userLocation = useDiscovery((s) => s.userLocation);
  const selectedId = useDiscovery((s) => s.selectedListingId);
  const select = useDiscovery((s) => s.select);
  const setCamera = useDiscovery((s) => s.setCamera);
  const setCriteria = useDiscovery((s) => s.setCriteria);

  const [region, setRegion] = useState<Region>(() =>
    camera ?? (target ? regionFromBounds(target.bounds) : userLocation ? { latitude: userLocation.lat, longitude: userLocation.lng, latitudeDelta: 0.25, longitudeDelta: 0.25 } : SPAIN)
  );
  const regionRef = useRef(region);
  useEffect(() => {
    regionRef.current = region;
  }, [region]);
  const programmatic = useRef(false);

  const pinnable = useMemo(() => listings.filter(hasOwnCoordinates), [listings]);
  useEffect(() => onUnpinnedCount?.(listings.length - pinnable.length), [listings.length, pinnable.length, onUnpinnedCount]);

  const index = useMemo(() => {
    const sc = new Supercluster<PointProps, ClusterProps>({ radius: 56, maxZoom: 17, minPoints: 2 });
    sc.load(
      pinnable.map((l) => {
        const p = coordsFor(l);
        const { amount } = priceParts(l);
        return { type: "Feature" as const, properties: { id: l.id, price: amount }, geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] } };
      })
    );
    return sc;
  }, [pinnable]);

  const clusters = useMemo(() => {
    const b = boundsFromRegion(region);
    const pad = 0.3;
    const bbox: [number, number, number, number] = [
      b.west - (b.east - b.west) * pad, b.south - (b.north - b.south) * pad,
      b.east + (b.east - b.west) * pad, b.north + (b.north - b.south) * pad,
    ];
    return index.getClusters(bbox, Math.min(17, Math.max(0, zoomFromRegion(region))));
  }, [index, region]);

  const animateTo = useCallback((r: Region, duration = 900) => {
    programmatic.current = true;
    mapRef.current?.animateToRegion(r as MapRegion, duration);
    setTimeout(() => (programmatic.current = false), duration + 150);
  }, []);

  useEffect(() => {
    registerMapController({
      flyToBounds: (b: GeoBounds, duration) => animateTo(regionFromBounds(b), duration),
      flyToPoint: (p: GeoPoint, halfKm = 3, duration) =>
        animateTo({ latitude: p.lat, longitude: p.lng, latitudeDelta: (halfKm * 2) / 111, longitudeDelta: (halfKm * 2) / (111 * Math.max(0.2, Math.cos((p.lat * Math.PI) / 180))) }, duration),
      zoomBy: (factor) => {
        const r = regionRef.current;
        animateTo({ ...r, latitudeDelta: r.latitudeDelta * factor, longitudeDelta: r.longitudeDelta * factor }, 500);
      },
      focusListing: (id) => {
        const l = pinnable.find((x) => x.id === id);
        if (!l) return;
        const p = coordsFor(l);
        const r = regionRef.current;
        const latDelta = Math.min(r.latitudeDelta, 0.03);
        // Shift the centre down a little so the pin stays clear of the preview card.
        animateTo({ latitude: p.lat - latDelta * 0.22, longitude: p.lng, latitudeDelta: latDelta, longitudeDelta: Math.min(r.longitudeDelta, 0.03) }, 600);
      },
    });
    return () => registerMapController(null);
  }, [animateTo, pinnable]);

  function onRegionChangeComplete(r: MapRegion) {
    const next: Region = { latitude: r.latitude, longitude: r.longitude, latitudeDelta: r.latitudeDelta, longitudeDelta: r.longitudeDelta };
    setRegion(next);
    setCamera(next);
    // Viewport becomes the search area whether the user panned or Suza flew here.
    setCriteria({ bounds: boundsFromRegion(next) });
  }

  function onPressCluster(clusterId: number, lng: number, lat: number) {
    const zoom = Math.min(index.getClusterExpansionZoom(clusterId), 18);
    const span = 360 / Math.pow(2, zoom);
    haptic.select();
    animateTo({ latitude: lat, longitude: lng, latitudeDelta: span * 0.6, longitudeDelta: span }, 600);
  }

  function onPressPin(id: string) {
    haptic.light();
    select(id);
    const l = pinnable.find((x) => x.id === id);
    if (l) {
      const p = coordsFor(l);
      const r = regionRef.current;
      animateTo({ ...r, latitude: p.lat - r.latitudeDelta * 0.18, longitude: p.lng }, 450);
    }
  }

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={region as MapRegion}
      onRegionChangeComplete={onRegionChangeComplete}
      onPress={() => select(null)}
      showsUserLocation={!!userLocation}
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      mapPadding={{ top: 120, right: 0, bottom: 180, left: 0 }}
    >
      {clusters.map((f) => {
        const [lng, lat] = f.geometry.coordinates;
        const props = f.properties as ClusterProps | PointProps;
        if ("cluster" in props && props.cluster) {
          return (
            <Marker key={`c-${props.cluster_id}`} coordinate={{ latitude: lat, longitude: lng }} onPress={() => onPressCluster(props.cluster_id, lng, lat)} tracksViewChanges={false} zIndex={2}>
              <View style={styles.cluster}>
                <Text style={styles.clusterText}>{props.point_count}</Text>
              </View>
            </Marker>
          );
        }
        const point = props as PointProps;
        const selected = point.id === selectedId;
        return (
          <Marker key={point.id} coordinate={{ latitude: lat, longitude: lng }} onPress={() => onPressPin(point.id)} tracksViewChanges={false} zIndex={selected ? 10 : 1}>
            <View style={[styles.pill, selected && styles.pillSelected]}>
              <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{point.price}</Text>
            </View>
          </Marker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: colors.white, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 10,
    borderWidth: 1, borderColor: colors.divider, ...shadow.float,
  },
  pillSelected: { backgroundColor: colors.text, borderColor: colors.text, transform: [{ scale: 1.1 }] },
  pillText: { ...typography.smallBold, color: colors.text },
  pillTextSelected: { color: colors.white },
  cluster: {
    minWidth: 40, height: 40, borderRadius: 20, paddingHorizontal: 10, backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: colors.white, ...shadow.float,
  },
  clusterText: { ...typography.smallBold, color: colors.white },
});
