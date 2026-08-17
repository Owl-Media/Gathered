import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { LegalFooter } from "@/components/legal-footer";

/**
 * Shell for the privacy notice and the terms.
 *
 * Public and unauthenticated by design: a guest deciding whether to reply to an
 * invitation has to be able to read how their data will be handled before they
 * hand any of it over, and without signing in to anything.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="from-cream-100 to-cream-50 min-h-dvh bg-gradient-to-b">
      <header className="px-5 py-6 sm:px-8">
        <div className="mx-auto w-full max-w-3xl">
          <Link href="/" className="inline-block rounded-lg">
            <Wordmark />
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 pb-12 sm:px-8">{children}</main>

      <div className="mx-auto w-full max-w-3xl px-5 pb-10 sm:px-8">
        <LegalFooter />
      </div>
    </div>
  );
}
