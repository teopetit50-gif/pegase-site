/* ══════════════════════════════════════════════════════════════════════
   FilPiece — la trace d'une vente dans le logiciel, du devis au paiement

   ORIGINE. `timeline` de @robertlib (21st.dev, relevé le 23/11/2026 sur
   le registre) : une liste d'événements datés reliés par un trait — un
   repère rond à pictogramme, le titre et l'heure sur une ligne, une
   phrase dessous, et au besoin un encart (ici : ce qui a été corrigé).

   CE QUI EST REPRIS TEL QUEL, taille « md » de la source : rail de
   32 px, repère de 32 px au pictogramme de 16 px, trait de 2 px,
   12 px entre rail et texte, 24 px sous chaque événement, titre en
   14 px demi-gras, heure en 12 px, encart à 8 px du texte.

   CE QUI CHANGE, et pourquoi :
   1. UN SEUL FICHIER. La source tire quatorze modules utilitaires
      (langue, fuseau, format d'heure, squelette de chargement, variante
      alternée) pour afficher des dates : les nôtres sont écrites en
      français dans la donnée, il ne reste que la liste.
   2. LE FIL EST CELUI DU LOGICIEL DE GESTION (repris le 23/11 : la
      première version suivait une relance). C'est la même vente que
      CycleVente : l'IA prépare le devis, vous le corrigez, vous validez
      la facture, la banque rapproche. « L'IA prépare, vous validez.
      Chaque action laisse une trace. »
   3. LES TONS PORTENT UN SENS : vert pour le paiement, encre pour le
      reste. La source a sept couleurs de repère.
   Les noms, dates et montants sont ceux des écrans de /gestion : des
   EXEMPLES, et le bloc le dit.
   ══════════════════════════════════════════════════════════════════════ */

import type { ReactNode } from "react";
import { Banknote, FileText, Pencil, Send } from "lucide-react";
import "./essai.css";

type Evenement = {
  titre: ReactNode;
  heure: string;
  texte: string;
  icone: ReactNode;
  ton?: "vert";
  encart?: { libelle: string; avant: string; apres: string }[];
};

const EVENEMENTS: Evenement[] = [
  {
    titre: "Virement de 2 496,00 € rapproché",
    heure: "24 nov. 2026, 14 h 02",
    texte: "Banque : facture F-2053 soldée, écriture passée en comptabilité",
    icone: <Banknote />,
    ton: "vert",
  },
  {
    titre: (
      <>
        <b className="font-semibold">Vous</b> avez validé la facture F-2053
      </>
    ),
    heure: "21 nov. 2026, 9 h 30",
    texte: "Stock : trois articles sortis du dépôt nord",
    icone: <Send />,
  },
  {
    titre: (
      <>
        <b className="font-semibold">Vous</b> avez corrigé le devis
      </>
    ),
    heure: "20 nov. 2026, 16 h 12",
    texte: "Deux lignes modifiées avant l'envoi à Atelier Bertin",
    icone: <Pencil />,
    encart: [
      { libelle: "Disjoncteur 16 A", avant: "60 pièces", apres: "80 pièces" },
      { libelle: "Délai de livraison", avant: "10 jours", apres: "5 jours" },
    ],
  },
  {
    titre: (
      <>
        <b className="font-semibold">L&apos;IA</b> a préparé le devis D-0314
      </>
    ),
    heure: "20 nov. 2026, 15 h 40",
    texte: "D'après la demande d'Atelier Bertin, à votre en-tête",
    icone: <FileText />,
  },
];

export default function FilPiece() {
  return (
    <div className="eb w-full">
      <ol role="list" className="m-0 list-none p-0 text-sm">
        {EVENEMENTS.map((evenement, index) => {
          const dernier = index === EVENEMENTS.length - 1;
          return (
            <li key={evenement.heure} className="flex gap-3">
              <div aria-hidden="true" className="flex w-8 shrink-0 flex-col items-center">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border [&>svg]:size-4 ${
                    evenement.ton === "vert" ? "eb-repere-vert" : "eb-repere"
                  }`}
                >
                  {evenement.icone}
                </span>
                <div className={`w-0.5 flex-1 ${dernier ? "" : "eb-piste"}`} />
              </div>

              <div className={`min-w-0 flex-1 pt-1.5 ${dernier ? "" : "pb-6"}`}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <div className="eb-encre min-w-0 grow font-medium">{evenement.titre}</div>
                  <span className="eb-doux shrink-0 text-xs whitespace-nowrap">{evenement.heure}</span>
                </div>
                <div className="eb-doux mt-0.5">{evenement.texte}</div>
                {evenement.encart && (
                  <dl className="eb-voile m-0 mt-2 flex flex-col gap-1 rounded-lg px-3 py-2">
                    {evenement.encart.map((ligne) => (
                      <div key={ligne.libelle} className="flex flex-wrap gap-x-1.5">
                        <dt className="eb-texte">{ligne.libelle}&nbsp;:</dt>
                        <dd className="eb-encre m-0">
                          <s className="eb-doux">{ligne.avant}</s> → {ligne.apres}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="eb-pale mt-4 mb-0 text-xs">Exemple : les noms, dates et montants sont fictifs.</p>
    </div>
  );
}
