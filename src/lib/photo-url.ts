/** URL of a stored passport photo, or null. The version param busts the browser cache when it changes. */
export function photoUrl(owner: "student" | "staff", id: number, photoAt: Date | null | undefined) {
  return photoAt ? `/photo/${owner}/${id}?v=${photoAt.getTime()}` : null;
}
