import { model, models, Schema, type InferSchemaType } from "mongoose";
import type { LayoutConfig } from "@/types/workshop";

const workshopSchema = new Schema({
  key: { type: String, required: true, unique: true, trim: true, lowercase: true },
  workshopName: { type: String, required: true, trim: true },
  workshopFullTitle: { type: String, required: true, trim: true },
  workshopCode: { type: String, required: true, trim: true, uppercase: true },
  eventYear: { type: String, required: true, trim: true },
  eventDate: { type: String, required: true, trim: true },
  isActive: { type: Boolean, required: true, default: true },
  isCompleted: { type: Boolean, required: true, default: false },
  allowOutsiders: { type: Boolean, required: true, default: false },
  confirmationMessage: { type: String, trim: true, maxlength: 5000, default: "" },
  registrationFields: { type: [{ key: { type: String, required: true }, label: { type: String, required: true, trim: true }, type: { type: String, enum: ["text", "yes_no", "checkbox", "matrix"], default: "text" }, choices: { type: [String], default: [] }, rows: { type: [String], default: [] }, selectionMode: { type: String, enum: ["multiple", "single"], default: "multiple" }, required: { type: Boolean, required: true, default: false } }], default: [] },
  organizedBy: { type: String, required: true, trim: true },
  templatePath: { type: String, required: true },
  layout: { type: Schema.Types.Mixed, required: true },
  templateData: { type: String, default: null },
}, { timestamps: true, versionKey: false });

export type WorkshopDocument = InferSchemaType<typeof workshopSchema> & { layout: LayoutConfig };

// In development, Next.js can retain the previously compiled Mongoose model
// after a schema change. Recompile it when the cached model lacks this field.
if (models.Workshop && (!models.Workshop.schema.path("isActive") || !models.Workshop.schema.path("isCompleted") || !models.Workshop.schema.path("confirmationMessage") || !models.Workshop.schema.path("registrationFields") || !models.Workshop.schema.path("registrationFields.type") || !models.Workshop.schema.path("registrationFields.choices") || !models.Workshop.schema.path("registrationFields.rows") || !models.Workshop.schema.path("registrationFields.selectionMode"))) {
  delete models.Workshop;
}

const WorkshopModel = models.Workshop || model("Workshop", workshopSchema);
export default WorkshopModel;
