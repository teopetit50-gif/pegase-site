import { BadgeCheck, CalendarClock, Check, Landmark, MailCheck } from "lucide-react";
import QuandVisible from "./QuandVisible";
import { PROFILS } from "@/lib/reservation";
import "./GarantiesAudit.css";

/* ══════════════════════════════════════════════════════════════════════
   <GarantiesAudit> — le pied des cartes de formats, /reserver-un-audit
   (27/09/2026, seconde version du jour)

   Teo, sur le bandeau « Gratuit, sans engagement | Chèque TIC » : « change
   ça par un component plus pro », puis, sur le panneau à filets qui l'a
   remplacé une heure : « non, je veux un component plus complexe, là
   c'est trop basique ». Les trois cartes au-dessus ne bougent pas.

   ORIGINE. `bento-grid` d'@arihantcodes sur 21st.dev (lu le 27/09 ; le
   registre ne publie que la grille, les cartes et leurs démos sont dans
   des fichiers fermés — seule la COMPOSITION est reprise, d'après
   l'aperçu, comme pour les autres composants fermés du registre) : des
   cartes claires à filet fin, chacune avec une mini-interface flottante
   au-dessus d'un pied « pastille d'icône · titre · phrase », des cartes
   larges et étroites en quinconce, une entrée en cascade à l'écran.

   CE QUI EST NÔTRE : les quatre mini-interfaces, dessinées pour dire
   chacune UN fait du bandeau d'avant, sans en ajouter —
     · un reçu : les trois formats, 0 € pour les deux gratuits, « sur
       devis, déduit de l'installation » pour l'atelier (lus dans
       PROFILS : une carte qui change de prix change le reçu) ;
     · une jauge : le Chèque TIC finance de 40 à 80 % d'un projet selon
       le poste, plafond 10 000 € (chiffres de lib/reservation.ts) ;
     · un agenda : lundi à vendredi, créneaux de 9 h à 17 h, un créneau
       bloqué à l'instant où on le choisit ;
     · une notification : la confirmation du jour même, avec le lien de
       la visioconférence.
   Les dessins sont DÉCORATIFS (aria-hidden) : chaque fait est aussi dit
   en clair dans le titre et la phrase de sa carte.

   Sous 768 px, la grille devient un rail horizontal à cartes
   magnétiques : la première section fait déjà trois cartes de haut sur
   un téléphone, un bento empilé y aurait ajouté quatre écrans.
   ══════════════════════════════════════════════════════════════════════ */

const FORMATS = PROFILS[1].formules;
const gratuit = (conditions: string) => conditions.toLowerCase().startsWith("gratuit");

/* les colonnes de l'agenda, et les rangées d'heures montrées */
const JOURS = ["L", "M", "M", "J", "V", "S", "D"];
const HEURES = ["9 h", "11 h", "14 h", "16 h"];
/* le créneau qu'on voit se bloquer : mardi, 11 h */
const BLOQUE = { jour: 1, heure: 1 };

function Recu() {
  return (
    <div className="ga-recu">
      <div className="ga-recu-tete">
        <span className="ga-recu-titre">Votre audit</span>
        <span className="ga-pastille">Sans engagement</span>
      </div>
      <ul className="ga-recu-lignes">
        {FORMATS.map((f, i) => (
          <li key={f.id} className="ga-recu-ligne" style={{ "--i": i } as React.CSSProperties}>
            <span className="ga-recu-nom">
              {f.nom}
              <span className="ga-recu-duree"> · {f.duree}</span>
            </span>
            {gratuit(f.conditions) ? (
              <span className="num ga-recu-prix">0&nbsp;€</span>
            ) : (
              <span className="ga-recu-prix ga-recu-prix--devis">
                Sur devis
                <span className="ga-recu-deduit">déduit de l&apos;installation</span>
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="ga-recu-total">
        <span>À la réservation</span>
        <span className="num">0&nbsp;€</span>
      </div>
    </div>
  );
}

function Jauge() {
  return (
    <div className="ga-jauge">
      <div className="ga-jauge-tete">
        <span className="ga-jauge-libelle">Part du projet financée</span>
        <span className="num ga-jauge-valeur">40 – 80&nbsp;%</span>
      </div>
      <div className="ga-jauge-piste">
        <span className="ga-jauge-bande" />
        <span className="ga-jauge-repere" style={{ left: "40%" }} />
        <span className="ga-jauge-repere" style={{ left: "80%" }} />
      </div>
      <div className="num ga-jauge-graduations">
        <span style={{ left: "0%" }}>0&nbsp;%</span>
        <span style={{ left: "40%" }}>40&nbsp;%</span>
        <span style={{ left: "80%" }}>80&nbsp;%</span>
        <span style={{ left: "100%" }}>100&nbsp;%</span>
      </div>
      <div className="ga-jauge-pied">
        <span>Selon le poste · plafond</span>
        <span className="num ga-jauge-plafond">10&#8239;000&nbsp;€</span>
      </div>
    </div>
  );
}

function Agenda() {
  return (
    <div className="ga-agenda">
      <div className="ga-agenda-tete">
        <span className="ga-agenda-titre">Cette semaine</span>
        <span className="ga-agenda-legende">
          <span className="ga-agenda-point" />
          bloqué à l&apos;instant
        </span>
      </div>
      <div className="ga-agenda-grille">
        <span />
        {JOURS.map((j, i) => (
          <span key={i} className="ga-agenda-jour">
            {j}
          </span>
        ))}
        {HEURES.map((h, r) => (
          <div key={h} className="ga-agenda-rangee">
            <span className="num ga-agenda-heure">{h}</span>
            {JOURS.map((_, c) => {
              const ferme = c >= 5;
              const bloque = c === BLOQUE.jour && r === BLOQUE.heure;
              return (
                <span
                  key={c}
                  className={`ga-agenda-case${ferme ? " ga-agenda-case--ferme" : ""}${bloque ? " ga-agenda-case--bloque" : ""}`}
                  style={{ "--c": c } as React.CSSProperties}
                >
                  {bloque ? <Check strokeWidth={2.4} /> : null}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Notification() {
  return (
    <div className="ga-notif">
      <div className="ga-notif-dessous" />
      <div className="ga-notif-carte">
        <span className="ga-notif-icone">
          <Check strokeWidth={2.4} />
        </span>
        <span className="ga-notif-corps">
          <span className="ga-notif-titre">Votre créneau est confirmé</span>
          <span className="ga-notif-texte">Lien de la visioconférence joint</span>
        </span>
        <span className="ga-notif-heure">aujourd&apos;hui</span>
      </div>
    </div>
  );
}

const CARTES = [
  {
    cle: "a",
    Icone: BadgeCheck,
    titre: "Gratuit, sans engagement",
    texte: "Toute installation commence par cet audit.",
    Scene: Recu,
  },
  {
    cle: "b",
    Icone: Landmark,
    titre: "Jusqu'à 10 000 € financés",
    texte:
      "Par le Chèque TIC de la Région Guadeloupe, pour les entreprises éligibles. L'éligibilité est vérifiée pendant l'audit, avant tout engagement.",
    Scene: Jauge,
  },
  {
    cle: "c",
    Icone: CalendarClock,
    titre: "Du lundi au vendredi, 9 h – 17 h",
    texte: "Heure de Guadeloupe. L'entretien se termine à l'heure annoncée.",
    Scene: Agenda,
  },
  {
    cle: "d",
    Icone: MailCheck,
    titre: "Confirmé le jour même",
    texte: "Avec le lien de la visioconférence.",
    Scene: Notification,
  },
];

export default function GarantiesAudit() {
  return (
    <QuandVisible data-arrivee="colonne" seuil={0.15} className="ga">
      <div className="ga-grille">
        {CARTES.map(({ cle, Icone, titre, texte, Scene }, i) => (
          <article
            key={cle}
            data-reveal
            className={`ga-carte ga-carte--${cle}`}
            style={{ "--i": i } as React.CSSProperties}
          >
            <div aria-hidden className="ga-scene">
              <Scene />
            </div>
            <div className="ga-pied">
              <span aria-hidden className="ga-icone">
                <Icone strokeWidth={1.6} />
              </span>
              <div>
                <h3 className="ga-titre">{titre}</h3>
                <p className="ga-texte">{texte}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </QuandVisible>
  );
}
