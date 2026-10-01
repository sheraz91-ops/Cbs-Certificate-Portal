import WorkshopDetails from "./WorkshopDetails";

export default async function WorkshopDetailsPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <WorkshopDetails workshopKey={key} />;
}
