# TODO

This file tracks active implementation tasks that are not yet fully captured in the main architecture or roadmap documents.

## Authentication Rework For Web Frontend

### Status

Implemented in the current backend and frontend contract shell.

### Delivered backend scope

- password-based `POST /auth/register`
- password-based `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /auth/google/url`
- `POST /auth/google`
- `POST /auth/telegram/login` for Telegram Login Widget
- `POST /auth/telegram` and `POST /auth/telegram/miniapp` for Mini App auth
- refresh-session persistence and rotation in `user_sessions`
- provider identity linking through `auth_identities`
- password hashes stored in `password_credentials`

### Delivered frontend contract scope

- auth entry route updated for browser auth plus Mini App preference
- dedicated login route added
- registration route updated to a real email/password contract
- Mini App detection helpers added in `apps/web/lib/auth.ts` and `apps/web/lib/telegram.ts`
- auth mock contracts updated to reflect the new backend session shape

### Remaining follow-up

- wire the Next.js frontend to call the live auth endpoints instead of mock contract data
- add production callback/redirect UX around Google sign-in
- add end-user KYC transport when that workflow is ready
- expose admin user-role management in the admin panel after bootstrap admin creation
