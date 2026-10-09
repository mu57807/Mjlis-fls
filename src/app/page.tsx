import { connection } from "next/server";
import { isDemoMode } from "@/lib/claude/structure";
import { NewIncidentForm } from "@/components/NewIncidentForm";

export default async function HomePage() {
  // Read settings at request time, not build time.
  await connection();
  return <NewIncidentForm demoMode={isDemoMode()} />;
}
