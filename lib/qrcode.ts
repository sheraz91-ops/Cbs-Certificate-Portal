import QRCode from "qrcode";

/**
 * Builds the verification URL encoded into every certificate's QR code.
 * Uses the current browser origin so it always resolves correctly —
 * on localhost while developing, on a Vercel preview URL, or on a
 * custom production domain — with zero configuration.
 */
export function buildVerifyUrl(formattedId: string): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "";
  return `${origin}/verify?id=${encodeURIComponent(formattedId)}`;
}

/**
 * Generates a QR code as a PNG data URL for the given verification URL.
 */
export async function generateQrDataUrl(
  verifyUrl: string,
  sizePx: number
): Promise<string> {
  return QRCode.toDataURL(verifyUrl, {
    width: sizePx,
    margin: 1,
    errorCorrectionLevel: "M",
    color: {
      dark: "#0b1c47",
      light: "#ffffff",
    },
  });
}

/** Converts a `data:image/png;base64,...` URL into raw PNG bytes. */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
