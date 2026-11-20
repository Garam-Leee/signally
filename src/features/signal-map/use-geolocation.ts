import { useEffect, useRef, useState } from "react";
import type { MapEngine } from "./map-engine";
import type { Coordinate } from "./crossing-data";

export type UserPosition = { location: Coordinate; accuracy: number };
export function useGeolocation(map: MapEngine | null) {
  const [position, setPosition] = useState<UserPosition | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const watch = useRef<number | null>(null);
  const follow = useRef(false);
  const latest = useRef<UserPosition | null>(null);

  useEffect(() => {
    if (!map) return;
    const release = map.subscribe("manual", () => {
      follow.current = false;
    });
    return () => {
      release();
      if (watch.current !== null)
        navigator.geolocation.clearWatch(watch.current);
      watch.current = null;
      follow.current = false;
    };
  }, [map]);

  function recenter() {
    if (!map) return;
    if (!navigator.geolocation) {
      setMessage("이 브라우저에서는 위치를 확인할 수 없어요.");
      return;
    }
    follow.current = true;
    setMessage("");
    if (latest.current)
      map.move({
        center: latest.current.location,
        zoom: Math.max(16, map.zoom()),
      });
    if (watch.current !== null) return;
    setPending(true);
    watch.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const next: UserPosition = {
          location: [coords.longitude, coords.latitude],
          accuracy: coords.accuracy,
        };
        setPosition(next);
        setPending(false);
        setMessage("");
        latest.current = next;
        if (follow.current)
          map.move({
            center: next.location,
            zoom: Math.max(16, map.zoom()),
          });
      },
      (error) => {
        setPending(false);
        setMessage(
          error.code === 1
            ? "위치 권한이 꺼져 있어요. 브라우저 설정에서 허용해 주세요."
            : "현재 위치를 확인하지 못했어요.",
        );
        if (watch.current !== null)
          navigator.geolocation.clearWatch(watch.current);
        watch.current = null;
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 12_000 },
    );
  }

  return {
    position,
    recenter,
    pending,
    message,
    stopFollowing: () => {
      follow.current = false;
    },
  };
}
