"use client";

import { useEffect, useState } from "react";
import { getSignedUrlForEvidence } from "@/lib/actions/evidence";

export function EvidencePreview({
  storagePath,
  mimeType,
  filename,
}: {
  storagePath: string;
  mimeType: string | null;
  filename: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setUrl(null);
    getSignedUrlForEvidence(storagePath, false).then((signedUrl) => {
      if (!cancelled) {
        setUrl(signedUrl);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [storagePath]);

  if (loading) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-ocean-100 bg-ocean-50/40 text-sm text-ocean-400">
        Loading preview…
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-ocean-100 bg-ocean-50/40 text-sm text-ocean-400">
        Preview not available.
      </div>
    );
  }

  const isImage = mimeType?.startsWith("image/") ?? false;
  const isPdf = mimeType === "application/pdf";

  if (isImage) {
    return (
      <div className="flex items-center justify-center overflow-hidden rounded-xl border border-ocean-100 bg-ocean-50/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={filename} className="max-h-[420px] w-full object-contain" />
      </div>
    );
  }

  if (isPdf) {
    return <iframe src={url} title={filename} className="h-[480px] w-full rounded-xl border border-ocean-100" />;
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-ocean-100 bg-ocean-50/40 p-6 text-center text-sm text-ocean-500">
      <p>This file type can&apos;t be shown inline here — {filename}</p>
      <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium text-ocean-700 underline">
        Open in a new tab instead
      </a>
    </div>
  );
}
