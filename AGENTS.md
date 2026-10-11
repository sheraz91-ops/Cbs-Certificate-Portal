# Instructions for AI coding assistants

Before making a cross-cutting change, read [AI_CONTEXT.md](./AI_CONTEXT.md) and the linked topic document(s). These are repository-specific orientation documents, not substitutes for inspecting the implementation.

## Working in this repository

- Follow the existing flow: App Router page/component → feature API module → shared API client → route handler → Mongoose model/DB.
- Validate inbound data server-side. Reuse the schemas and helpers in `lib/validation/`, `lib/api-client.ts`, `lib/api-response.ts`, and the auth wrappers.
- Preserve the JSON response envelope and route-specific response types. Keep public responses minimized to fields the caller needs.
- Enforce authorization and domain conditions in the server route, even when the UI also hides unavailable actions.
- Keep server-only secrets and credentials out of client components and public responses.
- Read all affected call sites before changing a shared type or API payload. Update related documentation when behavior or data flow changes.
- Do not infer policy from UI presentation alone; confirm the route/model/schema behavior.
- Run the smallest relevant validation command and report any warnings or limitations.

## Source of truth

The code is authoritative. The documentation index identifies the main implementation locations and known flows. Verify details against current source before editing, especially if a documented rule and code appear to differ.
