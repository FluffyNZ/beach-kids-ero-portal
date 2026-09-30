import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Beach Kids coastal-professional palette
        sand: {
          50: "#fdfbf7",
          100: "#faf5ec",
          200: "#f3e9d6",
          300: "#e8d7b8",
        },
        ocean: {
          50: "#f0f7f9",
          100: "#daedf0",
          200: "#b3dbe2",
          300: "#83c1cc",
          400: "#4fa2b1",
          500: "#2f8496",
          600: "#256a7a",
          700: "#215564",
          800: "#204653",
          900: "#1d3b47",
          950: "#0f242c",
        },
        kelp: {
          50: "#f2f8f4",
          100: "#dfeee3",
          500: "#3f8f5c",
          600: "#317249",
        },
        // Beach Kids brand refresh — warm editorial palette layered on top
        // of the original coastal tokens above (kept for anything not yet
        // restyled in this pass).
        cream: "#F6F1E7",
        // Phase 3 (Contra visual refit, 2026-09-24): shifted from a warm
        // dark taupe (#353530) to a true near-black so "text-charcoal" and
        // every charcoal/NN opacity border/text derived from it reads as
        // Contra's near-black-on-off-white system app-wide, without having
        // to touch each of the many call sites individually.
        charcoal: "#18181B",
        // Pale lilac/grey accent used ONLY for the sidebar's active-nav
        // background and a couple of quiet tag chips — Contra's stand-in
        // for a brand colour in navigation. Burgundy is deliberately not
        // used there any more; see DESIGN_SYSTEM.md's Phase 3 notes.
        lilac: {
          50: "#F7F6FC",
          100: "#EFEDF9",
          200: "#E1DDF3",
          600: "#6D5FA6",
        },
        burgundy: {
          50: "#FBEAF0",
          100: "#F5D0DD",
          200: "#E5A6BB",
          400: "#B5385F",
          500: "#9F1D45",
          600: "#851A3A",
          700: "#6B152F",
          900: "#4A0F21",
        },
        pink: {
          50: "#FDECF0",
          100: "#FBD6E0",
          300: "#F4A3B5",
          400: "#EC6E8F",
          500: "#D71950",
          600: "#B81044",
        },
        orange: {
          50: "#FEF3E6",
          100: "#FCE3C4",
          300: "#F7C17E",
          500: "#F39A32",
          600: "#D97F1A",
        },
        yellow: {
          50: "#FEF8E9",
          100: "#FCEEC5",
          300: "#F8DA96",
          500: "#F4C75B",
          600: "#E0AC2E",
        },
        blue: {
          50: "#EAF1FB",
          100: "#D2E3F6",
          300: "#93BCEA",
          500: "#3E7BC4",
          600: "#2F62A0",
        },
        purple: {
          50: "#F3EAFB",
          100: "#E4D2F5",
          300: "#C79CE9",
          500: "#8B4FC7",
          600: "#6E3AA0",
        },
        status: {
          ready: "#2f9e5b",
          readyBg: "#eaf7ee",
          attention: "#c9871f",
          attentionBg: "#fbf1e0",
          action: "#c9432f",
          actionBg: "#fbe9e6",
          neutral: "#6b7a80",
          neutralBg: "#eef2f3",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        display: ["var(--font-bitter)", "Georgia", "serif"],
      },
      // Phase 3 (Contra visual refit): the previous overrides pushed every
      // radius toward "pill" territory (xl=16px, 2xl=20px, 3xl=28px).
      // Contra uses moderate radii — large containers ~12-16px,
      // inputs/buttons ~10-14px — which is exactly Tailwind's own default
      // scale, so the overrides are removed rather than replaced:
      // rounded-xl is back to 12px, rounded-2xl to 16px, rounded-3xl to
      // 24px everywhere they're already used across the app.
      boxShadow: {
        // Cards/panels now rely on a 1px border for definition, not a drop
        // shadow — "card" stays defined (rather than being deleted) so any
        // existing `shadow-card` class becomes a harmless no-op instead of
        // a build error.
        card: "none",
        // Reserved for things that genuinely float above page content (an
        // open dropdown menu, a modal surface) — deliberately faint, not
        // the old dual-layer drop shadow.
        cardHover: "0 1px 3px rgba(15, 15, 20, 0.08), 0 4px 10px rgba(15, 15, 20, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
