import { model, models, Schema } from "mongoose";

const participantSequenceSchema = new Schema({
  _id: { type: String, required: true },
  sequence: { type: Number, required: true, default: 0 },
}, { versionKey: false, collection: "participant_sequences" });

const ParticipantSequenceModel = models.ParticipantSequence || model("ParticipantSequence", participantSequenceSchema);
export default ParticipantSequenceModel;
