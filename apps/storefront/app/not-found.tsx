import Link from "next/link"

export default function NotFound() {
  return (
    <main className="flex min-h-[calc(100vh-9rem)] flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-bold text-brand-200">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-gray-900">Page not found</h1>
      <p className="mt-2 text-gray-500">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/"
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          Go Home
        </Link>
        <Link
          href="/products"
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Browse Products
        </Link>
      </div>
    </main>
  )
}
