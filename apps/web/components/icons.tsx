import { cn } from "@/lib/cn";

type IconName =
  | "arrow-right"
  | "bank"
  | "bolt"
  | "chart"
  | "check"
  | "chevron-right"
  | "clock"
  | "coins"
  | "dashboard"
  | "document"
  | "globe"
  | "home"
  | "layers"
  | "link"
  | "lock"
  | "map-pin"
  | "portfolio"
  | "settings"
  | "shield"
  | "spark"
  | "sun"
  | "token"
  | "upload"
  | "user"
  | "wallet";

const iconPaths: Record<IconName, string[]> = {
  "arrow-right": ["M5 12h14", "m12 5 7 7-7 7"],
  bank: ["M3 10 12 4l9 6", "M5 10v8", "M9 10v8", "M15 10v8", "M19 10v8", "M3 20h18"],
  bolt: ["m13 2-8 10h6l-1 10 8-10h-6l1-10Z"],
  chart: ["M4 19V5", "M10 19v-8", "M16 19v-4", "M22 19H2"],
  check: ["M5 13l4 4L19 7"],
  "chevron-right": ["m9 18 6-6-6-6"],
  clock: ["M12 6v6l4 2", "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"],
  coins: [
    "M12 6c-4.4 0-8 1.3-8 3v6c0 1.7 3.6 3 8 3s8-1.3 8-3V9c0-1.7-3.6-3-8-3Z",
    "M4 9c0 1.7 3.6 3 8 3s8-1.3 8-3",
    "M4 15c0 1.7 3.6 3 8 3s8-1.3 8-3",
  ],
  dashboard: ["M4 4h7v7H4z", "M13 4h7v5h-7z", "M13 11h7v9h-7z", "M4 13h7v7H4z"],
  document: ["M8 3h7l5 5v13H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z", "M15 3v6h6", "M10 14h8", "M10 18h5"],
  globe: [
    "M3 12h18",
    "M12 3a15.3 15.3 0 0 1 0 18",
    "M12 3a15.3 15.3 0 0 0 0 18",
    "M4.9 7h14.2",
    "M4.9 17h14.2",
  ],
  home: ["M3 11.5 12 4l9 7.5", "M5 10.5V20h14v-9.5", "M9 20v-6h6v6"],
  layers: ["m12 3-9 5 9 5 9-5-9-5Z", "m3 13 9 5 9-5", "m3 18 9 5 9-5"],
  link: ["m10 13 4-4", "M7 17H6a4 4 0 0 1 0-8h3", "M17 7h1a4 4 0 0 1 0 8h-3"],
  lock: ["M7 10V8a5 5 0 0 1 10 0v2", "M5 10h14v10H5z", "M12 14v3"],
  "map-pin": [
    "M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z",
    "M12 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  ],
  portfolio: ["M4 7h16v11H4z", "M8 7V5h8v2", "M4 11h16", "M10 14h4"],
  settings: [
    "M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z",
    "m19.4 15 .6 1.1-1.7 2.9-1.3-.3a7.8 7.8 0 0 1-1.7 1l-.2 1.3H8.9l-.2-1.3a7.8 7.8 0 0 1-1.7-1l-1.3.3L4 16.1l.6-1.1a7.6 7.6 0 0 1 0-2l-.6-1.1 1.7-2.9 1.3.3a7.8 7.8 0 0 1 1.7-1l.2-1.3h3.4l.2 1.3a7.8 7.8 0 0 1 1.7 1l1.3-.3 1.7 2.9-.6 1.1a7.6 7.6 0 0 1 0 2Z",
  ],
  shield: ["M12 3 5 6v5c0 5 3.4 8.7 7 10 3.6-1.3 7-5 7-10V6l-7-3Z", "m9.5 12 1.8 1.8 3.2-3.6"],
  spark: [
    "M12 2v4",
    "M12 18v4",
    "M4.9 4.9l2.8 2.8",
    "M16.3 16.3l2.8 2.8",
    "M2 12h4",
    "M18 12h4",
    "M4.9 19.1l2.8-2.8",
    "M16.3 7.7l2.8-2.8",
    "M12 8.5 9.5 12 12 15.5 14.5 12 12 8.5Z",
  ],
  sun: [
    "M12 3v2",
    "M12 19v2",
    "m4.9 4.9 1.4 1.4",
    "m17.7 17.7 1.4 1.4",
    "M3 12h2",
    "M19 12h2",
    "m4.9 19.1 1.4-1.4",
    "m17.7 6.3 1.4-1.4",
    "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z",
  ],
  token: ["M12 2 3.5 7v10L12 22l8.5-5V7L12 2Z", "M12 7v10", "M7.2 9.8 12 12l4.8-2.2"],
  upload: ["M12 16V6", "m8 10 4-4 4 4", "M4 19h16"],
  user: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M4 20a8 8 0 0 1 16 0"],
  wallet: ["M4 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4z", "M4 7V5a2 2 0 0 1 2-2h11", "M16 13h4"],
};

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-5 shrink-0", className)}
    >
      {iconPaths[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
