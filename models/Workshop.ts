import { model, models, Schema, type InferSchemaType } from "mongoose";
import type { LayoutConfig } from "@/config/workshops";

const workshopSchema = new Schema({
  key: { type: String, required: true, unique: true, trim: true, lowercase: true },
  workshopName: { type: String, required: true, trim: true },
  workshopFullTitle: { type: String, required: true, trim: true },
  workshopCode: { type: String, required: true, trim: true, uppercase: true },
  eventYear: { type: String, required: true, trim: true },
  eventDate: { type: String, required: true, trim: true },
  organizedBy: { type: String, required: true, trim: true },
  templatePath: { type: String, required: true },
  layout: { type: Schema.Types.Mixed, required: true },
  templateData: { type: String, default: null },
}, { timestamps: true, versionKey: false });

export type WorkshopDocument = InferSchemaType<typeof workshopSchema> & { layout: LayoutConfig };
const WorkshopModel = models.Workshop || model("Workshop", workshopSchema);
export default WorkshopModel;
