import { model, models, Schema } from "mongoose";

const userRegistrationFieldSchema = new Schema({
  key: { type: String, required: true, trim: true },
  label: { type: String, required: true, trim: true },
  required: { type: Boolean, required: true, default: false },
  type: { type: String, enum: ["text", "yes_no", "checkbox"], default: "text" },
  choices: { type: [String], default: [] },
  selectionMode: { type: String, enum: ["multiple", "single"], default: "multiple" },
}, { _id: false });

const userRegistrationFormSchema = new Schema({
  _id: { type: String, default: "user-registration-form" },
  fields: {
    type: [userRegistrationFieldSchema],
    required: true,
  },
}, { versionKey: false, collection: "user_registration_form" });

const UserRegistrationFormModel = models.UserRegistrationForm || model("UserRegistrationForm", userRegistrationFormSchema);
export default UserRegistrationFormModel;
