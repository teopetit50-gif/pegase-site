import type { Metadata } from "next";
import { Refusees } from "@/components/espace2/filed/Refusees";

/* /espace2/filed/refusees — FILED, les factures refusées : à reprendre ou à classer sans suite (26/10/2026). */

export const metadata: Metadata = {
  title: "Refusées, à reprendre ou à classer",
  description: "FILED : les factures refusées, le motif du refus, l'état de leur reprise et le classement sans suite.",
};

export default function Page() {
  return <Refusees />;
}
