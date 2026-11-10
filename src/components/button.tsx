"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

const variants = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 border-transparent",
  secondary: "bg-white text-gray-700 hover:bg-gray-50 border-gray-300",
  danger: "bg-red-600 text-white hover:bg-red-700 border-transparent",
  ghost: "bg-transparent text-gray-600 hover:bg-gray-100 border-transparent shadow-none",
};
export type ButtonVariant = keyof typeof variants;

export const buttonClass = (variant: ButtonVariant = "primary", extra = "") =>
  `inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${extra}`;

/**
 * Submit buttons lock themselves while their form's server action is running,
 * so a double/triple click can never send the same form twice.
 */
export function Button({
  variant = "primary",
  className = "",
  pendingText = "Saving…",
  children,
  disabled,
  type = "submit",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; pendingText?: string }) {
  const { pending } = useFormStatus();
  const busy = pending && type === "submit";
  return (
    <button type={type} disabled={disabled || busy} aria-busy={busy} className={buttonClass(variant, className)} {...props}>
      {busy ? (
        <>
          <Loader2 size={15} className="animate-spin" /> {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function LinkButton({ variant = "primary", className = "", ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
