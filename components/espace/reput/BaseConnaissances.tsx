"use client";

/* ══════════════════════════════════════════════════════════════════════
   La base de connaissances REPUT (06/10/2026, session C3, c3_01)

   Les fiches en vigueur et les brouillons, par sujet : questions-réponses,
   horaires, tarifs, documents. Chaque fiche dit sa source et sa période de
   validité ; la corriger en crée une nouvelle version (la précédente reste
   au journal), qui s'applique à la réponse suivante. Un collaborateur écrit
   un brouillon ; un gérant, un administrateur ou un valideur le valide.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { dateCourte } from "../format";
import { Avis, Pastille, Vide } from "../ui";
import { ecrireFiche, retirerFiche, validerFiche } from "./portes";
import type { Client, Fiche, GenreFiche, Monde } from "./types";

const GENRES: Record<GenreFiche, string> = {
  question: "Question-réponse", horaires: "Horaires", tarif: "Tarif", document: "Document", information: "Information",
};

type Brouillon = { id: string | null; sujet: string; genre: GenreFiche; titre: string; contenu: string; source: string; valide_du: string; valide_au: string };

const VIDE: Brouillon = { id: null, sujet: "information", genre: "question", titre: "", contenu: "", source: "", valide_du: "", valide_au: "" };

export default function BaseConnaissances({ monde, source, client, role, relire, modifierLocal }: {
  monde: Monde; source: "exemple" | "reelle"; client: Client | null; role: string;
  relire: () => Promise<void>; modifierLocal: (f: (m: Monde) => Monde) => void;
}) {
  const [b, setB] = useState<Brouillon | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const ecrit = role !== "lecteur";
  const decide = role === "gerant" || role === "admin" || role === "valideur";

  const parSujet = monde.sujets
    .map((s) => ({ s, fiches: monde.fiches.filter((f) => f.sujet === s.code) }))
    .filter((x) => x.fiches.length > 0);

  const action = async (f: () => Promise<unknown>, local: (m: Monde) => Monde, message: string) => {
    setEnvoi(true);
    setErreur(null);
    try {
      if (source === "reelle") {
        await f();
        await relire();
      } else modifierLocal(local);
      setFait(message);
      setB(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(false);
    }
  };

  const enregistrer = () => {
    if (!b) return;
    const fiche = { sujet: b.sujet, genre: b.genre, titre: b.titre.trim(), contenu: b.contenu.trim(), source: b.source.trim(),
                    ...(b.valide_du ? { valide_du: b.valide_du } : {}), valide_au: b.valide_au || null };
    void action(
      () => ecrireFiche(b.id, client!.client_id, fiche as Partial<Fiche>),
      (m) => {
        const avant = b.id ? m.fiches.find((x) => x.id === b.id) : undefined;
        const id = crypto.randomUUID();
        const nouvelle: Fiche = {
          id, entite_id: null, origine_id: avant?.origine_id ?? id, version: (avant?.version ?? 0) + 1, sujet: b.sujet, genre: b.genre,
          titre: fiche.titre, contenu: fiche.contenu, langue: "fr", source: fiche.source, valide_du: b.valide_du || new Date().toISOString().slice(0, 10),
          valide_au: b.valide_au || null, statut: decide ? "validee" : "brouillon", cree_le: new Date().toISOString(), valide_le: decide ? new Date().toISOString() : null,
        };
        return { ...m, fiches: [nouvelle, ...m.fiches.filter((x) => !(decide && avant && x.origine_id === avant.origine_id))] };
      },
      decide ? "La fiche est en vigueur : la prochaine réponse la cite." : "Brouillon enregistré : un valideur le met en vigueur.",
    );
  };

  const pret = b && b.titre.trim() && b.contenu.trim() && b.source.trim() && (!b.valide_au || !b.valide_du || b.valide_au >= b.valide_du);

  return (
    <section className="esp-carte" aria-label="Base de connaissances">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Base de connaissances</h2>
        {ecrit ? (
          <button type="button" className="r-btn r-btn--noir" onClick={() => { setErreur(null); setB({ ...VIDE }); }}>
            <Plus width={15} height={15} aria-hidden="true" /> Nouvelle fiche
          </button>
        ) : null}
      </div>
      <div className="esp-carte-corps">
        <p className="esp-kpi-sous">
          Les réponses ne disent que ce qui est écrit ici. Chaque fiche porte sa source et sa période de validité ; une correction crée une nouvelle version, appliquée dès la réponse suivante.
        </p>
        {fait ? <div style={{ marginTop: 10 }}><Avis teinte="vert" role="status">{fait}</Avis></div> : null}
        {erreur && !b ? <div style={{ marginTop: 10 }}><Avis teinte="rouge" role="alert">{erreur}</Avis></div> : null}
      </div>
      {parSujet.length === 0 ? (
        <div className="esp-carte-corps"><Vide titre="La base est vide">Sans fiche, chaque demande est transmise à votre équipe avec un accusé de réception.</Vide></div>
      ) : parSujet.map(({ s, fiches }) => (
        <div key={s.code} className="esp-carte-corps">
          <div className="esp-section-titre">{s.libelle}</div>
          <ul style={{ display: "grid", gap: 12 }}>
            {fiches.map((f) => (
              <li key={f.id}>
                <div className="esp-item-haut">
                  <strong>{f.titre}</strong>
                  <Pastille contour>{GENRES[f.genre]}</Pastille>
                  {f.statut === "brouillon" ? <Pastille teinte="ambre">Brouillon à valider</Pastille> : null}
                  {f.version > 1 ? <Pastille teinte="gris">Version {f.version}</Pastille> : null}
                </div>
                <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", margin: "4px 0" }}>{f.contenu}</p>
                <p className="esp-kpi-sous">
                  Source : {f.source} · en vigueur du {dateCourte(f.valide_du)}{f.valide_au ? ` au ${dateCourte(f.valide_au)}` : ", sans fin"}
                </p>
                {ecrit ? (
                  <div className="esp-actions" style={{ marginTop: 6 }}>
                    <button type="button" className="r-btn" onClick={() => { setErreur(null); setB({ id: f.id, sujet: f.sujet, genre: f.genre, titre: f.titre, contenu: f.contenu, source: f.source, valide_du: f.valide_du, valide_au: f.valide_au ?? "" }); }}>Corriger</button>
                    {decide && f.statut === "brouillon" ? (
                      <button type="button" className="r-btn r-btn--noir" disabled={envoi}
                        onClick={() => void action(() => validerFiche(f.id), (m) => ({ ...m, fiches: m.fiches.map((x) => (x.id === f.id ? { ...x, statut: "validee", valide_le: new Date().toISOString() } : x)) }), "La fiche est validée et en vigueur.")}>Valider</button>
                    ) : null}
                    {decide ? (
                      <button type="button" className="r-btn" disabled={envoi}
                        onClick={() => {
                          const motif = window.prompt("Pourquoi retirer cette fiche ?");
                          if (motif && motif.trim()) void action(() => retirerFiche(f.id, motif.trim()), (m) => ({ ...m, fiches: m.fiches.filter((x) => x.id !== f.id) }), "La fiche est retirée : les réponses ne la citent plus.");
                        }}>Retirer</button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <Dialog open={b !== null} onOpenChange={(o) => !o && setB(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><BookOpen width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{b?.id ? "Corriger la fiche" : "Nouvelle fiche"}</DialogTitle>
            <DialogDescription>Écrivez ce que vous répondriez vous-même, avec ses chiffres exacts. La réponse ne dira rien de plus.</DialogDescription>
          </DialogHeader>
          {b ? (
            <DialogBody>
              <div className="esp-form">
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Sujet
                    <select className="rv-champ" value={b.sujet} onChange={(e) => setB({ ...b, sujet: e.target.value })}>
                      {monde.sujets.filter((s) => s.actif).map((s) => <option key={s.code} value={s.code}>{s.libelle}</option>)}
                    </select>
                  </label>
                  <label className="rv-libelle">Genre
                    <select className="rv-champ" value={b.genre} onChange={(e) => setB({ ...b, genre: e.target.value as GenreFiche })}>
                      {(Object.keys(GENRES) as GenreFiche[]).map((g) => <option key={g} value={g}>{GENRES[g]}</option>)}
                    </select>
                  </label>
                </div>
                <label className="rv-libelle">Question ou titre <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" value={b.titre} onChange={(e) => setB({ ...b, titre: e.target.value })} placeholder="Êtes-vous ouverts le samedi ?" />
                </label>
                <label className="rv-libelle">Réponse ou contenu <span className="esp-obligatoire">(obligatoire)</span>
                  <textarea className="rv-champ" rows={5} value={b.contenu} onChange={(e) => setB({ ...b, contenu: e.target.value })} placeholder="Le samedi de 9 h à 12 h." />
                </label>
                <label className="rv-libelle">Source <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" value={b.source} onChange={(e) => setB({ ...b, source: e.target.value })} placeholder="Grille tarifaire 2026, page 2" />
                </label>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">En vigueur à partir du
                    <input className="rv-champ" type="date" value={b.valide_du} onChange={(e) => setB({ ...b, valide_du: e.target.value })} />
                  </label>
                  <label className="rv-libelle">Jusqu&apos;au (facultatif)
                    <input className="rv-champ" type="date" value={b.valide_au} onChange={(e) => setB({ ...b, valide_au: e.target.value })} />
                  </label>
                </div>
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div>
            </DialogBody>
          ) : null}
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!pret || envoi} onClick={enregistrer}>{envoi ? <Loader variant="spin" /> : null} {decide ? "Mettre en vigueur" : "Enregistrer le brouillon"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
