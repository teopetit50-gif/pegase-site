/* Visuels du gabarit « publish » — 25/07/2026.

   Référence : ocoya.com/features/publish. Son hero pose un COLLAGE de
   panneaux qui se chevauchent (Teo : « des sortes d'image superposées, je
   veux ça aussi ») — une console centrale, un sélecteur de période flottant
   à gauche, un panneau de saisie en bas à gauche, un aperçu à droite.

   Reconstruit ici en HTML/CSS et alimenté par la fiche du moteur. Toutes les
   surfaces passent par les variables `--demo-*` de `.o-demo` : le collage
   suit donc automatiquement la variante sombre du gabarit, au lieu de poser
   des panneaux blancs sur le noir. */

import type { ReactNode } from "react";
import type { Fiche } from "@/lib/fiches";
import { CarteBlanche, DemoFiche } from "./MediaFiche";

/* ——————————————————————————————————————————————————————————
   Panneaux du collage
   —————————————————————————————————————————————————————————— */

function Panneau({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`o-demo ${className}`}>{children}</div>;
}

/* Console centrale : la vue « dossier du mois » — onglets, barre de période,
   puis une grille de lignes. C'est l'équivalent du calendrier de la
   référence : le plan de travail sur lequel les autres panneaux se posent. */
function Console() {
  const colonnes = ["Reçu", "Contrôlé", "Classé"];
  const lignes = [
    ["EDF · juillet", "312,40 €", 2],
    ["Sodexo Restauration", "1 084,00 €", 2],
    ["Caraïbe Pièces Auto", "1 345,40 €", 1],
    ["Loyer atelier", "950,00 €", 2],
    ["Total Énergies", "218,90 €", 0],
  ] as const;

  return (
    <Panneau className="w-full">
      {/* barre d'onglets */}
      <div className="o-demo-tete flex flex-wrap items-center gap-3 px-5 py-3">
        <span className="o-demo-faible text-[12px] font-semibold">Pièces</span>
        <span
          className="border-b-2 pb-0.5 text-[12px] font-semibold"
          style={{ borderColor: "currentColor" }}
        >
          <span className="o-demo-fort">Dossier</span>
        </span>
        <span className="ml-auto flex items-center gap-2">
          <span className="o-demo-jeton--off rounded-[6px] px-2 py-1 text-[10.5px] font-semibold">
            Juillet 2026
          </span>
          <span className="o-demo-jalon rounded-[6px] px-2 py-1 text-[10.5px] font-semibold">
            Envoyer au cabinet
          </span>
        </span>
      </div>

      {/* en-têtes de colonnes */}
      <div className="o-demo-sep grid grid-cols-[1fr_auto_auto] gap-3 px-5 py-2.5">
        {["Pièce", "Montant", "État"].map((c) => (
          <span
            key={c}
            className="o-demo-faible text-[10.5px] font-semibold uppercase tracking-[0.06em] last:text-right"
          >
            {c}
          </span>
        ))}
      </div>

      {/* lignes */}
      <div className="space-y-1.5 px-4 py-3">
        {lignes.map(([nom, montant, etape]) => (
          <div
            key={nom}
            className="o-demo-ligne grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-[9px] px-3 py-2.5"
          >
            <span className="o-demo-fort min-w-0 truncate text-[12.5px] font-medium">
              {nom}
            </span>
            <span
              className="o-demo-fort text-[12px] font-semibold"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {montant}
            </span>
            {/* jauge d'avancement : reçu → contrôlé → classé */}
            <span className="flex items-center gap-1" title={colonnes[etape]}>
              {colonnes.map((c, i) => (
                <span
                  key={c}
                  className="h-1.5 w-4 rounded-full"
                  style={{
                    background:
                      i <= etape ? "var(--demo-fort)" : "var(--demo-filet)",
                  }}
                />
              ))}
            </span>
          </div>
        ))}
      </div>
    </Panneau>
  );
}

/* Sélecteur de période — l'équivalent du mini-calendrier de la référence.
   Les jours sont purement graphiques : aucune date n'y est présentée comme
   une donnée du client. */
function Periode() {
  const jours = Array.from({ length: 31 }, (_, i) => i + 1);
  return (
    <Panneau className="w-[236px]">
      <div className="o-demo-sep flex items-center justify-between px-4 py-3">
        <span className="o-demo-faible text-[11px]">‹</span>
        <span className="o-demo-fort text-[12px] font-semibold">Juillet 2026</span>
        <span className="o-demo-faible text-[11px]">›</span>
      </div>
      <div className="grid grid-cols-7 gap-1 px-4 py-3">
        {["L", "M", "M", "J", "V", "S", "D"].map((j, i) => (
          <span
            key={i}
            className="o-demo-faible grid h-5 place-items-center text-[9.5px] font-semibold"
          >
            {j}
          </span>
        ))}
        {jours.map((j) => (
          <span
            key={j}
            className={`grid h-5 place-items-center rounded-[4px] text-[9.5px] ${
              j === 12 ? "o-demo-jalon font-bold" : "o-demo-doux"
            }`}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {j}
          </span>
        ))}
      </div>
    </Panneau>
  );
}

/* Panneau de saisie — l'équivalent du « Schedule post » de la référence :
   ce que le moteur a rempli tout seul, et que vous n'avez plus qu'à valider. */
function Saisie({ fiche }: { fiche: Fiche }) {
  return (
    <Panneau className="w-[268px]">
      <div className="o-demo-sep px-4 py-3">
        <span className="o-demo-fort text-[12px] font-semibold">
          Classement proposé
        </span>
      </div>
      <div className="space-y-2.5 px-4 py-3.5">
        {[
          ["Journal", "Achats"],
          ["Compte", "606 · Fournitures"],
          ["Période", "Juillet 2026"],
        ].map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3">
            <span className="o-demo-faible text-[11px]">{k}</span>
            <span className="o-demo-fort text-[11.5px] font-medium">{v}</span>
          </div>
        ))}
        <div className="flex gap-2 pt-1.5">
          <span className="o-demo-jalon rounded-[7px] px-3 py-1.5 text-[11px] font-semibold">
            Valider
          </span>
          <span
            className="rounded-[7px] px-3 py-1.5 text-[11px] font-semibold"
            style={{
              border: "1px solid var(--demo-filet)",
              color: "var(--demo-doux)",
            }}
          >
            Corriger
          </span>
        </div>
        <div className="o-demo-faible pt-1 text-[10.5px]">
          {fiche.outils[0]} · classement réversible
        </div>
      </div>
    </Panneau>
  );
}

/* ——————————————————————————————————————————————————————————
   Le collage — scène de 900 × 660 sur grand écran
   —————————————————————————————————————————————————————————— */

/* Les quatre panneaux sont posés en ABSOLU dans une scène de hauteur fixe :
   flottants, ils ne comptent pas dans le flux et déborderaient sinon sur la
   section suivante. Sous 1024 px la scène retombe en flux et ne garde que la
   console et l'aperçu — à cette largeur, quatre panneaux superposés se
   masqueraient au lieu de se décaler. */
export function CollagePublish({ fiche }: { fiche: Fiche }) {
  return (
    <div className="relative mx-auto w-full max-w-[900px] lg:h-[660px]">
      {/* console centrale, légèrement décalée à droite comme la référence */}
      <div className="relative z-10 mx-auto w-full max-w-[660px] lg:absolute lg:left-[210px] lg:top-0 lg:w-[600px]">
        <Console />
      </div>

      {/* sélecteur de période — flottant haut-gauche */}
      <div className="absolute left-0 top-[92px] z-20 hidden lg:block">
        <Periode />
      </div>

      {/* aperçu de la pièce — flottant droite, c'est la démo réelle du moteur */}
      <div className="relative z-30 mt-6 w-full lg:absolute lg:right-0 lg:top-[218px] lg:mt-0 lg:w-[380px]">
        <DemoFiche demo={fiche.demo} />
      </div>

      {/* panneau de saisie — flottant bas-gauche */}
      <div className="absolute bottom-[6px] left-[74px] z-20 hidden lg:block">
        <Saisie fiche={fiche} />
      </div>
    </div>
  );
}

/* ——————————————————————————————————————————————————————————
   Médias des deux grandes cartes de la section « réglages »
   —————————————————————————————————————————————————————————— */

export function MaqRegleClassement({ fiche }: { fiche: Fiche }) {
  return (
    <CarteBlanche className="w-full">
      <div className="o-demo-tete px-5 py-3">
        <span className="o-demo-doux text-[12px] font-semibold">
          Règles de classement
        </span>
      </div>
      <div className="space-y-1.5 px-4 py-4">
        {[
          ["Fournisseur reconnu", "Journal et compte pré-remplis"],
          ["Doublon détecté", "Écarté, vous êtes prévenu"],
          ["Pièce illisible", "Mise de côté pour relecture"],
        ].map(([k, v]) => (
          <div key={k} className="o-demo-ligne rounded-[9px] px-3 py-2.5">
            <div className="o-demo-fort text-[12.5px] font-semibold">{k}</div>
            <div className="o-demo-faible text-[11.5px] leading-[1.6]">{v}</div>
          </div>
        ))}
        <div className="o-demo-faible pt-1 text-[11px]">
          Règles fixées avec vous à l&apos;installation · {fiche.outils.join(" · ")}
        </div>
      </div>
    </CarteBlanche>
  );
}

export function MaqDossierCabinet() {
  return (
    <CarteBlanche className="w-full">
      <div className="o-demo-tete flex items-center justify-between px-5 py-3">
        <span className="o-demo-doux text-[12px] font-semibold">
          Dossier transmis
        </span>
        <span className="o-demo-jeton--ok rounded-[6px] px-2 py-[3px] text-[10.5px] font-semibold">
          Complet
        </span>
      </div>
      <div className="px-4 py-4">
        <div className="grid grid-cols-3 gap-2">
          {["Achats", "Ventes", "Banque"].map((j) => (
            <div key={j} className="o-demo-ligne rounded-[9px] px-3 py-3 text-center">
              <div className="o-demo-fort text-[13px] font-semibold">{j}</div>
              <div className="o-demo-faible text-[10.5px]">journal</div>
            </div>
          ))}
        </div>
        <div className="o-demo-faible mt-3 text-[11px] leading-[1.6]">
          Un dossier par mois, nommé et horodaté, prêt à ouvrir par le cabinet.
        </div>
      </div>
    </CarteBlanche>
  );
}
