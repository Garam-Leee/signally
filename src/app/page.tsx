import "maplibre-gl/dist/maplibre-gl.css";
import "@/features/signal-map/map.css";
import { MapView } from "@/features/signal-map/map-view";

export default function Home() {
  const naverClientId =
    process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID?.trim() ?? "";
  const initialProvider =
    naverClientId && process.env.SIGNALLY_MAP_PROVIDER === "naver"
      ? "naver"
      : "maplibre";
  return (
    <MapView
      allowDemo={process.env.NODE_ENV === "development"}
      naverClientId={naverClientId}
      initialProvider={initialProvider}
    />
  );
}
