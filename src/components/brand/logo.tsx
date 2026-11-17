/* eslint-disable @next/next/no-img-element -- plain <img> on purpose: the
   supplied SVG files are served as-is from /public/brand, untouched by the
   image optimiser (which would otherwise rasterise or reject SVGs). */
import { cn } from "@/lib/utils";

// The Earlydesk logo, drawn from the supplied brand files in /public/brand —
// never recreated with a font or redrawn. Each asset keeps its own
// proportions: only the height is chosen here and the width always follows
// the file's aspect ratio, so the logo can't be stretched or cropped.
//
//   variant "full" — symbol + wordmark (earlydesk-logo.svg, or the white
//                    wordmark version on dark backgrounds)
//   variant "icon" — the symbol on its own, for compact spots
//   variant "app"  — white symbol on a lilac tile (app/home-screen style)

type Variant = "full" | "icon" | "app";
type Background = "light" | "dark";

const ASSETS: Record<Variant, { light: string; dark: string; ratio: number }> = {
  full: { light: "/brand/earlydesk-logo.svg", dark: "/brand/earlydesk-logo-dark.svg", ratio: 1322 / 266 },
  icon: { light: "/brand/earlydesk-icon.svg", dark: "/brand/earlydesk-icon.svg", ratio: 1 },
  app: { light: "/brand/earlydesk-app-icon.svg", dark: "/brand/earlydesk-app-icon.svg", ratio: 1 },
};

export function Logo({
  variant = "full",
  background = "light",
  height = 28,
  label = "Earlydesk",
  decorative = false,
  className,
}: {
  variant?: Variant;
  /** The background the logo sits on — picks the readable wordmark colour. */
  background?: Background;
  /** Rendered height in CSS pixels; width follows the logo's proportions. */
  height?: number;
  /** Accessible name. Ignored when `decorative` is true. */
  label?: string;
  /** True when nearby text already says "Earlydesk" (e.g. inside a link
   * with its own label), so screen readers don't hear it twice. */
  decorative?: boolean;
  className?: string;
}) {
  const asset = ASSETS[variant];
  const width = Math.round(height * asset.ratio);
  return (
    <img
      src={background === "dark" ? asset.dark : asset.light}
      alt={decorative ? "" : label}
      aria-hidden={decorative ? true : undefined}
      width={width}
      height={height}
      style={{ height, width: "auto" }}
      draggable={false}
      className={cn("block max-w-none shrink-0 select-none", className)}
    />
  );
}
