import Link from "next/link";
import { requireOrganiser } from "@/lib/auth/guards";
import { renewSessionIfNeeded } from "@/lib/auth/session";
import { Wordmark } from "@/components/brand";
import { LegalFooter } from "@/components/legal-footer";
import { logoutAction } from "../(auth)/actions";

/**
 * Shell for every organiser page.
 *
 * `requireOrganiser` runs here, so every route in this group is protected by a
 * server-side check before any content renders. Individual pages and actions
 * still re-check ownership of the specific event they touch, the layout only
 * establishes *who* is asking (Spec 6.1, 8.1).
 */
export default async function OrganiserLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOrganiser();
  await renewSessionIfNeeded();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-cream-300 sticky top-0 z-30 border-b bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <Link href="/dashboard" className="rounded-lg">
            <Wordmark />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-ink-500 hidden text-sm sm:inline">{user.name}</span>
            <form action={logoutAction}>
              <button type="submit" className="btn btn-ghost btn-sm">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-7 sm:px-8 sm:py-10">{children}</main>

      <footer className="mx-auto w-full max-w-6xl px-5 pb-8 sm:px-8">
        <LegalFooter />
      </footer>
    </div>
  );
}
