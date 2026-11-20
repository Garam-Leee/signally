import type { Bounds, Coordinate } from "./crossing-data";

export type MapProvider = "maplibre" | "naver";
export type Camera = { center: Coordinate; zoom: number };
export type CameraEvent = "frame" | "settled" | "manual";
export interface MapEngine {
  bounds(): Bounds;
  overlayPane?: HTMLElement;
  project(
    coordinate: Coordinate,
    relativeToPane?: boolean,
  ): { x: number; y: number };
  accuracyRadius(coordinate: Coordinate, meters: number): number;
  zoom(): number;
  move(camera: Camera): void;
  zoomBy(amount: number): void;
  subscribe(event: CameraEvent, callback: () => void): () => void;
  destroy(): void;
}
export type MapCallbacks = {
  ready(): void;
  error(message: string): void;
};
