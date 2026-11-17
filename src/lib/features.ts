// Switches for whole areas of Earlydesk that are temporarily parked.
//
// Learning Stories is parked (Nov 2026): it's hidden from navigation, the
// Create menu and child/staff profiles, and its pages show a short "paused"
// notice instead of loading anything. Every story, photo, video, tag and
// database record is left exactly as it is, and all the code is still in
// place — setting this back to `true` (and re-adding the nav entry in
// lib/constants.ts) brings the feature back.
export const FEATURES = {
  learningStories: false,
} as const;
