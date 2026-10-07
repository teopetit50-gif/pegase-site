"use client";

/* Automatisations — l'équivalent des « Workflows » d'Attio, dit à notre
   façon : chaque module Omega EST une automatisation qui tourne pour
   l'entreprise. La page les liste avec ce qu'ils font, et mène à chacun. */

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { MODULES, RACINE } from "./modules";

export default function Automatisations() {
  return (
    <div className="v2-page v2-page--etroite v2-arrivee">
      <h1 className="v2-sr">Automatisations</h1>
      <div className="v2-tete">
        <p style={{ margin: 0 }}>Chaque module est une automatisation qui travaille pour vous. Ouvrez-en un pour voir ce qu&apos;il a fait et ce qui attend votre accord.</p>
      </div>
      <ul className="v2-carte v2-liste">
        {MODULES.map((m) => (
          <li key={m.cle} className="v2-liste-item">
            <m.icone width={18} height={18} aria-hidden="true" style={{ flexShrink: 0 }} />
            <Link href={`${RACINE}/${m.cle}${m.cle === "filed" ? "/a-payer" : ""}`} className="v2-liste-texte" style={{ color: "inherit" }}>
              <span>
                <strong style={{ fontWeight: 500 }}>{m.nom}</strong> · {m.libelle}
              </span>
              <small>{m.description}</small>
            </Link>
            <ChevronRight width={16} height={16} aria-hidden="true" />
          </li>
        ))}
      </ul>
    </div>
  );
}
