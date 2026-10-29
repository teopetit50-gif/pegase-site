"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les six fenêtres de l'écran LORANI (sorties d'EcranLorani le 29/10/2026,
   telles quelles) : nouveau projet (F1), nouveau permis (F2), déposer un
   courrier de la mairie (F3), ajouter un lot (F4), un intervenant (F5),
   composer l'équipe (F6).

   Le parent garde la fenêtre ouverte (`form`) et la ferme (`fermer`) ; une
   saisie passe par `agir` (la porte puis relecture en base réelle, le
   dossier d'exemple modifié en mémoire). `apres(id, type)` reçoit le
   projet ou le permis créé, au même moment qu'avant (l'écran de /espace
   l'ouvre ; l'espace 2 navigue vers sa page). `onEnvoi` dit au parent
   qu'une saisie part, pour griser ses boutons pendant ce temps.

   À l'ouverture, une fenêtre repart sans erreur ; « Nouveau projet »
   repart vide (les autres gardent leur dernière saisie, comme avant).
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { FolderPlus, Mail, Plus, UserPlus } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis } from "../ui";
import { NATURES_INTERVENANT, NATURES_PROJET, ROLES_PROJET, TYPES, TYPES_PIECE } from "./etats";
import { ajouterIntervenant, ajouterLot, ajouterMembre, deposerCourrier, ouvrirPermis, ouvrirProjet } from "./portes";
import type { Dossier, Intervenant, Lot, MembreProjet, Permis, PieceProjet, Projet } from "./types";

export type Form = { type: "projet" } | { type: "permis"; projet: string } | { type: "courrier"; projet: string } | { type: "lot"; projet: string } | { type: "intervenant"; projet: string } | { type: "membre"; projet: string } | null;

const aujourdHuiIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
};

const PROJET_VIDE = { nom: "", reference: "", adresse: "", code_postal: "", commune: "", code_insee: "", parcelles: "", nature: "maison_individuelle", marche_public: false };

export default function Formulaires({ form, fermer, dossier, personnes, agir, apres, onEnvoi }: {
  form: Form;
  fermer: () => void;
  dossier: Dossier;
  personnes: { user_id: string; nom: string }[];
  agir: (reel: () => Promise<void>, local: () => Dossier) => Promise<void>;
  apres?: (id: string, type: "projet" | "permis") => void;
  onEnvoi?: (enCours: boolean) => void;
}) {
  const [envoi, setEnvoiIci] = useState(false);
  const [erreurForm, setErreurForm] = useState<string | null>(null);
  const setEnvoi = (v: boolean) => {
    setEnvoiIci(v);
    onEnvoi?.(v);
  };

  const [np, setNp] = useState(PROJET_VIDE);
  const [nx, setNx] = useState({ type: "pc", intitule: "", numero: "", date_depot: "" });
  const [fichier, setFichier] = useState<File | null>(null);
  const [typePiece, setTypePiece] = useState("");
  const [nl, setNl] = useState({ numero: "", intitule: "" });
  const [ni, setNi] = useState({ nature: "bet_structure", organisme: "", contact: "", email: "", telephone: "", siren: "", lot_id: "" });
  const [nm, setNm] = useState({ user_id: "", role_projet: "chef_projet" });

  /* une fenêtre qui s'ouvre : sans l'erreur d'avant ; le nouveau projet, vide */
  const [ouverte, setOuverte] = useState<Form>(form);
  if (form !== ouverte) {
    setOuverte(form);
    if (form) setErreurForm(null);
    if (form?.type === "projet") setNp(PROJET_VIDE);
  }

  const clientId = dossier.moi?.client_id ?? "";

  const appliquer = async (reel: () => Promise<void>, localFn: () => Dossier) => {
    setEnvoi(true);
    setErreurForm(null);
    try {
      await agir(reel, localFn);
      fermer();
    } catch (e) {
      setErreurForm(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(false);
    }
  };

  const soumettreProjet = async () => {
    const parcelles = np.parcelles.split(/[,;\n]+/).map((x) => x.trim().toUpperCase()).filter(Boolean);
    const v = { client_id: clientId, nom: np.nom.trim(), reference: np.reference.trim() || null, adresse: np.adresse.trim() || null, code_postal: np.code_postal.trim() || null, commune: np.commune.trim() || null, code_insee: np.code_insee.trim() || null, parcelles, nature: np.nature as Projet["nature"], marche_public: np.marche_public };
    await appliquer(
      () => ouvrirProjet(v).then((id) => apres?.(id, "projet")),
      () => {
        const id = `local-projet-${Date.now()}`;
        const nouveau: Projet = { ...v, id, entite_id: dossier.projets[0]?.entite_id ?? "", phase: "esq", territoire: "metropole", actif: true, cree_le: new Date().toISOString(), maj_le: new Date().toISOString() };
        apres?.(id, "projet");
        return { ...dossier, projets: [nouveau, ...dossier.projets] };
      },
    );
  };

  const soumettrePermis = async () => {
    if (form?.type !== "permis") return;
    const v = { client_id: clientId, projet_id: form.projet, type_autorisation: nx.type as Permis["type_autorisation"], intitule: nx.intitule.trim() || null, numero: nx.numero.trim() || null, date_depot: nx.date_depot || null };
    await appliquer(
      () => ouvrirPermis(v).then((id) => apres?.(id, "permis")),
      () => {
        const id = `local-permis-${Date.now()}`;
        const nouveau: Permis = {
          ...v,
          id,
          entite_id: dossier.projets.find((p) => p.id === form.projet)?.entite_id ?? "",
          secteur_protege: false, immeuble_inscrit_mh: false, erp_autorisation: false, igh: false, evaluation_environnementale: false, cas_rejet: [],
          date_demande_pieces: null, date_pieces_fournies: null, delai_notifie_mois: null, date_notification_delai: null, decision: null, date_decision: null, date_affichage: null,
          actif: true, etat: v.date_depot ? "completude" : "a_deposer", silence: "tacite", date_decision_attendue: null, date_purge: null,
          calcul: { version: "lorani.m4.1", etat: v.date_depot ? "completude" : "a_deposer", etapes: v.date_depot ? [{ nature: "depot", libelle: "Dépôt du dossier en mairie", date: v.date_depot, statut: "fait" }] : [], avertissements: [] },
          calcule_le: new Date().toISOString(), cree_le: new Date().toISOString(), maj_le: new Date().toISOString(), pieces_demandees: [],
        };
        apres?.(id, "permis");
        return { ...dossier, permis: [nouveau, ...dossier.permis] };
      },
    );
  };

  const soumettreCourrier = async () => {
    if (form?.type !== "courrier" || !fichier) return;
    const f = fichier;
    await appliquer(
      () => deposerCourrier(clientId, form.projet, f, typePiece || null).then(() => undefined),
      () => {
        const nouveau: PieceProjet = { id: `local-piece-${Date.now()}`, objet_id: form.projet, nom_fichier: f.name, mime: f.type, statut: "en_lecture", type_piece: typePiece || null, cree_le: new Date().toISOString() };
        return { ...dossier, pieces: [nouveau, ...dossier.pieces] };
      },
    );
  };

  const soumettreLot = async () => {
    if (form?.type !== "lot") return;
    const v = { client_id: clientId, projet_id: form.projet, numero: nl.numero.trim(), intitule: nl.intitule.trim() };
    await appliquer(
      () => ajouterLot(v),
      () => ({ ...dossier, lots: [...dossier.lots, { id: `local-lot-${Date.now()}`, projet_id: v.projet_id, numero: v.numero, intitule: v.intitule, activites_requises: [] } satisfies Lot] }),
    );
  };

  const soumettreIntervenant = async () => {
    if (form?.type !== "intervenant") return;
    const v = { client_id: clientId, projet_id: form.projet, nature: ni.nature as Intervenant["nature"], organisme: ni.organisme.trim(), contact: ni.contact.trim() || null, email: ni.email.trim() || null, telephone: ni.telephone.trim() || null, siren: ni.siren.replace(/\s/g, "") || null, lot_id: ni.lot_id || null };
    await appliquer(
      () => ajouterIntervenant(v),
      () => ({ ...dossier, intervenants: [...dossier.intervenants, { ...v, id: `local-int-${Date.now()}`, actif: true } satisfies Intervenant] }),
    );
  };

  const soumettreMembre = async () => {
    if (form?.type !== "membre") return;
    const v = { client_id: clientId, projet_id: form.projet, user_id: nm.user_id, role_projet: nm.role_projet as MembreProjet["role_projet"] };
    await appliquer(
      () => ajouterMembre(v),
      () => ({ ...dossier, membres: [...dossier.membres, { id: `local-m-${Date.now()}`, projet_id: v.projet_id, user_id: v.user_id, role_projet: v.role_projet } satisfies MembreProjet] }),
    );
  };

  return (
    <>
      {/* ——— nouveau projet ——— */}
      <Dialog open={form?.type === "projet"} onOpenChange={(o) => !o && fermer()}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><FolderPlus width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Nouveau projet</DialogTitle>
            <DialogDescription>Le lieu du terrain fixe les règles : le code INSEE ou le code postal dit si le code de l&apos;urbanisme national s&apos;applique.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Nom du projet <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={np.nom} onChange={(e) => setNp((s) => ({ ...s, nom: e.target.value }))} maxLength={200} placeholder="Maison Lemoine" />
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Référence interne
                  <input className="rv-champ" value={np.reference} onChange={(e) => setNp((s) => ({ ...s, reference: e.target.value }))} maxLength={60} placeholder="26-014" />
                </label>
                <label className="rv-libelle">Nature
                  <select className="rv-champ" value={np.nature} onChange={(e) => setNp((s) => ({ ...s, nature: e.target.value }))}>
                    {(Object.keys(NATURES_PROJET) as Projet["nature"][]).map((n) => <option key={n} value={n}>{NATURES_PROJET[n]}</option>)}
                  </select>
                </label>
              </div>
              <label className="rv-libelle">Adresse du terrain
                <input className="rv-champ" value={np.adresse} onChange={(e) => setNp((s) => ({ ...s, adresse: e.target.value }))} maxLength={300} />
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Code postal <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" inputMode="numeric" value={np.code_postal} onChange={(e) => setNp((s) => ({ ...s, code_postal: e.target.value.replace(/\D/g, "").slice(0, 5) }))} placeholder="44000" />
                </label>
                <label className="rv-libelle">Commune
                  <input className="rv-champ" value={np.commune} onChange={(e) => setNp((s) => ({ ...s, commune: e.target.value }))} maxLength={120} placeholder="Nantes" />
                </label>
              </div>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Code INSEE
                  <input className="rv-champ" value={np.code_insee} onChange={(e) => setNp((s) => ({ ...s, code_insee: e.target.value.toUpperCase().slice(0, 5) }))} placeholder="44109" />
                </label>
                <label className="rv-libelle">Parcelles
                  <input className="rv-champ" value={np.parcelles} onChange={(e) => setNp((s) => ({ ...s, parcelles: e.target.value }))} placeholder="AB 123, AB 124" />
                </label>
              </div>
              <div className="lor-cases">
                <label><input type="checkbox" checked={np.marche_public} onChange={(e) => setNp((s) => ({ ...s, marche_public: e.target.checked }))} /> Marché public (maîtrise d&apos;ouvrage publique)</label>
              </div>
              {erreurForm ? <Avis teinte="rouge" role="alert">{erreurForm}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!np.nom.trim() || !/^\d{5}$/.test(np.code_postal) || envoi} onClick={soumettreProjet}>{envoi ? <Loader variant="spin" /> : null} Ouvrir le projet</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— nouveau permis ——— */}
      <Dialog open={form?.type === "permis"} onOpenChange={(o) => !o && fermer()}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Plus width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Nouveau permis</DialogTitle>
            <DialogDescription>Le type fixe le délai de droit commun (un mois pour une déclaration préalable, deux pour une maison, trois pour les autres permis). Les cas particuliers (secteur protégé, ERP, monument historique) se cochent ensuite sur le permis.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Type d&apos;autorisation
                <select className="rv-champ" value={nx.type} onChange={(e) => setNx((s) => ({ ...s, type: e.target.value }))}>
                  {(Object.keys(TYPES) as Permis["type_autorisation"][]).map((t) => <option key={t} value={t}>{TYPES[t].libelle}</option>)}
                </select>
              </label>
              <label className="rv-libelle">Intitulé
                <input className="rv-champ" value={nx.intitule} onChange={(e) => setNx((s) => ({ ...s, intitule: e.target.value }))} maxLength={120} placeholder="Extension, clôture, surélévation…" />
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Numéro du dossier
                  <input className="rv-champ" value={nx.numero} onChange={(e) => setNx((s) => ({ ...s, numero: e.target.value }))} maxLength={40} placeholder="si déjà déposé" />
                </label>
                <label className="rv-libelle">Date de dépôt
                  <input className="rv-champ" type="date" value={nx.date_depot} onChange={(e) => setNx((s) => ({ ...s, date_depot: e.target.value }))} max={aujourdHuiIso()} />
                </label>
              </div>
              {erreurForm ? <Avis teinte="rouge" role="alert">{erreurForm}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={soumettrePermis}>{envoi ? <Loader variant="spin" /> : null} Saisir le permis</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— déposer un courrier ——— */}
      <Dialog open={form?.type === "courrier"} onOpenChange={(o) => { if (!o) { fermer(); setFichier(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Mail width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Déposer un courrier de la mairie</DialogTitle>
            <DialogDescription>Récépissé, lettre de délai, demande de pièces, arrêté, certificat de permis tacite ou constat d&apos;affichage. Lorani le lit et vous propose la date à confirmer.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle" htmlFor="lor-courrier-fichier">
                <span>Fichier <span className="esp-obligatoire">(obligatoire)</span></span>
                <div className="esp-fichier">
                  <input id="lor-courrier-fichier" type="file" className="esp-fichier-natif" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFichier(e.target.files?.[0] ?? null)} />
                  <span className="r-btn r-btn--fil" role="presentation">Choisir un fichier</span>
                  <span className="esp-kpi-sous">{fichier ? `${fichier.name} · ${Math.round(fichier.size / 1024)} Ko` : "PDF ou image, 50 Mo au plus."}</span>
                </div>
              </label>
              <label className="rv-libelle">Nature du courrier
                <select className="rv-champ" value={typePiece} onChange={(e) => setTypePiece(e.target.value)}>
                  <option value="">Laisser Lorani reconnaître</option>
                  {TYPES_PIECE.map((t) => <option key={t.cle} value={t.cle}>{t.libelle}</option>)}
                </select>
              </label>
              {erreurForm ? <Avis teinte="rouge" role="alert">{erreurForm}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!fichier || envoi} onClick={soumettreCourrier}>{envoi ? <Loader variant="spin" /> : null} Déposer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— lot, intervenant, membre ——— */}
      <Dialog open={form?.type === "lot"} onOpenChange={(o) => !o && fermer()}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Plus width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Ajouter un lot</DialogTitle>
            <DialogDescription>Le numéro est unique dans le projet (01, 02, 08.1…).</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">Numéro <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" value={nl.numero} onChange={(e) => setNl((s) => ({ ...s, numero: e.target.value }))} maxLength={10} placeholder="01" />
                </label>
                <label className="rv-libelle">Intitulé <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" value={nl.intitule} onChange={(e) => setNl((s) => ({ ...s, intitule: e.target.value }))} maxLength={200} placeholder="Gros œuvre" />
                </label>
              </div>
              {erreurForm ? <Avis teinte="rouge" role="alert">{erreurForm}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!/^[0-9A-Za-z][0-9A-Za-z.-]{0,9}$/.test(nl.numero.trim()) || !nl.intitule.trim() || envoi} onClick={soumettreLot}>{envoi ? <Loader variant="spin" /> : null} Ajouter</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={form?.type === "intervenant"} onOpenChange={(o) => !o && fermer()}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><UserPlus width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Ajouter un intervenant</DialogTitle>
            <DialogDescription>Maître d&apos;ouvrage, bureaux d&apos;études, contrôleur, entreprise : qui travaille sur le projet, et sur quel lot.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">Rôle
                  <select className="rv-champ" value={ni.nature} onChange={(e) => setNi((s) => ({ ...s, nature: e.target.value }))}>
                    {(Object.keys(NATURES_INTERVENANT) as Intervenant["nature"][]).map((n) => <option key={n} value={n}>{NATURES_INTERVENANT[n]}</option>)}
                  </select>
                </label>
                <label className="rv-libelle">Lot
                  <select className="rv-champ" value={ni.lot_id} onChange={(e) => setNi((s) => ({ ...s, lot_id: e.target.value }))}>
                    <option value="">Tout le projet</option>
                    {dossier.lots.filter((l) => form?.type === "intervenant" && l.projet_id === form.projet).map((l) => <option key={l.id} value={l.id}>{l.numero} · {l.intitule}</option>)}
                  </select>
                </label>
              </div>
              <label className="rv-libelle">Organisme <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={ni.organisme} onChange={(e) => setNi((s) => ({ ...s, organisme: e.target.value }))} maxLength={200} />
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Contact
                  <input className="rv-champ" value={ni.contact} onChange={(e) => setNi((s) => ({ ...s, contact: e.target.value }))} maxLength={200} />
                </label>
                <label className="rv-libelle">SIREN
                  <input className="rv-champ" inputMode="numeric" value={ni.siren} onChange={(e) => setNi((s) => ({ ...s, siren: e.target.value.replace(/\D/g, "").slice(0, 9) }))} />
                </label>
              </div>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Courriel
                  <input className="rv-champ" type="email" value={ni.email} onChange={(e) => setNi((s) => ({ ...s, email: e.target.value }))} maxLength={320} />
                </label>
                <label className="rv-libelle">Téléphone
                  <input className="rv-champ" value={ni.telephone} onChange={(e) => setNi((s) => ({ ...s, telephone: e.target.value }))} maxLength={40} />
                </label>
              </div>
              {erreurForm ? <Avis teinte="rouge" role="alert">{erreurForm}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!ni.organisme.trim() || (ni.siren !== "" && ni.siren.length !== 9) || envoi} onClick={soumettreIntervenant}>{envoi ? <Loader variant="spin" /> : null} Ajouter</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={form?.type === "membre"} onOpenChange={(o) => !o && fermer()}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><UserPlus width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Composer l&apos;équipe</DialogTitle>
            <DialogDescription>Le chef de projet reçoit les rappels et la ligne du point du matin. Un membre voit le projet s&apos;il y a accès ; un gérant ou un admin ouvre l&apos;accès.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">Personne <span className="esp-obligatoire">(obligatoire)</span>
                  <select className="rv-champ" value={nm.user_id} onChange={(e) => setNm((s) => ({ ...s, user_id: e.target.value }))}>
                    <option value="">Choisir…</option>
                    {personnes.map((p) => <option key={p.user_id} value={p.user_id}>{p.nom}</option>)}
                  </select>
                </label>
                <label className="rv-libelle">Rôle dans le projet
                  <select className="rv-champ" value={nm.role_projet} onChange={(e) => setNm((s) => ({ ...s, role_projet: e.target.value }))}>
                    {(Object.keys(ROLES_PROJET) as MembreProjet["role_projet"][]).map((r) => <option key={r} value={r}>{ROLES_PROJET[r]}</option>)}
                  </select>
                </label>
              </div>
              {erreurForm ? <Avis teinte="rouge" role="alert">{erreurForm}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!nm.user_id || envoi} onClick={soumettreMembre}>{envoi ? <Loader variant="spin" /> : null} Ajouter</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
