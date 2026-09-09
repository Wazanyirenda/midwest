import Link from "next/link"

export default function NotFound() {
  return (
    <main className="flex min-h-[calc(100vh-9rem)] flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-6xl font-bold text-brand-200">404</p>
      <h1 className="mt-4 text-2xl font-bold text-sand-900">Page not found</h1>
      <p className="mt-2 text-sm text-sand-600">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Go Home
        </Link>
        <Link
          href="/products"
          className="rounded-full border border-sand-300 px-6 py-3 text-sm font-medium text-sand-700 transition-colors hover:border-brand-400 hover:text-brand-700"
        >
          Browse Products
        </Link>
      </div>
    </main>
  )
}
