import type { MarketingPlatform } from "@/lib/types";

// Media validation against each platform's current requirements, as asked
// for in the brief. Meta's own current docs did NOT state consistent
// numeric limits for resolution/duration/file size at the time this was
// written (confirmed by live research — see the explanation given to
// Ethan alongside this feature), so this deliberately only hard-blocks on
// things that ARE clearly, consistently documented (Instagram images must
// be JPEG; both platforms publish from mp4 video), and otherwise raises a
// warning asking for a quick manual check rather than inventing a number
// that could be stale by the time Ethan actually uses this.

export type MediaValidationInput = {
  mediaType: "image" | "video";
  mimeType: string;
  fileSize: number | null;
  durationSeconds: number | null;
};

export type MediaValidationResult = {
  errors: string[];
  warnings: string[];
};

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // matches the marketing-media bucket's own cap (migration 0064)

export function validateMediaForPlatforms(media: MediaValidationInput, platforms: MarketingPlatform[]): MediaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (media.fileSize !== null && media.fileSize > MAX_UPLOAD_BYTES) {
    errors.push(`File is larger than the ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB upload limit.`);
  }

  if (media.mediaType === "image") {
    const isJpeg = media.mimeType === "image/jpeg" || media.mimeType === "image/jpg";
    if (platforms.includes("instagram") && !isJpeg) {
      errors.push("Instagram only accepts JPEG photos — please convert this image before posting to Instagram.");
    }
    if (!isJpeg && media.mimeType !== "image/png" && media.mimeType !== "image/webp") {
      errors.push(`Unsupported image type (${media.mimeType}) — use JPEG, PNG or WEBP.`);
    }
    if (media.mimeType === "image/webp") {
      warnings.push("WEBP images aren't explicitly documented as supported by Meta's publishing endpoints — JPEG is the safest choice.");
    }
  }

  if (media.mediaType === "video") {
    if (media.mimeType !== "video/mp4") {
      warnings.push(`Video is ${media.mimeType}, not MP4 — Meta's endpoints are documented against MP4; convert if publishing fails.`);
    }
    if (media.durationSeconds !== null && media.durationSeconds > 90) {
      warnings.push(
        "This video is over 90 seconds. Reels/feed video length limits weren't consistently stated in Meta's current docs when this was built — double-check your Page/Instagram account's current limit before scheduling."
      );
    }
    warnings.push(
      "Exact current resolution/aspect-ratio/duration limits for Facebook and Instagram video weren't confirmed from Meta's live docs — worth a quick check against the Graph API Explorer or a short test post before relying on this for something time-sensitive."
    );
  }

  return { errors, warnings };
}
