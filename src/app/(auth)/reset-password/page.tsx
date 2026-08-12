import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="card card-padded">
        <h1 className="text-2xl">Link not valid</h1>
        <p className="text-ink-500 mt-2 text-sm">
          This password reset link is incomplete. Please request a new one.
        </p>
        <Link href="/forgot-password" className="btn btn-primary btn-block mt-6">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="card card-padded">
      <h1 className="text-2xl">Choose a new password</h1>
      <p className="text-ink-500 mt-1.5 mb-6 text-sm">
        Pick something you'll remember. You'll be signed out of any other devices.
      </p>

      <ResetPasswordForm token={token} />
    </div>
  );
}
