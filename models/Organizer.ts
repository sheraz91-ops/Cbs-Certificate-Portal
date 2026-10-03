import { model, models, Schema } from "mongoose";

const organizerSchema = new Schema({
  organizerId: { type: String, required: true, trim: true },
  emailAddress: { type: String, required: true, trim: true, lowercase: true },
  fullName: { type: String, required: true, trim: true },
  registrationNumber: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  semester: { type: String, required: true, trim: true },
  section: { type: String, required: true, trim: true },
  institute: { type: String, required: true, trim: true },
  whatsappNumber: { type: String, required: true, trim: true },
  cnic: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  workshops: { type: [String], required: true, default: [] },
  isActive: { type: Boolean, required: true, default: true },
}, { timestamps: true, versionKey: false });

organizerSchema.index({ organizerId: 1 }, { unique: true });
organizerSchema.index({ emailAddress: 1 }, { unique: true });

const OrganizerModel = models.Organizer || model("Organizer", organizerSchema);
export default OrganizerModel;
