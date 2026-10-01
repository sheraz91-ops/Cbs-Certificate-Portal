/** Workshop enrollment used by certificate lookup and admin workshop pages. */
export interface ParticipantRecord {
  id: string;
  normalizedId: string;
  userId: string;
  name: string;
  workshop: string;
}
