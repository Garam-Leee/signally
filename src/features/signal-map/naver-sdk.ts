// Minimal NAVER Maps v3 surface used by the adapter.
interface NaverPoint {
  x: number;
  y: number;
}
interface NaverLatLng {
  lat(): number;
  lng(): number;
}
interface NaverMap {
  getBounds(): { getSW(): NaverLatLng; getNE(): NaverLatLng };
  getProjection(): { fromCoordToOffset(coordinate: NaverLatLng): NaverPoint };
  getPanes(): { overlayLayer: HTMLElement };
  getZoom(): number;
  setSize(size: NaverPoint): void;
  setZoom(zoom: number): void;
  updateBy(center: NaverLatLng, zoom: number): void;
  destroy(): void;
}
interface NaverMaps {
  Map: new (
    container: HTMLElement,
    options: {
      center: NaverLatLng;
      zoom: number;
      minZoom: number;
      maxZoom: number;
      draggable: boolean;
      pinchZoom: boolean;
      scrollWheel: boolean;
      keyboardShortcuts: boolean;
      scaleControl: boolean;
      mapDataControl: boolean;
      logoControl: boolean;
    },
  ) => NaverMap;
  LatLng: new (latitude: number, longitude: number) => NaverLatLng;
  Size: new (width: number, height: number) => NaverPoint;
  Event: {
    addListener(map: NaverMap, name: string, callback: () => void): object;
    removeListener(listener: object): void;
  };
}
declare global {
  interface Window {
    naver?: { maps?: NaverMaps };
    navermap_authFailure?: () => void;
    signallyNaverReady?: () => void;
  }
}

export class NaverSdkError extends Error {}

export const naverAuthError =
  "NAVER 지도 인증에 실패했어요. Client ID, Dynamic Map 활성화 및 등록 URL을 확인해 주세요.";
const listeners = new Set<() => void>();
let load: Promise<NaverMaps> | undefined;
let currentId: string | undefined;
let authFailed = false;

export function onNaverAuthFailure(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function loadNaverMaps(clientId: string): Promise<NaverMaps> {
  if (typeof window === "undefined")
    return Promise.reject(
      new NaverSdkError("NAVER 지도는 브라우저에서 사용할 수 있어요."),
    );
  if (!clientId)
    return Promise.reject(
      new NaverSdkError("NAVER 지도 Client ID가 설정되지 않았어요."),
    );
  if (authFailed) return Promise.reject(new NaverSdkError(naverAuthError));
  if (load)
    return currentId === clientId
      ? load
      : Promise.reject(
          new NaverSdkError("설정이 변경됐어요. 페이지를 새로고침해 주세요."),
        );
  currentId = clientId;
  load = new Promise<NaverMaps>((resolve, reject) => {
    const script = document.createElement("script");
    const previous = window.navermap_authFailure;
    const timer = window.setTimeout(
      () => fail("NAVER 지도 SDK 응답 시간이 초과됐어요."),
      12_000,
    );
    function clean() {
      window.clearTimeout(timer);
      delete window.signallyNaverReady;
    }
    function fail(message: string) {
      clean();
      script.remove();
      window.navermap_authFailure = previous;
      reject(new NaverSdkError(message));
    }
    window.navermap_authFailure = () => {
      authFailed = true;
      for (const listener of listeners) listener();
      fail(naverAuthError);
      previous?.();
    };
    window.signallyNaverReady = () => {
      const maps = window.naver?.maps;
      if (!maps?.Map) return;
      clean();
      resolve(maps);
    };
    const url = new URL("https://oapi.map.naver.com/openapi/v3/maps.js");
    url.search = new URLSearchParams({
      ncpKeyId: clientId,
      callback: "signallyNaverReady",
    }).toString();
    script.src = url.href;
    script.async = true;
    script.onload = () => window.signallyNaverReady?.();
    script.onerror = () =>
      fail("NAVER 지도 SDK를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.");
    document.head.append(script);
  }).catch((error: unknown) => {
    if (!authFailed) load = undefined;
    throw error;
  });
  return load;
}
