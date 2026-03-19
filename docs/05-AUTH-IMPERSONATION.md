# 05 — Auth, admin login & meekijken

## Admin auth (nu)
- Middleware beschermt:
  - `/admin/*`
  - `/api/admin/*`
- Cookies:
  - `synergos_is_admin=1`
  - `synergos_admin_session=<signed token>`

`lib/auth.ts` doet signing + verify.

## User auth (nu)
- `lib/currentUser.ts` is nog MOCK (altijd admin).
- `lib/auth.ts` bevat al helpers voor `synergos_user_session` (signed).

## Impersonation (“meekijken”)
Admin kan (via UI knoppen) een cookie zetten:
- `impersonate_user_id=<id>`

`requireAdminAuth()` retourneert:
- `realUser` (kan null)
- `actAsUser` (impersonation target)
- `effectiveUser`

## v2: hoe het moet worden
1. **Één endpoint**: `GET /api/me`
   - geeft `{ user, effectiveUser, role, isImpersonating, currentUitvoeringId }`
2. Student/docent UI gebruikt alleen `/api/me` + enrollments.
3. Admin blijft cookies gebruiken, maar impersonation wordt “first class”:
   - audit logging (later)
   - duidelijke banner (bestaat al client-side)

## Minimum security afspraken v2
- Admin secrets nooit in repo
- Cookies: httpOnly + sameSite=lax + secure in production
- Geen “legacy” plain userId cookie meer zodra user sessions live zijn
