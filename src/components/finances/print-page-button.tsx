"use client";

export function PrintPageButton({ label = "Print" }: { label?: string }) {
  return (
    <button type="button" className="btn-primary print:hidden" onClick={() => window.print()}>
      {label}
    </button>
  );
}
