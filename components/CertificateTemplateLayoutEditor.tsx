"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import InputField from "@/components/InputField";
import { layoutPercentSchema } from "@/lib/validation/schemas";
import type { LayoutConfig } from "@/types/workshop";

function clampRatio(value: number) {
  return Math.max(0, Math.min(1, value));
}

function updateBox(
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

function moveBox(
  layout: LayoutConfig,
  field: "nameField" | "idField",
  dx: number,
  dy: number,
): LayoutConfig {
  const current = layout[field];
  const maskBox = {
    leftRatio: clampRatio(current.maskBox.leftRatio + dx),
    rightRatio: clampRatio(current.maskBox.rightRatio + dx),
    topRatio: clampRatio(current.maskBox.topRatio + dy),
    bottomRatio: clampRatio(current.maskBox.bottomRatio + dy),
  };
  if (field === "nameField") {
    return {
      ...layout,
      nameField: {
        ...layout.nameField,
        centerXRatio: clampRatio(layout.nameField.centerXRatio + dx),
        centerYRatio: clampRatio(layout.nameField.centerYRatio + dy),
        maskBox,
      },
    };
  }
  return {
    ...layout,
    idField: {
      ...layout.idField,
      startXRatio: clampRatio(layout.idField.startXRatio + dx),
      centerYRatio: clampRatio(layout.idField.centerYRatio + dy),
      maskBox,
    },
  };
}

function percent(value: number) {
  return `${Math.round(value * 1000) / 10}`;
}

export default function CertificateTemplateLayoutEditor({
  imageUrl,
  layout,
  onChange,
}: {
  imageUrl: string;
  layout: LayoutConfig;
  onChange: (layout: LayoutConfig) => void;
}) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const image = new window.Image();
    image.onload = () => {
      if (!cancelled) {
        setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
      }
    };
    image.onerror = () => {
      if (!cancelled) setImageSize(null);
    };
    image.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  function startDragging(
    field: "nameField" | "idField",
    event: React.PointerEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    const preview = previewRef.current;
    if (!preview) return;
    const rect = preview.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const initial = layout;
    const handleMove = (moveEvent: PointerEvent) => {
      if (!rect.width || !rect.height) return;
      onChange(
        moveBox(
          initial,
          field,
          (moveEvent.clientX - startX) / rect.width,
          (moveEvent.clientY - startY) / rect.height,
        ),
      );
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
  }

  function setCoordinate(
    field: "nameField" | "idField",
    coordinate: "leftRatio" | "rightRatio" | "topRatio" | "bottomRatio",
    rawValue: string,
  ) {
    const value = Number(rawValue);
    if (Number.isFinite(value)) onChange(updateBox(layout, field, coordinate, value / 100));
  }

  const boxStyle = (box: LayoutConfig["nameField"]["maskBox"], color: string) => ({
    left: `${box.leftRatio * 100}%`,
    top: `${box.topRatio * 100}%`,
    width: `${(box.rightRatio - box.leftRatio) * 100}%`,
    height: `${(box.bottomRatio - box.topRatio) * 100}%`,
    borderColor: color,
    backgroundColor: `${color}22`,
  });
  const numberClass =
    "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100";

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h4 className="text-sm font-semibold text-slate-100">
        Name and ID field placement
      </h4>
      <p className="mt-1 text-xs text-slate-400">
        Drag the outlined boxes over the name and ID areas, or adjust their
        edges below.
      </p>
      {imageSize ? (
        <div
          ref={previewRef}
          className="relative mt-3 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-950"
          style={{ aspectRatio: `${imageSize.width} / ${imageSize.height}` }}
        >
          <Image
            src={imageUrl}
            alt="Certificate template with name and ID placement"
            fill
            unoptimized
            className="object-contain"
          />
          {(
            [
              ["nameField", "#60a5fa", "Name"],
              ["idField", "#f59e0b", "ID"],
            ] as const
          ).map(([field, color, label]) => (
            <div
              key={field}
              className="absolute rounded-lg border-2"
              style={boxStyle(layout[field].maskBox, color)}
            >
              <button
                type="button"
                onPointerDown={(event) => startDragging(field, event)}
                className="absolute left-1 top-1 cursor-move rounded bg-slate-950/90 px-2 py-1 text-[10px] font-bold text-white"
                aria-label={`Drag ${label} placement`}
              >
                {label} · Drag
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p role="status" className="mt-3 text-xs text-slate-400">
          Loading image dimensions…
        </p>
      )}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {(
          [
            ["nameField", "Full name", "text-blue-300"],
            ["idField", "Certificate ID", "text-amber-300"],
          ] as const
        ).map(([field, label, color]) => (
          <fieldset
            key={field}
            className="rounded-lg border border-slate-800 bg-slate-900 p-3"
          >
            <legend className={`px-1 text-xs font-semibold ${color}`}>
              {label} area
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["leftRatio", "Left %"],
                  ["rightRatio", "Right %"],
                  ["topRatio", "Top %"],
                  ["bottomRatio", "Bottom %"],
                ] as const
              ).map(([coordinate, title]) => (
                <label
                  key={coordinate}
                  className="space-y-1 text-[11px] text-slate-400"
                >
                  {title}
                  <InputField
                    type="number"
                    step="0.1"
                    validationSchema={layoutPercentSchema}
                    value={percent(layout[field].maskBox[coordinate])}
                    onChange={(event) =>
                      setCoordinate(field, coordinate, event.target.value)
                    }
                    className={numberClass}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </section>
  );
}
