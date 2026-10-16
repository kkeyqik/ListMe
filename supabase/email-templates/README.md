# Supabase Auth email templates

Paste each file into Supabase → Authentication → Email Templates. Every email
carries both a 6-digit code (typed into the ListMe sign-in screen) and a link.
The links use `token_hash`, so they work even when opened on a different
device from the one that asked for the email.

| Template          | File               | Subject                              |
|-------------------|--------------------|--------------------------------------|
| Confirm signup    | confirm-signup.html | Confirm your ListMe email: {{ .Token }} |
| Magic Link        | magic-link.html     | Your ListMe sign-in code: {{ .Token }}  |
| Reset Password    | reset-password.html | Reset your ListMe password: {{ .Token }} |

Related settings (Authentication):
- Site URL: `https://listme-sable.vercel.app` (switch to the real domain at launch).
- Redirect URLs: `https://listme-sable.vercel.app/**`, `http://localhost:3000/**`.
- Email provider: "Confirm email" on, minimum password length 8, OTP length 6, OTP expiry 600 seconds.
- SMTP: custom SMTP (Brevo or Resend) sending from the ListMe domain, with SPF, DKIM and DMARC set.
