import { mapAssetPath } from "./asset-path";
import Image from "next/image";
import { Icon } from "./icons";

export function MapControls({
  disabled,
  pending,
  zoom,
  locate,
}: {
  disabled: boolean;
  pending: boolean;
  zoom: (direction: number) => void;
  locate: () => void;
}) {
  return (
    <div className="map-controls">
      <div className="map-north" aria-label="북쪽 고정">
        <Icon name="arrow" className="size-4" />
        <span>N</span>
      </div>
      <div className="map-zoom">
        <button
          type="button"
          className="map-icon-button"
          aria-label="확대"
          onClick={() => zoom(1)}
          disabled={disabled}
        >
          <Image
            src={mapAssetPath("/icons/map/control-zoom-in.svg")}
            width={30}
            height={30}
            alt=""
            unoptimized
          />
        </button>
        <button
          type="button"
          className="map-icon-button"
          aria-label="축소"
          onClick={() => zoom(-1)}
          disabled={disabled}
        >
          <Image
            src={mapAssetPath("/icons/map/control-zoom-out.svg")}
            width={30}
            height={30}
            alt=""
            unoptimized
          />
        </button>
      </div>
      <button
        type="button"
        className="map-icon-button map-locate"
        aria-label="내 위치로 이동"
        onClick={locate}
        disabled={disabled || pending}
      >
        <Image
          src={mapAssetPath("/icons/map/control-location.svg")}
          width={30}
          height={30}
          alt=""
          unoptimized
        />
      </button>
    </div>
  );
}
