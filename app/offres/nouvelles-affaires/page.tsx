import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { Heros } from "@/components/produits/reprise/Heros";
import { BandeauOutils } from "@/components/produits/reprise/BandeauOutils";
import { Separateur } from "@/components/produits/reprise/Cadre";
import { Fonctionnalites } from "@/components/produits/reprise/Fonctionnalites";
import { Chiffres } from "@/components/produits/reprise/Chiffres";
import Perimetre from "@/components/produits/reprise/Perimetre";
import { Metiers } from "@/components/produits/reprise/Metiers";
import { Questions } from "@/components/produits/reprise/Questions";
import { Francais } from "@/components/produits/reprise/Francais";
import { Appel } from "@/components/produits/reprise/Appel";
import "./reprise.css";

/* ══════════════════════════════════════════════════════════════════════
   /offres/nouvelles-affaires — RELOAD (11/09/2026)

   Rapatriement de la page d'accueil du site SaaS OMEGA/reload-site, qui
   disparaît (voir RAPATRIEMENT.md à la racine du banc). Elle remplace le
   gabarit « integration » décalqué d'ocoya : le slug ne bouge pas, et une
   route statique prime sur app/offres/[system]/ — tous les liens du site
   tombent donc ici sans une seule redirection.

   Le site source était un décalque d'intellune-ruixen-com.vercel.app,
   relevé au style calculé le 09/09/2026 (CDP, 5 largeurs).

   Ce qui NE vient pas (règle 6) :
     · son entête et son pied — le site a les siens, par PageShell ;
     · sa bascule clair/sombre et son amorce localStorage (règle 4) : la
       page est figée dans son monde CLAIR, et les neuf utilitaires `dark:`
       du balisage d'origine sont retirés ;
     · sa signature Ω d'éditeur — ici on EST chez l'éditeur ;
     · ses routes /commencer, /espace et /espace/tableau.

   Ce qui change de la maquette d'origine : <main> est plafonné à 1440 px
   par PageShell, là où le relevé montait jusqu'à 1700. La colonne de la
   page (.rp-colonne, ex-`container`) plafonne de son côté à 1400 px
   au-delà de 96rem — elle tient donc entière dans le cadre, et le fond
   clair déborde jusqu'aux bords de l'écran par l'ombre géante écrêtée de
   `.p-reprise` (même technique que `.monde-clair`).
   ══════════════════════════════════════════════════════════════════════ */

/* Règle 5 — les polices s'importent DANS la page, pas dans le layout
   (next/font/google marche dans n'importe quel module serveur). Les deux
   variables descendent sur le conteneur de page, et `.p-reprise` écrit
   `font-family` explicitement : la règle de police du site est posée plus
   haut, sur `body`, avec Inter.
   Écart de police assumé côté design : « Geist » est libre (SIL OFL). */

/* Recentrage du 15/09/2026 : la moitié « marchés publics » a quitté la page.
   La description nomme les trois relances dans l'ordre de lib/produits/
   reprise.ts. Le titre garde la forme du site (« … | Omega.AI »), pas celle
   du site source. */
export const metadata: Metadata = {
  alternates: { canonical: "/offres/nouvelles-affaires" },
  title: "RELOAD | Omega.AI",
  description:
    "Votre fichier client relu chaque matin : les comptes qui n'ont plus commandé, les entretiens redevenus dus et les affaires restées en plan. La relance est rédigée, vos équipes la valident. Un système Omega.AI.",
};

export default function NouvellesAffairesPage() {
  return (
    <PageShell>
      <div className="p-reprise">
        {/* Les filets pointillés horizontaux entre sections viennent du
            divide-y du conteneur, pas d'une bordure posée section par
            section. */}
        <div className="flex flex-col divide-y divide-dashed divide-[#d9d9d9] border-[#d9d9d9] border-dashed sm:border-b">
          <Heros />
          <BandeauOutils />
          <Separateur />
          {/* Remontée ici à la demande de Teo : « un produit français » est une
              prise de position, elle se lit avant l'explication du produit —
              et surtout elle se voit sans avoir à défiler jusqu'en bas. */}
          <Francais />
          <Separateur />
          <Fonctionnalites />
          <Separateur />
          {/* 14/09 — `Chiffres` ne rend plus ses quatre tuiles (« 7 h 30 »,
              « 60 / 100 », « 1 seul », « Arrêt »), qui décrivaient la
              machine au lieu de son étendue ; son graphique reste, c'est le
              seul endroit de la page où le coût de l'inaction se voit. Le
              périmètre, les cas tordus et l'échelle groupe prennent la
              place des tuiles. ⚠ Voir la colonne `atteste` de
              `lib/produits/capacites/reprise.ts`. */}
          <Chiffres />
          <Separateur />
          <Perimetre />
          <Separateur />
          <Metiers />
          <Separateur />
          <Questions />
          <Separateur />
          <Appel />
        </div>
      </div>
    </PageShell>
  );
}
