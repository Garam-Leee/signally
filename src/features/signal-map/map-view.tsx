"use client";

import { mapAssetPath } from "./asset-path";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MapEngine, MapProvider } from "./map-engine";
import { createLibreMap } from "./maplibre-engine";
import { createNaverMap } from "./naver-engine";
import { NaverSdkError } from "./naver-sdk";
import {
  center,
  demoProvider,
  displayReading,
  homeZoom,
  liveProvider,
  type DataMode,
  type VisibleCrossing,
} from "./crossing-data";
import { CrossingBottomSheet } from "./crossing-bottom-sheet";
import { CrossingMarker } from "./crossing-marker";
import { Icon } from "./icons";
import { MapControls } from "./map-controls";
import { useGeolocation } from "./use-geolocation";
import { useMapBounds } from "./use-map-bounds";
import { UserLocationMarker } from "./user-location-marker";

export function MapView({
  allowDemo,
  naverClientId,
  initialProvider,
}: {
  allowDemo: boolean;
  naverClientId: string;
  initialProvider: MapProvider;
}) {
  const container = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const [map, setMap] = useState<MapEngine | null>(null);
  const [provider, setProvider] = useState(initialProvider);
  const [mapError, setMapError] = useState("");
  const [mapState, setMapState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [mode, setMode] = useState<DataMode>(allowDemo ? "DEMO" : "LIVE");
  const [crossings, setCrossings] = useState<VisibleCrossing[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [dataError, setDataError] = useState(false);
  const [{ now, start }, setClock] = useState({ now: 0, start: 0 });
  const [, setFrame] = useState(0);
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const bounds = useMapBounds(mapState === "ready" ? map : null);
  const location = useGeolocation(map);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const controller = new AbortController();
    let engine: MapEngine | null = null;
    let unsubscribe: (() => void) | undefined;
    const ready = () => {
      if (!controller.signal.aborted) setMapState("ready");
    };
    const error = (message: string) => {
      if (!controller.signal.aborted) {
        setMapError(message);
        setMapState("error");
      }
    };
    async function initialize(element: HTMLElement) {
      const instance =
        provider === "naver"
          ? await createNaverMap(
              element,
              naverClientId,
              { ready, error },
              controller.signal,
            )
          : createLibreMap(element, { ready, error });
      if (!instance) return;
      if (controller.signal.aborted) {
        instance.destroy();
        return;
      }
      engine = instance;
      const updateSize = () => {
        if (element)
          setSize({ width: element.clientWidth, height: element.clientHeight });
      };
      updateSize();
      const offFrame = engine.subscribe("frame", () =>
        setFrame((frame) => frame + 1),
      );
      const resize = new ResizeObserver(updateSize);
      resize.observe(element);
      unsubscribe = () => {
        offFrame();
        resize.disconnect();
      };
      setMap(engine);
    }
    void Promise.resolve()
      .then(() => {
        if (!controller.signal.aborted) return initialize(element);
      })
      .catch((failure: unknown) => {
        error(
          provider === "naver" && failure instanceof NaverSdkError
            ? failure.message
            : "지도를 초기화하지 못했어요.",
        );
      });
    return () => {
      controller.abort();
      unsubscribe?.();
      engine?.destroy();
    };
  }, [provider, naverClientId]);

  useEffect(() => {
    const tick = () => {
      const time = Date.now();
      setClock((clock) => ({ now: time, start: clock.start || time }));
    };
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!bounds || mapState !== "ready") return;
    const controller = new AbortController();
    const provider = mode === "DEMO" ? demoProvider : liveProvider;
    provider
      .load(bounds, controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) {
          setCrossings(rows);
          setSelected((id) =>
            rows.some((crossing) => crossing.id === id) ? id : null,
          );
          setDataError(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setCrossings([]);
          setDataError(true);
        }
      });
    return () => controller.abort();
  }, [bounds, mapState, mode]);

  function changeMode(next: DataMode) {
    if (next === mode) return;
    setSelected(null);
    setCrossings([]);
    setDataError(false);
    setMode(next);
  }

  function changeProvider(next: MapProvider) {
    if (next === provider) return;
    location.stopFollowing();
    setMap(null);
    setSelected(null);
    setCrossings([]);
    setMapError("");
    setMapState("loading");
    setProvider(next);
  }

  function selectCrossing(crossing: VisibleCrossing) {
    setSelected(crossing.id);
    if (!map) return;
    requestAnimationFrame(() => {
      const stage = container.current?.getBoundingClientRect();
      const sheetElement = sheetRef.current;
      if (!stage || !sheetElement) return;
      const sheet = sheetElement.getBoundingClientRect();
      // Read the expanded content even while the card height is animating.
      const sheetTop = Math.min(
        sheet.top,
        sheet.bottom - sheetElement.scrollHeight,
      );
      const point = map.project(crossing.location);
      const x = stage.left + point.x;
      const y = stage.top + point.y;
      const obscured =
        x + 46 >= sheet.left &&
        x - 46 <= sheet.right &&
        y + 8 >= sheetTop &&
        y - 44 <= sheet.bottom;
      if (obscured) {
        location.stopFollowing();
        map.move({ center: crossing.location, zoom: map.zoom() });
      }
    });
  }

  function resetArea() {
    location.stopFollowing();
    setSelected(null);
    map?.move({ center, zoom: homeZoom });
  }

  const active = crossings.find((crossing) => crossing.id === selected) ?? null;
  const markers: { crossing: VisibleCrossing; x: number; y: number }[] = [];
  if (map && mapState === "ready" && size !== null) {
    const { width, height } = size;
    const candidates = active
      ? [active, ...crossings.filter((item) => item.id !== selected)]
      : crossings;
    for (const crossing of candidates) {
      const { x, y } = map.project(crossing.location);
      if (x < 0 || x > width || y < 0 || y > height) continue;
      if (
        markers.some(
          (marker) =>
            Math.abs(marker.x - x) < 88 && Math.abs(marker.y - y) < 28,
        )
      )
        continue;
      markers.push({ crossing, x, y });
    }
  }

  const overlay = (
    <div
      className={
        map?.overlayPane
          ? "marker-overlay marker-overlay-pane"
          : "marker-overlay"
      }
    >
      {map && location.position && (
        <UserLocationMarker map={map} position={location.position} />
      )}
      {markers.map(({ crossing, x, y }) => (
        <CrossingMarker
          key={crossing.id}
          crossing={crossing}
          reading={displayReading(crossing, mode, now, start)}
          x={map?.overlayPane ? map.project(crossing.location, true).x : x}
          y={map?.overlayPane ? map.project(crossing.location, true).y : y}
          selected={selected === crossing.id}
          onSelect={() => selectCrossing(crossing)}
        />
      ))}
    </div>
  );

  return (
    <main className="signal-map">
      <header className="signal-header">
        <h1 className="signal-brand">
          <Image
            src={mapAssetPath("/icons/brand/wordmark.svg")}
            width={152}
            height={41}
            alt="시그널리 Signally"
            unoptimized
          />
        </h1>
        <p className="signal-tagline">우리 동네 신호를 한눈에</p>
        <div className="signal-modes" aria-label="데이터 모드">
          {allowDemo && (
            <button
              type="button"
              aria-pressed={mode === "DEMO"}
              onClick={() => changeMode("DEMO")}
            >
              DEMO
            </button>
          )}
          <button
            type="button"
            aria-pressed={mode === "LIVE"}
            onClick={() => changeMode("LIVE")}
          >
            LIVE
          </button>
        </div>
      </header>
      <div className="map-stage">
        <div
          className={`map-canvas map-provider-${provider}`}
          key={provider}
          ref={container}
          aria-label="신호등 탐색 지도"
        />
        {map?.overlayPane ? createPortal(overlay, map.overlayPane) : overlay}
        <div className="map-toolbar">
          <button
            type="button"
            className="area-chip"
            onClick={resetArea}
            disabled={mapState !== "ready"}
          >
            <Icon name="pin" className="size-4" />
            난곡사거리
          </button>
          <p className={`mode-notice ${mode === "LIVE" ? "mode-live" : ""}`}>
            <Icon name="info" className="size-4" />
            {mode === "DEMO"
              ? "DEMO · 실제 신호 아님"
              : "LIVE · 신호 연결 준비 중"}
          </p>
        </div>
        {(allowDemo || (provider === "naver" && mapState === "error")) && (
          <div className="map-provider-switch" aria-label="지도 공급원">
            <button
              type="button"
              aria-pressed={provider === "maplibre"}
              onClick={() => changeProvider("maplibre")}
            >
              MapLibre
            </button>
            {allowDemo && (
              <button
                type="button"
                aria-pressed={provider === "naver"}
                onClick={() => changeProvider("naver")}
              >
                NAVER
              </button>
            )}
          </div>
        )}
        {mapState !== "ready" && (
          <p className="map-feedback" role="status">
            {mapState === "loading" ? "지도를 불러오는 중…" : mapError}
          </p>
        )}
        {(location.message || dataError) && (
          <p className="map-feedback" role="status">
            {location.message || "신호 정보를 확인하는 중입니다."}
          </p>
        )}
        <MapControls
          disabled={mapState !== "ready"}
          pending={location.pending}
          locate={location.recenter}
          zoom={(direction) => {
            location.stopFollowing();
            map?.zoomBy(direction);
          }}
        />
        <CrossingBottomSheet
          sheetRef={sheetRef}
          crossing={active}
          reading={active ? displayReading(active, mode, now, start) : null}
          mode={mode}
          count={crossings.length}
          close={() => setSelected(null)}
        />
      </div>
    </main>
  );
}
