# AI context: CBS Certificate Portal

This is the quick-start map for AI coding assistants. For exact behavior, inspect the linked source files; these notes are a navigation aid and can become stale as the app changes.

## Read by task

| Task | Read |
|---|---|
| Overall structure and runtime layers | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| Follow a value from UI to database or back | [docs/DATA_FLOW.md](./docs/DATA_FLOW.md) |
| Understand validation, eligibility, and access conditions | [docs/BUSINESS_RULES.md](./docs/BUSINESS_RULES.md) |
| Understand records, keys, and browser storage | [docs/DATA_MODEL.md](./docs/DATA_MODEL.md) |
| Find every API endpoint and known caller | [Documentation.html](./Documentation.html) |

## Stack and conventions

- Next.js App Router, React, TypeScript, MongoDB/Mongoose, TanStack Query, Zod.
- Route handlers are in `app/api/**/route.ts`; pages are in `app/**/page.tsx`.
- Feature clients are grouped under `features/`; shared fetch/envelope behavior is in `lib/api-client.ts` and `lib/api-response.ts`.
- Most APIs return `{ Code, Content, Count, Message, Status }`. The template route returns image bytes.
- Public registration and certificate lookup are unauthenticated flows. Admin and organizer operations use distinct sessions and authorization checks.
- Do not widen public API data unnecessarily. The certificate lookup intentionally projects minimal public DTOs.

## Domain map

- Events/workshops define registration status, custom questions, certificate layout/template, and local-attendance event permission.
- Users are CBS profiles; participants represent enrollment in a specific workshop and hold participant ID, attendance, and event answers.
- Organizers have assignments and their own local-attendance permission.
- Admin and organizer sessions are persisted with token hashes and expiry; browser storage values are markers, not credentials.
- Organizer attendance can be drafted in localStorage and pushed in a batch, subject to both permission flags and server-side checks.
- Certificate eligibility for participants uses completed-event and attendance flags; organizer certificates use organizer identity/assignment checks.

## Important implementation locations

- Models: `models/User.ts`, `models/Participant.ts`, `models/Workshop.ts`, `models/Organizer.ts`, session/sequence models nearby.
- Validation: `lib/validation/schemas.ts`, `lib/userRegistrationValidation.ts`, `lib/matrixRegistration.ts`.
- Session/auth: `lib/adminSession.ts`, `lib/adminApi.ts`, `lib/organizerAuth.ts`, `lib/organizerApi.ts`.
- Registration: `components/EventRegistrationForm.tsx`, `features/events/api.ts`, `app/api/events/`.
- Attendance: `app/organizer/page.tsx`, `features/organizers/api.ts`, `app/api/organizer/attendance/`.
- Collected answers: `app/admin/workshops/collected-data/page.tsx`, `app/api/admin/workshops/details/route.ts`.
- Certificates: `app/api/certificates/lookup/route.ts`, `components/CertificatePreview.tsx`, `components/VerifyPanel.tsx`, `lib/generateCertificate.ts`, `lib/renderCertificatePng.ts`.

## Safe editing checklist

1. Trace the caller and the route; do not assume the UI is the only caller.
2. Check schema validation, auth wrapper, and model constraints.
3. Check whether the value is global user profile data or event-specific participant data.
4. Preserve current API envelope and error behavior.
5. Enforce permissions/eligibility on the server and keep client feedback consistent.
6. Update the relevant topic docs if behavior changes.
7. Run targeted typecheck/lint/tests or build as appropriate.
