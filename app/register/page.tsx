import type { Metadata } from "next";
import RegisterPageContent from "@/app/register/RegisterPageContent";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = {
  title: "Register for a CBS Event",
  description: "Register for an upcoming Character Building Society event.",
};

export default function RegisterPage() {
  return (
    <PageShell>
      <RegisterPageContent />
    </PageShell>
  );
}
