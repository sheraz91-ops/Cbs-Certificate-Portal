import { model, models, Schema } from "mongoose";

const adminSessionSchema = new Schema({
  tokenHash: { type: String, required: true },
  passwordVersion: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false });

adminSessionSchema.index({ tokenHash: 1 }, { unique: true });
adminSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AdminSessionModel = models.AdminSession || model("AdminSession", adminSessionSchema);
export default AdminSessionModel;
