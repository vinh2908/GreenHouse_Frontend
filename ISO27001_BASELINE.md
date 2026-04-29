# ISO/IEC 27001:2022 Security Baseline (Applied)

This project now follows a minimum security baseline aligned with Annex A controls:

- A.8.25 Secure development life cycle
- A.8.26 Application security requirements
- A.8.28 Secure coding
- A.8.29 Security testing in development and acceptance
- A.8.32 Change management

## Controls Applied In Code

1. Output encoding for untrusted data:
- Added HTML escaping helpers in `js/utils.js`.
- Applied escaping to chat and review rendering in `js/main.js`.
- Applied escaping in toast messages in `js/toast.js`.

2. Payment trust hardening:
- Bank checkout no longer sets `isPaid=true` from client-side only proof upload.
- Payment now records `paymentProofStatus='submitted_unverified'` until verification.
- Service-payment flow in `js/profile.js` no longer auto-confirms payment or schedules.

3. Auth/session hardening:
- Logout now clears `currentUser`, `token`, and temporary OTP session artifacts.
- Local storage parsing is now guarded in `js/config.js` to fail safely on corruption.

4. Destructive operation hardening:
- Frontend bulk reset function is disabled in `js/admin.js` (fail-closed).

5. Collision risk reduction:
- Order IDs now include timestamp + random suffix for lower collision probability.

## Risk Treatment Notes

1. OTP verification:
- Browser-only OTP verification is not compliant.
- Account registration/reset confirmation is blocked in frontend until server-side OTP verification is implemented.

2. Admin authorization:
- Any direct client write path must be protected by server authorization and strict Firestore rules.
- Client checks are convenience only; they are not security boundaries.

## Required Backend Follow-up (Mandatory)

1. Move OTP validation entirely to backend:
- `request-otp` and `verify-otp` endpoints with expiry, replay protection, and rate limits.

2. Enforce payment verification server-side:
- Only trusted backend/admin workflow can set `isPaid=true` and `status='confirmed'`.

3. Lock data access with least privilege:
- Firestore security rules for role-based read/write restrictions.
- Remove public write capability for admin collections/actions.

4. Add acceptance tests for security controls:
- Stored-XSS regression tests.
- Payment status integrity tests.
- OTP bypass tests.
