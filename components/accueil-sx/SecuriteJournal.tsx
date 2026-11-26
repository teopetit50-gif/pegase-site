/* 26/11/2026 — LE JOURNAL EN CARTES (Teo : « Bento Grid », Kokonut UI, via
   21st.dev). Remplace les barres colorées de la carte « Chaque action est
   tracée » (SxSecurite).

   La version de 21st.dev demande une connexion, et le registre public de
   Kokonut UI sert aujourd'hui un autre composant (une grille de widgets à
   ressorts). Ce fichier reprend donc le DESSIN vu sur 21st.dev : des cartes
   blanches avec une icône, un titre et sa précision, une étiquette d'état
   en haut à droite et des mots-clés en pied, qui se soulèvent au survol.

   Les lignes sont des exemples de journal (prénoms et heures fictifs),
   comme les autres écrans dessinés de l'accueil. Les trois familles sont
   celles que la carte affichait : relances, factures fournisseurs,
   demandes clients. */

import { Bell, FileSearch, MessageSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Ligne = {
  Icone: LucideIcon;
  titre: string;
  detail: string;
  etat: string;
  teinte: string;
  mots: string[];
};

const LIGNES: Ligne[] = [
  {
    Icone: Bell,
    titre: "Relance envoyée",
    detail: "Validée par Maya, 10 h 42",
    etat: "Validée",
    teinte: "#2d00f7",
    mots: ["#relance", "#client"],
  },
  {
    Icone: FileSearch,
    titre: "Facture fournisseur contrôlée",
    detail: "Montant et TVA vérifiés, 11 h 05",
    etat: "Contrôlée",
    teinte: "#f06a00",
    mots: ["#achats", "#tva"],
  },
  {
    Icone: MessageSquare,
    titre: "Demande client traitée",
    detail: "Réponse relue par Hugo, 11 h 20",
    etat: "Validée",
    teinte: "#16a34a",
    mots: ["#demande", "#réponse"],
  },
];

export default function SecuriteJournal() {
  return (
    <ul className="flex w-[min(100%,380px)] flex-col gap-2.5" aria-label="Exemple de journal">
      {LIGNES.map(({ Icone, titre, detail, etat, teinte, mots }) => (
        <li
          key={titre}
          className="group relative overflow-hidden rounded-xl border border-[#e6e6e1] bg-white px-4 py-3.5 text-[#171717] transition-all duration-300 will-change-transform hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-12px_rgba(0,0,0,0.18)]"
        >
          {/* la trame à points de la carte Kokonut, au survol seulement */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: "radial-gradient(circle at center, rgba(0,0,0,0.04) 1px, transparent 1px) 0 0 / 4px 4px" }}
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                style={{ background: teinte + "14", color: teinte }}
              >
                <Icone className="size-4" strokeWidth={2} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-[13.5px] font-medium leading-tight">{titre}</span>
                <span className="mt-0.5 block text-[12px] text-[#84877f]">{detail}</span>
              </span>
            </div>
            <span className="shrink-0 rounded-md bg-[#f1f1ee] px-2 py-0.5 text-[11px] font-medium text-[#3d3d3d]">{etat}</span>
          </div>
          <div className="relative mt-2.5 flex gap-1.5 pl-11">
            {mots.map((m) => (
              <span key={m} className="rounded-md bg-[#f5f5f2] px-1.5 py-0.5 text-[11px] text-[#84877f]">
                {m}
              </span>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
