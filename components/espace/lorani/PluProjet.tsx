"use client";

/* Le PLU du projet, trouvé depuis son adresse (b5_17) : la base géocode l'adresse (Base Adresse Nationale), ou prend
   la parcelle au cadastre, puis interroge le Géoportail de l'urbanisme (API Carto de l'IGN) — zone, document
   d'urbanisme, lien du règlement, prescriptions. L'écran lance la recherche (lorani_chercher_plu) et la suit
   (lorani_suivre_plu) toutes les deux secondes et demie pendant une minute ; au-delà, le passage du socle la reprend
   toutes les cinq minutes. Exemple : la recherche ne sort pas du navigateur ; seule la surélévation Dubois a une
   réponse préparée. */

import { useEffect, useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille } from "../ui";
import { dateCourte } from "../format";
import { chercherPlu, suivrePlu } from "./portes";
import type { Dossier, Plu, Projet } from "./types";

const EN_COURS: Plu["statut"][] = ["a_chercher", "geocodage", "zonage"];
const TYPES_ZONE: Record<string, string> = { U: "zone urbaine", AUc: "zone à urbaniser", AUs: "zone à urbaniser (stricte)", AU: "zone à urbaniser", A: "zone agricole", N: "zone naturelle" };
const ETAPES: Record<Plu["statut"], string> = {
  a_chercher: "Recherche lancée…",
  geocodage: "Adresse en cours de localisation…",
  zonage: "Zonage demandé au Géoportail de l’urbanisme…",
  trouve: "Trouvé",
  introuvable: "Introuvable",
  erreur: "Service indisponible",
};
const SUIVIS_MAX = 24;

/* exemple : la réponse préparée pour la surélévation Dubois (Villeurbanne, PLU-H de la Métropole de Lyon) */
function reponseExemple(p: Plu, projet: Projet): Plu {
  if (projet.commune !== "Villeurbanne") return { ...p, statut: "introuvable", erreur: "Exemple : sur la base réelle, Lorani interroge le Géoportail de l’urbanisme à l’adresse du projet." };
  return {
    ...p, statut: "trouve", methode: "adresse", point_libelle: "8 Rue Francis de Pressensé 69100 Villeurbanne", point_score: 0.96, zone: "URm1", trouve_le: new Date().toISOString(),
    zones: [{ libelle: "URm1", libelong: "Zone urbaine mixte de formes compactes", typezone: "U", partition: "DU_200046977", idurba: "200046977_PLUI_20260326", nomfic: null, urlfic: null, datvalid: null }],
    document: { du_type: "PLUi", titre: "PLU-H MÉTROPOLE DE LYON", nom: "200046977_PLUi_20260326", partition: "DU_200046977" },
    prescriptions: [{ libelle: "Périmètre de mixité sociale", typepsc: "17", stypepsc: "00" }],
  };
}

export default function PluProjet({ projet, dossier, peutEcrire, agir }: {
  projet: Projet;
  dossier: Dossier;
  peutEcrire: boolean;
  agir: (reel: () => Promise<void>, local: () => Dossier) => Promise<void>;
}) {
  const plu = dossier.plu.find((x) => x.projet_id === projet.id) ?? null;
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [suivis, setSuivis] = useState(0);
  const enCours = !!plu && EN_COURS.includes(plu.statut);
  const localisable = !!projet.adresse?.trim() || projet.parcelles.length > 0;

  /* le suivi : une relève toutes les 2,5 s tant que la recherche tourne, une minute au plus */
  useEffect(() => {
    if (!enCours || suivis >= SUIVIS_MAX) return;
    const t = window.setTimeout(() => {
      setSuivis((n) => n + 1);
      void agir(
        () => suivrePlu(projet.id).then(() => undefined),
        () => ({ ...dossier, plu: dossier.plu.map((x) => (x.projet_id === projet.id ? reponseExemple(x, projet) : x)) }),
      ).catch(() => undefined);
    }, 2500);
    return () => window.clearTimeout(t);
  }, [enCours, suivis, agir, dossier, projet]);

  const chercher = async () => {
    setEnvoi(true);
    setErreur(null);
    setSuivis(0);
    try {
      await agir(
        () => chercherPlu(projet.id).then(() => undefined),
        () => {
          const ligne: Plu = {
            id: plu?.id ?? `local-plu-${Date.now()}`, projet_id: projet.id, statut: "geocodage", methode: projet.adresse ? "adresse" : "parcelle",
            requete: [projet.adresse, projet.code_postal, projet.commune].filter(Boolean).join(" "), point_libelle: null, point_score: null, zones: [], zone: null, document: null,
            reglement_url: null, prescriptions: [], rnu: null, erreur: null, demande_le: new Date().toISOString(), trouve_le: null,
          };
          return { ...dossier, plu: [...dossier.plu.filter((x) => x.projet_id !== projet.id), ligne] };
        },
      );
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(false);
    }
  };

  const z = plu?.zones[0];
  return (
    <div className="esp-carte-corps">
      <div className="esp-section-titre">
        <span>Règles d’urbanisme</span>
        <span className="esp-item-haut">
          <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi || enCours || !localisable} onClick={() => void chercher()}>
            {plu ? "Chercher à nouveau" : "Trouver le PLU"}
          </button>
        </span>
      </div>

      {!plu ? (
        <div className="lor-tableau-vide">
          {localisable
            ? "Lorani localise l’adresse (ou la parcelle) et demande au Géoportail de l’urbanisme la zone, le document d’urbanisme et le règlement qui s’appliquent."
            : "Renseignez l’adresse ou une parcelle du projet : Lorani y cherchera la zone du PLU et son règlement."}
        </div>
      ) : enCours ? (
        <p className="lor-sous" role="status">
          <Loader variant="spin" /> {ETAPES[plu.statut]}
          {suivis >= SUIVIS_MAX ? " Le service tarde : Lorani reprendra la recherche toutes les cinq minutes." : ""}
        </p>
      ) : plu.statut === "trouve" && z ? (
        <div className="lor-plu">
          <div className="lor-plu-tete">
            <MapPin width={16} height={16} aria-hidden="true" />
            <strong>Zone {plu.zone}</strong>
            {z.typezone ? <Pastille contour>{TYPES_ZONE[z.typezone] ?? `zone ${z.typezone}`}</Pastille> : null}
            {plu.document ? <span className="esp-kpi-sous">{[plu.document.titre, plu.document.du_type].filter(Boolean).join(" · ")}</span> : null}
          </div>
          {z.libelong ? <div className="lor-sous">{z.libelong}</div> : null}
          {plu.zones.length > 1 ? <div className="lor-sous">La parcelle touche aussi : {plu.zones.slice(1).map((x) => x.libelle).join(", ")}.</div> : null}
          <div className="lor-sous">
            Localisé {plu.methode === "parcelle" ? "par la parcelle" : "par l’adresse"} : {plu.point_libelle ?? "—"}
            {plu.point_score !== null && plu.methode === "adresse" ? ` (confiance ${Math.round(plu.point_score * 100)} %)` : ""} · le {dateCourte(plu.trouve_le ?? plu.demande_le)}
          </div>
          <div className="esp-actions">
            {plu.reglement_url ? (
              <a className="r-btn r-btn--fil r-btn--petit" href={plu.reglement_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink width={15} height={15} aria-hidden="true" /> Règlement de la zone (PDF)
              </a>
            ) : (
              <span className="lor-sous">Le Géoportail ne donne pas de lien direct vers le règlement de ce document : déposez-le comme pièce « Règlement du PLU ».</span>
            )}
          </div>
          {plu.prescriptions.length ? (
            <details className="lor-temps-recents">
              <summary>Prescriptions à cet endroit ({plu.prescriptions.length})</summary>
              <ul className="lor-liste">
                {plu.prescriptions.map((x, i) => <li key={i}>{x.libelle}</li>)}
              </ul>
            </details>
          ) : null}
        </div>
      ) : (
        <Avis teinte={plu.statut === "erreur" ? "rouge" : "ambre"}>{plu.erreur ?? ETAPES[plu.statut]}</Avis>
      )}
      {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
    </div>
  );
}
