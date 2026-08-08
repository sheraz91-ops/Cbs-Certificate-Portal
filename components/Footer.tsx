import { ORG_CONFIG } from "@/config/certificate.config";

export default function Footer() {
  return (
    <footer className="w-full text-center py-8 text-xs text-navy-200/50 animate-fade-in">
      <p>
        &copy; {new Date().getFullYear()} {ORG_CONFIG.organizationName} (
        {ORG_CONFIG.institutionAbbreviation}). All rights reserved.
      </p>
      <p className="mt-1">
        Having trouble downloading your certificate? Contact your event
        coordinator.
      </p>
    </footer>
  );
}
