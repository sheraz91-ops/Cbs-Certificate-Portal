import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { PAGE_HEIGHT_PT, PAGE_WIDTH_PT } from "@/config/certificate.config";
import type { CertificatePlan } from "@/types";
import { dataUrlToBytes, generateQrDataUrl } from "./qrcode";

/** Converts a top-left-origin ratio into a PDF y-coordinate (bottom-up). */
function toPdfY(topRatio: number): number {
  return PAGE_HEIGHT_PT - topRatio * PAGE_HEIGHT_PT;
}

function toPdfX(ratio: number): number {
  return ratio * PAGE_WIDTH_PT;
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return rgb(r, g, b);
}

/** Fetches a static asset (e.g. the template PNG) as raw bytes. */
async function loadAssetBytes(path: string): Promise<ArrayBuffer> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Unable to load asset: ${path}`);
  }
  return res.arrayBuffer();
}

/**
 * Picks the largest font size (within min/max bounds) at which `text`
 * still fits inside `maxWidth` points, so long names/IDs never overflow
 * their designated area on the certificate.
 */
function autoFitFontSize(
  text: string,
  font: PDFFont,
  maxWidth: number,
  maxFontSize: number,
  minFontSize: number
): number {
  let size = maxFontSize;
  while (size > minFontSize) {
    const width = font.widthOfTextAtSize(text, size);
    if (width <= maxWidth) break;
    size -= 0.5;
  }
  return size;
}

/**
 * Generates a print-quality certificate PDF for the given certificate
 * plan and returns the raw PDF bytes. All rendering happens
 * client-side — no backend involved beyond fetching the static
 * template image that ships with the app.
 */
export async function generateCertificatePdf(
  plan: CertificatePlan
): Promise<Uint8Array> {
  const { fullName, formattedId, verifyUrl, workshop } = plan;
  const layout = workshop.layout;

  const [templateBytes, qrDataUrl] = await Promise.all([
    loadAssetBytes(workshop.templatePath),
    generateQrDataUrl(verifyUrl, 400),
  ]);
  const qrBytes = dataUrlToBytes(qrDataUrl);

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);

  // --- Background artwork ---------------------------------------------------
  const templateImage = await pdfDoc.embedPng(templateBytes);
  page.drawImage(templateImage, {
    x: 0,
    y: 0,
    width: PAGE_WIDTH_PT,
    height: PAGE_HEIGHT_PT,
  });

  // --- Fonts ------------------------------------------------------------------
  const nameFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const idFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const captionFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const maskFill = hexToRgb(layout.maskColor);

  // --- Mask + draw participant name -------------------------------------------
  const { nameField, idField, qrField } = layout;

  page.drawRectangle({
    x: toPdfX(nameField.maskBox.leftRatio),
    y: toPdfY(nameField.maskBox.bottomRatio),
    width:
      toPdfX(nameField.maskBox.rightRatio) -
      toPdfX(nameField.maskBox.leftRatio),
    height:
      toPdfY(nameField.maskBox.topRatio) -
      toPdfY(nameField.maskBox.bottomRatio),
    color: maskFill,
  });

  const maxNameWidth = PAGE_WIDTH_PT * nameField.maxWidthRatio;
  const nameFontSize = autoFitFontSize(
    fullName,
    nameFont,
    maxNameWidth,
    nameField.maxFontSize,
    nameField.minFontSize
  );
  const nameWidth = nameFont.widthOfTextAtSize(fullName, nameFontSize);
  const nameHeight = nameFont.heightAtSize(nameFontSize);
  const nameX = toPdfX(nameField.centerXRatio) - nameWidth / 2;
  const nameY = toPdfY(nameField.centerYRatio) - nameHeight * 0.36;

  page.drawText(fullName, {
    x: nameX,
    y: nameY,
    size: nameFontSize,
    font: nameFont,
    color: hexToRgb(nameField.color),
  });

  // --- Mask + draw certificate ID ----------------------------------------------
  page.drawRectangle({
    x: toPdfX(idField.maskBox.leftRatio),
    y: toPdfY(idField.maskBox.bottomRatio),
    width:
      toPdfX(idField.maskBox.rightRatio) - toPdfX(idField.maskBox.leftRatio),
    height:
      toPdfY(idField.maskBox.topRatio) - toPdfY(idField.maskBox.bottomRatio),
    color: maskFill,
  });

  const idText = `${idField.label}${formattedId}`;
  const maxIdWidth = PAGE_WIDTH_PT * idField.maxWidthRatio;
  const idFontSize = autoFitFontSize(
    idText,
    idFont,
    maxIdWidth,
    idField.maxFontSize,
    idField.minFontSize
  );
  const idHeight = idFont.heightAtSize(idFontSize);
  const idY = toPdfY(idField.centerYRatio) - idHeight * 0.36;

  page.drawText(idText, {
    x: toPdfX(idField.startXRatio),
    y: idY,
    size: idFontSize,
    font: idFont,
    color: hexToRgb(idField.color),
  });

  // --- QR code + caption ---------------------------------------------------------
  const qrImage = await pdfDoc.embedPng(qrBytes);
  const qrX = toPdfX(qrField.box.leftRatio);
  const qrY = toPdfY(qrField.box.bottomRatio);
  const qrWidth = toPdfX(qrField.box.rightRatio) - toPdfX(qrField.box.leftRatio);
  const qrHeight =
    toPdfY(qrField.box.topRatio) - toPdfY(qrField.box.bottomRatio);

  page.drawImage(qrImage, { x: qrX, y: qrY, width: qrWidth, height: qrHeight });

  const captionWidth = captionFont.widthOfTextAtSize(
    qrField.caption,
    qrField.captionFontSize
  );
  page.drawText(qrField.caption, {
    x: toPdfX(qrField.captionCenterXRatio) - captionWidth / 2,
    y: toPdfY(qrField.captionCenterYRatio),
    size: qrField.captionFontSize,
    font: captionFont,
    color: hexToRgb(qrField.captionColor),
  });

  // --- Metadata --------------------------------------------------------------
  pdfDoc.setTitle(`Certificate of Participation - ${fullName}`);
  pdfDoc.setSubject(`Certificate ${formattedId}`);
  pdfDoc.setProducer("CBS Certificate Portal");
  pdfDoc.setCreator("CBS Certificate Portal");

  return pdfDoc.save();
}

/** Triggers a browser download of arbitrary bytes as a file. */
export function downloadBytes(
  bytes: Uint8Array,
  fileName: string,
  mimeType: string
): void {
  const blob = new Blob([bytes as unknown as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Triggers a browser download of the generated PDF bytes. */
export function downloadPdf(bytes: Uint8Array, fileName: string): void {
  downloadBytes(bytes, fileName, "application/pdf");
}
