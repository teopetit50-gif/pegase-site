"use client";

/* ══════════════════════════════════════════════════════════════════════
   L'équipe — la page Settings › Members de Linear, au 1:1
   (28/10/2026, nuit ; demande de Teo : « reproduis-les à l'identique »).

   Le titre, la barre d'outils (recherche de 300, filtre « Tous V »,
   « Réglages », « Inviter »), puis le tableau : en-tête de 32, une ligne
   de groupe « Membres N », des lignes de 50 (avatar 24, nom, e-mail, rôle,
   sociétés, « ··· » au survol). Mesures : ./linear-reglages.css, relevé
   scratchpad/releve-linear-reglages.md.

   Mêmes données et mêmes portes que l'écran d'avant
   (components/espace/equipe/EcranEquipe.tsx, equipe/portes.ts) : l'exemple
   vu par Claire Morel, ou la base réelle (annuaire, comptes, entités).
   Où chaque geste est passé :
     · inviter (« Ajouter une personne ») : le bouton plein « Inviter »,
       le dialogue d'invitation de Linear (adresse, rôle) ;
     · changer le rôle : le menu « ··· » de la ligne (un choix par rôle,
       coche sur l'actuel) — avant, un <select> dans la colonne ;
     · sociétés visibles (« Modifier ») : le même menu, « Sociétés
       visibles… », le dialogue d'avant (toutes, ou cochées) ;
     · retirer : le même menu, « Retirer de l'organisation… » ;
     · filtrer les membres : le champ de recherche (nom, adresse, rôle) ;
       le filtre « Tous V » par rôle, dans l'URL (?role=, replace) ;
     · « Réglages » : le bouton cerclé, à la place d'« Export CSV » ;
     · « Ce que chaque rôle permet » : un second groupe du tableau, une
       ligne par rôle (libellé, ce qu'il permet, la clé).
   Les droits sont ceux d'avant : seuls gérants et administrateurs agissent,
   seul un gérant touche un gérant, personne ne se retire ni ne change son
   propre rôle ici ; la base les vérifie aussi.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Building2, Check, MoreHorizontal, Search, Settings, UserMinus, UserPlus, X } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { CLAIRE, ENTITES, EXEMPLE_CLIENT_ID, MARC, PERSONNES, SIEGE, SOFIA, YANIS } from "@/components/espace/exemples/socle";
import { useSource } from "@/components/espace/source";
import { ROLES, ajouterMembre, changerRole, chargerEquipe, libelleRole, reglerPerimetre, retirerMembre, type Membre, type Role, type VueEquipe } from "@/components/espace/equipe/portes";
import { Note, Squelette } from "../ui";
import { Menu } from "./Lin";
import { RACINE } from "../modules";
import { Chevron, Select } from "./ReglagesLinear";
import "./lin.css";
import "./linear-reglages.css";

const CHEMIN = `${RACINE}/equipe`;

/* l'exemple vu par la gérante, Claire Morel — celui de l'écran d'avant, inchangé */
const ADRESSES: Record<string, string> = {
  [CLAIRE]: "claire.morel@atelier-bertin.fr",
  [YANIS]: "yanis.dupre@atelier-bertin.fr",
  [SOFIA]: "sofia.carvalho@atelier-bertin.fr",
  [MARC]: "marc.levy@atelier-bertin.fr",
};
function vueExemple(): VueEquipe {
  const membres: Membre[] = Object.entries(PERSONNES)
    .filter(([id]) => ADRESSES[id])
    .map(([id, p]) => ({ user_id: id, nom: p.nom, email: ADRESSES[id], role: p.role as Role, perimetre_total: id !== YANIS, entites: id === YANIS ? [SIEGE] : [] }));
  return { membres, societes: ENTITES.map((e) => ({ id: e.id, nom: e.nom })), client: EXEMPLE_CLIENT_ID, moi: CLAIRE, monRole: "gerant" };
}

type Form = { type: "ajouter" } | { type: "perimetre"; membre: Membre } | { type: "retirer"; membre: Membre } | null;
const initiales = (nom: string) =>
  nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m.charAt(0))
    .join("");
const sansAccents = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/* ——— le dialogue de Linear (« Invite to your workspace ») ——— */
function Dialogue({
  ouvert,
  fermer,
  icone,
  titre,
  description,
  children,
  pied,
}: {
  ouvert: boolean;
  fermer: () => void;
  icone: React.ReactNode;
  titre: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  pied: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={ouvert} onOpenChange={(o) => !o && fermer()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="lrg-voile" />
        <DialogPrimitive.Content className="v2 lrg-dlg-portail" onOpenAutoFocus={(e) => e.preventDefault()}>
          <div className="lin lrg-dlg">
            <div className="lrg-dlg-tete">
              <span className="lrg-dlg-icone" aria-hidden="true">
                {icone}
              </span>
              <DialogPrimitive.Title className="lrg-dlg-titre">{titre}</DialogPrimitive.Title>
              <DialogPrimitive.Close className="lin-rond lrg-dlg-fermer" aria-label="Fermer">
                <X aria-hidden="true" />
              </DialogPrimitive.Close>
            </div>
            <div className="lrg-dlg-corps">
              {description ? <DialogPrimitive.Description className="lrg-dlg-desc">{description}</DialogPrimitive.Description> : null}
              {children}
              <div className="lrg-dlg-pied">{pied}</div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default function Equipe() {
  const { source } = useSource();
  const routeur = useRouter();
  const params = useSearchParams();
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
  const [filtre, setFiltre] = useState("");

  /* le filtre par rôle et le tri, dans l'URL (même route, replace) */
  const roleFiltre = params.get("role") ?? "";
  const tri = params.get("tri") === "desc" ? "desc" : "asc";
  const poser = (cle: string, valeur: string | null) => {
    const p = new URLSearchParams(params.toString());
    if (valeur) p.set(cle, valeur);
    else p.delete(cle);
    const q = p.toString();
    routeur.replace(q ? `${CHEMIN}?${q}` : CHEMIN, { scroll: false });
  };

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
    if (f?.type === "ajouter") {
      setEmail("");
      setRole("collaborateur");
    }
    if (f?.type === "perimetre") {
      setTotal(f.membre.perimetre_total);
      setChoix(f.membre.entites);
    }
    setForm(f);
  };
  const changerLeRole = (m: Membre, r: Role) => {
    if (r === m.role || !vue) return;
    void agir(
      m.user_id,
      () => changerRole(vue.client, m.user_id, r),
      (v) => ({ ...v, membres: v.membres.map((x) => (x.user_id === m.user_id ? { ...x, role: r } : x)) }),
      `${m.nom} est maintenant ${libelleRole(r).toLowerCase()}.`,
    );
  };

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const q = sansAccents(filtre.trim());
  const membresVus = useMemo(() => {
    const liste = (vue?.membres ?? []).filter((m) => (!roleFiltre || m.role === roleFiltre) && (!q || [m.nom, m.email, libelleRole(m.role)].some((x) => x && sansAccents(x).includes(q))));
    return [...liste].sort((a, b) => (tri === "asc" ? 1 : -1) * a.nom.localeCompare(b.nom, "fr"));
  }, [vue, roleFiltre, q, tri]);
  const filtreOptions = [{ cle: "", libelle: "Tous" }, ...ROLES.map((r) => ({ cle: r.cle, libelle: `${r.libelle}s` }))];
  const libelleFiltre = filtreOptions.find((o) => o.cle === roleFiltre)?.libelle ?? "Tous";

  return (
    <div className="lin lrg lrg-membres">
      <div className="lrg-mtete">
        <h1 className="lrg-h1">Équipe</h1>
        <div className="lrg-outils">
          <div className="lrg-outils-gauche">
            <form className="lrg-recherche" role="search" onSubmit={(e) => e.preventDefault()}>
              <Search aria-hidden="true" />
              <input className="lrg-champ" type="search" placeholder="Chercher par nom ou adresse" aria-label="Chercher un membre" value={filtre} onChange={(e) => setFiltre(e.target.value)} />
              {filtre ? (
                <button type="button" className="lrg-effacer" aria-label="Effacer la recherche" onClick={() => setFiltre("")}>
                  <X aria-hidden="true" />
                </button>
              ) : null}
            </form>
            <Menu
              bouton={(ouvert, basculer) => (
                <button type="button" className="lrg-select lrg-filtre" aria-haspopup="menu" aria-expanded={ouvert} aria-label={`Filtrer par rôle : ${libelleFiltre}`} onClick={basculer}>
                  {libelleFiltre}
                  <Chevron />
                </button>
              )}
            >
              {(fermer) => (
                <div className="lrg-menu-corps" role="menu" aria-label="Filtrer par rôle">
                  <ul>
                    {filtreOptions.map((o) => (
                      <li key={o.cle || "tous"}>
                        <button
                          type="button"
                          role="menuitemradio"
                          aria-checked={roleFiltre === o.cle}
                          className="lrg-menu-item"
                          onClick={() => {
                            poser("role", o.cle || null);
                            fermer();
                          }}
                        >
                          {o.libelle}
                          {roleFiltre === o.cle ? <Check className="lrg-coche" aria-hidden="true" /> : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Menu>
          </div>
          <div className="lrg-outils-droite">
            <Link href={`${RACINE}/reglages`} className="lrg-btn lrg-btn--cercle">
              <Settings aria-hidden="true" /> Réglages
            </Link>
            {gere ? (
              <button type="button" className="lrg-btn lrg-btn--plein" onClick={() => ouvrir({ type: "ajouter" })}>
                Inviter
              </button>
            ) : null}
          </div>
        </div>
        {erreur || fait || (erreurAction && !form) ? (
          <div className="lrg-notes">
            {erreur ? (
              <Note teinte="rouge" role="alert">
                <strong>La base réelle n&apos;a pas répondu.</strong> {erreur}
              </Note>
            ) : null}
            {fait ? (
              <Note teinte="vert" role="status">
                <strong>C&apos;est fait.</strong> {fait}
              </Note>
            ) : null}
            {erreurAction && !form ? (
              <Note teinte="rouge" role="alert">
                <strong>Refusé par la base.</strong> {erreurAction}
              </Note>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="lrg-tableau" role="table" aria-label="Les membres de l'organisation">
        <div className="lrg-entete" role="row">
          <span />
          <span className="lrg-entete-nom" role="columnheader" aria-sort={tri === "asc" ? "ascending" : "descending"}>
            <button type="button" className="lrg-entete-btn" data-tri={tri} onClick={() => poser("tri", tri === "asc" ? "desc" : null)} aria-label={`Trier par nom, ${tri === "asc" ? "décroissant" : "croissant"}`}>
              Nom
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M11.536 10.275a.75.75 0 0 0-.955-1.147l-.062.046L8 11.274 5.48 9.174l-.061-.046a.75.75 0 0 0-.955 1.147l2.52 2.1c.59.49 1.443.49 2.032 0l2.52-2.1ZM8.75 3.75a.75.75 0 0 0-1.5 0v8h1.5v-8Z" />
              </svg>
            </button>
          </span>
          <span role="columnheader">
            <span className="lrg-entete-btn">E-mail</span>
          </span>
          <span role="columnheader">
            <span className="lrg-entete-btn">Rôle</span>
          </span>
          <span role="columnheader">
            <span className="lrg-entete-btn">Sociétés</span>
          </span>
          <span />
          <span />
        </div>

        <div className="lrg-groupe" role="row">
          <span className="lrg-groupe-nom" role="cell">
            Membres
          </span>
          <span className="lrg-groupe-n" role="cell">
            {vue ? membresVus.length : ""}
          </span>
        </div>

        {source === "reelle" && reel === undefined ? (
          <div className="lrg-mligne" role="row">
            <div className="lrg-squelette" role="cell">
              <Squelette hauteur={24} />
            </div>
          </div>
        ) : !vue ? (
          <div className="lrg-mligne" role="row">
            <div className="lrg-vide" role="cell">
              <strong>Aucune organisation</strong>
              Connectez-vous avec un compte rattaché à une organisation pour voir son équipe.
            </div>
          </div>
        ) : !membresVus.length ? (
          <div className="lrg-mligne" role="row">
            <div className="lrg-vide" role="cell">
              <strong>Aucun membre trouvé</strong>
              Aucun membre ne correspond à ce filtre.
            </div>
          </div>
        ) : (
          membresVus.map((m) => {
            const moi = m.user_id === vue.moi;
            const peutRole = touche(m) && !moi;
            const peutSocietes = touche(m) && vue.societes.length > 1;
            const peutRetirer = touche(m) && !moi;
            const aMenu = peutRole || peutSocietes || peutRetirer;
            return (
              <div key={m.user_id} className="lrg-mligne" role="row" aria-busy={envoi === m.user_id || undefined}>
                <div className="lrg-cel-nom" role="cell">
                  <span className="lrg-avatar" aria-hidden="true">
                    {initiales(m.nom)}
                  </span>
                  <span className="lrg-nom">
                    <span className="lrg-nom-titre">{m.nom}</span>
                    {moi ? (
                      <span className="lrg-nom-sous">
                        <span className="lrg-point" aria-hidden="true" style={{ display: "inline-block", marginRight: 4, verticalAlign: "-1px" }} />
                        vous
                      </span>
                    ) : null}
                  </span>
                </div>
                <div className="lrg-cel-email" role="cell" title={m.email ?? undefined}>
                  {m.email ?? "—"}
                </div>
                <div className="lrg-cel-role" role="cell">
                  {m.role === "gerant" || m.role === "admin" ? <span className="lrg-badge">{libelleRole(m.role)}</span> : libelleRole(m.role)}
                </div>
                <div
                  className="lrg-cel-soc"
                  role="cell"
                  data-vide={!m.perimetre_total && !m.entites.length ? "" : undefined}
                  title={!m.perimetre_total && m.entites.length ? m.entites.map(nomSociete).join(", ") : undefined}
                >
                  {m.perimetre_total ? "Toutes" : m.entites.length ? m.entites.map(nomSociete).join(", ") : "aucune"}
                </div>
                <div className="lrg-cel-menu" role="cell">
                  {aMenu ? (
                    <Menu
                      bouton={(ouvert, basculer) => (
                        <button type="button" className="lin-rond" aria-haspopup="menu" aria-expanded={ouvert} aria-label={`Gestes pour ${m.nom}`} disabled={envoi === m.user_id} onClick={basculer}>
                          {envoi === m.user_id ? <Loader variant="spin" /> : <MoreHorizontal width={16} height={16} aria-hidden="true" />}
                        </button>
                      )}
                    >
                      {(fermer) => (
                        <div className="lrg-menu-corps lrg-menu--droite" role="menu" aria-label={`Gestes pour ${m.nom}`}>
                          {peutRole ? (
                            <>
                              <div className="lrg-menu-titre">Rôle</div>
                              <ul>
                                {rolesPermis.map((r) => (
                                  <li key={r.cle}>
                                    <button
                                      type="button"
                                      role="menuitemradio"
                                      aria-checked={m.role === r.cle}
                                      className="lrg-menu-item"
                                      onClick={() => {
                                        fermer();
                                        changerLeRole(m, r.cle);
                                      }}
                                    >
                                      {r.libelle}
                                      {m.role === r.cle ? <Check className="lrg-coche" aria-hidden="true" /> : null}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                              {peutSocietes || peutRetirer ? <div className="lrg-menu-sep" role="separator" /> : null}
                            </>
                          ) : null}
                          <ul>
                            {peutSocietes ? (
                              <li>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="lrg-menu-item"
                                  onClick={() => {
                                    fermer();
                                    ouvrir({ type: "perimetre", membre: m });
                                  }}
                                >
                                  <Building2 aria-hidden="true" /> Sociétés visibles…
                                </button>
                              </li>
                            ) : null}
                            {peutRetirer ? (
                              <li>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="lrg-menu-item"
                                  data-danger=""
                                  onClick={() => {
                                    fermer();
                                    ouvrir({ type: "retirer", membre: m });
                                  }}
                                >
                                  <UserMinus aria-hidden="true" /> Retirer de l&apos;organisation…
                                </button>
                              </li>
                            ) : null}
                          </ul>
                        </div>
                      )}
                    </Menu>
                  ) : null}
                </div>
              </div>
            );
          })
        )}

        <div className="lrg-groupe" role="row" style={{ marginTop: 8 }}>
          <span className="lrg-groupe-nom" role="cell">
            Ce que chaque rôle permet
          </span>
          <span className="lrg-groupe-n" role="cell">
            {ROLES.length}
          </span>
        </div>
        {ROLES.map((r) => (
          <div key={r.cle} className="lrg-mligne" role="row">
            <div className="lrg-cel-nom" role="cell">
              <span className="lrg-nom">
                <span className="lrg-nom-titre">{r.libelle}</span>
                <span className="lrg-nom-sous" style={{ whiteSpace: "normal" }}>
                  {r.peut}
                </span>
              </span>
            </div>
            <div className="lrg-cel-email" role="cell">
              {r.cle}
            </div>
            <div className="lrg-cel-role" role="cell" />
            <div className="lrg-cel-soc" role="cell" />
            <div className="lrg-cel-menu" role="cell" />
          </div>
        ))}
      </div>
      {vue && !gere ? <p className="lrg-mnote">Seuls les gérants et administrateurs changent l&apos;équipe. Votre rôle : {libelleRole(vue.monRole ?? "")}.</p> : null}

      {/* ——— inviter ——— */}
      <Dialogue
        ouvert={form?.type === "ajouter"}
        fermer={() => setForm(null)}
        icone={<UserPlus aria-hidden="true" />}
        titre={
          <>
            Inviter dans <b>votre organisation</b>
          </>
        }
        description="La personne doit déjà avoir un compte Omega. L'invitation par courriel arrive bientôt."
        pied={
          <>
            <button type="button" className="lrg-btn lrg-btn--cercle" onClick={() => setForm(null)}>
              Annuler
            </button>
            <button
              type="button"
              className="lrg-btn lrg-btn--plein"
              disabled={!emailOk || !!envoi}
              onClick={() => {
                const adresse = email.trim();
                void agir(
                  "ajouter",
                  () => ajouterMembre(vue!.client, adresse, role),
                  (v) => ({
                    ...v,
                    membres: [
                      ...v.membres,
                      {
                        user_id: `ex-${Date.now()}`,
                        nom: adresse
                          .split("@")[0]
                          .replace(/\./g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase()),
                        email: adresse,
                        role,
                        perimetre_total: true,
                        entites: [],
                      },
                    ],
                  }),
                  `${adresse} est ajoutée à l'organisation (${libelleRole(role).toLowerCase()}).`,
                );
              }}
            >
              {envoi === "ajouter" ? <Loader variant="spin" /> : null} Ajouter
            </button>
          </>
        }
      >
        <div className="lrg-dlg-bloc">
          <label className="lrg-dlg-libelle" htmlFor="lrg-invite-email">
            Adresse de son compte
          </label>
          <input id="lrg-invite-email" type="email" className="lrg-dlg-champ" placeholder="prenom.nom@entreprise.fr" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" autoFocus />
        </div>
        <div className="lrg-dlg-bloc">
          <span className="lrg-dlg-libelle">Rôle</span>
          <Select valeur={role} options={rolesPermis.map((r) => ({ cle: r.cle, libelle: r.libelle }))} onChange={setRole} libelle="Rôle" />
          <p className="lrg-dlg-aide" style={{ marginTop: 8 }}>
            {ROLES.find((r) => r.cle === role)?.peut}
          </p>
        </div>
        {erreurAction ? (
          <div className="lrg-dlg-note">
            <Note teinte="rouge" role="alert">
              <strong>Refusé par la base.</strong> {erreurAction}
            </Note>
          </div>
        ) : null}
      </Dialogue>

      {/* ——— sociétés visibles ——— */}
      <Dialogue
        ouvert={form?.type === "perimetre"}
        fermer={() => setForm(null)}
        icone={<Building2 aria-hidden="true" />}
        titre="Sociétés visibles"
        description={form?.type === "perimetre" ? `${form.membre.nom} ne voit et ne décide que pour les sociétés cochées.` : ""}
        pied={
          <>
            <button type="button" className="lrg-btn lrg-btn--cercle" onClick={() => setForm(null)}>
              Annuler
            </button>
            <button
              type="button"
              className="lrg-btn lrg-btn--plein"
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
          </>
        }
      >
        <div className="lrg-dlg-bloc lrg-choix">
          <label>
            <input type="radio" name="lrg-perimetre" checked={total} onChange={() => setTotal(true)} /> Toutes les sociétés
          </label>
          <label>
            <input type="radio" name="lrg-perimetre" checked={!total} onChange={() => setTotal(false)} /> Seulement :
          </label>
          {!total ? (
            <div className="lrg-choix-sous">
              {vue?.societes.map((s) => (
                <label key={s.id}>
                  <input type="checkbox" checked={choix.includes(s.id)} onChange={(e) => setChoix((c) => (e.target.checked ? [...c, s.id] : c.filter((x) => x !== s.id)))} /> {s.nom}
                </label>
              ))}
            </div>
          ) : null}
          {!total && !choix.length ? <p className="lrg-dlg-aide">Cochez au moins une société.</p> : null}
        </div>
        {erreurAction ? (
          <div className="lrg-dlg-note">
            <Note teinte="rouge" role="alert">
              <strong>Refusé par la base.</strong> {erreurAction}
            </Note>
          </div>
        ) : null}
      </Dialogue>

      {/* ——— retirer ——— */}
      <Dialogue
        ouvert={form?.type === "retirer"}
        fermer={() => setForm(null)}
        icone={<UserMinus aria-hidden="true" />}
        titre="Retirer de l'organisation"
        description={form?.type === "retirer" ? `${form.membre.nom} perd l'accès à l'organisation. Ce qui a été fait reste au journal, à son nom.` : ""}
        pied={
          <>
            <button type="button" className="lrg-btn lrg-btn--cercle" onClick={() => setForm(null)}>
              Annuler
            </button>
            <button
              type="button"
              className="lrg-btn lrg-btn--plein"
              disabled={!!envoi}
              onClick={() => {
                if (form?.type !== "retirer") return;
                const m = form.membre;
                void agir(
                  m.user_id,
                  () => retirerMembre(vue!.client, m.user_id),
                  (v) => ({ ...v, membres: v.membres.filter((x) => x.user_id !== m.user_id) }),
                  `${m.nom} n'a plus accès à l'organisation.`,
                );
              }}
            >
              {envoi && form?.type === "retirer" ? <Loader variant="spin" /> : null} Retirer
            </button>
          </>
        }
      >
        {erreurAction ? (
          <div className="lrg-dlg-note">
            <Note teinte="rouge" role="alert">
              <strong>Refusé par la base.</strong> {erreurAction}
            </Note>
          </div>
        ) : null}
      </Dialogue>
    </div>
  );
}
