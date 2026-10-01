# CBS Certificate Portal

A certificate portal for the Character Building Society (MNSUAM). Participants can find, preview, and download their certificates as PDF or PNG, then verify certificates through the QR code. Workshops, participants, and uploaded certificate templates are stored in MongoDB.

## Stack

- Next.js 15 App Router and TypeScript
- MongoDB through Mongoose
- TanStack Query for client data and mutation state
- PDF output with `pdf-lib`, PNG output with Canvas, QR codes with `qrcode`

## Setup

Requirements: Node.js 20.19+ and npm.

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local`.
3. Set `MONGODB_URI` to a MongoDB connection string. The database name defaults to `CBS`; change it with `MONGODB_DB_NAME` if needed. Set a private `ADMIN_PASSWORD` too.
4. Start the app with `npm run dev`.

Open http://localhost:3000. The database is not populated automatically. Create workshops and add participants through the admin pages. Existing MongoDB records remain available; the app no longer imports records from files.

Keep these environment variables server-only. Do not prefix them with `NEXT_PUBLIC_`. For deployment, configure them in the hosting provider's environment settings. MongoDB Atlas users must allow connections from the hosting environment.

## Data and project structure

```text
app/api/
  admin/route.ts                  Admin workshop and participant operations
  certificates/lookup/route.ts    Public certificate lookup
  templates/[key]/route.ts        Serves database-stored templates
  workshops/route.ts              Public workshop list
models/
  Participant.ts                  Participant schema and unique workshop ID index
  User.ts                          Registered user profile schema
  UserSequence.ts                  Atomic assigned user ID counter
  Workshop.ts                     Workshop, layout, and template schema
lib/
  mongodb.ts                      Cached Mongoose connection
  adminAuth.ts                    Server-side admin password check
  api-client.ts                   Shared getData/postData and envelope handling
  api-response.ts                 Shared server response envelope
features/
  certificates/api.ts             Certificate lookup requests
  participants/api.ts             Participant management requests
  users/api.ts                    Admin user registration and list requests
  workshops/api.ts                Workshop management requests
app/providers.tsx                 TanStack Query provider
config/                            Certificate settings
```

Use the admin pages to register users, create workshops, enroll users by assigned ID, and manage workshop participants. Uploaded template artwork and workshop layouts are stored with their MongoDB workshop records.

JSON APIs use the same response shape:

```json
{
  "Code": 200,
  "Content": {},
  "Count": 1,
  "Message": "Successfully completed",
  "Status": "Success"
}
```

Client components use TanStack Query. Feature API modules call the shared
`getData` / `postData` helpers in `lib/api-client.ts`; API route handlers use
`successResponse` / `errorResponse` from `lib/api-response.ts`. The template
image route returns image bytes on success because it serves a binary asset.

Participant IDs are unique within each workshop. Bare numeric IDs search all workshops and return a choice if more than one participant matches. Full IDs such as `CBS-LSW-2026-005` identify a workshop directly.

## Certificate templates

Templates already in `public/templates/` remain available as static assets. Templates uploaded through the admin interface are saved in MongoDB and served through `/api/templates/<workshop-key>`. Layout ratios are stored on the workshop and applied by both PDF and PNG renderers.

## Deployment

Deploy as a Node.js Next.js application (Vercel is supported). Set `MONGODB_URI` and `ADMIN_PASSWORD` in the deployment environment before opening the portal. The app connects to MongoDB from server-side API routes; database credentials are never sent to the browser.
