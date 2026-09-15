import PageShell from "@/components/PageShell";
import { Loader } from "@/components/ui/loader";

/* ══════════════════════════════════════════════════════════════════════
   ChargementPage — l'écran d'attente des routes servies à la demande
   (15/09/2026)

   Cinq routes du site sont rendues par le serveur à chaque visite parce
   qu'elles lisent la session avant d'afficher quoi que ce soit :
   /reserver, /installation, /connexion, /site/commande et /compte (celle-
   là a son propre écran, la coque de « Mon compte » n'utilise pas
   PageShell). Sans fichier `loading`, Next n'a rien à montrer pendant
   l'aller-retour : le navigateur RESTE sur la page précédente et le clic
   paraît sans effet.

   Le cadre est celui des pages elles-mêmes — PageShell (colonne de
   1440 px, filets, pied de page) et `.resa` (fond clair) — pour que rien
   ne saute quand le contenu arrive, et pour que l'entête caméléon, qui
   prélève la couleur sous lui à l'intérieur de <main>, soit déjà en
   verre clair.

   La hauteur est celle de l'écran moins l'entête (64 px, 72 à partir de
   `sm`), comme la coque de « Mon compte ». Un `min-h-[60vh]` laissait le
   pied remonter à mi-écran et le noir du site apparaître dessous : mesuré
   à 1440 × 1000, 178 px de bande noire sous le pied.

   Le témoin s'annonce (pas d'`aria-hidden`) : il est seul à l'écran,
   aucun texte ne dit l'attente à sa place. Son libellé est celui de la
   route, donc un lecteur d'écran dit ce qui arrive, pas « chargement ».
   ══════════════════════════════════════════════════════════════════════ */

export default function ChargementPage({ libelle }: { libelle: string }) {
  return (
    <PageShell>
      <div className="resa">
        <section className="r-wrap flex min-h-[calc(100dvh-64px)] items-center justify-center pb-16 pt-12 sm:min-h-[calc(100dvh-72px)] sm:pb-24 sm:pt-14">
          <Loader size="lg" aria-label={libelle} />
        </section>
      </div>
    </PageShell>
  );
}
