"use client";

import { useEffect } from "react";

/** Opens the browser's print dialog as soon as this mounts — used when the
 * page was reached via the dashboard's "Print next week's attendance"
 * button, so that one click actually gets you to a print preview instead
 * of landing on the page and needing a second click. The page's own
 * "Print / Save as PDF" button still works normally for a later reprint
 * without needing to navigate here again. */
export function AutoPrint() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 150);
    return () => clearTimeout(t);
  }, []);
  return null;
}
