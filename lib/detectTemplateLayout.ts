import type { LayoutConfig } from "@/config/workshops";

type Box = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  area: number;
  color: string;
};

type SearchRegion = {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
};

const DARK_THRESHOLD = 170;
const MIN_COMPONENT_AREA = 150;

const NAME_REGION: SearchRegion = { x1: 0.18, x2: 0.88, y1: 0.28, y2: 0.66 };
const ID_REGION: SearchRegion = { x1: 0.48, x2: 0.96, y1: 0.58, y2: 0.92 };

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load certificate template image"));
    };
    image.src = url;
  });
}

function averageColor(pixels: Uint8ClampedArray, width: number, points: number[]): string {
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;

  for (const index of points) {
    red += pixels[index];
    green += pixels[index + 1];
    blue += pixels[index + 2];
    count += 1;
  }

  if (count === 0) return "#222222";

  const toHex = (value: number) => value.toString(16).padStart(2, "0");
  return `#${toHex(Math.round(red / count))}${toHex(Math.round(green / count))}${toHex(Math.round(blue / count))}`;
}

function regionBounds(region: SearchRegion, width: number, height: number) {
  return {
    x1: Math.max(0, Math.floor(region.x1 * width)),
    x2: Math.min(width - 1, Math.ceil(region.x2 * width)),
    y1: Math.max(0, Math.floor(region.y1 * height)),
    y2: Math.min(height - 1, Math.ceil(region.y2 * height)),
  };
}

function isDarkPixel(pixels: Uint8ClampedArray, index: number): boolean {
  const red = pixels[index];
  const green = pixels[index + 1];
  const blue = pixels[index + 2];
  const alpha = pixels[index + 3];
  if (alpha < 40) return false;
  const luminance = (red + green + blue) / 3;
  return luminance < DARK_THRESHOLD;
}

function findTextComponent(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  region: SearchRegion,
  scoreMode: "wide" | "compact"
): Box {
  const bounds = regionBounds(region, width, height);
  const regionWidth = bounds.x2 - bounds.x1 + 1;
  const regionHeight = bounds.y2 - bounds.y1 + 1;
  const visited = new Uint8Array(regionWidth * regionHeight);

  const indexInRegion = (x: number, y: number) => (y - bounds.y1) * regionWidth + (x - bounds.x1);
  const globalIndex = (x: number, y: number) => (y * width + x) * 4;

  let best: Box | null = null;

  for (let y = bounds.y1; y <= bounds.y2; y += 1) {
    for (let x = bounds.x1; x <= bounds.x2; x += 1) {
      if (visited[indexInRegion(x, y)]) continue;
      const pixelIndex = globalIndex(x, y);
      if (!isDarkPixel(pixels, pixelIndex)) continue;

      const queue: Array<[number, number]> = [[x, y]];
      visited[indexInRegion(x, y)] = 1;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let area = 0;
      const sampleIndices: number[] = [];

      while (queue.length > 0) {
        const current = queue.pop();
        if (!current) continue;
        const [cx, cy] = current;
        const currentIndex = globalIndex(cx, cy);
        area += 1;
        sampleIndices.push(currentIndex);

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const neighbors = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ];

        for (const [nx, ny] of neighbors) {
          if (nx < bounds.x1 || nx > bounds.x2 || ny < bounds.y1 || ny > bounds.y2) continue;
          const regionIndex = indexInRegion(nx, ny);
          if (visited[regionIndex]) continue;
          visited[regionIndex] = 1;
          if (isDarkPixel(pixels, globalIndex(nx, ny))) {
            queue.push([nx, ny]);
          }
        }
      }

      if (area < MIN_COMPONENT_AREA) continue;

      const box = {
        left: minX,
        right: maxX,
        top: minY,
        bottom: maxY,
        area,
        color: averageColor(pixels, width, sampleIndices),
      };

      const boxWidth = box.right - box.left + 1;
      const boxHeight = box.bottom - box.top + 1;
      const aspect = boxWidth / Math.max(boxHeight, 1);
      const regionCenterY = (bounds.y1 + bounds.y2) / 2;
      const boxCenterY = (box.top + box.bottom) / 2;
      const centerPenalty = Math.abs(boxCenterY - regionCenterY) / Math.max(regionHeight, 1);

      const score =
        scoreMode === "wide"
          ? box.area * Math.min(aspect, 15) * (1 - centerPenalty * 0.5)
          : box.area * Math.min(8 / Math.max(aspect, 1), 8) * (1 - centerPenalty * 0.35);

      if (!best) {
        best = box;
        (best as Box & { score?: number }).score = score;
        continue;
      }

      const currentBestScore = (best as Box & { score?: number }).score ?? 0;
      if (score > currentBestScore) {
        best = box;
        (best as Box & { score?: number }).score = score;
      }
    }
  }

  if (!best) {
    throw new Error("Could not detect certificate placeholders in the uploaded template");
  }

  return best;
}

function colorToTextFieldColor(color: string): string {
  return color;
}

export async function detectTemplateLayout(file: File): Promise<LayoutConfig> {
  const image = await loadImageFromFile(file);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas rendering is unavailable in this browser");
  }

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  const nameBox = findTextComponent(pixels, canvas.width, canvas.height, NAME_REGION, "wide");
  const idBox = findTextComponent(pixels, canvas.width, canvas.height, ID_REGION, "compact");

  const width = canvas.width;
  const height = canvas.height;
  const padX = Math.max(8, Math.round(width * 0.012));
  const padY = Math.max(8, Math.round(height * 0.018));

  return {
    nameField: {
      centerXRatio: (nameBox.left + nameBox.right + 1) / 2 / width,
      centerYRatio: (nameBox.top + nameBox.bottom + 1) / 2 / height,
      maskBox: {
        leftRatio: Math.max(0, (nameBox.left - padX) / width),
        rightRatio: Math.min(1, (nameBox.right + padX) / width),
        topRatio: Math.max(0, (nameBox.top - padY) / height),
        bottomRatio: Math.min(1, (nameBox.bottom + padY) / height),
      },
      font: "serif",
      color: colorToTextFieldColor(nameBox.color),
      maxFontSize: 42,
      minFontSize: 16,
      maxWidthRatio: Math.min(0.8, Math.max(0.4, (nameBox.right - nameBox.left + 1) / width + 0.08)),
    },
    idField: {
      startXRatio: Math.max(0, (idBox.left - padX) / width),
      centerYRatio: (idBox.top + idBox.bottom + 1) / 2 / height,
      maskBox: {
        leftRatio: Math.max(0, (idBox.left - padX) / width),
        rightRatio: Math.min(1, (idBox.right + padX) / width),
        topRatio: Math.max(0, (idBox.top - padY) / height),
        bottomRatio: Math.min(1, (idBox.bottom + padY) / height),
      },
      font: "sans-bold",
      color: colorToTextFieldColor(idBox.color),
      label: "",
      maxFontSize: 18,
      minFontSize: 8,
      maxWidthRatio: Math.min(0.5, Math.max(0.12, (idBox.right - idBox.left + 1) / width + 0.05)),
    },
    qrField: {
      box: {
        leftRatio: 0.8219,
        rightRatio: 0.9116,
        topRatio: 0.2533,
        bottomRatio: 0.373,
      },
      caption: "SCAN TO VERIFY",
      captionCenterXRatio: 0.8667,
      captionCenterYRatio: 0.3859,
      captionFontSize: 8.5,
      captionColor: "#0b1c47",
    },
    maskColor: "#f9f9f9",
  };
}