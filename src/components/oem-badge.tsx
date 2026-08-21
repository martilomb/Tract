import { cn } from "@/lib/utils";
import { useState } from "react";

// Brand palette + official domain per OEM. Domain is used to fetch the
// real logo icon via Google's public favicon service (no auth required),
// with the color monogram as a graceful fallback.
const OEM_BRAND: Record<
  string,
  { bg: string; fg: string; ring: string; mark: string; label: string; domain: string }
> = {
  Ford: {
    bg: "#003478",
    fg: "#ffffff",
    ring: "#0057b8",
    mark: "F",
    label: "Ford",
    domain: "ford.com",
  },
  GM: {
    bg: "#00204e",
    fg: "#f7c744",
    ring: "#0a3a86",
    mark: "GM",
    label: "General Motors",
    domain: "gm.com",
  },
  Stellantis: {
    bg: "#0b1a3a",
    fg: "#ffffff",
    ring: "#1e3a8a",
    mark: "S",
    label: "Stellantis",
    domain: "stellantis.com",
  },
  Toyota: {
    bg: "#eb0a1e",
    fg: "#ffffff",
    ring: "#b30818",
    mark: "T",
    label: "Toyota",
    domain: "toyota.com",
  },
  Honda: {
    bg: "#cc0000",
    fg: "#ffffff",
    ring: "#8a0000",
    mark: "H",
    label: "Honda",
    domain: "honda.com",
  },
  Rivian: {
    bg: "#0a2540",
    fg: "#ffd400",
    ring: "#183b60",
    mark: "R",
    label: "Rivian",
    domain: "rivian.com",
  },
  Volkswagen: {
    bg: "#001e50",
    fg: "#ffffff",
    ring: "#00437a",
    mark: "VW",
    label: "Volkswagen",
    domain: "vw.com",
  },
  Hyundai: {
    bg: "#002c5f",
    fg: "#ffffff",
    ring: "#0a4a8f",
    mark: "H",
    label: "Hyundai",
    domain: "hyundai.com",
  },
  Nissan: {
    bg: "#c3002f",
    fg: "#ffffff",
    ring: "#8a0021",
    mark: "N",
    label: "Nissan",
    domain: "nissan-global.com",
  },
  Tesla: {
    bg: "#111111",
    fg: "#e31937",
    ring: "#2a2a2a",
    mark: "T",
    label: "Tesla",
    domain: "tesla.com",
  },
};

function brandFor(oem: string) {
  return (
    OEM_BRAND[oem] ?? {
      bg: "#0f172a",
      fg: "#ffffff",
      ring: "#334155",
      mark: oem.slice(0, 2).toUpperCase(),
      label: oem,
      domain: "",
    }
  );
}

export function oemLogoUrl(domain: string, size = 128) {
  if (!domain) return "";
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

/**
 * A round OEM chip that renders the OEM's real logo icon on a light
 * background, falling back to a colored monogram if the logo can't load.
 */
export function OemMark({
  oem,
  size = "md",
  className,
}: {
  oem: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const b = brandFor(oem);
  const [failed, setFailed] = useState(false);
  const dims =
    size === "sm"
      ? { box: "h-5 w-5", img: "h-3.5 w-3.5", txt: "text-[9px]" }
      : size === "lg"
        ? { box: "h-10 w-10", img: "h-7 w-7", txt: "text-sm" }
        : { box: "h-7 w-7", img: "h-5 w-5", txt: "text-[11px]" };

  const showLogo = !!b.domain && !failed;
  return (
    <span
      title={b.label}
      className={cn(
        "inline-flex select-none items-center justify-center rounded-full font-black tracking-tight shadow-sm ring-1 ring-border overflow-hidden",
        dims.box,
        dims.txt,
        className,
      )}
      style={
        showLogo
          ? { backgroundColor: "#ffffff" }
          : { backgroundColor: b.bg, color: b.fg, boxShadow: `inset 0 0 0 1px ${b.ring}` }
      }
    >
      {showLogo ? (
        <img
          src={oemLogoUrl(b.domain, 128)}
          alt={`${b.label} logo`}
          loading="lazy"
          onError={() => setFailed(true)}
          className={cn("object-contain", dims.img)}
        />
      ) : (
        b.mark
      )}
    </span>
  );
}

/**
 * Full OEM chip with logo + name — used in headers and cards.
 */
export function OemChip({
  oem,
  className,
  onDark = false,
}: {
  oem: string;
  className?: string;
  onDark?: boolean;
}) {
  const b = brandFor(oem);
  const [failed, setFailed] = useState(false);
  const showLogo = !!b.domain && !failed;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5 text-[11px] font-semibold",
        onDark ? "bg-white/10 text-white" : "bg-secondary text-foreground",
        className,
      )}
    >
      <span
        className="inline-flex h-5 w-5 items-center justify-center rounded-full overflow-hidden ring-1 ring-black/5"
        style={showLogo ? { backgroundColor: "#ffffff" } : { backgroundColor: b.bg, color: b.fg }}
      >
        {showLogo ? (
          <img
            src={oemLogoUrl(b.domain, 64)}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-3.5 w-3.5 object-contain"
          />
        ) : (
          <span className="text-[9px] font-black">{b.mark}</span>
        )}
      </span>
      {b.label}
    </span>
  );
}
