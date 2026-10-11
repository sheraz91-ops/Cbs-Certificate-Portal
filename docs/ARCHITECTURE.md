# Application architecture

## Runtime layers

```text
Browser route/page
  └─ component and TanStack Query state
      └─ feature API module
          └─ lib/api-client.ts (same-origin fetch, envelope parsing)
              └─ Next.js route handler (app/api/**/route.ts)
                  ├─ validation/auth helpers
                  ├─ lib/mongodb.ts
                  └─ Mongoose models
                      └─ MongoDB
```

The route handler is the trust boundary. Client validation improves feedback but does not replace server validation or authorization.

### UI and data-fetching layer

- Public user flows: `app/page.tsx`, `app/register/`, `app/certificate/`, `app/download/`, and `app/verify/`.
- Admin flows: `app/admin/`, composed through `app/admin/AdminShell.tsx`.
- Organizer attendance: `app/organizer/` and `app/organizer/login/`.
- Reusable UI and workflow components live in `components/`.
- TanStack Query provider and defaults live in `app/providers.tsx`.

### Client API layer

Feature wrappers group requests by domain:

- `features/events/api.ts`
- `features/certificates/api.ts` and `features/certificates/organizer-api.ts`
- `features/admin/api.ts`
- `features/users/api.ts` and `features/users/registrationFormApi.ts`
- `features/organizers/api.ts`
- `features/workshops/api.ts`
- `features/participants/api.ts`

These use `getData`/`postData` in `lib/api-client.ts`. That helper sends same-origin credentials, parses the common JSON envelope, surfaces API errors, and supports array-buffer asset requests. API responses are normally unwrapped from `Content` before reaching the component.

### Server/API layer

API handlers are under `app/api/`, grouped by feature: `admin`, `organizer`, `events`, `certificates`, `templates`, `workshops`, and `user-registration-form`.

- `lib/api-response.ts` provides `successResponse` and `errorResponse`.
- Admin POST routes commonly use `lib/adminApi.ts` for same-origin checking, admin session validation, DB setup, and error envelopes.
- Organizer protected routes use `lib/organizerApi.ts` and organizer session helpers.
- Public routes validate request shapes using schemas in `lib/validation/schemas.ts` and domain-specific validation helpers.
- `lib/mongodb.ts` owns the shared/cached MongoDB connection.

Most APIs use `{ Code, Content, Count, Message, Status }`; a successful template response is binary image content.

## Persisted domain boundaries

| Domain | Responsibility |
|---|---|
| `Workshop` | Event identity/status, registration question definitions, attendance permission, certificate layout and template. |
| `User` | CBS account/profile, including global profile custom fields and active state. |
| `Participant` | User enrollment in one workshop, event-local participant ID, attendance, and event-specific answers. |
| `Organizer` | Organizer profile, password hash, assigned workshop keys, active state, and individual local-attendance permission. |
| `UserRegistrationForm` | Global configurable user profile fields. |
| `AdminSession`, `OrganizerSession` | Hashed session-token records and expiry. |
| `UserSequence`, `ParticipantSequence` | Atomic ID allocation counters. |

Detailed fields, constraints, indexes, and storage boundaries are in [DATA_MODEL.md](./DATA_MODEL.md).

## Main application domains

### Public registration

Event discovery and per-event links feed `EventRegistrationForm`. The form gets public profile field configuration and event-specific questions, validates user input, and submits registration. The server validates again, resolves existing accounts, then creates/updates user and participant records as appropriate.

### Admin

Admin pages manage users, workshops, organizers, participant enrollments, attendance, and collected event answers. Protected routes use an HttpOnly cookie backed by a database session. Admin workflow locations and endpoints are listed in [Documentation.html](../Documentation.html).

### Organizer

Organizers sign in, load assigned open events and participant lists, and update attendance. Local attendance drafts may be stored in browser localStorage only if both the event and organizer permission flags are enabled; sync is re-authorized by the server.

### Certificates

Public lookup produces a minimal response for the public UI. Preview/download code applies the event template and layout, writes name/ID/QR code, and generates PDF or PNG in browser-side code. QR verification routes back to the public verify flow.

## Authentication boundaries

- Admin and organizer sessions are separate.
- Session markers in browser `sessionStorage` are not authentication credentials. HttpOnly cookies carry the session token.
- Database session records keep a hash of the token and an expiry rather than the raw token.
- Admin and organizer protected route wrappers enforce authorization on the server; UI gating is supplemental.

See [BUSINESS_RULES.md](./BUSINESS_RULES.md) for exact conditions and [DATA_FLOW.md](./DATA_FLOW.md) for end-to-end examples.
