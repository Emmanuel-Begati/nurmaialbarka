import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/current";
import LoginForm from "./login-form";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  const settings = await getSettings();
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-800 to-brand-900 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-xl font-bold text-white">
            ن
          </div>
          <h1 className="text-lg font-semibold text-gray-900">{settings?.name ?? "School Admin"}</h1>
          <p className="text-sm text-gray-500">Sign in to continue</p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-gray-400">
          Staff and parents use their email. Students use their admission number.
        </p>
      </div>
    </main>
  );
}
