const sizes = { sm: "h-9 w-9 text-xs", md: "h-14 w-14 text-base", lg: "h-28 w-28 text-2xl" };

function initials(name: string) {
  const parts = name.replace(/\b(Ustadh|Ustadha|Mallam|Mallama|Sheikh|Mr|Mrs|Miss|Dr)\b\.?/gi, "").trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

/** Passport photo, or the person's initials when no photo has been uploaded. */
export function Avatar({ src, name, size = "sm", className = "" }: { src: string | null | undefined; name: string; size?: keyof typeof sizes; className?: string }) {
  const box = `${sizes[size]} shrink-0 rounded-full ${className}`;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- private, auth-checked image route; next/image would cache it publicly
    return <img src={src} alt={name} loading="lazy" className={`${box} border border-gray-200 bg-gray-100 object-cover`} />;
  }
  return (
    <span aria-hidden className={`${box} inline-flex items-center justify-center bg-brand-100 font-semibold text-brand-700 select-none`}>
      {initials(name)}
    </span>
  );
}
