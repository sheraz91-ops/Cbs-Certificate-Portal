# Application data flows

This document follows important values between page, client, route, validation, and persistence. The implementation is authoritative; use the listed source locations to confirm current behavior.

## Public event registration

1. The public registration page loads open event choices through `GET /api/events`, or a pinned event through `GET /api/events/[eventCode]`.
2. `components/EventRegistrationForm.tsx` loads global profile form configuration through `GET /api/user-registration-form`.
3. The selected event contains event-specific `registrationFields`; the global profile form contains profile fields. These are distinct configurations.
4. The client validates profile values with `lib/userRegistrationValidation.ts` and matrix answers with `lib/matrixRegistration.ts`.
5. Registration submits through `features/events/api.ts` to `POST /api/events/register`. The server checks event status and repeats validation using schemas in `lib/validation/schemas.ts` plus domain validation helpers.
6. For a new account, the server allocates a CBS user ID using `models/UserSequence.ts` support and creates a `User`. It allocates a separate event participant ID and creates a `Participant`.
7. Global profile custom answers are stored on the user (`profileCustomFields`). Event-specific answers are stored on the participant (`customFields`).
8. If the submitted identity matches an existing account, registration is not silently attached to it. The flow prompts for account verification; `POST /api/events/account` accepts a matching saved email **or** phone before continuation.

Relevant implementation: `components/EventRegistrationForm.tsx`, `features/events/api.ts`, `app/api/events/register/route.ts`, `app/api/events/account/route.ts`, `lib/userRegistrationValidation.ts`, `lib/matrixRegistration.ts`, `lib/participantSequence.ts`.

## User ID storage in registration UI

- The browser may store `localStorage["cbs_user_id"]` with only the numeric suffix.
- On load, the registration component normalizes a valid numeric/CBSU form and removes malformed values.
- This value is only a UX shortcut for the returning-participant flow. It is not proof of ownership; the server requires account verification.

Relevant implementation: `components/EventRegistrationForm.tsx`.

## Admin-created users, workshops, and enrollments

- Admin UI pages call grouped wrappers under `features/admin/api.ts`, `features/users/api.ts`, `features/workshops/api.ts`, and `features/participants/api.ts`.
- The corresponding `/api/admin/**` route validates the payload and requires a valid admin session.
- User profile records live in `User`. Enrollment is a separate `Participant` record keyed to the workshop and user.
- `POST /api/admin/users/enroll` attaches an existing user to an event and initializes attendance to false.
- Workshop creation/update persists event question configuration, attendance permission, certificate layout, and template fields in `Workshop`.

Relevant implementation: `app/admin/`, `features/`, `app/api/admin/`, `models/User.ts`, `models/Participant.ts`, `models/Workshop.ts`.

## Organizer attendance: online and local

### Online update

1. The organizer page checks its session and loads assigned events and their participants.
2. A single attendance change calls `POST /api/organizer/attendance/update`.
3. The server verifies the session, event assignment/status and participant before writing `Participant.attendance`.

### Local draft and push

1. The UI offers local attendance only when `Workshop.allowLocalAttendance === true` **and** `Organizer.allowLocalAttendance === true`.
2. Draft values are stored under `localStorage["organizer-attendance:<event-key>"]` as participant IDs mapped to booleans.
3. The organizer page overlays local drafts over server values. Draft entries equal to current server values are no longer pending changes.
4. Push submits `{ workshop, attendance: [{ participantId, present }] }` to `POST /api/organizer/attendance/sync`.
5. The server rechecks session, assignment, both local-permission flags, event completion state, unique participant IDs, and that the requested participants exist before performing the bulk write.
6. The client batches very large submissions (maximum 5,000 records per request). Successful sync clears the local queue for the event; a failed sync keeps it available for retry.

Relevant implementation: `app/organizer/page.tsx`, `features/organizers/api.ts`, `app/api/organizer/attendance/update/route.ts`, `app/api/organizer/attendance/sync/route.ts`, `models/Workshop.ts`, `models/Organizer.ts`.

## Admin collected event answers

1. The admin page requests authenticated event details from `POST /api/admin/workshops/details`.
2. The route includes each event's question definitions and participants' event-specific `customFields`; it excludes the certificate template image data.
3. `app/admin/workshops/collected-data/page.tsx` matches answer keys to event questions, builds answer summaries, and displays a participant-by-question table.
4. Yes/no, checkbox, and text values get summary counts. Matrix answers are shown per participant/question and do not receive an aggregate matrix statistic in this view.
5. Global profile answers on `User.profileCustomFields` are a separate data set and are not this report's answer source.

Relevant implementation: `app/admin/workshops/collected-data/page.tsx`, `app/api/admin/workshops/details/route.ts`, `models/Participant.ts`, `models/User.ts`.

## Certificate lookup, rendering, and verification

1. Lookup clients call `POST /api/certificates/lookup` with an ID and optional event key.
2. Numeric IDs are first interpreted as CBS user ID suffixes. If no account enrollment resolves and the input is numeric, lookup can continue as a participant-number search.
3. A bare participant number that matches multiple eligible events returns a candidate list; an event key/code scopes lookup.
4. A participant certificate is eligible only when the event is completed and participant attendance is true.
5. The route projects internal records to the minimum public response DTO. It does not serialize complete participant or workshop documents.
6. Preview/render code obtains the template, applies the event layout, and draws name, formatted certificate ID, and a QR code. PDF and PNG generation occurs in certificate rendering helpers.
7. The QR code opens the verification route, which repeats lookup rather than trusting the displayed certificate alone.

Relevant implementation: `app/api/certificates/lookup/route.ts`, `features/certificates/api.ts`, `components/CertificateForm.tsx`, `components/CertificatePreview.tsx`, `components/VerifyPanel.tsx`, `lib/generateCertificate.ts`, `lib/renderCertificatePng.ts`, `lib/qrcode.ts`, `app/api/templates/[key]/route.ts`.

## Session flow

- Admin login establishes an HttpOnly admin cookie and a database session with an expiry. Logout revokes/clears it. Admin API wrappers validate same-origin request provenance and session state.
- Organizer login similarly establishes an HttpOnly organizer cookie and expiring session. Organizer API wrappers validate the session and active organizer status.
- Session token hashes, not raw tokens, are stored in MongoDB. `sessionStorage` markers are for client UI state only.
- Browser keeps no admin or organizer password as session material.

Relevant implementation: `lib/adminSession.ts`, `lib/adminApi.ts`, `lib/organizerAuth.ts`, `lib/organizerApi.ts`, `models/AdminSession.ts`, `models/OrganizerSession.ts`.
