# Business rules and conditions

This file records conditions enforced by the current application code. A UI control being hidden is not itself a security rule; server-side route checks are the effective boundary.

## Registration availability

- The public event list hides events that are inactive or completed.
- A direct/pinned event lookup may still resolve an event that is closed, but it marks it inactive for registration.
- The registration route rejects registration when the event is inactive or completed.
- Event dates do not automatically complete an event. Completion is controlled by the stored `isCompleted` state.

Source: `app/api/events/route.ts`, `app/api/events/[eventCode]/route.ts`, `app/api/events/register/route.ts`, `models/Workshop.ts`.

## User and event registration values

- Full name is required.
- Public profile validation requires email, name, registration number, department, semester, section, institute, and WhatsApp number when those profile fields are part of the active registration configuration.
- Email is normalized to lowercase. A campus registration number must match `YYYY-uam-RRRR` and is normalized to lowercase when campus-specific validation applies.
- Semester values are `1` through `8` or `Graduated`; section values are `A` through `F`.
- WhatsApp input permits common phone punctuation but must contain 7–15 digits.
- Campus-only events require a valid campus registration number even if the event form omitted it or marked the field optional.
- A user with an identity match must verify account ownership using either the saved email or saved phone before enrolling as that account.
- Custom event answer values must fit configured question keys/types/options; unknown answer keys and invalid choices are rejected by server validation.
- User profile custom answers and event-specific answers are stored separately.

Source: `lib/validation/schemas.ts`, `lib/userRegistrationValidation.ts`, `lib/matrixRegistration.ts`, `app/api/events/register/route.ts`, `app/api/events/account/route.ts`.

## Registration form configuration

- Field IDs must be unique. The full-name field must remain visible and required.
- Built-in profile fields cannot be assigned custom choices/rows or a non-text question type.
- Choices are supported for checkbox/matrix types as validated by the schema; options must be unique case-insensitively.
- Matrix fields require at least one row and one choice; row labels must be unique.
- Rows are only valid for matrix questions. Question/choice/row counts and label lengths are bounded by the schema.

Source: `lib/validation/schemas.ts`, `models/UserRegistrationForm.ts`, `models/Workshop.ts`.

## IDs and uniqueness

- CBS user IDs are assigned from a sequence and formatted with a `CBSU-` prefix plus a numeric suffix padded to at least six digits.
- Participant IDs are assigned independently per workshop; formatted certificate IDs combine workshop/org information and participant number.
- A user may have one enrollment per event, enforced with an enrollment key/index.
- Participant IDs must be unique within a workshop; normalized IDs are indexed for lookup.

Source: `lib/participantSequence.ts`, `lib/formatId.ts`, `models/UserSequence.ts`, `models/ParticipantSequence.ts`, `models/Participant.ts`.

## Certificate eligibility and lookup

- Participant certificates require both `Workshop.isCompleted === true` and `Participant.attendance === true`.
- Incomplete events and missing attendance are reported as distinct lookup statuses.
- Organizer certificates require an active organizer, matching organizer identity, assignment to the selected event, and a completed event.
- A numeric lookup is first treated as a user ID suffix; when no matching account registration resolves, it may be searched as a participant number.
- Bare participant numbers can match multiple events; callers can supply an event key/code to disambiguate.
- Public lookup responses are explicitly projected; do not return entire MongoDB documents or unrelated registration/permission fields.

Source: `app/api/certificates/lookup/route.ts`, `app/api/certificates/organizer/assigned-events/route.ts`, `app/api/certificates/organizer/generate/route.ts`, `types/index.ts`, `types/workshop.ts`.

## Organizer access and attendance

- Organizer accounts must be active to authenticate/use protected organizer operations.
- An organizer may manage only assigned event keys.
- Local attendance requires **both** `Workshop.allowLocalAttendance === true` and `Organizer.allowLocalAttendance === true`.
- The local attendance sync route rechecks event assignment, both permission flags, and that the event is not completed; UI gating does not replace these checks.
- Sync validates uniqueness and existence of submitted participant IDs before bulk updating.
- Online single attendance updates and admin attendance changes use separate authorization paths.

Source: `lib/organizerAuth.ts`, `lib/organizerApi.ts`, `app/api/organizer/attendance/update/route.ts`, `app/api/organizer/attendance/sync/route.ts`, `app/api/admin/attendance/update/route.ts`, `models/Organizer.ts`, `models/Workshop.ts`.

## Admin access and sessions

- Admin protected routes require a valid admin session cookie; protected POST routes also require a same-origin request.
- Session tokens are random; MongoDB stores token hashes and expiry rather than raw tokens.
- Sessions have an eight-hour duration. Admin session validity is tied to the configured password version.
- The `sessionStorage` marker is not authorization. All sensitive checks happen server-side.

Source: `lib/adminApi.ts`, `lib/adminSession.ts`, `models/AdminSession.ts`, `app/api/admin/session/`.

## Certificate layout validation

- Layout coordinates/ratios must be finite and within the accepted range.
- Mask/QR boxes must have positive width and height.
- Font size values must be positive and bounded; a minimum font size cannot exceed its maximum.

Source: `lib/validation/schemas.ts`, especially `layoutConfigSchema` and `boxSchema`.

## Collected-answer reporting scope

- The admin collected-data report reads event-specific participant answers (`Participant.customFields`) and question configuration (`Workshop.registrationFields`).
- It does not report global user profile custom fields.
- It aggregates yes/no, checkbox, and text responses as implemented by the page; matrix responses are displayed individually without aggregate statistics.

Source: `app/admin/workshops/collected-data/page.tsx`, `app/api/admin/workshops/details/route.ts`.

## Known limits of documented rules

- Current models store attendance as a boolean. No separate attendance history/audit trail is established by that data shape.
- The code does not establish automatic event completion from event date/time.
- Retention duration for user, participant, and registration answer records is not established by the above flows.
