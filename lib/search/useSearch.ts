import { useEffect, useRef } from "react";
import { useDiscovery } from "../store/discovery";
import { searchListings } from "./service";

/**
 * Keeps the store's results in sync with its criteria. Debounced so map
 * panning doesn't fire a search per frame; stale responses are dropped so
 * a slow distance pass can never overwrite a newer result.
 */
export function useSearchSync(debounceMs = 250) {
  const criteria = useDiscovery((s) => s.criteria);
  const hydrated = useDiscovery((s) => s.hydrated);
  const seq = useRef(0);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    const mySeq = ++seq.current;
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    const { setSearching, setResult } = useDiscovery.getState();
    setSearching(true);

    const timer = setTimeout(() => {
      searchListings(criteria, {
        signal: ctrl.signal,
        onProgress: (partial) => {
          if (mySeq === seq.current) setResult(partial, true);
        },
      })
        .then((result) => {
          if (mySeq === seq.current) setResult(result, false);
        })
        .catch((e: unknown) => {
          if ((e as { name?: string })?.name === "AbortError") return;
          if (mySeq === seq.current) setResult({ items: [], matchedBeforeDistance: 0, unknownDistance: 0, includesDemo: false }, false);
        });
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [criteria, hydrated, debounceMs]);
}
