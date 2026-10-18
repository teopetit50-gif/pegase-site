import type { Metadata } from "next";
import Collection from "@/components/espace2/Collection";
import { COLLECTIONS } from "@/components/espace2/collections";

export const metadata: Metadata = {
  title: "Appels",
};

export default function Page() {
  return <Collection config={COLLECTIONS.appels} />;
}
