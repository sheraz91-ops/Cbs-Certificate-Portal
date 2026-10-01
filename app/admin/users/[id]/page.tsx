import UserDetails from "./UserDetails";

export default async function UserDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <UserDetails userId={id} />;
}
