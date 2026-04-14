/** Supabase / GoTrue: sign-in blocked until email is confirmed. */
export function authErrorLooksEmailNotConfirmed(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  if (/email not confirmed|not confirmed|email address not confirmed|confirm your email|verify your email/i.test(msg)) {
    return true;
  }
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = String((err as { code?: unknown }).code ?? '');
    return code === 'email_not_confirmed';
  }
  return false;
}
