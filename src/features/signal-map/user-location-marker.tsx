import { mapAssetPath } from "./asset-path";
import Image from "next/image";
import type { MapEngine } from "./map-engine";
import type { UserPosition } from "./use-geolocation";

export function UserLocationMarker({
  map,
  position,
}: {
  map: MapEngine;
  position: UserPosition;
}) {
  const point = map.project(position.location, Boolean(map.overlayPane));
  const radius = map.accuracyRadius(position.location, position.accuracy);
  // Clip very coarse accuracy circles at the map container rather than shifting the dot.
  return (
    <div
      className="user-position"
      style={{ left: point.x, top: point.y }}
      aria-label="내 위치"
    >
      <span
        className="user-accuracy"
        style={{ width: radius * 2, height: radius * 2 }}
      />
      <Image
        className="user-dot"
        src={mapAssetPath("/icons/map/my-location.svg")}
        width={34}
        height={34}
        alt=""
        unoptimized
      />
    </div>
  );
}
