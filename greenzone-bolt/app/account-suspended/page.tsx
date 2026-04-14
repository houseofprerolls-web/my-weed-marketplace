import Link from 'next/link';

export default function AccountSuspendedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center bg-background px-4 py-16 text-center text-zinc-100">
      <h1 className="text-2xl font-semibold text-white">Account suspended</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
        This account is no longer allowed to use GreenZone. If you think this is a mistake, contact support from
        the email associated with your account.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
      >
        Back to home
      </Link>
    </div>
  );
}
