"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import NextImage from "next/image";
import { DEFAULT_LAYOUT_CONFIG } from "@/config/certificate.config";
import type { LayoutConfig } from "@/types/workshop";
import { detectTemplateLayout } from "@/lib/detectTemplateLayout";
import { useAdminToast } from "@/app/admin/AdminShell";
import { addWorkshop as createWorkshop } from "@/features/workshops/api";
import { addParticipants } from "@/features/participants/api";
import InputField from "@/components/InputField";
import { addParticipantsSchema, createWorkshopSchema, layoutPercentSchema, templateFileMetadataSchema, validationMessage, workshopKeySchema, userIdSchema } from "@/lib/validation/schemas";

type WorkshopSummary = { key: string; workshopName: string };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function cloneDefaultLayout(): LayoutConfig {
  return {
    ...DEFAULT_LAYOUT_CONFIG,
    nameField: {
      ...DEFAULT_LAYOUT_CONFIG.nameField,
      maskBox: { ...DEFAULT_LAYOUT_CONFIG.nameField.maskBox },
    },
    idField: {
      ...DEFAULT_LAYOUT_CONFIG.idField,
      maskBox: { ...DEFAULT_LAYOUT_CONFIG.idField.maskBox },
    },
    qrField: {
      ...DEFAULT_LAYOUT_CONFIG.qrField,
      box: { ...DEFAULT_LAYOUT_CONFIG.qrField.box },
    },
  };
}

function cloneLayout(layout: LayoutConfig): LayoutConfig {
  return {
    ...layout,
    nameField: {
      ...layout.nameField,
      maskBox: { ...layout.nameField.maskBox },
    },
    idField: {
      ...layout.idField,
      maskBox: { ...layout.idField.maskBox },
    },
    qrField: {
      ...layout.qrField,
      box: { ...layout.qrField.box },
    },
  };
}

function LayoutPreview({
  fileUrl,
  imageWidth,
  imageHeight,
  layout,
  onLayoutChange,
}: {
  fileUrl: string;
  imageWidth: number;
  imageHeight: number;
  layout: LayoutConfig;
  onLayoutChange: (layout: LayoutConfig) => void;
}) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{
    field: "nameField" | "idField";
    startX: number;
    startY: number;
    startLayout: LayoutConfig;
  } | null>(null);

  const overlayBase =
    "absolute rounded-xl border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] shadow-lg backdrop-blur-[1px]";

  const boxStyle = (
    box: LayoutConfig["nameField"]["maskBox"],
    color: string,
    label: string,
  ) => ({
    left: `${box.leftRatio * 100}%`,
    top: `${box.topRatio * 100}%`,
    width: `${(box.rightRatio - box.leftRatio) * 100}%`,
    height: `${(box.bottomRatio - box.topRatio) * 100}%`,
    borderColor: color,
    backgroundColor: `${color}22`,
    color,
  });

  const beginDrag = (
    field: "nameField" | "idField",
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const preview = previewRef.current;
    if (!preview) return;

    const startLayout = cloneLayout(layout);
    dragState.current = {
      field,
      startX: event.clientX,
      startY: event.clientY,
      startLayout,
    };

    const handleMove = (moveEvent: PointerEvent) => {
      const active = dragState.current;
      if (!active) return;
      const rect = preview.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dx = (moveEvent.clientX - active.startX) / rect.width;
      const dy = (moveEvent.clientY - active.startY) / rect.height;
      onLayoutChange(translateLayout(active.startLayout, active.field, dx, dy));
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      dragState.current = null;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
  };

  useEffect(() => {
    return () => {
      dragState.current = null;
    };
  }, []);

  return (
    <div className="space-y-3">
      <div
        ref={previewRef}
        className="relative w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-950"
        style={{ aspectRatio: `${imageWidth} / ${imageHeight}` }}
      >
        <NextImage
          src={fileUrl}
          alt="Certificate template preview"
          fill
          unoptimized
          className="object-contain"
        />

        <div
          className={overlayBase}
          style={boxStyle(layout.nameField.maskBox, "#60a5fa", "Full Name")}
        >
          <button
            type="button"
            onPointerDown={(event) => beginDrag("nameField", event)}
            className="pointer-events-auto absolute left-1 top-1 rounded-md border border-blue-300/60 bg-slate-950/80 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.22em] text-blue-200 shadow-sm cursor-move"
            aria-label="Drag name field"
          >
            Drag
          </button>
          <span className="pointer-events-none inline-flex rounded-md bg-slate-950/80 px-1.5 py-0.5 text-[9px] tracking-[0.22em]">
            Name
          </span>
        </div>

        <div
          className={overlayBase}
          style={boxStyle(layout.idField.maskBox, "#f59e0b", "ID")}
        >
          <button
            type="button"
            onPointerDown={(event) => beginDrag("idField", event)}
            className="pointer-events-auto absolute left-1 top-1 rounded-md border border-amber-300/60 bg-slate-950/80 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.22em] text-amber-200 shadow-sm cursor-move"
            aria-label="Drag ID field"
          >
            Drag
          </button>
          <span className="pointer-events-none inline-flex rounded-md bg-slate-950/80 px-1.5 py-0.5 text-[9px] tracking-[0.22em]">
            ID
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300">
          <p className="font-semibold text-blue-300">Name field</p>
          <p className="mt-1 text-slate-400">
            Center {Math.round(layout.nameField.centerXRatio * 1000) / 10}% /{" "}
            {Math.round(layout.nameField.centerYRatio * 1000) / 10}%
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300">
          <p className="font-semibold text-amber-300">ID field</p>
          <p className="mt-1 text-slate-400">
            Start {Math.round(layout.idField.startXRatio * 1000) / 10}% / center{" "}
            {Math.round(layout.idField.centerYRatio * 1000) / 10}%
          </p>
        </div>
      </div>
    </div>
  );
}

function pct(value: number): string {
  return `${Math.round(value * 1000) / 10}`;
}

function clampRatio(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function updateLayoutBox(
  layout: LayoutConfig,
  field: "nameField" | "idField",
  key: "leftRatio" | "rightRatio" | "topRatio" | "bottomRatio",
  value: number,
): LayoutConfig {
  return {
    ...layout,
    [field]: {
      ...layout[field],
      maskBox: {
        ...layout[field].maskBox,
        [key]: clampRatio(value),
      },
    },
  };
}

function translateLayout(
  layout: LayoutConfig,
  field: "nameField" | "idField",
  dx: number,
  dy: number,
): LayoutConfig {
  if (field === "nameField") {
    return {
      ...layout,
      nameField: {
        ...layout.nameField,
        centerXRatio: clampRatio(layout.nameField.centerXRatio + dx),
        centerYRatio: clampRatio(layout.nameField.centerYRatio + dy),
        maskBox: {
          leftRatio: clampRatio(layout.nameField.maskBox.leftRatio + dx),
          rightRatio: clampRatio(layout.nameField.maskBox.rightRatio + dx),
          topRatio: clampRatio(layout.nameField.maskBox.topRatio + dy),
          bottomRatio: clampRatio(layout.nameField.maskBox.bottomRatio + dy),
        },
      },
    };
  }

  return {
    ...layout,
    idField: {
      ...layout.idField,
      startXRatio: clampRatio(layout.idField.startXRatio + dx),
      centerYRatio: clampRatio(layout.idField.centerYRatio + dy),
      maskBox: {
        leftRatio: clampRatio(layout.idField.maskBox.leftRatio + dx),
        rightRatio: clampRatio(layout.idField.maskBox.rightRatio + dx),
        topRatio: clampRatio(layout.idField.maskBox.topRatio + dy),
        bottomRatio: clampRatio(layout.idField.maskBox.bottomRatio + dy),
      },
    },
  };
}

function LayoutEditor({
  layout,
  onChange,
  onReset,
  detectionReady,
}: {
  layout: LayoutConfig;
  onChange: (layout: LayoutConfig) => void;
  onReset: () => void;
  detectionReady: boolean;
}) {
  const controlClass =
    "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

  const update = (
    field: "nameField" | "idField",
    key: "leftRatio" | "rightRatio" | "topRatio" | "bottomRatio",
    text: string,
  ) => {
    const parsed = Number(text);
    if (Number.isNaN(parsed)) return;
    onChange(updateLayoutBox(layout, field, key, parsed / 100));
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">
            Manual layout adjust
          </p>
          <p className="text-xs text-slate-500">
            Nudge the detected boxes before saving the workshop.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-indigo-500/50 hover:text-indigo-300"
        >
          Reset
        </button>
      </div>

      {!detectionReady && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Detection did not complete cleanly. The editor started from the
          default layout so you can still adjust it manually.
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
            Full Name
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="space-y-1 text-[11px] text-slate-400">
              Left %
              <InputField
                className={controlClass}
                type="number"
                step="0.1"
                validationSchema={layoutPercentSchema}
                value={pct(layout.nameField.maskBox.leftRatio)}
                onChange={(e) =>
                  update("nameField", "leftRatio", e.target.value)
                }
              />
            </label>
            <label className="space-y-1 text-[11px] text-slate-400">
              Right %
              <InputField
                className={controlClass}
                type="number"
                step="0.1"
                validationSchema={layoutPercentSchema}
                value={pct(layout.nameField.maskBox.rightRatio)}
                onChange={(e) =>
                  update("nameField", "rightRatio", e.target.value)
                }
              />
            </label>
            <label className="space-y-1 text-[11px] text-slate-400">
              Top %
              <InputField
                className={controlClass}
                type="number"
                step="0.1"
                validationSchema={layoutPercentSchema}
                value={pct(layout.nameField.maskBox.topRatio)}
                onChange={(e) =>
                  update("nameField", "topRatio", e.target.value)
                }
              />
            </label>
            <label className="space-y-1 text-[11px] text-slate-400">
              Bottom %
              <InputField
                className={controlClass}
                type="number"
                step="0.1"
                validationSchema={layoutPercentSchema}
                value={pct(layout.nameField.maskBox.bottomRatio)}
                onChange={(e) =>
                  update("nameField", "bottomRatio", e.target.value)
                }
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
            ID
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="space-y-1 text-[11px] text-slate-400">
              Left %
              <InputField
                className={controlClass}
                type="number"
                step="0.1"
                validationSchema={layoutPercentSchema}
                value={pct(layout.idField.maskBox.leftRatio)}
                onChange={(e) => update("idField", "leftRatio", e.target.value)}
              />
            </label>
            <label className="space-y-1 text-[11px] text-slate-400">
              Right %
              <InputField
                className={controlClass}
                type="number"
                step="0.1"
                validationSchema={layoutPercentSchema}
                value={pct(layout.idField.maskBox.rightRatio)}
                onChange={(e) =>
                  update("idField", "rightRatio", e.target.value)
                }
              />
            </label>
            <label className="space-y-1 text-[11px] text-slate-400">
              Top %
              <InputField
                className={controlClass}
                type="number"
                step="0.1"
                validationSchema={layoutPercentSchema}
                value={pct(layout.idField.maskBox.topRatio)}
                onChange={(e) => update("idField", "topRatio", e.target.value)}
              />
            </label>
            <label className="space-y-1 text-[11px] text-slate-400">
              Bottom %
              <InputField
                className={controlClass}
                type="number"
                step="0.1"
                validationSchema={layoutPercentSchema}
                value={pct(layout.idField.maskBox.bottomRatio)}
                onChange={(e) =>
                  update("idField", "bottomRatio", e.target.value)
                }
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AddWorkshopForm({
  onDone,
}: {
  onDone: (w: WorkshopSummary) => void;
}) {
  const toast = useAdminToast();
  const queryClient = useQueryClient();
  const addMutation = useMutation({
    mutationFn: (input: Parameters<typeof createWorkshop>[0]) => createWorkshop(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "workshop-details"] }),
        queryClient.invalidateQueries({ queryKey: ["workshops", "public"] }),
        queryClient.invalidateQueries({ queryKey: ["certificate-lookup"] }),
      ]);
    },
  });
  const [key, setKey] = useState("");
  const [workshopName, setWorkshopName] = useState("");
  const [workshopFullTitle, setWorkshopFullTitle] = useState("");
  const [workshopCode, setWorkshopCode] = useState("");
  const [eventYear, setEventYear] = useState(String(new Date().getFullYear()));
  const [eventDate, setEventDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [detectedLayout, setDetectedLayout] = useState<LayoutConfig | null>(
    null,
  );
  const [draftLayout, setDraftLayout] = useState<LayoutConfig | null>(null);
  const [detectionBusy, setDetectionBusy] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setPreviewSize(null);
      setDetectedLayout(null);
      setDraftLayout(null);
      setDetectionError(null);
      setDetectionBusy(false);
      return;
    }

    const url = URL.createObjectURL(file);
    let cancelled = false;
    setPreviewUrl(url);
    setPreviewSize(null);
    setDetectedLayout(null);
    setDraftLayout(null);
    setDetectionError(null);
    setDetectionBusy(true);

    const image = new window.Image();
    image.onload = async () => {
      if (cancelled) return;
      setPreviewSize({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      try {
        const layout = await detectTemplateLayout(file);
        if (!cancelled) {
          setDetectedLayout(layout);
          setDraftLayout(layout);
          setDetectionError(null);
        }
      } catch (cause: any) {
        if (!cancelled) {
          setDetectedLayout(null);
          setDraftLayout(cloneDefaultLayout());
          setDetectionError(
            cause?.message || "Could not detect placeholders in this template",
          );
        }
      } finally {
        if (!cancelled) setDetectionBusy(false);
      }
    };
    image.onerror = () => {
      if (!cancelled) {
        setDetectionBusy(false);
        setDetectionError("Could not load the selected template image");
      }
    };
    image.src = url;

    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const canSubmit =
    key &&
    workshopName &&
    workshopFullTitle &&
    workshopCode &&
    eventYear &&
    eventDate;

  async function submit() {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const imageBase64 = file ? await fileToBase64(file) : undefined;
      const imageExt = file?.name.split(".").pop();
      const layout =
        draftLayout ?? (file ? await detectTemplateLayout(file) : undefined);
      const parsed = createWorkshopSchema.safeParse({
        key, workshopName, workshopFullTitle, workshopCode, eventYear, eventDate,
        imageBase64, imageExt, layout,
      });
      if (!parsed.success) throw new Error(validationMessage(parsed.error));
      const data = await addMutation.mutateAsync(parsed.data);
      onDone(data.workshop);
      setNote(data.note);
      toast({
        title: "Workshop added",
        description: `${data.workshop.workshopName} is ready.`,
        tone: "success",
      });
      if (data.note)
        toast({
          title: "Workshop saved with a note",
          description: data.note,
          tone: "info",
        });
      setKey("");
      setWorkshopName("");
      setWorkshopFullTitle("");
      setWorkshopCode("");
      setEventDate("");
      setFile(null);
    } catch (e: any) {
      setError(e.message);
      toast({
        title: "Could not add workshop",
        description: e.message,
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-xl shadow-slate-950/10">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">Create Workshop</h2>

        <p className="mt-1 text-sm text-slate-400">
          Add the workshop details and certificate template.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Workshop Key
          </label>

          <InputField
            className="w-full h-11 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all hover:border-slate-600 focus:border-indigo-500 focus:bg-slate-900 focus:ring-4 focus:ring-indigo-500/10"
            placeholder="nbw-2026"
            validationSchema={workshopKeySchema}
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />

          <p className="mt-1.5 text-xs text-slate-500">
            Lowercase, hyphenated, unique id e.g. nbw-2026
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Short Display Name
          </label>

          <InputField
            className="w-full h-11 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all hover:border-slate-600 focus:border-indigo-500 focus:bg-slate-900 focus:ring-4 focus:ring-indigo-500/10"
            placeholder="National Bootcamp Workshop"
            validationSchema={createWorkshopSchema.shape.workshopName}
            value={workshopName}
            onChange={(e) => setWorkshopName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Full Descriptive Title
          </label>

          <InputField
            className="w-full h-11 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all hover:border-slate-600 focus:border-indigo-500 focus:bg-slate-900 focus:ring-4 focus:ring-indigo-500/10"
            placeholder="Full workshop title"
            validationSchema={createWorkshopSchema.shape.workshopFullTitle}
            value={workshopFullTitle}
            onChange={(e) => setWorkshopFullTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Workshop Code
            </label>

            <InputField
              className="w-full h-11 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm uppercase text-white placeholder:text-slate-600 outline-none transition-all hover:border-slate-600 focus:border-indigo-500 focus:bg-slate-900 focus:ring-4 focus:ring-indigo-500/10"
              placeholder="NBW"
              validationSchema={createWorkshopSchema.shape.workshopCode}
              value={workshopCode}
              onChange={(e) => setWorkshopCode(e.target.value.toUpperCase())}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Year
            </label>

            <InputField
              className="w-full h-11 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all hover:border-slate-600 focus:border-indigo-500 focus:bg-slate-900 focus:ring-4 focus:ring-indigo-500/10"
              placeholder="2026"
              validationSchema={createWorkshopSchema.shape.eventYear}
              value={eventYear}
              onChange={(e) => setEventYear(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Event Date
          </label>

          <InputField
            className="w-full h-11 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all hover:border-slate-600 focus:border-indigo-500 focus:bg-slate-900 focus:ring-4 focus:ring-indigo-500/10"
            placeholder="12 December 2026"
            validationSchema={createWorkshopSchema.shape.eventDate}
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Certificate Template Image
          </label>

          <label className="group flex flex-col items-center justify-center w-full min-h-32 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900 cursor-pointer transition-all hover:border-indigo-500/60 hover:bg-slate-900/80">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-3 transition group-hover:border-indigo-500/40 group-hover:bg-indigo-500/10">
              <svg
                className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M12 16V4m0 0L8 8m4-4l4 4M5 20h14"
                />
              </svg>
            </div>

            <span className="text-sm font-medium text-slate-200">
              Choose certificate template
            </span>

            <span className="text-xs text-slate-500 mt-1">
              PNG or JPEG image
            </span>

            <InputField
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              validationSchema={templateFileMetadataSchema}
              onChange={(e) => {
                const selected = e.target.files?.[0] || null;
                const parsedFile = selected ? templateFileMetadataSchema.safeParse({ type: selected.type, size: selected.size }) : null;
                if (parsedFile && !parsedFile.success) {
                  setFile(null);
                  setError(validationMessage(parsedFile.error));
                  e.target.value = "";
                  return;
                }
                setError(null);
                setFile(selected);
              }}
            />
          </label>

          {file && (
            <div className="mt-2 flex items-center gap-2 text-xs text-indigo-400">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              {file.name}
            </div>
          )}

          {file && (
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Detected layout preview
                  </p>
                  <p className="text-xs text-slate-500">
                    {detectionBusy
                      ? "Scanning for placeholders..."
                      : detectionError
                        ? "Fallback layout will be used unless you adjust it manually."
                        : "The detected boxes should line up with <<Full Name>> and <<ID>>."}
                  </p>
                </div>
                <div className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {detectionBusy
                    ? "Detecting"
                    : detectionError
                      ? "Needs review"
                      : "Ready"}
                </div>
              </div>

              {detectionError && (
                <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  {detectionError}
                </div>
              )}

              {previewUrl && previewSize && draftLayout && (
                <LayoutPreview
                  fileUrl={previewUrl}
                  imageWidth={previewSize.width}
                  imageHeight={previewSize.height}
                  layout={draftLayout}
                  onLayoutChange={setDraftLayout}
                />
              )}

              {previewUrl && previewSize && draftLayout && (
                <div className="mt-4">
                  <LayoutEditor
                    layout={draftLayout}
                    detectionReady={Boolean(detectedLayout)}
                    onChange={setDraftLayout}
                    onReset={() =>
                      setDraftLayout(
                        detectedLayout
                          ? cloneLayout(detectedLayout)
                          : cloneDefaultLayout(),
                      )
                    }
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
            <svg
              className="w-5 h-5 text-red-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M10.29 3.86l-7.82 13.5A2 2 0 004.2 20h15.6a1.99 1.99 0 001.73-2.64l-7.82-13.5a2 2 0 00-3.42 0z"
              />
            </svg>

            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {note && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
            <svg
              className="w-5 h-5 text-amber-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01M10.3 3.6l-7.2 12.5A2 2 0 004.8 19h14.4a1.99 1.99 0 001.7-2.9L13.7 3.6a1.99 1.99 0 00-3.4 0z"
              />
            </svg>

            <p className="text-xs leading-5 text-amber-300">{note}</p>
          </div>
        )}

        <button
          disabled={busy || !canSubmit}
          onClick={submit}
          className="w-full h-12 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-950/20 transition-all hover:bg-indigo-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
        >
          {busy ? "Saving" : "Save Workshop"}
        </button>

        <div className="flex items-start gap-2 rounded-xl bg-slate-900 border border-slate-800 px-4 py-3">
          <svg
            className="w-4 h-4 text-slate-500 mt-0.5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              d="M13 16h-1v-4h-1m1-4h.01M12 21a9 9 0 100-18 9 9 0 000 18z"
            />
          </svg>

          <p className="text-xs leading-5 text-slate-500">
            Upload the certificate artwork and the portal will try to detect the
            &lt;&lt;Full Name&gt;&gt; and &lt;&lt;ID&gt;&gt; placeholders
            automatically, then save the measured layout into the workshop
            registry. If detection fails, the workshop is still added with the
            default layout and you&apos;ll need to adjust the placeholder
            positions manually.
          </p>
        </div>
      </div>
    </section>
  );
}

export function AddParticipantsForm({
  workshops,
  onDone,
}: {
  workshops: WorkshopSummary[];
  onDone: (statusMsg: string) => void;
}) {
  const toast = useAdminToast();
  const queryClient = useQueryClient();
  const addMutation = useMutation({
    mutationFn: (input: { workshop: string; userIds: string[] }) =>
      addParticipants(input.workshop, input.userIds),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "workshop-details"] }),
        queryClient.invalidateQueries({ queryKey: ["certificate-lookup"] }),
      ]);
    },
  });
  const [workshop, setWorkshop] = useState("");
  const [entries, setEntries] = useState([""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);

  async function submit() {
    if (!workshop) {
      setError("Select a workshop first.");
      return;
    }
    const parsed = addParticipantsSchema.safeParse({ workshop, userIds: entries });
    if (!parsed.success) {
      setError(validationMessage(parsed.error));
      return;
    }
    setBusy(true);
    setError(null);
    setSkipped([]);
    try {
      const data = await addMutation.mutateAsync(parsed.data);
      onDone(
        `${data.added} participant(s) added:\n${data.assignedIds.join("\n")}`,
      );
      setSkipped(data.skipped || []);
      toast({
        title: "Participants added",
        description: `${data.added} participant record(s) saved.`,
        tone: "success",
      });
      if (data.skipped?.length)
        toast({
          title: "Some entries were skipped",
          description: `${data.skipped.length} duplicate or invalid ID(s) need review.`,
          tone: "info",
        });
      setEntries([""]);
    } catch (e: any) {
      setError(e.message);
      toast({
        title: "Could not add participants",
        description: e.message,
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-xl shadow-slate-950/10">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">Add Users to Workshop</h2>

        <p className="mt-1 text-sm text-slate-400">Add registered users to this workshop using their assigned user IDs.</p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">
            Workshop
          </label>

          <select
            className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-medium text-white outline-none transition-all hover:border-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            value={workshop}
            onChange={(e) => setWorkshop(e.target.value)}
          >
            <option value="" className="bg-slate-900 text-slate-400">
              Select workshop
            </option>

            {workshops.map((w) => (
              <option
                key={w.key}
                value={w.key}
                className="bg-slate-900 text-white"
              >
                {w.workshopName} ({w.key})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-4">
          {entries.map((entry, index) => (
            <div key={index} className="flex gap-2">
              <label className="min-w-0 flex-1 text-xs font-medium text-slate-300">
                Assigned User ID {index + 1}
                <InputField
                  aria-label={`Assigned user ID ${index + 1}`}
                  value={entry}
                  validationSchema={userIdSchema}
                  onChange={(event) => setEntries((current) => current.map((item, row) => row === index ? event.target.value : item))}
                  placeholder="CBSU-000001"
                  autoComplete="off"
                  className="mt-1.5 h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500"
                />
              </label>
              <button type="button" aria-label={`Remove user ID row ${index + 1}`} disabled={entries.length === 1} onClick={() => setEntries((current) => current.filter((_, row) => row !== index))} className="mt-5 h-11 rounded-lg border border-slate-700 px-3 text-slate-400 hover:border-red-500/50 hover:text-red-300 disabled:opacity-30">×</button>
            </div>
          ))}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setEntries((current) => [...current, ""])}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-indigo-500/50 hover:text-indigo-200"
            >
              + Add another user ID
            </button>
            <p className="text-xs text-slate-500">Find assigned IDs on the Users page.</p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
              <svg
                className="h-4 w-4 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M10.29 3.86l-7.82 13.5A2 2 0 004.2 20h15.6a1.99 1.99 0 001.73-2.64l-7.82-13.5a2 2 0 00-3.42 0z"
                />
              </svg>
            </div>

            <p className="pt-1 text-sm text-red-300">{error}</p>
          </div>
        )}

        {skipped.length > 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                <svg
                  className="h-4 w-4 text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01M10.3 3.6l-7.2 12.5A2 2 0 004.8 19h14.4a2 2 0 001.7-2.9L13.7 3.6a2 2 0 00-3.4 0z"
                  />
                </svg>
              </div>

              <p className="text-sm font-semibold text-amber-300">
                Skipped {skipped.length} line(s)
              </p>
            </div>

            <ul className="mt-3 list-disc space-y-1.5 pl-11 text-xs text-amber-300/80">
              {skipped.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          disabled={
            busy || !workshop
          }
          onClick={submit}
          className="h-12 w-full rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-lg shadow-indigo-950/20 transition-all hover:bg-indigo-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
        >
          {busy ? "Adding users" : "Add Users to Workshop"}
        </button>
      </div>
    </section>
  );
}
