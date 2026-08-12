import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create an account" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "superadmin" ? "/superadmin" : "/dashboard");

  return (
    <div className="card card-padded">
      <h1 className="text-2xl">Create your Gathered account</h1>
      <p className="text-ink-500 mt-1.5 mb-6 text-sm">
        Plan a baby shower, invite your guests, and keep every reply in one place.
      </p>

      <RegisterForm />

      <p className="border-cream-300 text-ink-500 mt-6 border-t pt-5 text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-blush-700 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
