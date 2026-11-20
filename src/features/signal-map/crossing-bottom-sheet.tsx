import type { Ref } from "react";
import type {
  DataMode,
  DisplayReading,
  VisibleCrossing,
} from "./crossing-data";
import { SignalStatusBadge, statusLabel } from "./crossing-marker";
import { Icon } from "./icons";

export function CrossingBottomSheet({
  crossing,
  reading,
  mode,
  count,
  close,
  sheetRef,
}: {
  crossing: VisibleCrossing | null;
  reading: DisplayReading | null;
  mode: DataMode;
  count: number;
  close: () => void;
  sheetRef: Ref<HTMLElement>;
}) {
  const expanded = Boolean(crossing && reading);
  return (
    <section
      ref={sheetRef}
      className="map-sheet"
      data-expanded={expanded}
      aria-label={expanded ? "횡단보도 신호 상세" : "지도 신호 요약"}
    >
      <span className="sheet-handle" aria-hidden="true" />
      {crossing && reading ? (
        <div className="sheet-detail">
          <div className="sheet-heading">
            <div>
              <p className="sheet-eyebrow">{crossing.intersection}</p>
              <h2>{crossing.name}</h2>
            </div>
            <button
              type="button"
              className="map-icon-button sheet-close"
              aria-label="상세 닫기"
              onClick={close}
            >
              <Icon name="close" className="size-5" />
            </button>
          </div>
          <div
            className={`sheet-reading signal-${reading.status.toLowerCase()}`}
          >
            <div className="sheet-reading-label">
              <SignalStatusBadge status={reading.status} />
              {reading.seconds !== null && reading.next && (
                <p>{statusLabel[reading.next]}까지</p>
              )}
            </div>
            {reading.seconds !== null && reading.next ? (
              <p className="sheet-count">
                {reading.seconds}
                <span>초</span>
              </p>
            ) : (
              <p className="sheet-unavailable">정보 확인 중</p>
            )}
          </div>
          <div className="sheet-meta">
            <span className="sheet-update">
              <Icon name="clock" className="size-3.5" />
              <span className="sr-only">마지막 갱신</span>
              {reading.observedAt === null
                ? "갱신 기록 없음"
                : new Date(reading.observedAt).toLocaleTimeString("ko-KR", {
                    timeZone: "Asia/Seoul",
                    hour12: false,
                  }) + " KST"}
            </span>
            <span className="sheet-source">
              {mode === "DEMO"
                ? "DEMO · 시뮬레이션"
                : reading.status === "STALE"
                  ? "LIVE · 지연"
                  : reading.observedAt === null ||
                      reading.status === "UNAVAILABLE" ||
                      reading.status === "UNKNOWN"
                    ? "LIVE · 미제공"
                    : "LIVE · 실시간"}
            </span>
          </div>
        </div>
      ) : (
        <div className="sheet-summary">
          <div className="sheet-summary-heading">
            <span className="sheet-pin">
              <Icon name="pin" className="size-5" />
            </span>
            <div>
              <h2>{mode === "DEMO" ? "주변 횡단보도" : "실시간 신호 정보"}</h2>
              <p>
                {mode === "LIVE"
                  ? "실시간 데이터 연결 준비 중"
                  : count
                    ? `현재 지도에 데모 신호 ${count}개`
                    : "현재 지도에 데모 신호가 없어요"}
              </p>
            </div>
          </div>
          <div className="sheet-legend">
            {mode === "DEMO" && (
              <>
                <SignalStatusBadge status="RED" />
                <SignalStatusBadge status="GREEN" />
              </>
            )}
            <SignalStatusBadge status="UNKNOWN" />
          </div>
        </div>
      )}
    </section>
  );
}
