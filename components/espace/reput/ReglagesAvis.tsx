"use client";

/* ══════════════════════════════════════════════════════════════════════
   Réglages des réponses et demandes d'avis (06/10/2026, session C3, c3_05)

   · Réglages (gérant, administrateur) : signature, formules, ton, mention
     de la réponse automatisée, langues couvertes, accusé de réception et
     son texte, lien et texte de la demande d'avis — porte reput_regler.
   · Demandes d'avis : programmées après un règlement (porte
     reput_programmer_avis) ; elles partent à J+3, sont relancées deux fois
     au plus, jamais la même personne avant six mois ; « Avis reçu » arrête
     les relances (reput_avis_recu).
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { Loader } from "@/components/ui/loader";
import { dateCourte } from "../format";
import { Avis as Bandeau, Pastille, Vide, type Teinte } from "../ui";
import { avisRecu, programmerAvis, regler } from "./portes";
import type { Avis, Client, Monde, Reglages } from "./types";

const STATUTS_AVIS: Record<Avis["statut"], { libelle: string; teinte: Teinte }> = {
  programme: { libelle: "Programmée", teinte: "bleu" },
  sollicite: { libelle: "Demandée", teinte: "ambre" },
  termine: { libelle: "Sans suite", teinte: "gris" },
  avis_recu: { libelle: "Avis reçu", teinte: "vert" },
  ecarte: { libelle: "Écartée (moins de six mois)", teinte: "gris" },
};

export default function ReglagesAvis({ monde, source, client, role, relire, modifierLocal }: {
  monde: Monde; source: "exemple" | "reelle"; client: Client | null; role: string;
  relire: () => Promise<void>; modifierLocal: (f: (m: Monde) => Monde) => void;
}) {
  const dirige = source === "exemple" || role === "gerant" || role === "admin";
  const membre = role !== "lecteur";
  const [r, setR] = useState<Reglages | null>(monde.reglages);
  const [nouvel, setNouvel] = useState({ canal: "email", adresse: "", nom: "", reference: "", regle_le: "" });
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const agir = async (cle: string, reel: () => Promise<unknown>, local: (m: Monde) => Monde, message: string) => {
    setEnvoi(cle);
    setErreur(null);
    try {
      if (source === "reelle") {
        await reel();
        await relire();
      } else modifierLocal(local);
      setFait(message);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(null);
    }
  };

  const enregistrer = () => {
    if (!r) return;
    const champs: Partial<Reglages> = {
      signature: r.signature, formule_appel: r.formule_appel, formule_politesse: r.formule_politesse, ton: r.ton,
      mention_automatisee: r.mention_automatisee, langues: r.langues, accuse: r.accuse, texte_accuse: r.texte_accuse,
      lien_avis: r.lien_avis, texte_avis: r.texte_avis,
    };
    void agir("reglages", () => regler(client!.client_id, champs), (m) => ({ ...m, reglages: r }), "Réglages enregistrés : ils valent dès la prochaine réponse.");
  };

  const programmer = () =>
    void agir("avis", async () => {
      const x = await programmerAvis(client!.client_id, nouvel.canal, nouvel.adresse.trim(), nouvel.nom.trim() || null, nouvel.reference.trim() || null, nouvel.regle_le || null);
      if (x.statut === "ecarte") throw new Error(x.motif ?? "Cette personne a déjà été sollicitée depuis moins de six mois.");
    }, (m) => ({
      ...m,
      avis: [{ id: crypto.randomUUID(), canal: nouvel.canal as Avis["canal"], adresse: nouvel.adresse.trim(), nom: nouvel.nom.trim() || null,
               reference: nouvel.reference.trim() || null, regle_le: nouvel.regle_le || new Date().toISOString().slice(0, 10), statut: "programme",
               motif: null, prochain_le: null, envois: [], cree_le: new Date().toISOString() }, ...m.avis],
    }), "Demande d'avis programmée : elle part trois jours après le règlement, relancée deux fois au plus.");

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {fait ? <Bandeau teinte="vert" role="status">{fait}</Bandeau> : null}
      {erreur ? <Bandeau teinte="rouge" role="alert">{erreur}</Bandeau> : null}

      <section className="esp-carte" aria-label="Réglages des réponses">
        <div className="esp-carte-tete"><h2 className="esp-carte-titre">Vos réponses</h2></div>
        {!r ? (
          <div className="esp-carte-corps"><Vide titre="REPUT n'est pas encore installé">Il s&apos;installe à la première demande reçue.</Vide></div>
        ) : (
          <div className="esp-carte-corps">
            <div className="esp-form">
              <label className="rv-libelle">Signature
                <textarea className="rv-champ" rows={2} disabled={!dirige} value={r.signature} onChange={(e) => setR({ ...r, signature: e.target.value })} />
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Formule d&apos;appel
                  <input className="rv-champ" disabled={!dirige} value={r.formule_appel} onChange={(e) => setR({ ...r, formule_appel: e.target.value })} />
                </label>
                <label className="rv-libelle">Formule de politesse
                  <input className="rv-champ" disabled={!dirige} value={r.formule_politesse} onChange={(e) => setR({ ...r, formule_politesse: e.target.value })} />
                </label>
              </div>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Ton
                  <select className="rv-champ" disabled={!dirige} value={r.ton} onChange={(e) => setR({ ...r, ton: e.target.value as Reglages["ton"] })}>
                    <option value="vouvoiement">Vouvoiement</option>
                    <option value="tutoiement">Tutoiement</option>
                  </select>
                </label>
                <label className="rv-libelle">Langues de réponse (codes, séparés par des virgules)
                  <input className="rv-champ" disabled={!dirige} value={r.langues.join(", ")}
                    onChange={(e) => setR({ ...r, langues: e.target.value.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean) })} />
                </label>
              </div>
              <label className="rv-libelle">Mention de la réponse automatisée, dans vos termes
                <input className="rv-champ" disabled={!dirige} value={r.mention_automatisee ?? ""} onChange={(e) => setR({ ...r, mention_automatisee: e.target.value })}
                  placeholder="Réponse préparée par notre assistant, relue par notre équipe." />
              </label>
              <label className="rv-libelle" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" disabled={!dirige} checked={r.accuse} onChange={(e) => setR({ ...r, accuse: e.target.checked })} />
                Accusé de réception dans la minute quand la réponse attend votre validation
              </label>
              <label className="rv-libelle">Texte de l&apos;accusé
                <textarea className="rv-champ" rows={2} disabled={!dirige || !r.accuse} value={r.texte_accuse} onChange={(e) => setR({ ...r, texte_accuse: e.target.value })} />
              </label>
              <label className="rv-libelle">Lien de votre page d&apos;avis (https)
                <input className="rv-champ" disabled={!dirige} value={r.lien_avis ?? ""} onChange={(e) => setR({ ...r, lien_avis: e.target.value })} placeholder="https://g.page/r/…/review" />
              </label>
              <label className="rv-libelle">Texte de la demande d&apos;avis
                <textarea className="rv-champ" rows={2} disabled={!dirige} value={r.texte_avis} onChange={(e) => setR({ ...r, texte_avis: e.target.value })} />
              </label>
              {dirige ? (
                <div className="esp-actions">
                  <button type="button" className="r-btn r-btn--noir" disabled={envoi !== null || !r.signature.trim()} onClick={enregistrer}>
                    {envoi === "reglages" ? <Loader variant="spin" /> : null} Enregistrer
                  </button>
                </div>
              ) : <p className="esp-kpi-sous">Le gérant ou un administrateur change ces réglages.</p>}
            </div>
          </div>
        )}
      </section>

      <section className="esp-carte" aria-label="Demandes d'avis">
        <div className="esp-carte-tete"><h2 className="esp-carte-titre">Demandes d&apos;avis</h2></div>
        <div className="esp-carte-corps">
          <p className="esp-kpi-sous">
            La demande part trois jours après le règlement, puis elle est relancée deux fois au plus. La même personne n&apos;est plus sollicitée avant six mois.
          </p>
        </div>
        {membre ? (
          <div className="esp-carte-corps">
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">Canal
                  <select className="rv-champ" value={nouvel.canal} onChange={(e) => setNouvel({ ...nouvel, canal: e.target.value })}>
                    <option value="email">Courriel</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                  </select>
                </label>
                <label className="rv-libelle">{nouvel.canal === "email" ? "Adresse" : "Numéro"} <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" value={nouvel.adresse} onChange={(e) => setNouvel({ ...nouvel, adresse: e.target.value })} />
                </label>
              </div>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Nom du client
                  <input className="rv-champ" value={nouvel.nom} onChange={(e) => setNouvel({ ...nouvel, nom: e.target.value })} />
                </label>
                <label className="rv-libelle">Facture ou intervention
                  <input className="rv-champ" value={nouvel.reference} onChange={(e) => setNouvel({ ...nouvel, reference: e.target.value })} placeholder="F-2026-118" />
                </label>
              </div>
              <label className="rv-libelle">Réglée le
                <input className="rv-champ" type="date" value={nouvel.regle_le} onChange={(e) => setNouvel({ ...nouvel, regle_le: e.target.value })} />
              </label>
              <div className="esp-actions">
                <button type="button" className="r-btn r-btn--noir" disabled={envoi !== null || nouvel.adresse.trim().length < 3} onClick={programmer}>
                  {envoi === "avis" ? <Loader variant="spin" /> : null} Programmer la demande d&apos;avis
                </button>
              </div>
            </div>
          </div>
        ) : null}
        <div className="esp-carte-corps">
          {monde.avis.length === 0 ? <Vide titre="Aucune demande d'avis">Elles s&apos;affichent ici dès qu&apos;un règlement est déclaré.</Vide> : (
            <ul style={{ display: "grid", gap: 10 }}>
              {monde.avis.map((a) => (
                <li key={a.id} style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                    <span className="esp-item-haut"><strong>{a.nom || a.adresse}</strong><Pastille teinte={STATUTS_AVIS[a.statut].teinte}>{STATUTS_AVIS[a.statut].libelle}</Pastille></span>
                    <span className="esp-kpi-sous" style={{ overflowWrap: "anywhere" }}>
                      Réglé le {dateCourte(a.regle_le)}{a.reference ? ` · ${a.reference}` : ""} · {a.envois.length} envoi{a.envois.length > 1 ? "s" : ""}
                      {a.prochain_le && (a.statut === "programme" || a.statut === "sollicite") ? ` · prochain le ${dateCourte(a.prochain_le)}` : ""}
                    </span>
                  </span>
                  {membre && (a.statut === "programme" || a.statut === "sollicite") ? (
                    <button type="button" className="r-btn" disabled={envoi !== null}
                      onClick={() => void agir(a.id, () => avisRecu(a.id), (m) => ({ ...m, avis: m.avis.map((x) => (x.id === a.id ? { ...x, statut: "avis_recu", prochain_le: null } : x)) }),
                        "Avis noté reçu : plus aucune relance.")}>Avis reçu</button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
