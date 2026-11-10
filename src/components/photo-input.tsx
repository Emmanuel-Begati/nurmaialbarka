"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { buttonClass } from "./button";

const MAX_SIDE = 600; // plenty for a passport photo / report card, keeps uploads ~50–150 KB
const MAX_BYTES = 2 * 1024 * 1024;

/** Shrink a picture in the browser so uploads stay small and fast on mobile data. */
async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
  if (!blob) throw new Error("resize failed");
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}

/**
 * Photo slot for a form. Submits as `photo` (file) and `removePhoto` ("1").
 * With `autoSubmit`, choosing or removing a photo saves straight away (used on profile pages).
 */
export function PhotoInput({ currentUrl, name, autoSubmit = false }: { currentUrl?: string | null; name: string; autoSubmit?: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const removeRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const { pending } = useFormStatus();
  const busy = working || (autoSubmit && pending);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const picked = input.files?.[0];
    setError("");
    if (!picked) return;
    if (!picked.type.startsWith("image/")) {
      input.value = "";
      return setError("Please choose an image file.");
    }
    setWorking(true);
    let file = picked;
    try {
      file = await shrink(picked);
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
    } catch {
      // some formats (e.g. HEIC on older browsers) can't be resized here; send the original if small enough
      if (picked.size > MAX_BYTES || !/^image\/(jpeg|png|webp)$/.test(picked.type)) {
        input.value = "";
        setWorking(false);
        return setError("That picture can't be used. Please choose a JPG or PNG under 2 MB.");
      }
    }
    if (removeRef.current) removeRef.current.value = "";
    setPreview((old) => {
      if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
    setWorking(false);
    if (autoSubmit) input.form?.requestSubmit();
  }

  function onRemove() {
    if (fileRef.current) fileRef.current.value = "";
    if (removeRef.current) removeRef.current.value = "1";
    setPreview(null);
    setError("");
    if (autoSubmit) fileRef.current?.form?.requestSubmit();
  }

  const initials = name.trim().split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-brand-50">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview / private image route
          <img src={preview} alt={`Photo of ${name}`} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-brand-700/50">{initials}</span>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Loader2 className="animate-spin text-brand-700" size={22} />
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-2">
          <label className={buttonClass("secondary", `cursor-pointer focus-within:ring-2 focus-within:ring-brand-500 ${busy ? "pointer-events-none opacity-60" : ""}`)}>
            <Camera size={15} /> {preview ? "Change photo" : "Add photo"}
            <input ref={fileRef} type="file" name="photo" accept="image/*" onChange={onPick} className="sr-only" />
          </label>
          {preview && (
            <button type="button" onClick={onRemove} disabled={busy} className={buttonClass("ghost", "text-red-600")}>
              <Trash2 size={15} /> Remove
            </button>
          )}
        </div>
        <input ref={removeRef} type="hidden" name="removePhoto" defaultValue="" />
        <p className="text-xs text-gray-500">{busy ? "Uploading…" : "Passport-style photo. Phone camera pictures are fine."}</p>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
