# Data model and storage map

MongoDB is accessed through Mongoose models in `models/`. The route handlers are the application boundary for writes; client components should not access MongoDB directly.

## Core records

| Record | Main role | Important data and relationships | Source |
|---|---|---|---|
| `Workshop` | Event/workshop configuration | Unique lowercase `key`; name/code/year/date; active/completed state; outsider/local-attendance event permissions; event registration questions; organizer display name; certificate template/layout. Participants and organizer assignments refer to the workshop key. | `models/Workshop.ts` |
| `User` | CBS user profile | Unique `userId`; name/contact/academic profile; `profileCustomFields`; active state. A user can have multiple `Participant` enrollments. | `models/User.ts` |
| `Participant` | Enrollment of one user in one workshop | User ID, workshop key, event-local participant ID and normalized ID, attendance boolean, event-specific `customFields`, enrollment key. Compound index makes participant IDs unique within a workshop; enrollment is unique per user/event. | `models/Participant.ts` |
| `Organizer` | Event manager account | Organizer ID/profile, salted password hash, assigned workshop keys, active state, and organizer-level local-attendance permission. | `models/Organizer.ts` |
| `UserRegistrationForm` | Global configurable profile form | Configurable user profile field definitions, separate from each workshop's questions. | `models/UserRegistrationForm.ts` |

## Session and sequence records

| Record | Purpose | Source |
|---|---|---|
| `AdminSession` | Hashed admin session token, expiry, and session/password-version information. | `models/AdminSession.ts`, `lib/adminSession.ts` |
| `OrganizerSession` | Hashed organizer session token, organizer reference, expiry. | `models/OrganizerSession.ts`, `lib/organizerAuth.ts` |
| `UserSequence` | Atomic CBS user ID allocation. | `models/UserSequence.ts` |
| `ParticipantSequence` | Per-workshop participant ID allocation. | `models/ParticipantSequence.ts`, `lib/participantSequence.ts` |

## User profile vs event answers

There are two answer sets with different scopes:

1. **Global profile answers** belong to a user and are stored in `User.profileCustomFields`, based on the admin-configured public profile form.
2. **Event answers** belong to a single participant enrollment and are stored in `Participant.customFields`, based on that workshop's `registrationFields`.

The admin Collected Event Data report reads the second set. It does not read the global user profile custom fields.

## Browser storage

Browser storage is not the database and is not an authorization source.

| Key | Storage | Purpose |
|---|---|---|
| `cbs_user_id` | `localStorage` | Numeric CBS user ID suffix for returning-participant UI convenience; server still verifies email or phone. |
| `organizer-attendance:<event-key>` | `localStorage` | Pending event attendance edits, participant ID → boolean. A successful sync removes the queue; failures preserve it for retry. |
| `admin_theme` | `localStorage` | Admin UI theme preference. |
| `admin_session` | `sessionStorage` | UI/session marker only; the HttpOnly cookie is the credential. |
| `organizer_session` | `sessionStorage` | UI/session marker only; the HttpOnly cookie is the credential. |

## Index and key notes

- `User.userId` is unique.
- `Workshop.key` is unique and is the domain reference used by participant and organizer assignments.
- `Participant` has a compound unique index on `(workshop, id)`, a normalized lookup index on `(workshop, normalizedId)`, and an index on `(workshop, userId)`.
- Participant enrollment keys are sparse unique values so legacy/other records without an enrollment key can exist while new enrollments stay unique.
- `Organizer.organizerId` is unique; email has a sparse unique index.

Check model definitions before changing keys or uniqueness semantics; indexes can affect existing production data during deployment.

## Privacy and projection

- Password hashes and session token hashes are server-side only.
- Public certificate lookup uses explicit response DTOs so it returns only the fields required by lookup/rendering.
- Admin details endpoints intentionally return broader data than public endpoints; keep those access-controlled.
- Avoid returning raw database documents where a response projection/DTO is sufficient.
