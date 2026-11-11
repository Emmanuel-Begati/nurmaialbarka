import Image from "next/image";

/** The school crest (public/logo.png, 311×366). Set the height with a class such as "h-10". */
export function Logo({ className = "h-10", priority = false }: { className?: string; priority?: boolean }) {
  return <Image src="/logo.png" alt="School crest" width={311} height={366} priority={priority} className={`w-auto shrink-0 ${className}`} />;
}
