/* Les petites briques communes aux trois écrans client (05/10/2026) :
   pastille d'état, avis, ruban de source, état vide, témoin de chargement.
   Sans « use client » : elles ne portent pas d'état et servent des deux
   côtés. */

import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import type { Source } from "./source";

export type Teinte = "vert" | "ambre" | "rouge" | "bleu" | "gris" | "noir";

export function Pastille({
  teinte = "gris",
  contour,
  children,
  title,
}: {
  teinte?: Teinte;
  contour?: boolean;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <span className={`esp-pastille${contour ? " esp-pastille--contour" : ""}`} data-teinte={teinte} title={title}>
      {children}
    </span>
  );
}

const ICONES = {
  vert: CheckCircle2,
  ambre: AlertTriangle,
  rouge: XCircle,
  bleu: Info,
  gris: Info,
  noir: Info,
};

export function Avis({
  teinte = "gris",
  children,
  role,
}: {
  teinte?: Teinte;
  children: React.ReactNode;
  role?: "status" | "alert";
}) {
  const Icone = ICONES[teinte];
  return (
    <div className="esp-avis" data-teinte={teinte} role={role}>
      <Icone className="esp-avis-icone" aria-hidden="true" strokeWidth={1.8} />
      <div>{children}</div>
    </div>
  );
}

export function Ruban({ source }: { source: Source }) {
  return (
    <span className="esp-ruban" data-source={source}>
      <span className="esp-ruban-point" aria-hidden="true" />
      {source === "reelle" ? "Base réelle" : "Données d'exemple"}
    </span>
  );
}

export function Vide({ titre, children }: { titre: string; children?: React.ReactNode }) {
  return (
    <div className="esp-vide">
      <strong>{titre}</strong>
      {children}
    </div>
  );
}

export function Chargement({ texte = "Chargement…" }: { texte?: string }) {
  return (
    <div className="esp-charge" role="status" aria-live="polite">
      <Loader variant="spin" />
      <span>{texte}</span>
    </div>
  );
}

/* Un couple étiquette / valeur d'une liste de définitions. */
export function Def({ etiquette, children, fort }: { etiquette: string; children: React.ReactNode; fort?: boolean }) {
  return (
    <div>
      <dt>{etiquette}</dt>
      <dd className={fort ? "esp-def-fort" : undefined}>{children}</dd>
    </div>
  );
}
