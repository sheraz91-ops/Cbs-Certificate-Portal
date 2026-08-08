import {
  PAGE_WIDTH_PT,
  TEMPLATE_PIXEL_SIZE,
} from "@/config/certificate.config";
import type { CertificatePlan } from "@/types";
import { generateQrDataUrl } from "./qrcode";

/** Supersampling factor over the template's native resolution, so the
 *  exported PNG (and the on-screen preview) stay crisp on high-DPI
 *  displays and print reasonably well. */
const RENDER_SCALE = 2;

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error(`Failed to load image: ${src.slice(0, 60)}`));
    img.src = src;
  });
}

/**
 * Picks the largest font size (within min/max bounds) at which `text`
 * still fits inside `maxWidth` canvas pixels.
 */
function autoFitFontSizePx(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontFamily: string,
  maxWidth: number,
  maxFontSizePx: number,
  minFontSizePx: number
): number {
  let size = maxFontSizePx;
  while (size > minFontSizePx) {
    ctx.font = `${fontFamily.includes("bold") ? "bold " : ""}${size}px ${
      fontFamily.includes("serif") ? '"Times New Roman", Times, serif' : "Arial, Helvetica, sans-serif"
    }`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  return size;
}

/**
 * Renders the certificate onto an in-memory canvas, mirroring the exact
 * same layout ratios used by the PDF generator (config/certificate.config.ts)
 * so the on-screen preview, the downloaded PNG, and the downloaded PDF
 * all look identical.
 */
export async function renderCertificateCanvas(
  plan: CertificatePlan
): Promise<HTMLCanvasElement> {
  const width = TEMPLATE_PIXEL_SIZE.width * RENDER_SCALE;
  const height = TEMPLATE_PIXEL_SIZE.height * RENDER_SCALE;
  // Converts PDF-space point sizes into canvas pixel sizes at the same
  // relative scale, so both outputs stay visually identical.
  const fontScale = width / PAGE_WIDTH_PT;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const [templateImg, qrDataUrl] = await Promise.all([
    loadImageElement(plan.workshop.templatePath),
    generateQrDataUrl(plan.verifyUrl, 800),
  ]);
  const qrImg = await loadImageElement(qrDataUrl);

  // --- Background ---------------------------------------------------------
  ctx.drawImage(templateImg, 0, 0, width, height);

  const layout = plan.workshop.layout;
  const { nameField, idField, qrField } = layout;

  // --- Name: mask + auto-fit centered text ---------------------------------
  ctx.fillStyle = layout.maskColor;
  ctx.fillRect(
    nameField.maskBox.leftRatio * width,
    nameField.maskBox.topRatio * height,
    (nameField.maskBox.rightRatio - nameField.maskBox.leftRatio) * width,
    (nameField.maskBox.bottomRatio - nameField.maskBox.topRatio) * height
  );

  const nameMaxWidthPx = width * nameField.maxWidthRatio;
  const nameFontSizePx = autoFitFontSizePx(
    ctx,
    plan.fullName,
    nameField.font,
    nameMaxWidthPx,
    nameField.maxFontSize * fontScale,
    nameField.minFontSize * fontScale
  );
  ctx.font = `${nameFontSizePx}px "Times New Roman", Times, serif`;
  ctx.fillStyle = nameField.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    plan.fullName,
    nameField.centerXRatio * width,
    nameField.centerYRatio * height
  );

  // --- Certificate ID: mask + auto-fit left-aligned text -------------------
  ctx.fillStyle = layout.maskColor;
  ctx.fillRect(
    idField.maskBox.leftRatio * width,
    idField.maskBox.topRatio * height,
    (idField.maskBox.rightRatio - idField.maskBox.leftRatio) * width,
    (idField.maskBox.bottomRatio - idField.maskBox.topRatio) * height
  );

  const idText = `${idField.label}${plan.formattedId}`;
  const idMaxWidthPx = width * idField.maxWidthRatio;
  const idFontSizePx = autoFitFontSizePx(
    ctx,
    idText,
    idField.font,
    idMaxWidthPx,
    idField.maxFontSize * fontScale,
    idField.minFontSize * fontScale
  );
  ctx.font = `bold ${idFontSizePx}px Arial, Helvetica, sans-serif`;
  ctx.fillStyle = idField.color;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(
    idText,
    idField.startXRatio * width,
    idField.centerYRatio * height
  );

  // --- QR code + caption -----------------------------------------------------
  const qrX = qrField.box.leftRatio * width;
  const qrY = qrField.box.topRatio * height;
  const qrW = (qrField.box.rightRatio - qrField.box.leftRatio) * width;
  const qrH = (qrField.box.bottomRatio - qrField.box.topRatio) * height;
  ctx.drawImage(qrImg, qrX, qrY, qrW, qrH);

  ctx.font = `bold ${qrField.captionFontSize * fontScale}px Arial, Helvetica, sans-serif`;
  ctx.fillStyle = qrField.captionColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    qrField.caption,
    qrField.captionCenterXRatio * width,
    qrField.captionCenterYRatio * height
  );

  return canvas;
}

/** Converts a canvas to a PNG data URL (used for the on-screen preview). */
export function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

/** Converts a canvas to raw PNG bytes (used for the download button). */
export function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("Failed to export canvas as PNG"));
        return;
      }
      const buffer = await blob.arrayBuffer();
      resolve(new Uint8Array(buffer));
    }, "image/png");
  });
}
