import type { Metadata } from "next";
import { Suspense } from "react";
import Notes from "@/components/espace3/Notes";

export const metadata: Metadata = {
  title: "Notes",
};

/* la page Notes, sur le document de projet de Linear (28/10/2026) — components/espace3/Notes */
export default function Page() {
  return (
    <Suspense>
      <Notes />
    </Suspense>
  );
}
