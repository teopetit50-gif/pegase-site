"use client";

/* ══════════════════════════════════════════════════════════════════════
   /espace/equipe — l'équipe de l'organisation (15/10/2026, A3)

   Qui a accès, avec quel rôle, sur quelles sociétés ; ajouter une personne
   qui a déjà un compte Omega, changer son rôle, régler les sociétés qu'elle
   voit, la retirer. Les gestes sont réservés aux gérants et administrateurs
   (la base le vérifie ; seul un gérant touche un gérant ; le dernier gérant
   ne se retire pas). Voir equipe/portes.ts.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Settings, UserMinus, UserPlus } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { CLAIRE, ENTITES, EXEMPLE_CLIENT_ID, MARC, PERSONNES, SIEGE, SOFIA, YANIS } from "../exemples/socle";
import { useSource } from "../source";
import { Avis, Chargement, Pastille, Ruban, Vide } from "../ui";
import { ROLES, ajouterMembre, changerRole, chargerEquipe, libelleRole, reglerPerimetre, retirerMembre, type Membre, type Role, type VueEquipe } from "./portes";

const ADRESSES: Record<string, string> = {
  [CLAIRE]: "claire.morel@atelier-bertin.fr",
  [YANIS]: "yanis.dupre@atelier-bertin.fr",
  [SOFIA]: "sofia.carvalho@atelier-bertin.fr",
  [MARC]: "marc.levy@atelier-bertin.fr",
};
/* l'exemple vu par la gérante, Claire Morel */
function vueExemple(): VueEquipe {
  const membres: Membre[] = Object.entries(PERSONNES)
    .filter(([id]) => ADRESSES[id])
    .map(([id, p]) => ({ user_id: id, nom: p.nom, email: ADRESSES[id], role: p.role as Role, perimetre_total: id !== YANIS, entites: id === YANIS ? [SIEGE] : [] }));
  return { membres, societes: ENTITES.map((e) => ({ id: e.id, nom: e.nom })), client: EXEMPLE_CLIENT_ID, moi: CLAIRE, monRole: "gerant" };
}

type Form = { type: "ajouter" } | { type: "perimetre"; membre: Membre } | { type: "retirer"; membre: Membre } | null;

export default function EcranEquipe() {
  const { source } = useSource();
  const [exemple, setExemple] = useState<VueEquipe>(vueExemple);
  const [reel, setReel] = useState<VueEquipe | null | undefined>(undefined);
  const [erreur, setErreur] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("collaborateur");
  const [total, setTotal] = useState(true);
  const [choix, setChoix] = useState<string[]>([]);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreurAction, setErreurAction] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    try {
      setReel(await chargerEquipe());
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel(null);
    }
  }, []);
  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);

  const vue = source === "exemple" ? exemple : reel;
  const gere = vue?.monRole === "gerant" || vue?.monRole === "admin";
  const touche = (m: Membre) => gere && (m.role !== "gerant" || vue?.monRole === "gerant");
  const nomSociete = (id: string) => vue?.societes.find((s) => s.id === id)?.nom ?? id.slice(0, 8);
  const rolesPermis = ROLES.filter((r) => r.cle !== "gerant" || vue?.monRole === "gerant");

  /* un geste : en exemple, en local ; en réel, la porte puis la relecture */
  const agir = async (cle: string, reelle: () => Promise<void>, locale: (v: VueEquipe) => VueEquipe, ok: string) => {
    setErreurAction(null);
    setFait(null);
    if (source === "exemple") {
      setExemple((v) => locale(v));
      setForm(null);
      setFait(ok);
      return;
    }
    if (!vue) return;
    setEnvoi(cle);
    try {
      await reelle();
      setForm(null);
      setFait(ok);
      await charger();
    } catch (e) {
      setErreurAction(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(null);
    }
  };

  const ouvrir = (f: Form) => {
    setErreurAction(null);
    setFait(null);
    if (f?.type === "ajouter") { setEmail(""); setRole("collaborateur"); }
    if (f?.type === "perimetre") { setTotal(f.membre.perimetre_total); setChoix(f.membre.entites); }
    setForm(f);
  };

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <>
      <div className="esp-tete" data-arrivee="">
        <div>
          <h1 className="esp-titre">Équipe</h1>
          <p className="esp-sous">Qui a accès à votre organisation, avec quel rôle, et sur quelles sociétés. Chaque changement est inscrit au journal.</p>
        </div>
        <div className="esp-item-haut">
          <Link href="/espace/reglages" className="r-btn r-btn--fil"><Settings width={15} height={15} aria-hidden="true" /> Réglages</Link>
          {gere ? <button type="button" className="r-btn r-btn--noir" onClick={() => ouvrir({ type: "ajouter" })}><UserPlus width={15} height={15} aria-hidden="true" /> Ajouter une personne</button> : null}
          <Ruban source={source} />
        </div>
      </div>

      {erreur ? <div style={{ marginBottom: 14 }}><Avis teinte="rouge" role="alert"><strong>La base réelle n&apos;a pas répondu.</strong> {erreur}</Avis></div> : null}
      {fait ? <div style={{ marginBottom: 14 }}><Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Avis></div> : null}
      {erreurAction && !form ? <div style={{ marginBottom: 14 }}><Avis teinte="rouge" role="alert"><strong>Refusé par la base.</strong> {erreurAction}</Avis></div> : null}

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 1fr)" }}>
        <section className="esp-carte" aria-labelledby="titre-membres">
          <div className="esp-carte-tete">
            <h2 className="esp-carte-titre" id="titre-membres">Les personnes</h2>
            {vue ? <span className="esp-kpi-sous">{vue.membres.length} personne{vue.membres.length > 1 ? "s" : ""}</span> : null}
          </div>
          {source === "reelle" && reel === undefined ? (
            <Chargement texte="Lecture de l'équipe…" />
          ) : !vue ? (
            <Vide titre="Aucune organisation">Connectez-vous avec un compte rattaché à une organisation pour voir son équipe.</Vide>
          ) : (
            <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Les personnes de l'organisation">
              <table className="esp-tableau">
                <thead><tr><th>Personne</th><th>Rôle</th><th>Sociétés visibles</th><th aria-label="Gestes" /></tr></thead>
                <tbody>
                  {vue.membres.map((m) => (
                    <tr key={m.user_id}>
                      <td>
                        <strong>{m.nom}</strong>{m.user_id === vue.moi ? <> <Pastille teinte="bleu">vous</Pastille></> : null}
                        <div className="esp-kpi-sous esp-mono">{m.email ?? ""}</div>
                      </td>
                      <td>
                        {touche(m) && m.user_id !== vue.moi ? (
                          <select
                            className="rv-champ"
                            aria-label={`Rôle de ${m.nom}`}
                            value={m.role}
                            disabled={envoi === m.user_id}
                            onChange={(e) => {
                              const r = e.target.value as Role;
                              void agir(m.user_id, () => changerRole(vue.client, m.user_id, r), (v) => ({ ...v, membres: v.membres.map((x) => (x.user_id === m.user_id ? { ...x, role: r } : x)) }), `${m.nom} est maintenant ${libelleRole(r).toLowerCase()}.`);
                            }}
                          >
                            {rolesPermis.map((r) => <option key={r.cle} value={r.cle}>{r.libelle}</option>)}
                          </select>
                        ) : (
                          <Pastille teinte={m.role === "gerant" ? "noir" : "gris"}>{libelleRole(m.role)}</Pastille>
                        )}
                      </td>
                      <td>
                        {m.perimetre_total ? "Toutes" : m.entites.length ? m.entites.map(nomSociete).join(", ") : <Pastille teinte="ambre">aucune</Pastille>}
                        {touche(m) && vue.societes.length > 1 ? (
                          <> <button type="button" className="esp-lien-bouton" aria-label={`Modifier les sociétés visibles par ${m.nom}`} onClick={() => ouvrir({ type: "perimetre", membre: m })}>Modifier</button></>
                        ) : null}
                      </td>
                      <td className="esp-num">
                        {touche(m) && m.user_id !== vue.moi ? (
                          <button type="button" className="r-btn r-btn--fil r-btn--petit" aria-label={`Retirer ${m.nom}`} onClick={() => ouvrir({ type: "retirer", membre: m })}><UserMinus width={13} height={13} aria-hidden="true" /> Retirer</button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {vue && !gere ? <div className="esp-carte-corps"><p className="esp-kpi-sous" style={{ margin: 0 }}>Seuls les gérants et administrateurs changent l&apos;équipe. Votre rôle : {libelleRole(vue.monRole ?? "")}.</p></div> : null}
        </section>

        <section className="esp-carte" aria-labelledby="titre-roles">
          <div className="esp-carte-tete"><h2 className="esp-carte-titre" id="titre-roles">Ce que chaque rôle permet</h2></div>
          <div className="esp-carte-corps">
            <dl className="esp-def">
              {ROLES.map((r) => (
                <div key={r.cle}><dt>{r.libelle}</dt><dd>{r.peut}</dd></div>
              ))}
            </dl>
          </div>
        </section>
      </div>

      <Dialog open={form?.type === "ajouter"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><UserPlus width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Ajouter une personne</DialogTitle>
            <DialogDescription>La personne doit déjà avoir un compte Omega. L&apos;invitation par courriel arrive bientôt.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div style={{ display: "grid", gap: 12 }}>
              <label className="rv-libelle">Adresse de son compte
                <input type="email" className="rv-champ" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
              </label>
              <label className="rv-libelle">Rôle
                <select className="rv-champ" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  {rolesPermis.map((r) => <option key={r.cle} value={r.cle}>{r.libelle}</option>)}
                </select>
              </label>
              <p className="esp-kpi-sous" style={{ margin: 0 }}>{ROLES.find((r) => r.cle === role)?.peut}</p>
              {erreurAction ? <Avis teinte="rouge" role="alert"><strong>Refusé par la base.</strong> {erreurAction}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--fil" onClick={() => setForm(null)}>Annuler</button>
            <button
              type="button"
              className="r-btn r-btn--noir"
              disabled={!emailOk || !!envoi}
              onClick={() => {
                const adresse = email.trim();
                void agir(
                  "ajouter",
                  () => ajouterMembre(vue!.client, adresse, role),
                  (v) => ({ ...v, membres: [...v.membres, { user_id: `ex-${Date.now()}`, nom: adresse.split("@")[0].replace(/\./g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), email: adresse, role, perimetre_total: true, entites: [] }] }),
                  `${adresse} est ajoutée à l'organisation (${libelleRole(role).toLowerCase()}).`,
                );
              }}
            >
              {envoi === "ajouter" ? <Loader variant="spin" /> : null} Ajouter
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={form?.type === "perimetre"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Building2 width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Sociétés visibles</DialogTitle>
            <DialogDescription>{form?.type === "perimetre" ? `${form.membre.nom} ne voit et ne décide que pour les sociétés cochées.` : ""}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div style={{ display: "grid", gap: 10 }}>
              <label className="esp-item-haut"><input type="radio" name="perimetre" checked={total} onChange={() => setTotal(true)} /> Toutes les sociétés</label>
              <label className="esp-item-haut"><input type="radio" name="perimetre" checked={!total} onChange={() => setTotal(false)} /> Seulement :</label>
              {!total ? (
                <div style={{ display: "grid", gap: 6, paddingLeft: 22 }}>
                  {vue?.societes.map((s) => (
                    <label key={s.id} className="esp-item-haut">
                      <input type="checkbox" checked={choix.includes(s.id)} onChange={(e) => setChoix((c) => (e.target.checked ? [...c, s.id] : c.filter((x) => x !== s.id)))} /> {s.nom}
                    </label>
                  ))}
                </div>
              ) : null}
              {!total && !choix.length ? <p className="esp-kpi-sous" style={{ margin: 0 }}>Cochez au moins une société.</p> : null}
              {erreurAction ? <Avis teinte="rouge" role="alert"><strong>Refusé par la base.</strong> {erreurAction}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--fil" onClick={() => setForm(null)}>Annuler</button>
            <button
              type="button"
              className="r-btn r-btn--noir"
              disabled={(!total && !choix.length) || !!envoi}
              onClick={() => {
                if (form?.type !== "perimetre") return;
                const m = form.membre;
                void agir(
                  m.user_id,
                  () => reglerPerimetre(vue!.client, m.user_id, total, choix, m.entites),
                  (v) => ({ ...v, membres: v.membres.map((x) => (x.user_id === m.user_id ? { ...x, perimetre_total: total, entites: total ? x.entites : choix } : x)) }),
                  total ? `${m.nom} voit toutes les sociétés.` : `${m.nom} voit : ${choix.map(nomSociete).join(", ")}.`,
                );
              }}
            >
              {envoi && form?.type === "perimetre" ? <Loader variant="spin" /> : null} Enregistrer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={form?.type === "retirer"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><UserMinus width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Retirer de l&apos;organisation</DialogTitle>
            <DialogDescription>{form?.type === "retirer" ? `${form.membre.nom} perd l'accès à l'organisation. Ce qui a été fait reste au journal, à son nom.` : ""}</DialogDescription>
          </DialogHeader>
          <DialogBody>{erreurAction ? <Avis teinte="rouge" role="alert"><strong>Refusé par la base.</strong> {erreurAction}</Avis> : null}</DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--fil" onClick={() => setForm(null)}>Annuler</button>
            <button
              type="button"
              className="r-btn r-btn--noir"
              disabled={!!envoi}
              onClick={() => {
                if (form?.type !== "retirer") return;
                const m = form.membre;
                void agir(m.user_id, () => retirerMembre(vue!.client, m.user_id), (v) => ({ ...v, membres: v.membres.filter((x) => x.user_id !== m.user_id) }), `${m.nom} n'a plus accès à l'organisation.`);
              }}
            >
              {envoi && form?.type === "retirer" ? <Loader variant="spin" /> : null} Retirer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
