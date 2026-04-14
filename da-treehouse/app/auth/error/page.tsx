import Link from "next/link";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  const reason = params.reason ?? "unknown";

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        We couldn&apos;t finish signing you in ({reason}). Try again from the
        login or signup page.
      </p>
      <Link
        href="/login"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Back to login
      </Link>
    </div>
  );
}
