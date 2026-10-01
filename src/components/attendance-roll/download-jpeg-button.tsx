"use client";

import { useState } from "react";

/**
 * Captures the on-screen roll (by element id) as a JPEG and downloads it —
 * for posting to the staff group chat, no printing/PDF step required.
 * Uses the `html-to-image` package (added as a new, small dependency for
 * this feature) to render the DOM node to an image entirely client-side —
 * nothing is sent to a server or stored anywhere.
 */
export function DownloadJpegButton({ targetId, fileName }: { targetId: string; fileName: string }) {
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setError(null);
    setIsWorking(true);
    try {
      const node = document.getElementById(targetId);
      if (!node) throw new Error("Could not find the roll to capture.");

      const { toJpeg } = await import("html-to-image");
      const dataUrl = await toJpeg(node, {
        quality: 0.95,
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });

      const link = document.createElement("a");
      link.download = fileName;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the image — try again.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" className="btn-secondary" onClick={handleDownload} disabled={isWorking}>
        {isWorking ? "Preparing…" : "Download JPEG"}
      </button>
      {error && <p className="text-xs text-status-action">{error}</p>}
    </div>
  );
}
