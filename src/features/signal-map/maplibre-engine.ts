import { getVersion, Map, ScaleControl, setWorkerUrl } from "maplibre-gl";
import { center, homeZoom } from "./crossing-data";
import type { MapCallbacks, MapEngine } from "./map-engine";

export function createLibreMap(
  container: HTMLElement,
  callbacks: MapCallbacks,
): MapEngine {
  setWorkerUrl("/map-assets/maplibre-gl-worker.mjs?v=" + getVersion());
  const map = new Map({
    container,
    style: "https://tiles.openfreemap.org/styles/positron",
    center,
    zoom: homeZoom,
    minZoom: 3,
    maxZoom: 20,
    bearing: 0,
    pitch: 0,
    maxPitch: 0,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    renderWorldCopies: false,
    transformStyle: (_previous, style) => ({
      ...style,
      layers: style.layers.map((layer) =>
        layer.id === "building" && layer.type === "fill"
          ? {
              ...layer,
              paint: {
                ...layer.paint,
                "fill-color": "#eee5d8",
                "fill-outline-color": "#e4dbd0",
              },
            }
          : layer,
      ),
    }),
  });
  map.touchZoomRotate.disableRotation();
  map.keyboard.disableRotation();
  map.addControl(
    new ScaleControl({ maxWidth: 85, unit: "metric" }),
    "top-left",
  );
  let ready = false;
  map.on("load", () => {
    ready = true;
    callbacks.ready();
  });
  map.on("error", () => {
    if (!ready && !map.isStyleLoaded())
      callbacks.error(
        "지도를 불러오지 못했어요. 연결 또는 WebGL 설정을 확인해 주세요.",
      );
  });
  return {
    bounds() {
      const box = map.getBounds();
      return {
        west: box.getWest(),
        south: box.getSouth(),
        east: box.getEast(),
        north: box.getNorth(),
      };
    },
    project: (coordinate) => map.project(coordinate),
    accuracyRadius: ([, latitude], meters) =>
      meters /
      Math.max(
        (40075016.7 * Math.cos((latitude * Math.PI) / 180)) /
          (512 * 2 ** map.getZoom()),
        0.0001,
      ),
    zoom: () => map.getZoom(),
    move: (camera) => {
      map.easeTo(camera);
    },
    zoomBy: (amount) => {
      map.zoomTo(map.getZoom() + amount);
    },
    subscribe(event, callback) {
      if (event === "manual") {
        const manual = (e: { originalEvent?: unknown }) => {
          if (e.originalEvent) callback();
        };
        map.on("movestart", manual);
        return () => {
          map.off("movestart", manual);
        };
      }
      const name = event === "frame" ? "move" : "moveend";
      map.on(name, callback);
      map.on("resize", callback);
      return () => {
        map.off(name, callback);
        map.off("resize", callback);
      };
    },
    destroy: () => {
      map.remove();
    },
  };
}
