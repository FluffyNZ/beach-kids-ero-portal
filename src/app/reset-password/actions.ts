"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ResetPasswordState = { error: string | null };

const MIN_LENGTH = 8;

/** Sets the new password for whoever followed a valid reset link, then
 * signs them out so they sign in fresh with it. Refuses outright without a
 * session from that link. */
export async function setNewPassword(_prev: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < MIN_LENGTH) return { error: `Use at least ${MIN_LENGTH} characters.` };
  if (password !== confirm) return { error: "The two passwords don't match." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "This reset link has expired. Go back and request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const message = /different from the old password/i.test(error.message)
      ? "Choose a password you haven't used before."
      : /weak|short|characters/i.test(error.message)
        ? "That password isn't strong enough — try a longer one."
        : "We couldn't save your new password. Please try again.";
    return { error: message };
  }

  await supabase.auth.signOut();
  redirect("/login?reset=done");
}
