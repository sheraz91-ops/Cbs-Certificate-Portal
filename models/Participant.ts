import { model, models, Schema } from "mongoose";

const participantSchema = new Schema({
  id: { type: String, required: true, trim: true },
  normalizedId: { type: String, required: true, trim: true },
  userId: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  workshop: { type: String, required: true, trim: true, lowercase: true, index: true },
  enrollmentKey: { type: String, trim: true, unique: true, sparse: true },
  attendance: { type: Boolean, required: true, default: false },
}, { timestamps: true, versionKey: false });
participantSchema.index({ workshop: 1, id: 1 }, { unique: true });
participantSchema.index({ workshop: 1, normalizedId: 1 });
participantSchema.index({ workshop: 1, userId: 1 });

const ParticipantModel = models.Participant || model("Participant", participantSchema);
export default ParticipantModel;
