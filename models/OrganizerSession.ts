import { model, models, Schema } from "mongoose";

const organizerSessionSchema = new Schema({
  organizerId: { type: Schema.Types.ObjectId, required: true, ref: "Organizer" },
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false });

organizerSessionSchema.index({ tokenHash: 1 }, { unique: true });
organizerSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OrganizerSessionModel = models.OrganizerSession || model("OrganizerSession", organizerSessionSchema);
export default OrganizerSessionModel;
