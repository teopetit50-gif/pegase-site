import { BadgeCheck, CalendarClock, Landmark } from "lucide-react";
import "./GarantiesAudit.css";

/* ══════════════════════════════════════════════════════════════════════
   <GarantiesAudit> — le pied des cartes de formats, /reserver-un-audit
   (27/09/2026)

   Teo, sur capture du bandeau « Gratuit, sans engagement | Chèque TIC »
   et de sa note : « change ça par un component plus pro ». C'est la seule
   pièce de la première section qu'il a demandé de reprendre — les trois
   cartes au-dessus ne bougent pas.

   ORIGINE. `features-9` de Tailark (@meschacirung sur 21st.dev, registre
   ouvert, lu le 27/09) : un panneau à filets en deux colonnes, chaque case
   titrée par une petite icône et un libellé gris, puis un énoncé en gras
   dont la fin passe en gris ; une rangée pleine largeur porte un grand
   chiffre (« 99.99% Uptime »).

   CE QUI EST REPRIS : le panneau à filets, la case de droite sur fond
   gris clair, le libellé iconé, l'énoncé à fin grisée, la rangée du grand
   chiffre — ici « Jusqu'à 10 000 € », le montant du Chèque TIC.
   CE QUI EST JETÉ : la carte du monde, la conversation d'assistance et le
   graphique d'activité (illustrations d'un produit qui n'est pas le
   nôtre) ; les angles vifs deviennent le rayon de 16 px des cartes de la
   page.

   Les textes sont ceux du bandeau et de la note du 15/09, redistribués
   sans un mot inventé : gratuité, créneaux et durées tenues, Chèque TIC
   (avec son incise « Région Guadeloupe », obligatoire), et le format dans
   vos locaux, sur devis, en note.
   ══════════════════════════════════════════════════════════════════════ */

export default function GarantiesAudit() {
  return (
    <>
      <div data-arrivee="colonne" className="ga">
        <div className="ga-case">
          <p className="ga-libelle">
            <BadgeCheck aria-hidden strokeWidth={1.6} />
            Point de départ
          </p>
          <p className="ga-enonce">
            Gratuit, sans engagement.{" "}
            <span className="ga-suite">Toute installation commence par cet audit.</span>
          </p>
        </div>

        <div className="ga-case ga-case--grise">
          <p className="ga-libelle">
            <CalendarClock aria-hidden strokeWidth={1.6} />
            Créneaux
          </p>
          <p className="ga-enonce">
            Du lundi au vendredi, 9&nbsp;h – 17&nbsp;h.{" "}
            <span className="ga-suite">
              Heure de Guadeloupe. Les durées annoncées sont tenues&nbsp;:
              l&apos;entretien se termine à l&apos;heure.
            </span>
          </p>
        </div>

        <div className="ga-chiffre">
          <div>
            <p className="ga-libelle ga-libelle--or">
              <Landmark aria-hidden strokeWidth={1.6} />
              Chèque TIC
            </p>
            <p className="num ga-montant">Jusqu&apos;à 10&#8239;000&nbsp;€</p>
          </div>
          <p className="ga-chiffre-texte">
            d&apos;une installation financés par la Région Guadeloupe pour les
            entreprises éligibles. Votre éligibilité est vérifiée pendant
            l&apos;audit, avant tout engagement.
          </p>
        </div>
      </div>

      <p data-arrivee="colonne" className="r-note ga-note">
        Le format dans vos locaux est facturé sur devis, et déduit de
        l&apos;installation si vous décidez d&apos;aller plus loin.
      </p>
    </>
  );
}
