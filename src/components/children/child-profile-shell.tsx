// The child profile uses the shared record page shell (also used by staff
// profiles) — see components/ui/record-shell.tsx. These names are kept so
// existing child profile code doesn't need to change.
export {
  RecordShell as ChildProfileShell,
  RecordTabs as ProfileTabs,
  RecordTabLink as TabLink,
  RecordEditButton as EditProfileButton,
  useRecordEdit as useProfileEdit,
} from "@/components/ui/record-shell";
export type { RecordTab as ProfileTab } from "@/components/ui/record-shell";
