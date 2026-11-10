import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";

// Every page under /fees is restricted to Admin & Bursar.
export default async function FeesLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin", "bursar");
  const tabs = [
    ["/fees", "Overview"],
    ["/fees/record", "Record payment"],
    ["/fees/payments", "Payment history"],
    ["/fees/items", "Fee structure"],
  ];
  return (
    <>
      <div className="no-print mb-6 flex gap-1 overflow-x-auto border-b border-gray-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map(([href, label]) => (
          <Link key={href} href={href} className="-mb-px border-b-2 border-transparent px-4 py-2 text-sm font-medium whitespace-nowrap text-gray-600 hover:border-brand-500 hover:text-brand-700">
            {label}
          </Link>
        ))}
      </div>
      {children}
    </>
  );
}
