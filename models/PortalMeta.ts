import { model, models, Schema } from "mongoose";

const portalMetaSchema = new Schema({
  key: { type: String, required: true, unique: true },
  completedAt: { type: Date, required: true },
}, { versionKey: false });

const PortalMetaModel = models.PortalMeta || model("PortalMeta", portalMetaSchema);
export default PortalMetaModel;
