"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Copies a private invitation link to the clipboard (Spec 4.5, 15.6).
 *
 * Falls back to selecting the text in a hidden input when the async Clipboard
 * API is unavailable. It requires a secure context, so plain-HTTP local
 * testing would otherwise silently do nothing.
 */
export function CopyButton({
  value,
  label = "Copy link",
  className = "btn btn-secondary btn-sm",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const fallbackRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  async function copy() {
    const announce = (next: "copied" | "failed") => {
      setState(next);
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setState("idle"), 2500);
    };

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        announce("copied");
        return;
      }
      const input = fallbackRef.current;
      if (input) {
        input.select();
        input.setSelectionRange(0, value.length);
        announce("copied");
        return;
      }
      announce("failed");
    } catch {
      announce("failed");
    }
  }

  return (
    <>
      <button type="button" onClick={copy} className={className}>
        {state === "copied" ? "Copied" : state === "failed" ? "Press Ctrl+C" : label}
      </button>
      <input
        ref={fallbackRef}
        readOnly
        value={value}
        tabIndex={-1}
        aria-hidden="true"
        className="visually-hidden"
      />
      <span aria-live="polite" className="visually-hidden">
        {state === "copied" ? "Link copied to clipboard" : ""}
      </span>
    </>
  );
}
