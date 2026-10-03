import OrganizerDetails from "./OrganizerDetails";

export default async function OrganizerDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrganizerDetails organizerId={id} />;
}
