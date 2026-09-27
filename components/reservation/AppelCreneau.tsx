import Link from "next/link";
import { Plus } from "lucide-react";
import { BoutonReservation } from "./ModeleUrl";
import { COURRIEL } from "@/lib/reservation";
import "./AppelCreneau.css";

/* ══════════════════════════════════════════════════════════════════════
   <AppelCreneau> — « Réservez votre créneau en deux minutes »,
   /reserver-un-audit (27/09/2026)

   ORIGINE. `cta-3` d'efferd sur 21st.dev (registre ouvert, lu le 27/09) :
   un cadre ouvert — deux filets horizontaux, deux montants verticaux qui
   les dépassent de 24 px, une croix à chaque intersection, un axe en
   pointillés derrière le texte, un halo à peine teinté en haut à gauche —
   puis un titre centré, une phrase, deux boutons.

   CE QUI EST REPRIS : tout le dessin du cadre, au pixel de la source
   (croix de 24 px au trait de 1, montants à −24 px), et les deux boutons
   côte à côte, le principal plein et noir.

   CE QUI CHANGE : le second bouton mène à /tarifs. C'était la mention
   « Estimez votre prix » en petit sous l'adresse e-mail ; en bouton, elle
   se lit enfin comme l'autre porte de la page — ceux qui veulent un
   ordre de grandeur avant de réserver. L'adresse reste affichée en clair,
   sans `mailto:` (15/09 : plus rien sur le site n'ouvre un client mail).

   Le texte est celui de la version du 26/07.
   ══════════════════════════════════════════════════════════════════════ */

export default function AppelCreneau() {
  return (
    <section id="reserver" data-monde="clair" className="r-wrap ac py-14 sm:py-28">
      <div data-reveal className="ac-cadre">
        <Plus aria-hidden strokeWidth={1} className="ac-croix ac-croix--hg" />
        <Plus aria-hidden strokeWidth={1} className="ac-croix ac-croix--hd" />
        <Plus aria-hidden strokeWidth={1} className="ac-croix ac-croix--bg" />
        <Plus aria-hidden strokeWidth={1} className="ac-croix ac-croix--bd" />
        <span aria-hidden className="ac-montant ac-montant--g" />
        <span aria-hidden className="ac-montant ac-montant--d" />
        <span aria-hidden className="ac-axe" />

        <div className="ac-corps">
          <h2 className="r-h3 ac-titre">Réservez votre créneau en deux minutes</h2>
          <p className="ac-texte">
            L&apos;agenda montre les créneaux réellement libres, en heure de Guadeloupe.
            Vous en choisissez un, il est bloqué à l&apos;instant même, et vous recevez
            la confirmation le jour même, avec le lien de la visioconférence.
          </p>
          <div className="ac-boutons">
            <Link href="/tarifs" className="r-btn r-btn--fil">
              Estimer votre prix
            </Link>
            <BoutonReservation formule="process" className="r-btn r-btn--noir">
              Réserver l&apos;audit gratuit
            </BoutonReservation>
          </div>
          <p className="r-note ac-courriel">
            Ou par e-mail&nbsp;: <span className="ac-adresse">{COURRIEL}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
