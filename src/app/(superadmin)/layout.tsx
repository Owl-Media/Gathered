import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth/guards";
import { renewSessionIfNeeded } from "@/lib/auth/session";
import { BrandMark } from "@/components/brand";
import { logoutAction } from "../(auth)/actions";
import { SuperadminNav } from "./superadmin/superadmin-nav";

/**
 * Superadmin shell (Spec 6.9).
 *
 * Visually distinct from the organiser area, a cool slate ground rather than
 * warm cream, so it is immediately obvious which surface is in use.
 */
export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSuperadmin();
  await renewSessionIfNeeded();

  return (
    <div className="bg-cream-50 flex min-h-dvh flex-col">
      <header className="border-cream-300 sticky top-0 z-30 border-b bg-white/90 backdrop-blur-md">
        <div className="mx-auto w-full max-w-6xl px-5 py-3.5 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link href="/superadmin" className="flex items-center gap-2.5 rounded-lg">
              <BrandMark className="size-7" />
              <span className="font-display text-ink-900 text-lg font-semibold">
                Platform admin
              </span>
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

          <SuperadminNav />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-7 sm:px-8 sm:py-10">
        {children}
      </main>
    </div>
  );
}
