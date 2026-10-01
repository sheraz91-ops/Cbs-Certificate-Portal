import { redirect } from "next/navigation";

export default function LegacyAllWorkshopsPage() {
  redirect("/admin/workshops/manage");
}
