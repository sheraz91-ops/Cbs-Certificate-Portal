/**
 * app/api/admin/route.ts
 *
 * Wired to the ACTUAL cbs-certificate-portal repo structure:
 *
 *   config/workshops.ts    -> WORKSHOPS: WorkshopDefinition[] (TypeScript,
 *                              not JSON — new entries are appended as
 *                              source text, right before the commented
 *                              "--- EXAMPLE" block)
 *   data/participants.json -> [{ id, name, workshop }]  (id is a bare
 *                              sequence number, auto-assigned here as
 *                              max-existing-id-for-that-workshop + 1)
 *   public/templates/<key>.png
 *
 * New workshops default to `layout: DEFAULT_LAYOUT_CONFIG`, but the admin
 * panel can also upload a template image and auto-detect a custom layout
 * for the `<<Full Name>>` / `<<ID>>` placeholders when the artwork uses a
 * different design.
 */

import { NextRequest, NextResponse } from "next/server";
import { getFile, putTextFile, putBinaryFile, checkAdminPassword } from "@/lib/github";

const WORKSHOPS_PATH = "config/workshops.ts";
const PARTICIPANTS_PATH = "data/participants.json";
const EXAMPLE_MARKER = "// --- EXAMPLE: duplicate & fill in for your next workshop";

type Participant = { id: string; name: string; workshop: string };
type WorkshopSummary = { key: string; workshopName: string };
type WorkshopDetails = WorkshopSummary & {
  workshopFullTitle: string;
  workshopCode: string;
  eventYear: string;
  eventDate: string;
  templatePath: string;
  participants: Participant[];
};

function unauthorized() {
  return NextResponse.json({ error: "Invalid admin password" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { password, action } = body;

  try {
    if (typeof password !== "string" || !checkAdminPassword(password)) {
      return unauthorized();
    }

    switch (action) {
      case "add-workshop":
        return await handleAddWorkshop(body);
      case "add-participants":
        return await handleAddParticipants(body);
      case "delete-workshop":
        return await handleDeleteWorkshop(body);
      case "delete-participant":
        return await handleDeleteParticipant(body);
      case "list":
        return await handleList();
      case "workshop-details":
        return await handleWorkshopDetails();
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    console.error("Admin API error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

// ---- helpers: reading the WORKSHOPS registry out of TS source text ------

/** Strips full-line comments so the commented-out EXAMPLE block never
 *  gets mistaken for a real entry when scanning for keys/names. */
function stripCommentLines(src: string): string {
  return src
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
}

function extractWorkshopSummaries(src: string): WorkshopSummary[] {
  const clean = stripCommentLines(src);
  const keyRe = /key:\s*"([^"]+)"/g;
  const nameRe = /workshopName:\s*"([^"]+)"/g;

  const keys: string[] = [];
  const names: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = keyRe.exec(clean))) keys.push(m[1]);
  while ((m = nameRe.exec(clean))) names.push(m[1]);

  return keys.map((key, i) => ({ key, workshopName: names[i] ?? key }));
}

// ---- add-workshop ---------------------------------------------------
// body: { password, action:"add-workshop", key, workshopName, workshopFullTitle,
//         workshopCode, eventYear, eventDate, imageBase64, imageExt, layout }

async function handleAddWorkshop(body: any) {
  const {
    key,
    workshopName,
    workshopFullTitle,
    workshopCode,
    eventYear,
    eventDate,
    imageBase64,
    imageExt,
    layout,
  } = body;

  const required = { key, workshopName, workshopFullTitle, workshopCode, eventYear, eventDate };
  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required field(s): ${missing.join(", ")}` },
      { status: 400 }
    );
  }
  if (!/^[a-z0-9-]+$/.test(key)) {
    return NextResponse.json(
      { error: "key must be lowercase letters, numbers, and hyphens only (e.g. nbw-2026)" },
      { status: 400 }
    );
  }

  const file = await getFile(WORKSHOPS_PATH);
  if (!file) {
    return NextResponse.json({ error: `${WORKSHOPS_PATH} not found in repo` }, { status: 500 });
  }

  const existingKeys = extractWorkshopSummaries(file.content).map((w) => w.key);
  if (existingKeys.includes(key)) {
    return NextResponse.json({ error: `Workshop key "${key}" already exists` }, { status: 409 });
  }

  const markerIndex = file.content.indexOf(EXAMPLE_MARKER);
  if (markerIndex === -1) {
    return NextResponse.json(
      {
        error:
          `Couldn't find the "${EXAMPLE_MARKER}" marker comment in ${WORKSHOPS_PATH} — ` +
          `has the file been restructured? Add the workshop manually this once.`,
      },
      { status: 500 }
    );
  }

  // Escape any double quotes/backticks a user might paste into text fields,
  // so the generated TS source stays syntactically valid.
  const esc = (s: string) => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const layoutSnippet = layout
    ? `layout: ${JSON.stringify(layout, null, 4).replace(/^/gm, "    ")},\n`
    : `layout: DEFAULT_LAYOUT_CONFIG,\n`;

  const templatePath = `/templates/${key}.${imageExt || "png"}`;

  const newEntry =
    `  {\n` +
    `    key: "${esc(key)}",\n` +
    `    workshopName: "${esc(workshopName)}",\n` +
    `    workshopFullTitle:\n      "${esc(workshopFullTitle)}",\n` +
    `    workshopCode: "${esc(workshopCode)}",\n` +
    `    eventYear: "${esc(eventYear)}",\n` +
    `    eventDate: "${esc(eventDate)}",\n` +
    "    organizedBy: `${ORG_CONFIG.organizationName} (${ORG_CONFIG.institutionAbbreviation})`,\n" +
    `    templatePath: "${templatePath}",\n` +
    `    ${layoutSnippet}` +
    `  },\n\n  `;

  const updatedContent =
    file.content.slice(0, markerIndex) + newEntry + file.content.slice(markerIndex);

  // 1. Upload the template image first — never leave a registry entry
  //    pointing at a file that doesn't exist yet.
  if (imageBase64) {
    await putBinaryFile(
      `public${templatePath}`,
      imageBase64,
      `admin: add ${key} certificate template`
    );
  }

  // 2. Commit the updated registry.
  await putTextFile(
    WORKSHOPS_PATH,
    updatedContent,
    `admin: add workshop ${key}`,
    file.sha
  );

  return NextResponse.json({
    ok: true,
    workshop: { key, workshopName },
    note: imageBase64
      ? layout
        ? "Workshop added with an auto-detected custom layout."
        : "Workshop added using DEFAULT_LAYOUT_CONFIG."
      : "Workshop added with no template image — upload one before generating certificates for it.",
  });
}

// ---- add-participants ---------------------------------------------------
// body: { password, action:"add-participants", workshop, names }
// `names` is newline-separated. Each line is either just a name (gets the
// next auto-incremented sequence number for that workshop) or "Name, ID"
// to pin a specific number.

async function handleAddParticipants(body: any) {
  const { workshop, names } = body;

  if (!workshop || typeof names !== "string" || !names.trim()) {
    return NextResponse.json(
      { error: "workshop and names (one per line) are required" },
      { status: 400 }
    );
  }

  const existingFile = await getFile(PARTICIPANTS_PATH);
  const participants: Participant[] = existingFile ? JSON.parse(existingFile.content) : [];

  const numericIdsInWorkshop = participants
    .filter((p) => p.workshop === workshop)
    .map((p) => parseInt(p.id.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));

  let nextId = numericIdsInWorkshop.length > 0 ? Math.max(...numericIdsInWorkshop) + 1 : 1;

  const newEntries: Participant[] = [];
  const skipped: string[] = [];

  for (const rawLine of names.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    let name: string;
    let id: string;

    if (line.includes(",")) {
      const [namePart, idPart] = line.split(",").map((p) => p.trim());
      if (!namePart || !idPart) {
        skipped.push(line);
        continue;
      }
      name = namePart;
      id = idPart;
    } else {
      name = line;
      id = String(nextId);
    }

    const alreadyUsed =
      participants.some((p) => p.workshop === workshop && p.id === id) ||
      newEntries.some((p) => p.workshop === workshop && p.id === id);
    if (alreadyUsed) {
      skipped.push(`${line}  (id ${id} already used in this workshop, skipped)`);
      continue;
    }

    newEntries.push({ id, name, workshop });
    const idNum = parseInt(id, 10);
    if (!isNaN(idNum) && idNum >= nextId) nextId = idNum + 1;
  }

  if (newEntries.length === 0) {
    return NextResponse.json(
      { error: "No valid names parsed.", skipped },
      { status: 400 }
    );
  }

  const updated = [...participants, ...newEntries];

  await putTextFile(
    PARTICIPANTS_PATH,
    JSON.stringify(updated, null, 2) + "\n",
    `admin: add ${newEntries.length} participant(s) to ${workshop}`,
    existingFile?.sha
  );

  return NextResponse.json({
    ok: true,
    added: newEntries.length,
    assignedIds: newEntries.map((e) => `${e.name} -> ${e.id}`),
    skipped,
  });
}

function extractWorkshopDetails(src: string, participants: Participant[]): WorkshopDetails[] {
  return extractWorkshopSummaries(src).map((summary) => {
    const keyIndex = src.indexOf(`key: "${summary.key}"`);
    const entryEnd = keyIndex === -1 ? -1 : src.indexOf("\n  },", keyIndex);
    const entry = keyIndex === -1 ? "" : src.slice(keyIndex, entryEnd === -1 ? src.length : entryEnd);
    const value = (field: string) => entry.match(new RegExp(`${field}:\\s*"([^"]+)"`))?.[1] || "Not set";
    return {
      ...summary,
      workshopFullTitle: value("workshopFullTitle"),
      workshopCode: value("workshopCode"),
      eventYear: value("eventYear"),
      eventDate: value("eventDate"),
      templatePath: value("templatePath"),
      participants: participants.filter((participant) => participant.workshop === summary.key),
    };
  });
}

// ---- delete-workshop -----------------------------------------------------
// The certificate template image is deliberately retained for recovery or
// reuse. The workshop registry entry and its participant records are removed.

function findWorkshopEntryBounds(source: string, key: string): [number, number] | null {
  const keyIndex = source.indexOf(`key: "${key}"`);
  if (keyIndex === -1) return null;

  const start = source.lastIndexOf("  {", keyIndex);
  if (start === -1) return null;

  let depth = 0;
  let quote: string | null = null;
  let escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        let end = i + 1;
        if (source[end] === ",") end += 1;
        while (source[end] === "\r" || source[end] === "\n") end += 1;
        return [start, end];
      }
    }
  }
  return null;
}

async function handleDeleteWorkshop(body: any) {
  const { workshop } = body;
  if (typeof workshop !== "string" || !workshop) {
    return NextResponse.json({ error: "A workshop key is required" }, { status: 400 });
  }

  const workshopFile = await getFile(WORKSHOPS_PATH);
  if (!workshopFile) {
    return NextResponse.json({ error: `${WORKSHOPS_PATH} not found in repo` }, { status: 500 });
  }

  const bounds = findWorkshopEntryBounds(workshopFile.content, workshop);
  if (!bounds) {
    return NextResponse.json({ error: `Workshop "${workshop}" was not found` }, { status: 404 });
  }

  const participantsFile = await getFile(PARTICIPANTS_PATH);
  const participants: Participant[] = participantsFile ? JSON.parse(participantsFile.content) : [];
  const remaining = participants.filter((participant) => participant.workshop !== workshop);
  const deletedParticipants = participants.length - remaining.length;
  const updatedWorkshops = workshopFile.content.slice(0, bounds[0]) + workshopFile.content.slice(bounds[1]);

  if (participantsFile && deletedParticipants > 0) {
    await putTextFile(
      PARTICIPANTS_PATH,
      JSON.stringify(remaining, null, 2) + "\n",
      `admin: remove participants for ${workshop}`,
      participantsFile.sha
    );
  }

  await putTextFile(WORKSHOPS_PATH, updatedWorkshops, `admin: delete workshop ${workshop}`, workshopFile.sha);
  return NextResponse.json({ ok: true, deletedParticipants });
}

// ---- delete-participant --------------------------------------------------

async function handleDeleteParticipant(body: any) {
  const { workshop, id, name } = body;
  if (typeof workshop !== "string" || typeof id !== "string" || typeof name !== "string") {
    return NextResponse.json({ error: "workshop, id, and name are required" }, { status: 400 });
  }

  const participantsFile = await getFile(PARTICIPANTS_PATH);
  if (!participantsFile) {
    return NextResponse.json({ error: `${PARTICIPANTS_PATH} not found in repo` }, { status: 500 });
  }

  const participants: Participant[] = JSON.parse(participantsFile.content);
  const remaining = participants.filter(
    (participant) => !(participant.workshop === workshop && participant.id === id && participant.name === name)
  );
  if (remaining.length === participants.length) {
    return NextResponse.json({ error: "Participant was not found" }, { status: 404 });
  }

  await putTextFile(
    PARTICIPANTS_PATH,
    JSON.stringify(remaining, null, 2) + "\n",
    `admin: remove participant ${id} from ${workshop}`,
    participantsFile.sha
  );
  return NextResponse.json({ ok: true });
}

// ---- list ---------------------------------------------------------------

async function handleList() {
  const file = await getFile(WORKSHOPS_PATH);
  const workshops = file ? extractWorkshopSummaries(file.content) : [];
  return NextResponse.json({ ok: true, workshops });
}

async function handleWorkshopDetails() {
  const [workshopFile, participantsFile] = await Promise.all([
    getFile(WORKSHOPS_PATH),
    getFile(PARTICIPANTS_PATH),
  ]);
  if (!workshopFile) {
    return NextResponse.json({ error: `${WORKSHOPS_PATH} not found in repo` }, { status: 500 });
  }
  const participants: Participant[] = participantsFile ? JSON.parse(participantsFile.content) : [];
  return NextResponse.json({ ok: true, workshops: extractWorkshopDetails(workshopFile.content, participants) });
}
