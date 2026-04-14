# DaTreehouse — Supabase auth email subjects & bodies

Paste each **Subject** and **Message body** into **Supabase Dashboard → Authentication → Email templates** (or your self-hosted mailer config).  
Variables use [Supabase’s auth email template fields](https://supabase.com/docs/guides/auth/auth-email-templates).

Site name in copy: **DaTreehouse**. Your **Site URL** in Auth settings should be production (e.g. `https://datreehouse.com`); `{{ .SiteURL }}` reflects that.

**Important:** Do not remove the real confirmation/reset links. Use `{{ .ConfirmationURL }}` (or the equivalent link Supabase shows in the editor) so verification still works.

---

## 1. Confirm sign up

**Subject:** `Confirm your DaTreehouse account`

**Body:**

```html
<h2 style="margin:0 0 12px;font-family:system-ui,sans-serif;color:#111;">Welcome to DaTreehouse</h2>
<p style="margin:0 0 16px;font-family:system-ui,sans-serif;color:#444;line-height:1.5;">
  Thanks for signing up{{ if .Email }} at <strong>{{ .Email }}</strong>{{ end }}. Tap the button below to verify your email and finish creating your account.
</p>
<p style="margin:24px 0;">
  <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 20px;background:#b91c1c;color:#fff;text-decoration:none;border-radius:8px;font-family:system-ui,sans-serif;font-weight:600;">
    Confirm email
  </a>
</p>
<p style="margin:16px 0 0;font-size:13px;font-family:system-ui,sans-serif;color:#666;">
  Or paste this link in your browser:<br />
  <span style="word-break:break-all;">{{ .ConfirmationURL }}</span>
</p>
<p style="margin:24px 0 0;font-size:12px;font-family:system-ui,sans-serif;color:#888;">
  If you did not create an account, you can ignore this message.
</p>
```

---

## 2. Invite user

**Subject:** `You’re invited to DaTreehouse`

**Body:**

```html
<h2 style="margin:0 0 12px;font-family:system-ui,sans-serif;color:#111;">You’re invited</h2>
<p style="margin:0 0 16px;font-family:system-ui,sans-serif;color:#444;line-height:1.5;">
  You’ve been invited to join <strong>DaTreehouse</strong>{{ if .SiteURL }} on <strong>{{ .SiteURL }}</strong>{{ end }}. Accept the invite to set your password and get started.
</p>
<p style="margin:24px 0;">
  <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 20px;background:#b91c1c;color:#fff;text-decoration:none;border-radius:8px;font-family:system-ui,sans-serif;font-weight:600;">
    Accept invite
  </a>
</p>
<p style="margin:16px 0 0;font-size:13px;font-family:system-ui,sans-serif;color:#666;word-break:break-all;">{{ .ConfirmationURL }}</p>
```

---

## 3. Magic link

**Subject:** `Your DaTreehouse sign-in link`

**Body:**

```html
<h2 style="margin:0 0 12px;font-family:system-ui,sans-serif;color:#111;">Sign in to DaTreehouse</h2>
<p style="margin:0 0 16px;font-family:system-ui,sans-serif;color:#444;line-height:1.5;">
  Use the button below to sign in{{ if .Email }} as <strong>{{ .Email }}</strong>{{ end }}. This link expires soon for your security.
</p>
<p style="margin:24px 0;">
  <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 20px;background:#b91c1c;color:#fff;text-decoration:none;border-radius:8px;font-family:system-ui,sans-serif;font-weight:600;">
    Sign in
  </a>
</p>
<p style="margin:16px 0 0;font-size:13px;font-family:system-ui,sans-serif;color:#666;word-break:break-all;">{{ .ConfirmationURL }}</p>
<p style="margin:24px 0 0;font-size:12px;font-family:system-ui,sans-serif;color:#888;">
  If you didn’t request this email, you can ignore it.
</p>
```

---

## 4. Change email address

**Subject:** `Confirm your new email for DaTreehouse`

**Body:**

```html
<h2 style="margin:0 0 12px;font-family:system-ui,sans-serif;color:#111;">Confirm email change</h2>
<p style="margin:0 0 16px;font-family:system-ui,sans-serif;color:#444;line-height:1.5;">
  {{ if .NewEmail }}You asked to use <strong>{{ .NewEmail }}</strong> on DaTreehouse.{{ else }}You asked to change the email on your DaTreehouse account.{{ end }}
  Confirm the update with the button below.
</p>
<p style="margin:24px 0;">
  <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 20px;background:#b91c1c;color:#fff;text-decoration:none;border-radius:8px;font-family:system-ui,sans-serif;font-weight:600;">
    Confirm new email
  </a>
</p>
<p style="margin:16px 0 0;font-size:13px;font-family:system-ui,sans-serif;color:#666;word-break:break-all;">{{ .ConfirmationURL }}</p>
```

---

## 5. Reset password

**Subject:** `Reset your DaTreehouse password`

**Body:**

```html
<h2 style="margin:0 0 12px;font-family:system-ui,sans-serif;color:#111;">Password reset</h2>
<p style="margin:0 0 16px;font-family:system-ui,sans-serif;color:#444;line-height:1.5;">
  We received a request to reset the password{{ if .Email }} for <strong>{{ .Email }}</strong>{{ end }}. Choose a new password using the button below.
</p>
<p style="margin:24px 0;">
  <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 20px;background:#b91c1c;color:#fff;text-decoration:none;border-radius:8px;font-family:system-ui,sans-serif;font-weight:600;">
    Reset password
  </a>
</p>
<p style="margin:16px 0 0;font-size:13px;font-family:system-ui,sans-serif;color:#666;word-break:break-all;">{{ .ConfirmationURL }}</p>
<p style="margin:24px 0 0;font-size:12px;font-family:system-ui,sans-serif;color:#888;">
  If you didn’t request a reset, ignore this email—your password will stay the same.
</p>
```

---

## 6. Reauthentication

**Subject:** `DaTreehouse security code`

**Body:**

```html
<h2 style="margin:0 0 12px;font-family:system-ui,sans-serif;color:#111;">Confirm it’s you</h2>
<p style="margin:0 0 16px;font-family:system-ui,sans-serif;color:#444;line-height:1.5;">
  DaTreehouse needs a quick check before a sensitive change. Enter this code where prompted:
</p>
<p style="margin:16px 0;font-size:28px;font-weight:700;letter-spacing:4px;font-family:ui-monospace,monospace;color:#111;">
  {{ .Token }}
</p>
<p style="margin:16px 0 0;font-size:12px;font-family:system-ui,sans-serif;color:#888;">
  This code expires soon. If you didn’t start this, secure your account and contact support.
</p>
```

*(If your project’s reauthentication template expects a link instead of OTP, keep the default link and add a sentence above it—see Supabase docs for your version.)*

---

## 7. Password changed (security notification)

**Subject:** `Your DaTreehouse password was changed`

**Body:**

```html
<h2 style="margin:0 0 12px;font-family:system-ui,sans-serif;color:#111;">Password updated</h2>
<p style="margin:0 0 12px;font-family:system-ui,sans-serif;color:#444;line-height:1.5;">
  This is a confirmation that the password for <strong>{{ .Email }}</strong> on DaTreehouse was just changed.
</p>
<p style="margin:0;font-size:13px;font-family:system-ui,sans-serif;color:#666;">
  If you didn’t make this change, reset your password and contact support immediately.
</p>
```

---

## 8. Email address changed (security notification)

**Subject:** `Your DaTreehouse email was updated`

**Body:**

```html
<h2 style="margin:0 0 12px;font-family:system-ui,sans-serif;color:#111;">Email address changed</h2>
<p style="margin:0 0 12px;font-family:system-ui,sans-serif;color:#444;line-height:1.5;">
  The sign-in email for your DaTreehouse account was updated from <strong>{{ .OldEmail }}</strong> to <strong>{{ .Email }}</strong>.
</p>
<p style="margin:0;font-size:13px;font-family:system-ui,sans-serif;color:#666;">
  If you didn’t request this, contact support right away.
</p>
```

---

## 9. Phone number changed (security notification)

**Subject:** `Your DaTreehouse phone number was updated`

**Body:**

```html
<h2 style="margin:0 0 12px;font-family:system-ui,sans-serif;color:#111;">Phone number changed</h2>
<p style="margin:0 0 12px;font-family:system-ui,sans-serif;color:#444;line-height:1.5;">
  The phone on file for <strong>{{ .Email }}</strong> was changed from <strong>{{ .OldPhone }}</strong> to <strong>{{ .Phone }}</strong>.
</p>
<p style="margin:0;font-size:13px;font-family:system-ui,sans-serif;color:#666;">
  If this wasn’t you, secure your account and contact support.
</p>
```

---

## 10. Identity linked (security notification)

**Subject:** `A sign-in method was linked to DaTreehouse`

**Body:**

```html
<h2 style="margin:0 0 12px;font-family:system-ui,sans-serif;color:#111;">New sign-in method</h2>
<p style="margin:0 0 12px;font-family:system-ui,sans-serif;color:#444;line-height:1.5;">
  A new identity (<strong>{{ .Provider }}</strong>) was linked to your DaTreehouse account <strong>{{ .Email }}</strong>.
</p>
<p style="margin:0;font-size:13px;font-family:system-ui,sans-serif;color:#666;">
  If you didn’t add this, remove it in account settings or contact support.
</p>
```

---

## 11. Identity unlinked (security notification)

**Subject:** `A sign-in method was removed from DaTreehouse`

**Body:**

```html
<h2 style="margin:0 0 12px;font-family:system-ui,sans-serif;color:#111;">Sign-in method removed</h2>
<p style="margin:0 0 12px;font-family:system-ui,sans-serif;color:#444;line-height:1.5;">
  The identity <strong>{{ .Provider }}</strong> was unlinked from <strong>{{ .Email }}</strong> on DaTreehouse.
</p>
<p style="margin:0;font-size:13px;font-family:system-ui,sans-serif;color:#666;">
  If you didn’t remove this, secure your account and contact support.
</p>
```

---

## 12. MFA method added (security notification)

**Subject:** `Two-step verification added on DaTreehouse`

**Body:**

```html
<h2 style="margin:0 0 12px;font-family:system-ui,sans-serif;color:#111;">New two-step method</h2>
<p style="margin:0 0 12px;font-family:system-ui,sans-serif;color:#444;line-height:1.5;">
  A new two-step verification method (<strong>{{ .FactorType }}</strong>) was added for <strong>{{ .Email }}</strong>.
</p>
<p style="margin:0;font-size:13px;font-family:system-ui,sans-serif;color:#666;">
  If this wasn’t you, remove the factor in security settings or contact support.
</p>
```

---

## 13. MFA method removed (security notification)

**Subject:** `Two-step verification removed on DaTreehouse`

**Body:**

```html
<h2 style="margin:0 0 12px;font-family:system-ui,sans-serif;color:#111;">Two-step method removed</h2>
<p style="margin:0 0 12px;font-family:system-ui,sans-serif;color:#444;line-height:1.5;">
  A two-step method (<strong>{{ .FactorType }}</strong>) was removed from <strong>{{ .Email }}</strong>.
</p>
<p style="margin:0;font-size:13px;font-family:system-ui,sans-serif;color:#666;">
  If you didn’t remove this, secure your account and contact support.
</p>
```

---

## Security toggles

Security emails (password changed, email changed, etc.) only send if you enable each notification under **Authentication** (or project auth config). Enable the ones you want so the templates above are actually used.

---

## Optional: OTP instead of a single click (signup)

Some providers prefetch links and burn the token. If you switch signup to **email OTP**, include `{{ .Token }}` in the confirm-signup template and verify with `verifyOtp` in your app—see [Supabase email template docs](https://supabase.com/docs/guides/auth/auth-email-templates#email-prefetching).
