import { WORKSHOPS } from "@/config/workshops";
import participantsData from "@/data/participants.json";
import type { Participant } from "@/types";
import ParticipantModel from "@/models/Participant";
import PortalMetaModel from "@/models/PortalMeta";
import WorkshopModel from "@/models/Workshop";
import { connectToDatabase } from "@/lib/mongodb";
import { normalizeParticipantId } from "@/lib/participantId";

type SeedCache = { initialized: boolean; promise: Promise<void> | null };
const globalWithSeedCache = globalThis as typeof globalThis & { seedCache?: SeedCache };
const seedCache = globalWithSeedCache.seedCache ?? { initialized: false, promise: null };
globalWithSeedCache.seedCache = seedCache;

/** Import the checked-in starter data once; all later changes live in MongoDB. */
export async function ensureDatabaseSeeded(): Promise<void> {
  if (seedCache.initialized) return;
  if (!seedCache.promise) {
    seedCache.promise = initializeDatabase().catch((error: unknown) => {
      seedCache.promise = null;
      throw error;
    });
  }
  await seedCache.promise;
  seedCache.initialized = true;
}

async function initializeDatabase(): Promise<void> {
  await connectToDatabase();
  const marker = await PortalMetaModel.exists({ key: "initial-data-v1" });
  if (!marker) {
    const workshops = WORKSHOPS.map((workshop) => ({ ...workshop }));
    await WorkshopModel.bulkWrite(workshops.map((workshop) => ({
      updateOne: { filter: { key: workshop.key }, update: { $setOnInsert: workshop }, upsert: true },
    })));

    const initialParticipants = participantsData as Participant[];
    if (initialParticipants.length) {
      await ParticipantModel.bulkWrite(initialParticipants.map((participant) => ({
        updateOne: {
          filter: { workshop: participant.workshop, id: participant.id },
          update: { $setOnInsert: { ...participant, normalizedId: normalizeParticipantId(participant.id) } },
          upsert: true,
        },
      })));
    }

    await PortalMetaModel.updateOne(
      { key: "initial-data-v1" },
      { $setOnInsert: { key: "initial-data-v1", completedAt: new Date() } },
      { upsert: true },
    );
  }

  const normalizedMarker = "participant-normalization-v1";
  if (!await PortalMetaModel.exists({ key: normalizedMarker })) {
    const participantsMissingKey = await ParticipantModel.find({ normalizedId: { $exists: false } }).select("_id id").lean();
    if (participantsMissingKey.length) {
      await ParticipantModel.bulkWrite(participantsMissingKey.map((participant) => ({
        updateOne: {
          filter: { _id: participant._id },
          update: { $set: { normalizedId: normalizeParticipantId(participant.id) } },
        },
      })));
    }
    await PortalMetaModel.updateOne(
      { key: normalizedMarker },
      { $setOnInsert: { key: normalizedMarker, completedAt: new Date() } },
      { upsert: true },
    );
  }
}

