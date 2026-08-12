import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <div className="card card-padded">
      <h1 className="text-2xl">Reset your password</h1>
      <p className="text-ink-500 mt-1.5 mb-6 text-sm">
        Enter the email address you signed up with and we'll send you a link to choose a new
        password.
      </p>

      <ForgotPasswordForm />

      <p className="border-cream-300 text-ink-500 mt-6 border-t pt-5 text-center text-sm">
        <Link href="/login" className="text-blush-700 font-medium hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
