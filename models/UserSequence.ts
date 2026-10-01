import { model, models, Schema } from "mongoose";

const userSequenceSchema = new Schema({
  _id: { type: String, required: true },
  sequence: { type: Number, required: true, default: 0 },
}, { versionKey: false, collection: "user_sequences" });

const UserSequenceModel = models.UserSequence || model("UserSequence", userSequenceSchema);
export default UserSequenceModel;
