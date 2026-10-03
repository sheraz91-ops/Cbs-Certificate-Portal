import { model, models, Schema } from "mongoose";

const organizerSchema = new Schema({
  organizerId: { type: String, required: true, trim: true },
  emailAddress: { type: String, required: true, trim: true, lowercase: true },
  fullName: { type: String, required: true, trim: true },
  registrationNumber: { type: String, required: true, trim: true, match: /^\d{4}-uam-\d{4}$/i },
  department: { type: String, required: true, trim: true },
  semester: { type: String, required: true, enum: ["1", "2", "3", "4", "5", "6", "7", "8", "Graduated"] },
  section: { type: String, required: true, enum: ["A", "B", "C", "D", "E", "F"] },
  institute: { type: String, required: true, trim: true },
  whatsappNumber: { type: String, required: true, trim: true },
  cnic: { type: String, required: true, trim: true, match: /^\d{5}-\d{7}-\d$/ },
  passwordHash: { type: String, required: true, select: false },
  workshops: { type: [String], required: true, default: [] },
  isActive: { type: Boolean, required: true, default: true },
}, { timestamps: true, versionKey: false });

organizerSchema.index({ organizerId: 1 }, { unique: true });
organizerSchema.index({ emailAddress: 1 }, { unique: true });

const OrganizerModel = models.Organizer || model("Organizer", organizerSchema);
export default OrganizerModel;
