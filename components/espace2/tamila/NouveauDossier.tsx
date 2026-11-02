"use client";

/* TAMILA — « Nouveau dossier » (B16, G2), le bouton « New issue » de My issues. Même formulaire et mêmes règles
   que l'écran d'avant (EcranTamila, B16) ; l'écriture passe par le trousseau partagé (donnees.tsx, creer). */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MATIERES, TERRITOIRES, estAssocie, libelleMatiere } from "@/components/espace/tamila/regles";
import { RACINE } from "@/components/espace2/modules";
import { Champ, TamFenetre } from "./TamFenetre";
import { useTamila, type NouveauDossierForm } from "./donnees";

export default function NouveauDossier({ ouverte, fermer }: { ouverte: boolean; fermer: () => void }) {
  const t = useTamila();
  const router = useRouter();
  const vide = (): NouveauDossierForm => ({ reference: "", intitule: "", numero_rg: "", matiere: "civil", juridiction: "", territoire: "metropole", mode: "contentieux", responsable: t.moi?.user_id ?? "", audit_fin: "", phrase: "" });
  const [nv, setNv] = useState<NouveauDossierForm>(vide);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const avocats = t.personnes.filter((p) => ["gerant", "admin", "valideur"].includes(p.role));
  const ok = nv.reference.trim().length >= 2 && nv.intitule.trim().length >= 3 && (t.source === "exemple" || t.auCoffre || !!t.phrase || nv.phrase.trim().length >= 8);
  const clore = () => {
    setNv(vide());
    setErreur(null);
    fermer();
  };
  const soumettre = async () => {
    if (!ok) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const id = await t.creer(nv);
      clore();
      router.push(`${RACINE}/tamila/dossiers/${id}`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base réelle n'a pas répondu.");
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <TamFenetre
      titre="Ouvrir un dossier"
      sous={t.auCoffre ? "Une clé est tirée par le coffre Scaleway du cabinet ; référence, intitulé et n° RG sont chiffrés dans votre navigateur avant de partir. Le socle ne voit que des octets." : "Une clé est tirée dans votre navigateur ; référence, intitulé et n° RG sont chiffrés avant de partir. Le socle ne voit que des octets."}
      ouverte={ouverte}
      fermer={clore}
      pied={
        <button type="button" className="tam-bouton tam-bouton--principal" disabled={!ok || envoi} onClick={soumettre}>
          {envoi ? "Ouverture…" : "Ouvrir le dossier"}
        </button>
      }
    >
      <div className="tam-champs-ligne">
        <Champ libelle="Référence du cabinet (obligatoire)">
          <input value={nv.reference} onChange={(e) => setNv({ ...nv, reference: e.target.value })} placeholder="2026-0431" />
        </Champ>
        <Champ libelle="N° RG">
          <input value={nv.numero_rg} onChange={(e) => setNv({ ...nv, numero_rg: e.target.value })} placeholder="26/01234" />
        </Champ>
      </div>
      <Champ libelle="Intitulé (obligatoire)">
        <input value={nv.intitule} onChange={(e) => setNv({ ...nv, intitule: e.target.value })} placeholder="Demandeur c/ Défendeur" />
      </Champ>
      <div className="tam-champs-ligne">
        <Champ libelle="Matière">
          <select value={nv.matiere} onChange={(e) => setNv({ ...nv, matiere: e.target.value })}>
            {MATIERES.map((m) => (
              <option key={m} value={m}>
                {libelleMatiere(m)}
              </option>
            ))}
          </select>
        </Champ>
        <Champ libelle="Mode">
          <select value={nv.mode} onChange={(e) => setNv({ ...nv, mode: e.target.value as NouveauDossierForm["mode"] })}>
            <option value="contentieux">Contentieux</option>
            <option value="dommage_corporel">Dommage corporel</option>
          </select>
        </Champ>
      </div>
      <div className="tam-champs-ligne">
        <Champ libelle="Juridiction">
          <input value={nv.juridiction} onChange={(e) => setNv({ ...nv, juridiction: e.target.value })} placeholder="Cour d'appel de Paris" />
        </Champ>
        <Champ libelle="Siège de la cour" aide="Son calendrier proroge les délais.">
          <select value={nv.territoire} onChange={(e) => setNv({ ...nv, territoire: e.target.value })}>
            {TERRITOIRES.map((x) => (
              <option key={x.code} value={x.code}>
                {x.libelle}
              </option>
            ))}
          </select>
        </Champ>
      </div>
      <div className="tam-champs-ligne">
        <Champ libelle="Avocat responsable">
          <select value={nv.responsable} onChange={(e) => setNv({ ...nv, responsable: e.target.value })}>
            {t.moi?.role === "collaborateur" ? <option value="">Choisir…</option> : null}
            {avocats.map((p) => (
              <option key={p.user_id} value={p.user_id}>
                {p.nom}
              </option>
            ))}
          </select>
        </Champ>
        {estAssocie(t.moi) ? (
          <Champ libelle="Audit : fin le" aide="Vide pour un dossier ordinaire.">
            <input type="date" value={nv.audit_fin} onChange={(e) => setNv({ ...nv, audit_fin: e.target.value })} />
          </Champ>
        ) : null}
      </div>
      {t.source === "reelle" && !t.phrase && !t.auCoffre ? (
        <Champ libelle="Phrase du cabinet (huit caractères au moins)" aide="La clé du dossier est enveloppée sous cette phrase ; elle sera mémorisée pour cet onglet.">
          <input type="password" autoComplete="off" value={nv.phrase} onChange={(e) => setNv({ ...nv, phrase: e.target.value })} />
        </Champ>
      ) : null}
      {t.moi?.role === "collaborateur" ? <p className="tam-note">Un dossier ouvert par un assistant attend l&apos;accord de son avocat responsable avant toute lecture.</p> : null}
      {erreur ? (
        <p className="tam-note" data-teinte="rouge" role="alert">
          {erreur}
        </p>
      ) : null}
    </TamFenetre>
  );
}
