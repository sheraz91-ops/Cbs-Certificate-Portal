import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import WorkshopModel from "@/models/Workshop";
import { errorResponse } from "@/lib/api-response";
import { workshopKeySchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params;
    const parsedKey = workshopKeySchema.safeParse(key);
    if (!parsedKey.success) return errorResponse("Invalid workshop key", 400);
    const validKey = parsedKey.data;
    await connectToDatabase();
    const workshop = await WorkshopModel.findOne({ key: validKey }).select("templateData").lean();
    if (workshop?.templateData) {
      const [metadata, payload] = workshop.templateData.split(",", 2);
      const mimeType = metadata.match(/^data:(.*);base64$/)?.[1] || "image/png";
      return new NextResponse(Buffer.from(payload, "base64"), { headers: { "Content-Type": mimeType, "Cache-Control": "public, max-age=3600" } });
    }
    const known = await WorkshopModel.exists({ key: validKey });
    if (known) {
      const staticPath = `/templates/${validKey}.png`;
      const response = await fetch(new URL(staticPath, new URL(_request.url).origin));
      if (response.ok) return new NextResponse(response.body, { headers: { "Content-Type": response.headers.get("content-type") || "image/png" } });
    }
    return errorResponse("Template not found", 404);
  } catch (error) {
    console.error("Template load error:", error);
    return errorResponse("Unable to load template");
  }
}
