import { getSiteUrl } from '@/lib/siteUrl';

/** Public origin for auth links (reset password, hints). Prefer NEXT_PUBLIC_SITE_URL in production. */
export function authPublicOriginBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv && /^https?:\/\//i.test(fromEnv)) {
    return fromEnv.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/$/, '');
  }
  return getSiteUrl().replace(/\/$/, '');
}

/**
 * When set, passed to `signUp` as `emailRedirectTo` (must exactly match Supabase Redirect URLs).
 * Leave unset so Supabase uses the project Site URL for confirmation links (fewer mismatches).
 */
export function optionalSupabaseAuthRedirectTo(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_AUTH_REDIRECT_URL?.trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return undefined;
  return `${raw.replace(/\/$/, '')}/`;
}

/** Pull message + optional GoTrue `code` from AuthApiError and similar shapes. */
function extractAuthErr(err: unknown): { msg: string; code?: string } {
  if (typeof err === 'object' && err !== null) {
    const o = err as Record<string, unknown>;
    const code = typeof o.code === 'string' ? o.code : undefined;
    if (err instanceof Error) {
      return { msg: (err.message || '').trim(), code };
    }
    const fromFields = [o.message, o.msg, o.error_description, o.error]
      .map((x) => (typeof x === 'string' ? x.trim() : ''))
      .find(Boolean);
    if (fromFields) return { msg: fromFields, code };
    return { msg: '', code };
  }
  const s = String(err ?? '').trim();
  return { msg: s };
}

/**
 * Maps Supabase Auth (and related) errors to copy that explains likely fixes.
 */
export function authErrorToastContent(err: unknown): { title: string; description: string } {
  const { msg: rawMsg, code } = extractAuthErr(err);
  const msg = rawMsg || (code ? `(${code})` : '');
  const lower = msg.toLowerCase();

  if (!msg) {
    return {
      title: 'Something went wrong',
      description:
        'The server did not return details. In your browser, open DevTools → Network, retry the action, and inspect the response for `/auth/v1/signup` or `/auth/v1/resend`.',
    };
  }

  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') {
    return {
      title: 'Too many emails sent',
      description:
        'Supabase limits how often confirmation emails go out. Wait a few minutes and try again, or check Supabase → Authentication → Rate limits.',
    };
  }

  if (code === 'captcha_failed') {
    return {
      title: 'Captcha check failed',
      description:
        'Turn off “Bot and abuse protection / captcha” for this flow in Supabase Authentication settings, or ensure the site loads the captcha widget if you enabled it.',
    };
  }

  if (code === 'user_not_found') {
    return {
      title: 'Could not resend confirmation',
      description:
        'No unconfirmed account matches that email or username. Use the exact address you signed up with, or create a new account if you never finished sign-up.',
    };
  }

  if (
    code === 'hook_timeout' ||
    code === 'hook_timeout_after_retry' ||
    lower.includes('hook') ||
    lower.includes('send email hook')
  ) {
    return {
      title: 'Email hook or SMTP failed',
      description:
        'Supabase could not finish sending mail (custom hook or SMTP). In Supabase → Authentication: check Send Email Hook logs, or Project Settings → Auth → SMTP. Details: ' +
        msg,
    };
  }

  if (code === 'email_address_invalid' || code === 'email_address_not_authorized') {
    return {
      title: 'Email not accepted',
      description:
        code === 'email_address_not_authorized'
          ? 'This address is not allowed to sign up on this project (Supabase Auth allow / deny list).'
          : 'That email address looks invalid to Supabase. Check for typos.',
    };
  }

  if (code === 'signup_disabled' || code === 'email_provider_disabled') {
    return {
      title: 'Sign-up email disabled',
      description:
        'Email sign-ups are turned off for this Supabase project, or the email provider is disabled. Enable them under Authentication → Providers.',
    };
  }

  if (lower.includes('no account found for that username')) {
    return {
      title: 'Username not found',
      description: 'There is no account with that username. Try your email instead, or sign up.',
    };
  }

  if (
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('email rate limit')
  ) {
    return {
      title: 'Too many requests',
      description: 'Wait a minute and try again. Supabase limits confirmation and auth emails.',
    };
  }

  if (
    lower.includes('535') ||
    lower.includes('smtp') ||
    lower.includes('mail delivery') ||
    lower.includes('message rejected')
  ) {
    return {
      title: 'Mail server rejected the send',
      description:
        'Custom SMTP credentials in Supabase are wrong or the provider blocked the send. Fix SMTP under Project Settings → Auth, or switch back to Supabase’s built-in mail for testing. Details: ' +
        msg,
    };
  }

  if (lower.includes('confirmation email') || lower.includes('error sending')) {
    const origin = typeof window !== 'undefined' ? `${window.location.origin}/` : '';
    return {
      title: 'Could not send confirmation email',
      description: origin
        ? `Supabase could not send the link. In the Supabase dashboard → Authentication → URL Configuration: set Site URL to your live site, add ${origin} under Redirect URLs (trailing slash), and check Authentication → Emails / SMTP. (${msg})`
        : `Supabase could not send the link. Check Authentication → URL Configuration (Site URL + Redirect URLs) and Emails / SMTP. (${msg})`,
    };
  }

  if (
    (lower.includes('redirect') && lower.includes('url')) ||
    lower.includes('invalid redirect') ||
    lower.includes('redirect_uri')
  ) {
    const hint = typeof window !== 'undefined' ? `${window.location.origin}/` : `${getSiteUrl()}/`;
    return {
      title: 'Redirect URL not allowed',
      description: `Add ${hint} to Supabase → Authentication → URL Configuration → Redirect URLs (or set NEXT_PUBLIC_SITE_URL to your production origin). (${msg})`,
    };
  }

  if (lower.includes('already registered') || lower.includes('user already exists')) {
    return {
      title: 'Account already exists',
      description: 'Try signing in instead, or use Forgot password if you do not remember it.',
    };
  }

  if (
    lower.includes('email not confirmed') ||
    lower.includes('not confirmed') ||
    lower.includes('email address not confirmed')
  ) {
    return {
      title: 'Confirm your email',
      description:
        'This account is not verified yet. Check your inbox and spam for the confirmation link, or tap “Resend confirmation email” on the sign-in screen.',
    };
  }

  if (
    lower.includes('invalid login') ||
    lower.includes('invalid credentials') ||
    lower.includes('invalid email or password')
  ) {
    return {
      title: 'Sign-in failed',
      description: 'Check your email or username and password, then try again.',
    };
  }

  return {
    title: 'Something went wrong',
    description: msg,
  };
}
