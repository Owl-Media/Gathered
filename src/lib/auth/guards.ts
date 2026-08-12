import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@/db/schema";
import { getCurrentUser } from "./session";

/**
 * Authorisation guards (Spec 6.1, 8.1).
 *
 * Every protected page and Server Action calls one of these. Access control is
 * enforced here on the server. Route hiding in the UI is presentation only and
 * is never relied upon (Spec 19).
 */

/** Requires any signed-in, non-disabled account. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Requires an organiser. Superadmins are deliberately rejected: they may not
 * create or edit events, and must not act through organiser surfaces
 * (Spec 6.9, 7, "Impersonate users: No" for every role).
 */
export async function requireOrganiser(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "organiser") redirect("/superadmin");
  return user;
}

export async function requireSuperadmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "superadmin") redirect("/dashboard");
  return user;
}

/**
 * Server Action variant of {@link requireOrganiser}. Throws instead of
 * redirecting so the caller can return a typed error to the form.
 */
export class AuthorisationError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "AuthorisationError";
  }
}

export async function requireOrganiserForAction(): Promise<User> {
  const user = await getCurrentUser();
  if (!user || user.role !== "organiser") {
    throw new AuthorisationError("You must be signed in as an organiser to do that.");
  }
  return user;
}

export async function requireSuperadminForAction(): Promise<User> {
  const user = await getCurrentUser();
  if (!user || user.role !== "superadmin") {
    throw new AuthorisationError("You must be signed in as a superadmin to do that.");
  }
  return user;
}
