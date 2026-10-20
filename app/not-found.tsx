import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">No guide here yet</h1>
      <p className="mt-2 text-muted">This page does not exist. You can look the app up and have it researched live.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          Search for an app
        </Link>
      </div>
    </main>
  );
}
