import OrganizerModel from "@/models/Organizer";

let indexPromise: Promise<void> | undefined;

/** Update databases created before organizer email became optional. */
export function ensureOrganizerEmailIndex(): Promise<void> {
  if (!indexPromise) {
    indexPromise = (async () => {
      let indexes: Awaited<ReturnType<typeof OrganizerModel.collection.indexes>>;
      try {
        indexes = await OrganizerModel.collection.indexes();
      } catch (error) {
        if (!error || typeof error !== "object" || !("code" in error) || error.code !== 26) throw error;
        indexes = [];
      }
      const emailIndex = indexes.find((index) => {
        const keys = Object.entries(index.key ?? {});
        return keys.length === 1 && keys[0][0] === "emailAddress" && keys[0][1] === 1 && index.unique;
      });

      if (emailIndex && (!emailIndex.sparse || emailIndex.name !== "organizer_email_unique_sparse")) {
        await OrganizerModel.collection.dropIndex(emailIndex.name!);
      }

      if (!emailIndex?.sparse || emailIndex.name !== "organizer_email_unique_sparse") {
        await OrganizerModel.collection.createIndex(
          { emailAddress: 1 },
          { unique: true, sparse: true, name: "organizer_email_unique_sparse" },
        );
      }
    })().catch((error: unknown) => {
      indexPromise = undefined;
      throw error;
    });
  }

  return indexPromise;
}
