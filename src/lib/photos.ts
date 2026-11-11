import "server-only";
import { db } from "@/lib/db";

/** "site" = images for the public website (id 1 = proprietor's photo). */
export type PhotoOwner = "student" | "staff" | "site";

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

/** Identify the image type from its first bytes. Never trust the browser-supplied type. */
function sniff(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export class PhotoError extends Error {}

/**
 * Apply the photo fields of a submitted form:
 *  - `photo` (file): a new picture replaces the old one
 *  - `removePhoto=1`: deletes the current picture
 * Does nothing when neither is present.
 */
export async function applyPhotoFromForm(owner: PhotoOwner, ownerId: number, fd: FormData) {
  const file = fd.get("photo");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_PHOTO_BYTES) throw new PhotoError("Photo is too large (max 2 MB).");
    const data = new Uint8Array(await file.arrayBuffer());
    const mime = sniff(data);
    if (!mime) throw new PhotoError("Photo must be a JPG, PNG or WebP image.");
    await db.photo.upsert({
      where: { ownerType_ownerId: { ownerType: owner, ownerId } },
      create: { ownerType: owner, ownerId, mime, data },
      update: { mime, data },
    });
    await setPhotoAt(owner, ownerId, new Date());
    return "saved" as const;
  }
  if (fd.get("removePhoto") === "1") {
    await deletePhotos(owner, [ownerId]);
    await setPhotoAt(owner, ownerId, null);
    return "removed" as const;
  }
  return null;
}

async function setPhotoAt(owner: PhotoOwner, id: number, photoAt: Date | null) {
  if (owner === "site") return; // website images use Photo.updatedAt for cache-busting
  if (owner === "student") await db.student.update({ where: { id }, data: { photoAt } });
  else await db.user.update({ where: { id }, data: { photoAt } });
}

export function deletePhotos(owner: PhotoOwner, ids: number[]) {
  return db.photo.deleteMany({ where: { ownerType: owner, ownerId: { in: ids } } });
}
