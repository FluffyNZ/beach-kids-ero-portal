import { redirect } from "next/navigation";

// Fees by Family has moved to Finance — this old route just forwards there
// so any existing bookmarks or links keep working. Safe to delete this
// whole folder once nothing points here anymore.
export default function FeesByFamilyRedirect() {
  redirect("/finances/fees");
}
