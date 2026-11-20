import { center, homeZoom, type Coordinate } from "./crossing-data";
import type { MapCallbacks, MapEngine } from "./map-engine";
import { loadNaverMaps, naverAuthError, onNaverAuthFailure } from "./naver-sdk";

export async function createNaverMap(
  container: HTMLElement,
  clientId: string,
  callbacks: MapCallbacks,
  signal: AbortSignal,
): Promise<MapEngine | null> {
  const maps = await loadNaverMaps(clientId);
  if (signal.aborted) return null;
  const latLng = ([lng, lat]: Coordinate) => new maps.LatLng(lat, lng);
  const map = new maps.Map(container, {
    center: latLng(center),
    zoom: Math.round(homeZoom),
    minZoom: 3,
    maxZoom: 20,
    draggable: true,
    pinchZoom: true,
    scrollWheel: true,
    keyboardShortcuts: true,
    scaleControl: true,
    mapDataControl: true,
    logoControl: true,
  });
  const listen = (name: string, callback: () => void) => {
    const listener = maps.Event.addListener(map, name, callback);
    return () => maps.Event.removeListener(listener);
  };
  const observers = new Set<() => void>();
  const resize = new ResizeObserver(() => {
    const { clientWidth, clientHeight } = container;
    if (clientWidth && clientHeight)
      map.setSize(new maps.Size(clientWidth, clientHeight));
    for (const callback of observers) callback();
  });
  resize.observe(container);
  let failed = false;
  const timeout = window.setTimeout(() => {
    callbacks.error(
      "NAVER 지도 타일을 불러오지 못했어요. 연결이나 이용 한도를 확인해 주세요.",
    );
  }, 15_000);
  const removeTiles = listen("tilesloaded", () => {
    window.clearTimeout(timeout);
    if (!failed) callbacks.ready();
  });
  const removeAuth = onNaverAuthFailure(() => {
    failed = true;
    window.clearTimeout(timeout);
    callbacks.error(naverAuthError);
  });
  const overlayPane = map.getPanes().overlayLayer;
  const project = (coordinate: Coordinate, relativeToPane = false) => {
    const point = map.getProjection().fromCoordToOffset(latLng(coordinate));
    if (relativeToPane) return point;
    // Convert SDK pane offsets to viewport coordinates for collision checks.
    const pane = overlayPane.getBoundingClientRect();
    const viewport = container.getBoundingClientRect();
    return {
      x: point.x + pane.left - viewport.left,
      y: point.y + pane.top - viewport.top,
    };
  };
  return {
    bounds() {
      const box = map.getBounds();
      const sw = box.getSW();
      const ne = box.getNE();
      return {
        west: sw.lng(),
        south: sw.lat(),
        east: ne.lng(),
        north: ne.lat(),
      };
    },
    overlayPane,
    project,
    accuracyRadius(coordinate, meters) {
      const [lng, lat] = coordinate;
      const delta = 100 / 111320;
      const sample = lat + delta <= 85 ? lat + delta : lat - delta;
      return (
        (Math.abs(project([lng, sample]).y - project(coordinate).y) * meters) /
        100
      );
    },
    zoom: () => map.getZoom(),
    move: ({ center, zoom }) => map.updateBy(latLng(center), Math.round(zoom)),
    zoomBy: (amount) => map.setZoom(map.getZoom() + amount),
    subscribe(event, callback) {
      if (event === "manual") {
        const off = listen("dragstart", callback);
        const touch = (e: TouchEvent) => {
          if (e.touches.length > 1) callback();
        };
        const key = (e: KeyboardEvent) => {
          if (/^(Arrow|[+-]$)/.test(e.key)) callback();
        };
        container.addEventListener("wheel", callback, { passive: true });
        container.addEventListener("dblclick", callback);
        container.addEventListener("touchstart", touch, { passive: true });
        container.addEventListener("keydown", key);
        return () => {
          off();
          container.removeEventListener("wheel", callback);
          container.removeEventListener("dblclick", callback);
          container.removeEventListener("touchstart", touch);
          container.removeEventListener("keydown", key);
        };
      }
      observers.add(callback);
      let frame: number | undefined;
      const draw = () => {
        if (frame !== undefined) return;
        frame = window.requestAnimationFrame(() => {
          frame = undefined;
          callback();
        });
      };
      const events =
        event === "frame"
          ? ["bounds_changed", "drag", "dragend", "idle"]
          : ["idle"];
      const remove = events.map((name) =>
        listen(name, event === "frame" ? draw : callback),
      );
      return () => {
        for (const unsubscribe of remove) unsubscribe();
        if (frame !== undefined) window.cancelAnimationFrame(frame);
        observers.delete(callback);
      };
    },
    destroy() {
      window.clearTimeout(timeout);
      removeTiles();
      removeAuth();
      resize.disconnect();
      map.destroy();
    },
  };
}
