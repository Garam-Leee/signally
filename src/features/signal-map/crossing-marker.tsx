import { mapAssetPath } from "./asset-path";
import Image from "next/image";
import type {
  DisplayReading,
  SignalStatus,
  VisibleCrossing,
} from "./crossing-data";

export const statusLabel: Record<SignalStatus, string> = {
  RED: "빨간불",
  GREEN: "초록불",
  UNKNOWN: "미확인",
  STALE: "지연",
  UNAVAILABLE: "미제공",
};

export function SignalStatusBadge({ status }: { status: SignalStatus }) {
  return (
    <span className={`signal-badge signal-${status.toLowerCase()}`}>
      <span className="signal-status-dot" />
      {statusLabel[status]}
    </span>
  );
}

export function CrossingMarker({
  crossing,
  reading,
  selected,
  x,
  y,
  onSelect,
}: {
  crossing: VisibleCrossing;
  reading: DisplayReading;
  selected: boolean;
  x: number;
  y: number;
  onSelect: () => void;
}) {
  const color =
    reading.status === "RED"
      ? "red"
      : reading.status === "GREEN"
        ? "green"
        : "unknown";
  return (
    <button
      type="button"
      className={`crossing-marker signal-${reading.status.toLowerCase()}`}
      style={{ left: x, top: y }}
      aria-pressed={selected}
      aria-label={`${crossing.intersection} ${crossing.name}, ${statusLabel[reading.status]}`}
      onClick={onSelect}
    >
      <span className="crossing-marker-art">
        <Image
          src={mapAssetPath(
            `/icons/map/signal-pin-${color}-${selected ? "selected" : "base"}.svg`,
          )}
          width={92}
          height={37}
          alt=""
          unoptimized
        />
        <span className="crossing-marker-label">
          {reading.seconds === null
            ? statusLabel[reading.status]
            : `${reading.seconds}초`}
        </span>
      </span>
    </button>
  );
}
