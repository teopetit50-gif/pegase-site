"use client";

/* Automatisations — la page Edge Functions de Supabase, au 1:1 (22/10/2026).

   Chaque module Omega EST une automatisation qui tourne pour l'entreprise
   (07/10, d'après les « Workflows » d'Attio). Depuis le 22/10, la page
   reprend Edge Functions : le titre, sa description et ses actions, la
   carte en trois colonnes qui dit comment un module travaille, puis la
   liste des modules en lignes à chevron, comme « Start with a template ».
   Gabarit : ./sb/sb.css. */

import Link from "next/link";
import { ChevronRight, Inbox, ShieldCheck, Workflow } from "lucide-react";
import { MODULES, MODULES_PRINCIPAUX, RACINE } from "./modules";
import "./sb/sb.css";

export default function Automatisations() {
  const communs = MODULES.filter((m) => MODULES_PRINCIPAUX.includes(m.cle));
  const metiers = MODULES.filter((m) => !MODULES_PRINCIPAUX.includes(m.cle));
  const lien = (cle: string) => `${RACINE}/${cle}${cle === "filed" ? "/a-payer" : ""}`;
  return (
    <div className="sb-liste v2-arrivee" style={{ maxWidth: 1200 }}>
      <div className="sb-liste-tete">
        <div>
          <h1 className="sb-titre">Automatisations</h1>
          <p className="sb-description">Chaque module est une automatisation qui travaille pour vous.</p>
        </div>
        <div className="sb-actions">
          <Link href="/espace2/activite" className="v2-btn">
            Activité
          </Link>
          <Link href="/contact" className="v2-btn v2-btn--primaire">
            Demander un module
          </Link>
        </div>
      </div>

      <div className="sb-trois">
        <p className="sb-etiquette">Comment un module travaille</p>
        <div className="sb-trois-grille">
          <div>
            <strong>
              <Inbox width={16} height={16} aria-hidden="true" /> Il lit
            </strong>
            <span>Vos factures, vos messages et vos exports arrivent là où ils arrivent déjà ; le module les lit sans que vous changiez d&apos;outil.</span>
          </div>
          <div>
            <strong>
              <Workflow width={16} height={16} aria-hidden="true" /> Il prépare
            </strong>
            <span>Il contrôle, classe, rédige la relance ou la réponse, et range ce qui demande une décision.</span>
          </div>
          <div>
            <strong>
              <ShieldCheck width={16} height={16} aria-hidden="true" /> Vous décidez
            </strong>
            <span>Rien ne part sans votre accord : chaque envoi attend dans « À valider », et tout reste au journal.</span>
            <Link href="/espace2/validations" className="v2-btn">
              Ouvrir « À valider »
            </Link>
          </div>
        </div>
      </div>

      {[
        { titre: "Vos modules", liste: communs },
        { titre: "Les logiciels métier", liste: metiers },
      ].map((g) => (
        <section key={g.titre} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
          <h2 className="v2-h2">{g.titre}</h2>
          <ul className="sb-liens-liste">
            {g.liste.map((m) => (
              <li key={m.cle}>
                <Link href={lien(m.cle)}>
                  <m.icone width={16} height={16} aria-hidden="true" className="sb-liens-icone" />
                  <span className="sb-liens-texte">
                    <strong>
                      {m.nom} · {m.libelle}
                    </strong>
                    <span>{m.description}</span>
                  </span>
                  <span className="sb-liens-fin">
                    <ChevronRight width={16} height={16} aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
