import { distanceKm, type GeoPoint } from "./distance";

export interface Airport extends GeoPoint {
  iata: string;
  name: string;
  city: string;
}

/**
 * Commercial airports near the Spain-first catalogue plus the hubs most
 * visitors fly from. Used to pick the nearest airport to a listing and to
 * the visitor, and to build flight-search links; no network call needed.
 */
export const airports: Airport[] = [
  // Spain
  { iata: "AGP", name: "Málaga–Costa del Sol", city: "Málaga", lat: 36.6749, lng: -4.4991 },
  { iata: "SVQ", name: "Seville", city: "Sevilla", lat: 37.418, lng: -5.8931 },
  { iata: "VLC", name: "Valencia", city: "Valencia", lat: 39.4893, lng: -0.4816 },
  { iata: "MAD", name: "Madrid–Barajas", city: "Madrid", lat: 40.4983, lng: -3.5676 },
  { iata: "BCN", name: "Barcelona–El Prat", city: "Barcelona", lat: 41.2971, lng: 2.0785 },
  { iata: "ALC", name: "Alicante–Elche", city: "Alicante", lat: 38.2822, lng: -0.5582 },
  { iata: "PMI", name: "Palma de Mallorca", city: "Palma", lat: 39.5517, lng: 2.7388 },
  { iata: "IBZ", name: "Ibiza", city: "Ibiza", lat: 38.8729, lng: 1.3731 },
  { iata: "GRX", name: "Granada", city: "Granada", lat: 37.1887, lng: -3.7774 },
  { iata: "LEI", name: "Almería", city: "Almería", lat: 36.8439, lng: -2.3701 },
  { iata: "XRY", name: "Jerez", city: "Jerez", lat: 36.7446, lng: -6.0601 },
  { iata: "GIB", name: "Gibraltar", city: "Gibraltar", lat: 36.1512, lng: -5.3497 },
  { iata: "BIO", name: "Bilbao", city: "Bilbao", lat: 43.3011, lng: -2.9106 },
  { iata: "SCQ", name: "Santiago de Compostela", city: "Santiago", lat: 42.8963, lng: -8.4151 },
  { iata: "LPA", name: "Gran Canaria", city: "Las Palmas", lat: 27.9319, lng: -15.3866 },
  { iata: "TFS", name: "Tenerife South", city: "Tenerife", lat: 28.0445, lng: -16.5725 },
  // Europe
  { iata: "LHR", name: "London Heathrow", city: "London", lat: 51.47, lng: -0.4543 },
  { iata: "LGW", name: "London Gatwick", city: "London", lat: 51.1537, lng: -0.1821 },
  { iata: "STN", name: "London Stansted", city: "London", lat: 51.885, lng: 0.235 },
  { iata: "MAN", name: "Manchester", city: "Manchester", lat: 53.3537, lng: -2.275 },
  { iata: "EDI", name: "Edinburgh", city: "Edinburgh", lat: 55.95, lng: -3.3725 },
  { iata: "DUB", name: "Dublin", city: "Dublin", lat: 53.4264, lng: -6.2499 },
  { iata: "CDG", name: "Paris Charles de Gaulle", city: "Paris", lat: 49.0097, lng: 2.5479 },
  { iata: "ORY", name: "Paris Orly", city: "Paris", lat: 48.7262, lng: 2.3652 },
  { iata: "AMS", name: "Amsterdam Schiphol", city: "Amsterdam", lat: 52.3105, lng: 4.7683 },
  { iata: "BRU", name: "Brussels", city: "Brussels", lat: 50.9014, lng: 4.4844 },
  { iata: "FRA", name: "Frankfurt", city: "Frankfurt", lat: 50.0379, lng: 8.5622 },
  { iata: "MUC", name: "Munich", city: "Munich", lat: 48.3537, lng: 11.775 },
  { iata: "BER", name: "Berlin Brandenburg", city: "Berlin", lat: 52.3667, lng: 13.5033 },
  { iata: "DUS", name: "Düsseldorf", city: "Düsseldorf", lat: 51.2895, lng: 6.7668 },
  { iata: "HAM", name: "Hamburg", city: "Hamburg", lat: 53.6304, lng: 9.9882 },
  { iata: "CGN", name: "Cologne Bonn", city: "Cologne", lat: 50.8659, lng: 7.1427 },
  { iata: "STR", name: "Stuttgart", city: "Stuttgart", lat: 48.6899, lng: 9.2219 },
  { iata: "ZRH", name: "Zurich", city: "Zurich", lat: 47.4647, lng: 8.5492 },
  { iata: "GVA", name: "Geneva", city: "Geneva", lat: 46.2381, lng: 6.1089 },
  { iata: "VIE", name: "Vienna", city: "Vienna", lat: 48.1103, lng: 16.5697 },
  { iata: "CPH", name: "Copenhagen", city: "Copenhagen", lat: 55.618, lng: 12.6508 },
  { iata: "ARN", name: "Stockholm Arlanda", city: "Stockholm", lat: 59.6498, lng: 17.9238 },
  { iata: "OSL", name: "Oslo Gardermoen", city: "Oslo", lat: 60.1976, lng: 11.1004 },
  { iata: "HEL", name: "Helsinki", city: "Helsinki", lat: 60.3172, lng: 24.9633 },
  { iata: "WAW", name: "Warsaw Chopin", city: "Warsaw", lat: 52.1657, lng: 20.9671 },
  { iata: "PRG", name: "Prague", city: "Prague", lat: 50.1008, lng: 14.26 },
  { iata: "LIS", name: "Lisbon", city: "Lisbon", lat: 38.7742, lng: -9.1342 },
  { iata: "OPO", name: "Porto", city: "Porto", lat: 41.2481, lng: -8.6814 },
  { iata: "FCO", name: "Rome Fiumicino", city: "Rome", lat: 41.8003, lng: 12.2389 },
  { iata: "MXP", name: "Milan Malpensa", city: "Milan", lat: 45.6306, lng: 8.7281 },
  { iata: "ATH", name: "Athens", city: "Athens", lat: 37.9364, lng: 23.9445 },
  { iata: "IST", name: "Istanbul", city: "Istanbul", lat: 41.2753, lng: 28.7519 },
  // Further afield
  { iata: "JFK", name: "New York JFK", city: "New York", lat: 40.6413, lng: -73.7781 },
  { iata: "EWR", name: "Newark", city: "New York", lat: 40.6895, lng: -74.1745 },
  { iata: "MIA", name: "Miami", city: "Miami", lat: 25.7959, lng: -80.287 },
  { iata: "LAX", name: "Los Angeles", city: "Los Angeles", lat: 33.9416, lng: -118.4085 },
  { iata: "YYZ", name: "Toronto Pearson", city: "Toronto", lat: 43.6777, lng: -79.6248 },
  { iata: "DXB", name: "Dubai", city: "Dubai", lat: 25.2532, lng: 55.3657 },
  { iata: "DOH", name: "Doha Hamad", city: "Doha", lat: 25.2731, lng: 51.6081 },
  { iata: "CMN", name: "Casablanca", city: "Casablanca", lat: 33.3675, lng: -7.59 },
];

export function nearestAirport(point: GeoPoint): { airport: Airport; km: number } {
  let best = airports[0];
  let bestKm = Infinity;
  for (const a of airports) {
    const km = distanceKm(point, a);
    if (km < bestKm) {
      best = a;
      bestKm = km;
    }
  }
  return { airport: best, km: bestKm };
}
