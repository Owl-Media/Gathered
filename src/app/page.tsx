import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Wordmark } from "@/components/brand";
import { LegalFooter } from "@/components/legal-footer";

/**
 * Landing page. Deliberately minimal: this platform has no public directory and
 * no browsable events (Spec 3.4, 16). Signed-in users go straight to their own
 * area.
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "superadmin" ? "/superadmin" : "/dashboard");

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div
        aria-hidden="true"
        className="from-blush-100 via-cream-100 to-sky-50 pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br"
      />

      <header className="px-5 py-6 sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <Wordmark className="whitespace-nowrap" />
          <Link href="/login" className="btn btn-ghost btn-sm hidden sm:inline-flex">
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center px-5 py-10 pb-16 sm:px-8 sm:py-14 lg:py-8">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
            <p className="text-blush-700 mb-4 text-sm font-semibold tracking-wide uppercase">
              Baby shower planning, made simple
            </p>
            <h1 className="text-5xl leading-[1.05] sm:text-6xl">
              Plan the event.{" "}
              <span className="text-blush-600 block">Skip the spreadsheet.</span>
            </h1>
            <p className="text-ink-700 mx-auto mt-6 max-w-lg text-lg leading-relaxed lg:mx-0">
              Send each guest a private invitation and keep replies, menu choices and dietary
              notes together, so you do not have to chase messages.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link href="/register" className="btn btn-primary btn-lg">
                Create your first event
              </Link>
              <Link href="/login" className="btn btn-secondary btn-lg">
                Sign in
              </Link>
            </div>

            <p className="text-ink-500 mt-7 text-sm">
              Are you a guest at an event? Use the private link in your invitation.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-xl" aria-hidden="true">
            <div className="bg-butter-100 absolute -top-5 -right-5 size-28 rounded-full opacity-70 blur-2xl" />
            <div className="bg-sky-100 absolute -bottom-6 -left-6 size-36 rounded-full opacity-80 blur-2xl" />
            <div className="border-cream-300 shadow-lift relative overflow-hidden rounded-[2.5rem] border bg-white p-2 sm:p-3">
              <Image
                src="/images/home-invitations-v2.webp"
                alt=""
                width={1200}
                height={1200}
                priority
                sizes="(min-width: 1024px) 520px, (min-width: 640px) 560px, calc(100vw - 40px)"
                className="h-auto w-full rounded-[2rem]"
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="flex flex-col items-center gap-2 px-5 pb-6 sm:px-8">
        <p className="text-ink-400 text-xs lg:hidden">Private invitations. No public guest lists.</p>
        <LegalFooter />
      </footer>
    </div>
  );
}
