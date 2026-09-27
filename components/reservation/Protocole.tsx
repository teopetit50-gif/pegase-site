import {
  Calculator,
  Clock3,
  Handshake,
  LockKeyhole,
  MessageSquareReply,
  Scale,
  type LucideIcon,
} from "lucide-react";
import "./Protocole.css";

/* ══════════════════════════════════════════════════════════════════════
   <Protocole> — « Ce qui est écrit noir sur blanc », /reserver-un-audit
   (27/09/2026, remplace <Engagements> du 04/08)

   ORIGINE. `feature-section-with-hover-effects` d'Aceternity sur 21st.dev
   (registre ouvert, lu le 27/09) : une grille d'articles séparés par des
   filets verticaux, chacun avec son pictogramme, un titre marqué d'une
   barre à gauche, et une phrase. Au survol, la barre s'allonge et se
   fonce, le titre glisse de 8 px, un lavis gris monte dans la case.

   CE QUI EST REPRIS : la grille à filets (4 × 2 chez eux, 3 × 2 ici :
   six articles), la barre et son geste, le lavis — orienté vers le filet
   qui sépare les deux rangées, comme chez eux.

   CE QUI EST GARDÉ DE LA VERSION D'AVANT (04/08, Teo : « trop
   amateur ») : ce ne sont PAS des témoignages, ce sont les règles du
   protocole d'audit — d'où le numéro d'article en tête de chaque case,
   l'intitulé « Protocole d'audit » et l'absence de guillemets. Les trois
   premiers articles sont ceux du 04/08, au mot près.

   LES TROIS ARTICLES AJOUTÉS ne sont pas écrits pour l'occasion : ce
   sont les lignes du comparatif qui valaient la même chose pour les trois
   formats (délai de réponse, engagement) et la note des durées tenues du
   haut de page. Identiques d'un format à l'autre, elles ne comparaient
   rien ; ici, elles disent ce qu'on tient quel que soit le format. Leur
   texte reprend celui de lib/reservation.ts (aides du comparatif, FAQ).
   ══════════════════════════════════════════════════════════════════════ */

const ARTICLES: { intitule: string; texte: string; Icone: LucideIcon }[] = [
  {
    intitule: "Chiffrage",
    texte:
      "Aucun audit ne se termine par une plaquette. Il se termine par un montant en euros ou en heures par mois, vérifiable dans vos propres documents.",
    Icone: Calculator,
  },
  {
    intitule: "Recommandation",
    texte:
      "Si le calcul ne justifie pas de déployer un système, la recommandation est de ne rien installer. C'est une conclusion valable, et elle arrive.",
    Icone: Scale,
  },
  {
    intitule: "Confidentialité",
    texte:
      "Les chiffres que vous montrez pendant l'audit ne sortent pas de l'entretien. Ils ne servent ni d'exemple commercial, ni de référence auprès d'un autre client.",
    Icone: LockKeyhole,
  },
  {
    intitule: "Durée tenue",
    texte:
      "L'entretien se termine à l'heure annoncée. Si le sujet mérite davantage, c'est vous qui décidez de la suite.",
    Icone: Clock3,
  },
  {
    intitule: "Réponse le jour même",
    texte:
      "Toute demande obtient une réponse le jour même, y compris pour dire non.",
    Icone: MessageSquareReply,
  },
  {
    intitule: "Aucun engagement",
    texte:
      "La recommandation vous appartient, que vous installiez un système ou non. Sans suite de votre part, le dossier se ferme\u00a0: aucune relance commerciale.",
    Icone: Handshake,
  },
];

export default function Protocole() {
  return (
    <section id="engagements" data-monde="clair" className="r-blanc po">
      <div className="r-wrap py-16 sm:py-24">
        <div className="po-tete">
          <p className="po-surtitre">Protocole d&apos;audit</p>
          <h2 className="r-h2 po-titre">Ce qui est écrit noir sur blanc</h2>
          <p className="r-lead po-chapo">
            Six règles, appliquées à tous les formats, sans exception.
          </p>
        </div>

        <ol data-reveal className="po-grille">
          {ARTICLES.map((a, i) => (
            <li key={a.intitule} className="po-article">
              <span aria-hidden className="po-lavis" />
              <div className="po-haut">
                <span aria-hidden className="po-icone">
                  <a.Icone strokeWidth={1.4} />
                </span>
                <span aria-hidden className="num po-numero">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="po-intitule">
                <span aria-hidden className="po-barre" />
                <span className="po-intitule-texte">{a.intitule}</span>
              </h3>
              <p className="po-texte">{a.texte}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
