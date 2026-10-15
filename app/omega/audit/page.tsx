import type { Metadata } from "next";
import AuditOmega from "@/components/omega/AuditOmega";

export const metadata: Metadata = { title: "Audit" };

export default function Page() {
  return <AuditOmega />;
}
