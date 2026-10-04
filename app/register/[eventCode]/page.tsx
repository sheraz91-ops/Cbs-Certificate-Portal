import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import RegisterPageContent from "@/app/register/RegisterPageContent";

export const metadata: Metadata = {
  title: "Register for an Event",
  description: "Review an event and register with CBS.",
};

export default async function RegisterForEventPage({
  params,
}: {
  params: Promise<{ eventCode: string }>;
}) {
  const { eventCode } = await params;

  return (
    <PageShell>
      <RegisterPageContent eventCode={eventCode} />
    </PageShell>
  );
}
