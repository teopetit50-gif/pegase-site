import type { Metadata } from "next";
import Tableaux from "@/components/omega/Tableaux";
import { lireLignes } from "@/lib/omega/donnees";

export const metadata: Metadata = { title: "Vue d'ensemble" };

export default async function Page() {
  const lignes = await lireLignes();
  return (
    <div className="v2-page om-page om-page--large">
      <div className="v2-tete">
        <h1>Vue d&apos;ensemble</h1>
      </div>
      <Tableaux lignes={lignes} />
    </div>
  );
}
