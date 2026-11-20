import type { SVGProps } from "react";

const paths = {
  pin: "M20 10c0 5-8 10-8 10S4 15 4 10a8 8 0 1 1 16 0ZM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  close: "m6 6 12 12M18 6 6 18",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-15v5l3 2",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-11v5m0-8h.01",
  arrow: "m12 3 6 17-6-4-6 4 6-17Z",
};
export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
