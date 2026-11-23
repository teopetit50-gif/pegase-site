/* ══════════════════════════════════════════════════════════════════════
   LES APERÇUS DE /secteurs (22/11/2026)

   Teo, 22/11 : « fais pareil pour les autres pages » — plus de capture
   d'écran, des composants dessinés en code, un visuel différent par
   emplacement, les cadres remplis. La page montrait la même capture deux
   fois par métier (fenêtre du héros, puis carte d'aperçu). Chaque métier a
   maintenant deux dessins différents :
     · DocumentMetier — la fenêtre du héros : LE DOCUMENT que son logiciel
       rend (un avenant, une chronologie sourcée, une note d'incohérences…) ;
     · ListeMatin — la carte d'aperçu : LA LISTE que le client reçoit le
       matin, reprise du champ `apercu` de lib/secteurs.ts.
   La capture « l'essentiel d'un chantier » de Daliro, elle, reste : Teo
   garde les vraies captures des logiciels métier (22/11).

   Les faits viennent de lib/secteurs.ts ; les noms et les montants sont
   des exemples.
   ══════════════════════════════════════════════════════════════════════ */
import {
  Building2,
  CarFront,
  DraftingCompass,
  HardHat,
  Hotel,
  Scale,
  Smile,
  type LucideIcon,
} from "lucide-react";
import { CARTE, ENCRE, FILET, Ligne, Pastille, SOURD } from "@/components/vignettes/briques";

const ICONE: Record<string, LucideIcon> = {
  btp: HardHat,
  avocats: Scale,
  architectes: DraftingCompass,
  "location-automobile": CarFront,
  dentaire: Smile,
  hotellerie: Hotel,
  groupes: Building2,
};

/* ── la fenêtre du héros : le document que le logiciel rend ── */
type Doc = { titre: string; etat: string; lignes: [string, string?][]; pied: string };
const DOCUMENTS: Record<string, Doc> = {
  btp: {
    titre: "Avenant n° 2 · Villa Morel",
    etat: "À signer",
    lignes: [["Reprise du réseau enterré", "2 400,00 €"], ["Regard supplémentaire", "750,00 €"], ["Travaux hors marché", "3 150,00 €"]],
    pied: "À faire signer avant l'ouvrage",
  },
  avocats: {
    titre: "Chronologie · Martin c/ Sté Alpha",
    etat: "Sourcée",
    lignes: [["4 mars · livraison", "Pièce 7, p. 3"], ["18 mars · mise en demeure", "Pièce 9, p. 1"], ["2 avril · paiement partiel", "Pièce 11, p. 2"]],
    pied: "1 contradiction entre deux pièces",
  },
  architectes: {
    titre: "Incohérences · Maison Leroy",
    etat: "2 à arbitrer",
    lignes: [["Planche A-12 et CCTP art. 4.2", "menuiseries"], ["DPGF lot 3 et planche A-07", "surface"], ["Planches A-01 à A-14", "croisées"]],
    pied: "Avant le dépôt du permis",
  },
  "location-automobile": {
    titre: "Retour · Clio AB-123-CD",
    etat: "À facturer",
    lignes: [["État des lieux de départ", "12 photos"], ["Rayure, aile avant droite", "relevée"], ["Chiffré sur votre barème", "180,00 €"]],
    pied: "Comparé photo par photo",
  },
  dentaire: {
    titre: "Créneau libéré · jeudi 10 h",
    etat: "Proposé",
    lignes: [["Mme Petit", "plan signé"], ["M. Bernard", "en attente"], ["Fauteuil 2", "45 min"]],
    pied: "Remplaçant confirmé la veille",
  },
  hotellerie: {
    titre: "Note de séjour · chambre 12",
    etat: "À vérifier",
    lignes: [["2 nuits", "240,00 €"], ["Extras · minibar", "18,00 €"], ["Commission de la plateforme", "contrôlée"]],
    pied: "Avant le départ du client",
  },
  groupes: {
    titre: "Fiche contrat · maintenance",
    etat: "Action proposée",
    lignes: [["Société", "Transport"], ["Fournisseur", "Sté Électra"], ["Échéance", "dans 30 jours"]],
    pied: "La direction décide",
  },
};

export function DocumentMetier({ slug }: { slug: string }) {
  const d = DOCUMENTS[slug];
  const I = ICONE[slug] ?? Building2;
  if (!d) return null;
  return (
    <div className="absolute inset-0 flex flex-col gap-1.5 bg-[#fff] p-3 text-left md:gap-2 md:p-4">
      <div className="flex items-center gap-2">
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-black/[0.05] ${ENCRE}`}>
          <I className="h-3.5 w-3.5" strokeWidth={1.7} />
        </span>
        <span className={`min-w-0 flex-1 truncate text-[11px] font-medium md:text-xs ${ENCRE}`}>{d.titre}</span>
        <Pastille pleine>{d.etat}</Pastille>
      </div>
      {d.lignes.map(([g, dr]) => (
        <div key={g} className={`pt-1.5 md:pt-2 ${FILET}`}>
          <Ligne g={g} d={dr} />
        </div>
      ))}
      <p className={`mt-auto truncate text-[10px] ${SOURD}`}>{d.pied}</p>
    </div>
  );
}

/* ── la carte d'aperçu : la liste que le client reçoit le matin ── */
type Liste = { titre: string; pour: string; lignes: [string, string, string][] };
const LISTES: Record<string, Liste> = {
  btp: {
    titre: "Ce matin sur vos chantiers",
    pour: "Trois listes, une par rôle",
    lignes: [
      ["Avenant à faire signer", "Villa Morel · avenant n° 2", "Conducteur"],
      ["Sous-traitant à relancer", "Lot plomberie · passage de jeudi", "Conducteur"],
      ["Livraison à décaler", "Carrelage · après la chape", "Chef d'équipe"],
      ["Situation à relire", "Novembre · 12 050,00 €", "Bureau"],
    ],
  },
  avocats: {
    titre: "Avant la première audience",
    pour: "Pour l'associé",
    lignes: [
      ["Pièces communiquées hier", "Martin c/ Sté Alpha · pièces 12 à 15", "4"],
      ["Honoraires forfaitaires dépassés", "Dossiers Leroy et Garnier", "2"],
      ["Sans diligence depuis 30 jours", "Dossiers à reprendre cette semaine", "3"],
      ["Contradictions entre pièces", "Pièce 7 et pièce 11", "1"],
    ],
  },
  architectes: {
    titre: "Quatre contrôles, du permis à la réception",
    pour: "Pour l'architecte",
    lignes: [
      ["Permis et DCE", "Maison Leroy · incohérences relevées", "2"],
      ["Analyse des offres", "Lot gros œuvre · offres comparées", "3"],
      ["Visa des documents d'exécution", "Plans des entreprises à viser", "5"],
      ["Situations de travaux", "Novembre · à contrôler", "1"],
    ],
  },
  "location-automobile": {
    titre: "Avant l'ouverture du comptoir",
    pour: "La page de l'agence",
    lignes: [
      ["Restitutions à facturer", "Clio, 308, Trafic · dommages chiffrés", "3"],
      ["À remettre en location", "Avant le prochain départ de 14 h", "2"],
      ["Entretien placé", "Hors des réservations · vendredi", "1"],
      ["Amendes à désigner", "Dans le délai · cette semaine", "2"],
    ],
  },
  dentaire: {
    titre: "Avant le premier patient",
    pour: "Trois listes pour le titulaire",
    lignes: [
      ["Créneaux libérés", "Jeudi 10 h, vendredi 15 h · patients proposés", "2"],
      ["Plans signés sans rendez-vous", "À rappeler cette semaine", "4"],
      ["Fauteuils qui tournent à vide", "Fauteuil 2 · jeudi après-midi", "1"],
    ],
  },
  hotellerie: {
    titre: "Le travail de la nuit",
    pour: "Pour la réception",
    lignes: [
      ["Demandes traitées", "Dans la langue de chaque client", "7"],
      ["Chambres annulées reprises", "Remises en vente dans la nuit", "2"],
      ["Extras à vérifier", "Avant les départs de 11 h", "5"],
      ["Commissions à contrôler", "Plateformes · séjours d'hier", "3"],
    ],
  },
  groupes: {
    titre: "Troisième jour sur le pôle",
    pour: "Pour la direction",
    lignes: [
      ["Plan rempli", "3 sociétés · clients, fournisseurs, contrats", "1 284"],
      ["Rapprochements à valider", "Mêmes fournisseurs sous deux codes", "12"],
      ["Cas d'usage en service", "Contrats à renouveler sous 30 jours", "1"],
    ],
  },
};

export function ListeMatin({ slug }: { slug: string }) {
  const l = LISTES[slug];
  const I = ICONE[slug] ?? Building2;
  if (!l) return null;
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-2 bg-[#fafafa] p-3 text-left md:p-5">
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-black/[0.07] bg-[#fff] ${ENCRE}`}>
          <I className="h-4 w-4" strokeWidth={1.6} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className={`truncate text-xs font-medium ${ENCRE}`}>{l.titre}</span>
          <span className={`truncate text-[10px] ${SOURD}`}>{l.pour}</span>
        </span>
      </div>
      <div className={`${CARTE} flex flex-col p-1`}>
        {l.lignes.map(([quoi, detail, compte], k) => (
          <div key={quoi} className={`flex items-center gap-2 px-2 py-1.5 ${k ? FILET : ""}`}>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={`truncate text-[11px] font-medium ${ENCRE}`}>{quoi}</span>
              <span className={`truncate text-[10px] ${SOURD}`}>{detail}</span>
            </span>
            <Pastille pleine={k === 0}>{compte}</Pastille>
          </div>
        ))}
      </div>
    </div>
  );
}
