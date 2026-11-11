import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { homePathFor } from "@/lib/home";

export default async function Forbidden() {
  const user = await getCurrentUser();
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Access restricted</h1>
        <p className="mt-2 text-sm text-gray-500">Your account does not have permission to view this page.</p>
        <Link href={user ? homePathFor(user.roles) : "/login"} className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
          Go to your home page
        </Link>
      </div>
    </main>
  );
}
