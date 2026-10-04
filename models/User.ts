import { model, models, Schema } from "mongoose";

const userSchema = new Schema({
  userId: { type: String, required: true, trim: true },
  emailAddress: { type: String, required: true, trim: true, lowercase: true },
  fullName: { type: String, required: true, trim: true },
  registrationNumber: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  semester: { type: String, required: true, enum: ["1", "2", "3", "4", "5", "6", "7", "8", "Graduated"] },
  section: { type: String, required: true, enum: ["A", "B", "C", "D", "E", "F"] },
  institute: { type: String, required: true, trim: true },
  whatsappNumber: { type: String, required: true, trim: true },
  cnic: { type: String, required: true, trim: true, match: /^\d{5}-\d{7}-\d$/ },
  isActive: { type: Boolean, required: true, default: true },
}, { timestamps: true, versionKey: false });

userSchema.index({ userId: 1 }, { unique: true });

if (models.User && !models.User.schema.path("isActive")) delete models.User;

const UserModel = models.User || model("User", userSchema);
export default UserModel;
