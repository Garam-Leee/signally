import { useEffect, useState } from "react";
import type { MapEngine } from "./map-engine";
import type { Bounds } from "./crossing-data";

export function useMapBounds(map: MapEngine | null) {
  const [bounds, setBounds] = useState<Bounds | null>(null);

  useEffect(() => {
    if (!map) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function update() {
      const box = map?.bounds();
      if (box) setBounds(box);
    }
    function queue() {
      clearTimeout(timer);
      timer = setTimeout(update, 220);
    }
    const cancel = () => clearTimeout(timer);
    const offManual = map.subscribe("manual", cancel);
    const offSettled = map.subscribe("settled", queue);
    queue();
    return () => {
      offManual();
      offSettled();
      clearTimeout(timer);
    };
  }, [map]);
  return bounds;
}
