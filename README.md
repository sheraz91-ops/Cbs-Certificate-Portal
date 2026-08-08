# CBS Certificate Download Portal

A production-ready, 100% frontend certificate platform for the
**Character Building Society (MNSUAM)**. Participants look up their
Certificate ID, preview their certificate, and download it as a
print-quality PDF or PNG — every certificate carries a scannable QR code
linking to a public verification page. No backend, no database, no
authentication.

Built for the **"Laptop Survival Workshop"**, but the entire event
identity is centralized in **one config file**, so the whole portal can
be repointed at a brand-new workshop by editing that single file and
swapping two data files (see [Reusing for a new event](#-reusing-for-a-new-event)).

---

## ✨ Features

- **Multiple workshops, one portal** — a workshop registry
  (`config/workshops.ts`) lets any number of events run simultaneously,
  each with its own template artwork and certificate ID namespace. A
  full Certificate ID (e.g. `CBS-LSW-2026-005`) always resolves
  unambiguously; a bare number searches every workshop and asks the
  person to pick if there's a collision.
- **Single-field lookup** — enter a Certificate ID, get your certificate.
- **Tolerant matching** — `"5"`, `"05"`, `"CBS-LSW-2026-005"`, and even a
  pasted QR link all resolve to the same participant.
- **Formatted Certificate IDs** — `CBS-LSW-2026-001` style, built from
  each workshop's own prefix + a zero-padded sequence number.
- **Certificate preview page** (`/certificate?id=...`) — see the finished
  certificate rendered on-screen before downloading anything.
- **Download as PDF or PNG** — PDF via `pdf-lib` (crisp vector text),
  PNG via an HTML canvas renderer that mirrors the exact same layout at
  2x resolution for crisp downloads and social sharing.
- **QR code on every certificate** — generated client-side with the
  `qrcode` package, linking straight to that certificate's verification
  page. Uses the live browser origin, so it's correct on localhost,
  Vercel previews, and your final domain with zero config.
- **Public verification page** (`/verify`) — anyone with a Certificate ID
  (typed in, or arriving via the QR code / a shared link) can confirm a
  certificate is authentic: name, ID, workshop, date, and organizer.
- **Centralized config** — `config/certificate.config.ts` holds org-wide
  branding; `config/workshops.ts` holds every workshop's details. Add a
  new workshop by adding one entry + one participant list + one
  template — no other code changes.
- **CBS logo as favicon & social preview image** — auto-detected via
  Next.js's `app/icon.png`, `app/apple-icon.png`, and
  `app/opengraph-image.png` conventions.
- **Premium blue & gold university UI** — rounded cards, gold accents,
  smooth animations, fully responsive, safe-area aware for notched
  phones.
- **Zero external network calls** at build or runtime beyond the static
  assets shipped with the app — deploys reliably anywhere.

---

## 🧱 Tech Stack

| Layer      | Choice                                     |
|------------|---------------------------------------------|
| Framework  | Next.js 15 (App Router)                      |
| Language   | TypeScript                                   |
| Styling    | Tailwind CSS                                 |
| PDF engine | pdf-lib (client-side, vector text)           |
| PNG engine | HTML Canvas 2D (client-side)                 |
| QR codes   | qrcode                                       |
| Hosting    | Vercel (no backend required)                 |

---

## 📁 Project Structure

```
certificate-portal/
├── app/
│   ├── layout.tsx              # Root layout, SEO metadata
│   ├── page.tsx                 # Home — Certificate ID lookup
│   ├── certificate/page.tsx     # Preview + Download PDF/PNG
│   ├── verify/page.tsx          # Public verification page
│   ├── globals.css
│   ├── icon.png                 # Favicon (from CBS logo)
│   ├── apple-icon.png           # Apple touch icon
│   └── opengraph-image.png      # Social preview image
├── components/
│   ├── PageShell.tsx            # Shared hero/background/footer shell
│   ├── LogoBadge.tsx             # Top logo — all size/style settings in one place
│   ├── Header.tsx                # Homepage title block
│   ├── CertificateForm.tsx       # ID input -> navigates to /certificate
│   ├── CertificatePreview.tsx    # Renders + downloads PDF/PNG
│   ├── VerifyPanel.tsx           # Verification form + result card
│   ├── AlertMessage.tsx
│   ├── LoadingSpinner.tsx
│   └── Footer.tsx
├── config/
│   ├── certificate.config.ts    # Org-wide settings (branding, ID padding, default layout)
│   └── workshops.ts             # ★ Workshop registry — add new workshops here ★
├── lib/
│   ├── participants.ts           # Data loading + tolerant, workshop-aware lookup
│   ├── formatId.ts               # ID formatting/parsing (workshop-code aware)
│   ├── certificatePlan.ts        # Participant -> render-ready plan (resolves workshop)
│   ├── qrcode.ts                 # QR generation + verify URL builder
│   ├── generateCertificate.ts    # PDF rendering (pdf-lib) + downloads
│   └── renderCertificatePng.ts   # Canvas rendering (preview + PNG)
├── data/
│   └── participants.json        # id + name + workshop records, ALL workshops in one file
├── public/
│   ├── templates/
│   │   └── lsw-2026.png          # Certificate artwork (one file per workshop)
│   └── cbs-logo.png              # Standalone logo (in-app use)
├── types/
│   └── index.ts
├── tailwind.config.ts
├── next.config.js
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.18+ (Node 20 LTS recommended)
- npm (or pnpm/yarn — adjust commands accordingly)

### Install & run locally

```bash
npm install
npm run dev
```

Visit **http://localhost:3000**. Try:
- Certificate ID `1` (or any ID from `data/participants.json`) → preview
  → download PDF/PNG.
- An out-of-range ID (e.g. `999`) → error state.
- **http://localhost:3000/verify** → paste a Certificate ID (or open the
  page with `?id=CBS-LSW-2026-005` the way a scanned QR code would) to
  see the verification result.

### Production build

```bash
npm run build
npm start
```

---

## 🎯 How It Works

### 1. Lookup (`/`)
`lib/participants.ts` parses whatever the participant types — a bare
number, a zero-padded number, or a full `CBS-LSW-2026-005` code — and
matches it against `data/participants.json`. If the input names a
specific workshop (via its code), the search is scoped to that
workshop only; a bare number is checked against every workshop, with an
inline picker shown if it collides across more than one. On a match,
the browser navigates to `/certificate?id=<formattedId>`.

### 2. Preview (`/certificate?id=...`)
`components/CertificatePreview.tsx` re-resolves the ID from the URL,
builds a `CertificatePlan` (`lib/certificatePlan.ts`) — which resolves
the participant's specific `WorkshopDefinition` from
`config/workshops.ts` — and renders it onto an off-screen `<canvas>`
(`lib/renderCertificatePng.ts`) using *that workshop's* template and
layout. That canvas becomes both the on-screen preview image and the
source for the "Download PNG" button.

### 3. Download PDF
`lib/generateCertificate.ts` independently re-renders the same plan
using `pdf-lib`, drawing vector text (crisp at any zoom/print size)
instead of a rasterized image. Both renderers read their template path
and layout ratios from the same resolved `plan.workshop`, so the
preview, the PNG, and the PDF are always visually identical for a given
certificate.

Both renderers:
- Paint a background-matched rectangle over the original `<<Full Name>>`
  / `<<ID>>` placeholder text (masking).
- Draw the real name and ID, **auto-shrinking the font size** if the
  text is too long to fit its box — this is what lets long names *and*
  the longer `CBS-LSW-2026-XXX` ID format fit cleanly without any manual
  per-certificate tuning.
- Draw a QR code (generated via `lib/qrcode.ts`) linking to
  `/verify?id=<formattedId>`, using the page's live origin so it's
  always correct.

### 4. Verify (`/verify`)
`components/VerifyPanel.tsx` performs the same workshop-aware lookup
and shows either a green "Certificate Verified" card (name, ID,
*that participant's* workshop, date, organizer), an amber "multiple
matches" picker, or a red "Certificate Not Found" card. It does not
offer a download — verification is intentionally a separate, read-only
action from generation.

---

## 🔡 Certificate ID Format

Each workshop gets its own ID namespace, built in `lib/formatId.ts` from
that workshop's entry in `config/workshops.ts`:

```
{organizationAbbreviation}-{workshopCode}-{eventYear}-{sequence, zero-padded}
        CBS         -    LSW     - 2026  -     005
```

`organizationAbbreviation` is org-wide (`config/certificate.config.ts`);
`workshopCode` and `eventYear` are per-workshop (`config/workshops.ts`).
Two different workshops can safely reuse the same sequence numbers
(`CBS-LSW-2026-005` and `CBS-AW-2026-005` are different people) because
the workshop code makes every ID globally unique.

---

## 🎪 Running Multiple Workshops in One Portal

The portal supports any number of workshops running simultaneously,
each with its own template, certificate ID namespace, and event details
— all under one deployment.

### How it works

- **`config/workshops.ts`** is a registry — an array of workshop
  definitions (name, code, date, template path, layout).
- **`data/participants.json`** is one shared file for everyone; each
  record has a `"workshop"` field tagging which workshop it belongs to.
- When someone enters a **full Certificate ID** (e.g.
  `CBS-LSW-2026-005`), the workshop code (`LSW`) tells the app exactly
  which workshop and template to use — this is what every QR code and
  printed "ID: ..." on a certificate already contains, so it's always
  unambiguous.
- When someone enters just a **bare number** (e.g. `5`), the app
  searches every workshop. If only one workshop has that number, it
  resolves normally. If more than one workshop happens to have used the
  same number, the person sees a small picker ("Which one is yours?")
  instead of guessing wrong.

### Add a new workshop

1. **Add its artwork** — drop the new template PNG in
   `public/templates/`, e.g. `public/templates/aw-2026.png`.
2. **Register it** — open `config/workshops.ts` and add one entry to
   the `WORKSHOPS` array (an example block is already there to copy):
   ```ts
   {
     key: "aw-2026",
     workshopName: "Another Workshop",
     workshopFullTitle: "Another Workshop: Full Descriptive Title",
     workshopCode: "AW",
     eventYear: "2026",
     eventDate: "12 December 2026",
     organizedBy: `${ORG_CONFIG.organizationName} (${ORG_CONFIG.institutionAbbreviation})`,
     templatePath: "/templates/aw-2026.png",
     layout: DEFAULT_LAYOUT_CONFIG, // reuse if the new artwork keeps the
                                      // same placeholder positions
   },
   ```
3. **Tag its participants** — add their records to
   `data/participants.json` with `"workshop": "aw-2026"` (matching the
   `key` above).
4. **(Only if the new artwork's layout differs)** re-measure the
   placeholders per the section below and give this workshop its own
   `layout` object instead of `DEFAULT_LAYOUT_CONFIG`.

That's it — the home page, preview page, verify page, PDF/PNG
generation, and QR codes all pick this up automatically. No other code
changes needed.

### Removing / retiring a workshop

Delete its entry from `WORKSHOPS` and its participants from
`participants.json`. Certificates already downloaded/printed still work
fine as PDFs/PNGs, but their QR codes will show "Certificate Not Found"
on `/verify` once removed, since the source record is gone.

---

## 🧭 Re-tuning a Template's Layout

If a workshop's artwork moves the placeholder text, or leaves a
QR-sized blank area somewhere else, re-measure it:

```python
from PIL import Image
import numpy as np

im = Image.open("public/templates/your-workshop.png").convert("L")
arr = np.array(im)
region = arr[Y1:Y2, X1:X2]        # a rough crop around the placeholder
mask = region < 100                # dark (text) pixels
ys, xs = np.where(mask)
print("x:", X1 + xs.min(), X1 + xs.max())
print("y:", Y1 + ys.min(), Y1 + ys.max())
```

For finding blank space to place a new QR code, scan candidate boxes for
"non-white density" and pick the lowest:

```python
def content_density(box, arr_rgb):
    x0, y0, x1, y1 = box
    sub = arr_rgb[y0:y1, x0:x1].astype(int)
    dist = np.abs(sub - 255).sum(axis=2)
    return (dist > 60).mean()  # fraction of non-blank pixels
```

Divide the resulting pixel boxes by the image's width/height to get the
ratios for a new `LayoutConfig` object (same shape as
`DEFAULT_LAYOUT_CONFIG` in `config/certificate.config.ts`), and assign
it to that workshop's `layout` field in `config/workshops.ts`.

---

## 🔁 Single-Workshop Reuse (Alternative to the Registry)

If you'd rather keep this deployment scoped to one workshop at a time
(e.g. archiving a finished workshop's portal and spinning up a fresh
one for the next), you can skip the registry entirely:

1. **Edit the one entry in `config/workshops.ts`** — update its name,
   code, year, date, template path.
2. **Replace `data/participants.json`** with the new participant list
   (keep the `"workshop"` field matching that one entry's `key`).
3. **Replace the template PNG** in `public/templates/`.

---

## 🖋️ Fonts

Both the PDF and PNG renderers use **standard, universally-available
fonts** rather than embedding custom webfonts:

- PDF: pdf-lib's built-in Standard Fonts (Times-Roman for the name,
  Helvetica-Bold for the ID/QR caption) — embedded in virtually every
  PDF viewer, guaranteeing identical output everywhere.
- Canvas/PNG: the equivalent system fonts (`"Times New Roman"` and
  `Arial/Helvetica`), so the preview and PNG match the PDF.

This keeps the app dependency-free for fonts — no downloads, no
`@pdf-lib/fontkit`, faster and more reliable builds.

---

## ☁️ Deploying to Vercel

### Option A — Vercel CLI
```bash
npm install -g vercel
vercel login
vercel        # first deploy
vercel --prod # promote to production
```

### Option B — Git + Vercel Dashboard (recommended)
1. Push this project to a GitHub/GitLab/Bitbucket repository.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Framework preset: Vercel auto-detects **Next.js** — no configuration
   needed.
4. Click **Deploy**.

After your first deploy, update `ORG_CONFIG.siteUrl` in
`config/certificate.config.ts` to your real Vercel domain for nicer
social link previews (this does **not** affect QR codes or
verification, which always use the live origin).

Every push to your default branch auto-deploys; pull requests get their
own preview URLs.

---

## ✅ Production Checklist

- [x] No hardcoded secrets or API keys (none are needed).
- [x] No backend/server code — fully client-rendered.
- [x] TypeScript strict mode enabled.
- [x] Responsive design (mobile → desktop).
- [x] Accessible form labeling and status alerts.
- [x] `npm run build` verified to complete successfully with zero errors.
- [x] QR codes verified (decoded with OpenCV) to resolve to the correct
      verification URL.
- [x] Long names and the full `CBS-LSW-2026-XXX` ID format verified to
      auto-fit their designated areas without manual tuning.
- [x] Multi-workshop lookup logic (workshop-scoped resolution,
      cross-workshop ambiguity detection, per-workshop template
      resolution) verified with a 17-case automated test run directly
      against the shipped source.

---

## 📄 License

Internal tool built for the Character Building Society (MNSUAM). Adapt
freely for your own society/university events.
