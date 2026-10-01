import { model, models, Schema } from "mongoose";

const userSchema = new Schema({
  userId: { type: String, required: true, trim: true },
  emailAddress: { type: String, required: true, trim: true, lowercase: true },
  fullName: { type: String, required: true, trim: true },
  registrationNumber: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  semester: { type: String, required: true, trim: true },
  section: { type: String, required: true, trim: true },
  institute: { type: String, required: true, trim: true },
  whatsappNumber: { type: String, required: true, trim: true },
  cnic: { type: String, required: true, trim: true },
}, { timestamps: true, versionKey: false });

userSchema.index({ userId: 1 }, { unique: true });

const UserModel = models.User || model("User", userSchema);
export default UserModel;
