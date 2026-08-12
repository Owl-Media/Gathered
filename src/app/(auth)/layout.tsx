import Link from "next/link";
import { Wordmark } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div
        aria-hidden="true"
        className="from-blush-100 via-cream-100 to-sky-50 pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br"
      />

      <header className="px-5 py-6 sm:px-8">
        <Link href="/" className="inline-block rounded-lg">
          <Wordmark />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-16 sm:px-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
