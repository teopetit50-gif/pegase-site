"use client";

/* ══════════════════════════════════════════════════════════════════════
   CASHD — vos textes (11/10/2026, session C2)

   Les textes des relances, palier par palier, langue par langue, en une à
   trois variantes : un compte reçoit à chaque palier la variante suivante
   de celle qu'il a reçue la dernière fois, il ne reçoit donc jamais deux
   fois le même message. Sans texte propre, ceux par défaut s'appliquent ;
   on part d'eux pour écrire les siens. Les variables ({lignes}, {total}…)
   se remplissent à chaque relance ; l'aperçu les remplit sur un exemple.
   Les réglages du ton (au-delà d'un montant), des moyens de règlement, de
   l'échelonnement proposé et du métier s'y règlent aussi. Écriture par
   les portes cashd_ecrire_gabarit et cashd_regler_relances (gestion
   seulement) ; chaque changement reste daté au journal.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader } from "@/components/ui/loader";
import { Avis, Chargement, Pastille } from "../ui";
import { montant } from "../format";
import * as portes from "./portes";
import { apercu, GABARITS_EXEMPLE, PALIERS_GABARIT, VARIABLES, verifier } from "./gabarits";
import type { CleGabarit, Gabarit, PalierValidation, Reglages, RoleValidation } from "./types";

/* les trois rôles que le socle admet en validation : le chargé de compte ou le responsable crédit valident s'ils portent le rôle valideur */
const ROLES: { cle: RoleValidation; libelle: string }[] = [
  { cle: "valideur", libelle: "Valideur (chargé de compte, responsable crédit)" },
  { cle: "admin", libelle: "Administrateur" },
  { cle: "gerant", libelle: "Direction" },
];
const PALIERS_DEFAUT: PalierValidation[] = [
  { montant: 0, roles: ["valideur", "admin", "gerant"] },
  { montant: 2000, roles: ["admin", "gerant"] },
  { montant: 10000, roles: ["gerant"] },
];

type Source = "exemple" | "reelle";
type Reglage = { metier: "general" | "btp"; seuil_ton: string; moyens_reglement: string; echelonnement_des: string };

function nombre(t: string): number | null {
  const s = t.replace(/[\s  €]/g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export default function Textes({ source, client, reglages, emetteur, apresReglage }: {
  source: Source;
  client: string | null;
  reglages: Reglages | null;
  emetteur?: string;
  apresReglage?: () => Promise<void> | void;
}) {
  const [liste, setListe] = useState<Gabarit[] | null>(source === "exemple" ? GABARITS_EXEMPLE : null);
  const [variables, setVariables] = useState<Record<string, string>>(VARIABLES);
  const [cle, setCle] = useState<CleGabarit>("rappel");
  const [langue, setLangue] = useState("fr");
  const [variante, setVariante] = useState(1);
  const [sujet, setSujet] = useState("");
  const [corps, setCorps] = useState("");
  const [nouvelleLangue, setNouvelleLangue] = useState("");
  const [ajoutees, setAjoutees] = useState<string[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [r, setR] = useState<Reglage>({
    metier: reglages?.metier ?? "general",
    seuil_ton: reglages?.seuil_ton != null ? String(reglages.seuil_ton) : "",
    moyens_reglement: reglages?.moyens_reglement ?? "",
    echelonnement_des: reglages?.echelonnement_des != null ? String(reglages.echelonnement_des) : "",
  });

  const charger = useCallback(async () => {
    if (source !== "reelle" || !client) return;
    try {
      const g = await portes.chargerGabarits(client);
      setListe(g.gabarits);
      setVariables(g.variables);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Les textes n'ont pas pu être lus.");
      setListe([]);
    }
  }, [source, client]);
  useEffect(() => {
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [charger]);

  const langues = useMemo(() => [...new Set(["fr", ...(liste ?? []).map((g) => g.langue), ...ajoutees])], [liste, ajoutees]);
  const palier = PALIERS_GABARIT.find((p) => p.cle === cle) ?? PALIERS_GABARIT[0];
  const actuel = (liste ?? []).find((g) => g.cle === cle && g.langue === langue && g.variante === variante) ?? null;
  const dansPalier = (liste ?? []).filter((g) => g.cle === cle && g.langue === langue);

  /* le texte affiché : celui du créneau, sinon la première variante du palier pour partir de quelque chose */
  const choisir = (c: CleGabarit, l: string, v: number) => {
    setCle(c);
    setLangue(l);
    setVariante(v);
    setErreur(null);
    setFait(null);
    const g = (liste ?? []).find((x) => x.cle === c && x.langue === l && x.variante === v)
      ?? (liste ?? []).find((x) => x.cle === c && x.langue === l)
      ?? (liste ?? []).find((x) => x.cle === c && x.langue === "fr" && x.variante === 1);
    setSujet(g?.sujet ?? "");
    setCorps(g?.corps ?? "");
  };
  const [initialise, setInitialise] = useState(false);
  useEffect(() => {
    if (!liste || initialise) return;
    const t = window.setTimeout(() => {
      choisir(cle, langue, variante);
      setInitialise(true);
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- le créneau se charge une fois, à l'arrivée de la liste ; ensuite c'est la personne qui le choisit
  }, [liste, initialise]);

  const refus = verifier(cle, sujet, corps, variables);
  const vu = apercu(cle, sujet, corps, {
    metier: r.metier, seuil_ton: nombre(r.seuil_ton), moyens_reglement: r.moyens_reglement.trim() || null,
    echelonnement_des: nombre(r.echelonnement_des), emetteur,
  });

  const enregistrer = async (actif: boolean) => {
    setEnvoi(true);
    setErreur(null);
    setFait(null);
    try {
      if (source === "reelle") {
        if (!client) throw new Error("Aucun compte rattaché à cette session.");
        await portes.ecrireGabarit({ client, cle, langue, variante, sujet, corps, actif });
        await charger();
      } else {
        setListe((prev) => {
          const l = prev ?? [];
          const defaut = GABARITS_EXEMPLE.find((g) => g.cle === cle && g.langue === langue && g.variante === variante) ?? null;
          const autres = l.filter((g) => !(g.cle === cle && g.langue === langue && g.variante === variante));
          if (!actif) return defaut ? [...autres, defaut] : autres;
          return [...autres, { cle, langue, variante, personnalise: true, sujet, corps, defaut_sujet: defaut?.sujet ?? null, defaut_corps: defaut?.corps ?? null, maj_le: new Date().toISOString() }];
        });
      }
      if (!actif) {
        const d = actuel?.defaut_sujet !== null && actuel?.defaut_corps !== null ? actuel : null;
        setSujet(d?.defaut_sujet ?? "");
        setCorps(d?.defaut_corps ?? "");
      }
      setFait(actif
        ? `Texte enregistré${source === "exemple" ? " (exemple)" : ""} : il s'applique dès les relances de demain matin. Le changement est daté au journal.`
        : `Le texte par défaut reprend la main${source === "exemple" ? " (exemple)" : ""}.`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé ce texte.");
    } finally {
      setEnvoi(false);
    }
  };

  /* qui valide, selon le montant (c2_06) */
  const [paliers, setPaliers] = useState<{ montant: string; roles: RoleValidation[] }[]>(
    (reglages?.paliers_validation ?? PALIERS_DEFAUT).map((x) => ({ montant: String(x.montant), roles: x.roles })),
  );
  const paliersLus = paliers.map((x, i) => ({ montant: i === 0 ? 0 : nombre(x.montant), roles: x.roles }));
  const paliersValides = paliersLus.every((x, i) => x.montant !== null && !Number.isNaN(x.montant) && x.roles.length > 0 && (i === 0 || (x.montant as number) > (paliersLus[i - 1].montant as number)));
  const reglerPaliers = async (vider: boolean) => {
    setEnvoi(true);
    setErreur(null);
    setFait(null);
    try {
      const liste = vider ? [] : paliersLus.map((x) => ({ montant: x.montant as number, roles: x.roles }));
      if (source === "reelle") {
        if (!client) throw new Error("Aucun compte rattaché à cette session.");
        await portes.reglerValidation(client, liste);
        await apresReglage?.();
      }
      setFait(vider ? `Plus de paliers${source === "exemple" ? " (exemple)" : ""} : les rôles par défaut valident.` : `Paliers enregistrés${source === "exemple" ? " (exemple)" : ""} : chaque relance attend la validation des rôles de son montant. La mise en demeure exige toujours un commentaire.`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé ces paliers.");
    } finally {
      setEnvoi(false);
    }
  };

  /* le portefeuille par chargé (c2_08) */
  const [portefeuille, setPortefeuille] = useState(!!reglages?.portefeuille_par_charge);
  const reglerPortefeuille = async (actif: boolean) => {
    setEnvoi(true);
    setErreur(null);
    setFait(null);
    try {
      let sans = 0;
      if (source === "reelle") {
        if (!client) throw new Error("Aucun compte rattaché à cette session.");
        sans = (await portes.reglerPortefeuille(client, actif)).comptes_sans_charge;
        await apresReglage?.();
      }
      setPortefeuille(actif);
      setFait(actif
        ? `Chaque chargé ne voit plus que ses comptes${source === "exemple" ? " (exemple)" : ""} ; la direction, l'administration et les valideurs lisent le consolidé.${sans ? ` ${sans} compte${sans > 1 ? "s n'ont" : " n'a"} pas encore de chargé : seuls les valideurs et la direction les voient.` : ""}`
        : `Tous les membres lisent à nouveau les comptes de leur périmètre${source === "exemple" ? " (exemple)" : ""}.`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé ce réglage.");
    } finally {
      setEnvoi(false);
    }
  };

  const valeursReglage = { seuil_ton: nombre(r.seuil_ton), echelonnement_des: nombre(r.echelonnement_des) };
  const reglageValide = !Number.isNaN(valeursReglage.seuil_ton) && !Number.isNaN(valeursReglage.echelonnement_des) && r.moyens_reglement.length <= 400;
  const reglerTon = async () => {
    setEnvoi(true);
    setErreur(null);
    setFait(null);
    try {
      if (source === "reelle") {
        if (!client) throw new Error("Aucun compte rattaché à cette session.");
        await portes.reglerRelances(client, {
          metier: r.metier, seuil_ton: valeursReglage.seuil_ton, moyens_reglement: r.moyens_reglement.trim(), echelonnement_des: valeursReglage.echelonnement_des,
        });
        await apresReglage?.();
      }
      setFait(`Réglages enregistrés${source === "exemple" ? " (exemple)" : ""} : l'aperçu ci-dessus les montre déjà.`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé ces réglages.");
    } finally {
      setEnvoi(false);
    }
  };

  if (!liste) return <div className="esp-carte"><Chargement texte="Lecture de vos textes…" /></div>;

  return (
    <section className="esp-carte c2-section" aria-label="Vos textes">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Vos textes</h2>
        <span className="esp-kpi-sous">un compte reçoit à chaque palier la variante suivante : jamais deux fois le même message</span>
      </div>
      <div className="esp-carte-corps">
        <div className="esp-form">
          <div className="esp-form-ligne">
            <label className="rv-libelle">Palier
              <select className="rv-champ" value={cle} onChange={(e) => choisir(e.target.value as CleGabarit, langue, 1)}>
                {PALIERS_GABARIT.map((p) => <option key={p.cle} value={p.cle}>{p.libelle}</option>)}
              </select>
            </label>
            <label className="rv-libelle">Langue
              <select className="rv-champ" value={langue} onChange={(e) => choisir(cle, e.target.value, 1)}>
                {langues.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
              </select>
            </label>
            <label className="rv-libelle">Variante
              <select className="rv-champ" value={variante} onChange={(e) => choisir(cle, langue, Number(e.target.value))}>
                {Array.from({ length: palier.variantes }, (_, i) => i + 1).map((v) => {
                  const g = dansPalier.find((x) => x.variante === v);
                  return <option key={v} value={v}>{`${v}${g ? (g.personnalise ? " — la vôtre" : " — par défaut") : " — à écrire"}`}</option>;
                })}
              </select>
            </label>
          </div>
          <div className="c2-tete-droite">
            {actuel?.personnalise ? <Pastille teinte="vert">Votre texte</Pastille> : actuel ? <Pastille teinte="gris">Texte par défaut</Pastille> : <Pastille teinte="ambre">Pas encore écrit</Pastille>}
            {cle === "mise_en_demeure" ? <span className="c2-sous">Une seule variante : la forme de la mise en demeure est juridique.</span> : null}
          </div>
          <label className="rv-libelle">Objet
            <input className="rv-champ" value={sujet} maxLength={200} onChange={(e) => setSujet(e.target.value)} />
          </label>
          <label className="rv-libelle">Corps (la formule de politesse et la signature réglées s&apos;ajoutent à la fin)
            <textarea className="rv-champ c2-gabarit" rows={9} value={corps} maxLength={8000} onChange={(e) => setCorps(e.target.value)} />
          </label>
          {refus ? <Avis teinte="ambre">{refus}</Avis> : null}
          <div className="esp-actions">
            <button type="button" className="r-btn r-btn--noir" disabled={!!refus || envoi} onClick={() => void enregistrer(true)}>
              {envoi ? <Loader variant="spin" /> : null} Enregistrer ce texte
            </button>
            {actuel?.personnalise ? (
              <button type="button" className="r-btn" disabled={envoi} onClick={() => void enregistrer(false)}>Revenir au texte par défaut</button>
            ) : null}
            <span className="c2-ajout-langue">
              <input className="rv-champ" aria-label="Nouvelle langue (deux lettres)" placeholder="de, es, it…" maxLength={2} value={nouvelleLangue}
                onChange={(e) => setNouvelleLangue(e.target.value.toLowerCase().replace(/[^a-z]/g, ""))} />
              <button type="button" className="esp-lien-bouton" disabled={nouvelleLangue.length !== 2 || langues.includes(nouvelleLangue)}
                onClick={() => {
                  const l = nouvelleLangue;
                  setAjoutees((prev) => [...prev, l]);
                  setNouvelleLangue("");
                  choisir(cle, l, 1);
                  setFait(`Écrivez ce palier en ${l.toUpperCase()}, en partant du texte français : les comptes de cette langue le recevront. Le détail des pièces reste en anglais.`);
                }}>
                Écrire dans une autre langue
              </button>
            </span>
          </div>
          {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          {fait ? <Avis teinte="vert" role="status">{fait}</Avis> : null}
        </div>
      </div>

      <div className="esp-carte-corps">
        <h3 className="esp-section-titre">Aperçu sur un exemple</h3>
        <p className="c2-sous">La SCI Lefèvre, une facture de {montant(12000)} en retard de 45 jours.</p>
        <pre className="c2-corps"><strong>{vu.sujet}</strong>{"\n\n"}{vu.corps}</pre>
        <details className="c2-variables">
          <summary>Les variables</summary>
          <dl className="c2-legende">
            {Object.entries(variables).map(([k, v]) => (
              <div key={k}><dt><code>{`{${k}}`}</code></dt><dd>{v}</dd></div>
            ))}
          </dl>
        </details>
      </div>

      <div className="esp-carte-corps">
        <h3 className="esp-section-titre">Le ton, les moyens de règlement, le métier</h3>
        <div className="esp-form">
          <div className="esp-form-ligne">
            <label className="rv-libelle">Au-delà de ce montant, demander la date de règlement (€)
              <input className="rv-champ" inputMode="decimal" value={r.seuil_ton} onChange={(e) => setR({ ...r, seuil_ton: e.target.value })} placeholder="10 000" />
            </label>
            <label className="rv-libelle">Proposer un échéancier au-delà de (€)
              <input className="rv-champ" inputMode="decimal" value={r.echelonnement_des} onChange={(e) => setR({ ...r, echelonnement_des: e.target.value })} placeholder="5 000" />
            </label>
          </div>
          <label className="rv-libelle">Vos moyens de règlement (« Vous pouvez régler … »)
            <input className="rv-champ" value={r.moyens_reglement} maxLength={400} onChange={(e) => setR({ ...r, moyens_reglement: e.target.value })} placeholder="par virement sur le compte FR76 …, par chèque à l'ordre de …, ou au comptoir" />
          </label>
          <label className="rv-libelle">Le vocabulaire des relances de devis
            <select className="rv-champ" value={r.metier} onChange={(e) => setR({ ...r, metier: e.target.value as Reglage["metier"] })}>
              <option value="general">Général</option>
              <option value="btp">Bâtiment : chantier, visite, date d&apos;intervention</option>
            </select>
          </label>
          <div className="esp-actions">
            <button type="button" className="r-btn" disabled={!reglageValide || envoi} onClick={() => void reglerTon()}>Enregistrer ces réglages</button>
          </div>
        </div>
      </div>

      <div className="esp-carte-corps" role="region" aria-label="Qui valide">
        <h3 className="esp-section-titre">Qui valide les relances, selon le montant</h3>
        <p className="c2-sous">Le gérant règle jusqu&apos;à trois paliers. Une relance attend la validation d&apos;une personne d&apos;un des rôles de son palier.</p>
        <div className="esp-form">
          {paliers.map((x, i) => (
            <fieldset key={i} className="c2-palier">
              <legend>{i === 0 ? "Dès 0 €" : `Palier ${i + 1}`}</legend>
              {i > 0 ? (
                <label className="rv-libelle">À partir de (€)
                  <input className="rv-champ" inputMode="decimal" value={x.montant} onChange={(e) => setPaliers(paliers.map((y, k) => (k === i ? { ...y, montant: e.target.value } : y)))} />
                </label>
              ) : null}
              <span className="c2-roles">
                {ROLES.map((r) => (
                  <label key={r.cle} className="c2-coche">
                    <input type="checkbox" checked={x.roles.includes(r.cle)}
                      onChange={(e) => setPaliers(paliers.map((y, k) => (k === i ? { ...y, roles: e.target.checked ? [...y.roles, r.cle] : y.roles.filter((z) => z !== r.cle) } : y)))} />
                    <span>{r.libelle}</span>
                  </label>
                ))}
              </span>
            </fieldset>
          ))}
          <div className="esp-actions">
            {paliers.length < 3 ? <button type="button" className="esp-lien-bouton" onClick={() => setPaliers([...paliers, { montant: "", roles: ["gerant"] }])}>Ajouter un palier</button> : null}
            {paliers.length > 1 ? <button type="button" className="esp-lien-bouton" onClick={() => setPaliers(paliers.slice(0, -1))}>Retirer le dernier palier</button> : null}
          </div>
          {!paliersValides ? <Avis teinte="ambre">Chaque palier a au moins un rôle, et ses montants croissent.</Avis> : null}
          <div className="esp-actions">
            <button type="button" className="r-btn" disabled={!paliersValides || envoi} onClick={() => void reglerPaliers(false)}>Enregistrer les paliers</button>
            {reglages?.paliers_validation ? <button type="button" className="r-btn" disabled={envoi} onClick={() => void reglerPaliers(true)}>Revenir aux rôles par défaut</button> : null}
          </div>
          <label className="c2-coche">
            <input type="checkbox" checked={portefeuille} disabled={envoi} onChange={(e) => void reglerPortefeuille(e.target.checked)} />
            <span>Chaque chargé de recouvrement ne voit que son portefeuille (les comptes dont il est le chargé) ; la direction, l&apos;administration et les valideurs lisent le consolidé.</span>
          </label>
        </div>
      </div>
    </section>
  );
}
