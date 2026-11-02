"use client";

/* Réseau Omega, page Membres — le panneau « Ce que je montre au réseau »,
   dans le panneau Détails de la liste « Projects » de Linear (lin-details :
   428 de large, onglets en pastilles, lignes de 13/450), comme sur
   Entreprises. Il parle de « vous », l'organisation connectée d'Espace 2
   (useOrganisation(), posée par la coquille), jamais d'un des membres.

   Onglet « Champs » : un interrupteur par champ, tous éteints au départ —
   rien n'est visible sans accord. Onglet « Aperçu » : votre ligne telle
   que les membres la voient. Sous 1100 px de panneau, le kit le pose sous
   la liste. */

import { useState } from "react";
import { BadgeCheck, Briefcase, EyeOff, Handshake, MapPin, Search, Timer, X } from "lucide-react";
import { Interrupteur } from "../ui";
import { useOrganisation } from "../organisation";
import { Avatar } from "./membres-ui";
import { CHAMPS_VISIBLES, VOUS_EXEMPLE, badgesLus, changerVisibilite, toutMasquer, useVisibilite, type ChampVisible } from "./membres-donnees";

const vous = VOUS_EXEMPLE;
const [badgePaiement, badgeReponse] = [badgesLus({ bonPayeur: vous.badges.bonPayeur }), badgesLus({ reponseRapide: vous.badges.reponseRapide })].map((l) => l[0]);

const I = { width: 16, height: 16, "aria-hidden": true } as const;
const CHAMPS: Record<ChampVisible, { libelle: string; valeur: string; icone: React.ReactNode; aide?: string }> = {
  bonPayeur: { libelle: "Badge « Bon payeur »", valeur: badgePaiement.phrase, icone: <BadgeCheck {...I} />, aide: "Calculé sur vos factures FILED, 12 mois" },
  reponseRapide: { libelle: "Badge « Réponse rapide »", valeur: badgeReponse.phrase, icone: <Timer {...I} />, aide: "Calculé sur vos demandes reçues, 12 mois" },
  secteur: { libelle: "Secteur", valeur: vous.secteur, icone: <Briefcase {...I} /> },
  commune: { libelle: "Commune", valeur: `${vous.commune}, ${vous.ile}`, icone: <MapPin {...I} /> },
  propose: { libelle: "Ce que vous proposez", valeur: vous.propose.join(" · "), icone: <Handshake {...I} /> },
  cherche: { libelle: "Ce que vous cherchez", valeur: vous.cherche.join(" · "), icone: <Search {...I} /> },
};

export function PanneauVisibilite({ onFermer }: { onFermer: () => void }) {
  const { nom } = useOrganisation();
  const v = useVisibilite();
  const [onglet, setOnglet] = useState<"champs" | "apercu">("champs");
  const visibles = CHAMPS_VISIBLES.filter((c) => v[c]).length;

  return (
    <aside className="lin-details rm-moi" aria-label="Ce que je montre au réseau">
      <div className="rm-moi-tete">
        <div className="lin-details-onglets" role="tablist" aria-label="Ce que je montre au réseau">
          <button type="button" role="tab" className="lin-details-onglet" aria-selected={onglet === "champs"} onClick={() => setOnglet("champs")}>
            Ce que je montre
          </button>
          <button type="button" role="tab" className="lin-details-onglet" aria-selected={onglet === "apercu"} onClick={() => setOnglet("apercu")}>
            Aperçu
          </button>
        </div>
        <button type="button" className="lin-rond" aria-label="Fermer le panneau" title="Fermer" onClick={onFermer}>
          <X aria-hidden="true" />
        </button>
      </div>

      <p className="rm-moi-intro">
        Les membres voient toujours le nom <b>{nom}</b>. Le reste attend votre accord, champ par champ : {visibles ? `${visibles} sur ${CHAMPS_VISIBLES.length} montrés.` : "rien n'est montré pour l'instant."}
      </p>

      {onglet === "champs" ? (
        <ul className="rm-moi-champs" role="tabpanel" aria-label="Champs">
          {CHAMPS_VISIBLES.map((c) => (
            <li key={c} className="rm-moi-champ" data-montre={v[c] ? "" : undefined}>
              <span className="rm-moi-icone">{CHAMPS[c].icone}</span>
              <span className="rm-moi-texte">
                <span className="rm-moi-libelle">{CHAMPS[c].libelle}</span>
                <span className="rm-moi-valeur">{CHAMPS[c].valeur}</span>
                {CHAMPS[c].aide ? <span className="rm-moi-aide">{CHAMPS[c].aide}</span> : null}
              </span>
              <Interrupteur actif={v[c]} onChange={(oui) => changerVisibilite(c, oui)}>
                <span className="rm-masque">{v[c] ? `Masquer : ${CHAMPS[c].libelle}` : `Montrer : ${CHAMPS[c].libelle}`}</span>
              </Interrupteur>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rm-apercu" role="tabpanel" aria-label="Aperçu">
          <div className="rm-apercu-tete">
            <Avatar nom={nom} taille={24} />
            <span className="rm-apercu-nom">{nom}</span>
          </div>
          <dl className="lin-props">
            <div>
              <dt>Activité</dt>
              <dd className={v.secteur ? undefined : "lin-props-vide"}>{v.secteur ? vous.secteur : "Non montré"}</dd>
            </div>
            <div>
              <dt>Lieu</dt>
              <dd className={v.commune ? undefined : "lin-props-vide"}>{v.commune ? `${vous.commune}, ${vous.ile}` : "Non montré"}</dd>
            </div>
            <div>
              <dt>Propose</dt>
              <dd className={v.propose ? "rm-apercu-long" : "lin-props-vide"}>{v.propose ? vous.propose.join(", ") : "Non montré"}</dd>
            </div>
            <div>
              <dt>Cherche</dt>
              <dd className={v.cherche ? "rm-apercu-long" : "lin-props-vide"}>{v.cherche ? vous.cherche.join(", ") : "Non montré"}</dd>
            </div>
            <div>
              <dt>Badges</dt>
              <dd className={v.bonPayeur || v.reponseRapide ? "rm-apercu-long" : "lin-props-vide"}>
                {[v.bonPayeur ? badgePaiement.phrase : null, v.reponseRapide ? badgeReponse.phrase : null].filter(Boolean).join(" · ") || "Aucun montré"}
              </dd>
            </div>
          </dl>
          {!visibles ? (
            <p className="rm-apercu-vide">
              <EyeOff width={14} height={14} aria-hidden="true" />
              Seul votre nom apparaît dans l&apos;annuaire.
            </p>
          ) : null}
        </div>
      )}

      <div className="rm-moi-pied">
        <span>Vos choix valent pour cette visite : ils ne sont pas encore enregistrés.</span>
        {visibles ? (
          <button type="button" className="lin-btn lin-btn--texte" onClick={toutMasquer}>
            Tout masquer
          </button>
        ) : null}
      </div>
    </aside>
  );
}
