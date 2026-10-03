import ParticipantModel from "@/models/Participant";
import ParticipantSequenceModel from "@/models/ParticipantSequence";

/** Atomically allocate workshop certificate numbers, accounting for legacy records. */
export async function allocateParticipantIds(workshop: string, count: number): Promise<string[]> {
  if (!Number.isInteger(count) || count < 1) throw new Error("Participant ID count must be positive");

  const counterExists = await ParticipantSequenceModel.exists({ _id: workshop });
  if (!counterExists) {
    const records = await ParticipantModel.find({ workshop }).select("id normalizedId").lean();
    const currentMax = records.reduce((max, record) => {
      const normalized = Number.parseInt(record.normalizedId, 10) || 0;
      const numeric = normalized || Number.parseInt(record.id.replace(/\D/g, ""), 10) || 0;
      return Math.max(max, numeric);
    }, 0);
    try {
      await ParticipantSequenceModel.create({ _id: workshop, sequence: currentMax });
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) throw error;
    }
  }

  const counter = await ParticipantSequenceModel.findOneAndUpdate(
    { _id: workshop },
    { $inc: { sequence: count } },
    { new: true },
  );
  if (!counter) throw new Error("Unable to allocate participant IDs");
  const firstId = counter.sequence - count + 1;
  return Array.from({ length: count }, (_, index) => String(firstId + index));
}
