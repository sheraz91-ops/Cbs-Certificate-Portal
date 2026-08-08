import CertificateForm from "@/components/CertificateForm";
import Header from "@/components/Header";
import PageShell from "@/components/PageShell";

export default function HomePage() {
  return (
    <PageShell>
      <Header />
      <CertificateForm />
    </PageShell>
  );
}
