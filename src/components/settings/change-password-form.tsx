"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

export function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  return (
    <form
      className="flex max-w-sm flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);

        if (password.length < 8) {
          setMessage({ type: "error", text: "Password must be at least 8 characters." });
          return;
        }
        if (password !== confirm) {
          setMessage({ type: "error", text: "Passwords don't match." });
          return;
        }

        startTransition(async () => {
          const supabase = createClient();
          const { error } = await supabase.auth.updateUser({ password });
          if (error) {
            setMessage({ type: "error", text: error.message });
            return;
          }
          setPassword("");
          setConfirm("");
          setMessage({ type: "success", text: "Password updated." });
        });
      }}
    >
      <div>
        <label className="label">New password</label>
        <input
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div>
        <label className="label">Confirm new password</label>
        <input
          type="password"
          className="input"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      {message && (
        <p
          className={
            message.type === "error"
              ? "rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action"
              : "rounded-lg bg-status-readyBg px-3 py-2 text-sm text-status-ready"
          }
        >
          {message.text}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary self-start">
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
