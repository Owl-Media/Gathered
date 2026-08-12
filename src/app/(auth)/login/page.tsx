import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "superadmin" ? "/superadmin" : "/dashboard");

  const { reset } = await searchParams;

  return (
    <div className="card card-padded">
      <h1 className="text-2xl">Welcome back</h1>
      <p className="text-ink-500 mt-1.5 mb-6 text-sm">
        Sign in to manage your events and see who's coming.
      </p>

      {reset === "1" && (
        <div className="notice notice-success mb-5" role="status">
          Your password has been changed. Please sign in with your new password.
        </div>
      )}

      <LoginForm />

      <p className="border-cream-300 text-ink-500 mt-6 border-t pt-5 text-center text-sm">
        Don't have an account?{" "}
        <Link href="/register" className="text-blush-700 font-medium hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
