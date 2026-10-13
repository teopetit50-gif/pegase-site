"use client";

/* ══════════════════════════════════════════════════════════════════════
   Appels (09/10/2026, redessinée le 10/10/2026 d'après la maquette de Teo)

   Une séance de prospection au téléphone, un établissement à la fois.
   Même mécanique qu'avant, nouveau dessin fini « à la Vercel / Attio » :
     · « À suivre » : les cinq prochains de la file (« Rappeler » d'abord,
       puis « À contacter »), filtrée par secteur ;
     · la fiche : liens pour préparer, le numéro, le script en quatre
       temps (ScriptAppel), les notes de l'échange, « Créer une tâche » ;
     · l'issue se choisit, puis « Enregistrer et suivant » : l'appel
       s'écrit dans omega_lignes (« appels »), le statut bouge dans
       omega_prospects, « RDV pris » ajoute le contact et le rendez-vous ;
     · les aides à la conversation : les objections les plus entendues,
       leur réponse, « +1 » pour compter celle qu'on vient d'entendre.
   Historique, Rappels et Analyse lisent les mêmes lignes.
   13/10/2026 (3) — « encore trop de trucs, regarde Notes et Activité » :
   comme la page Activité. Une barre fine (vue À appeler / Historique /
   Analyse, secteur | chiffres du jour, recherche), puis une liste
   encadrée, un prospect par ligne. L'appel s'ouvre au clic dans un
   panneau sur le côté (Appeler, script, issue, notes) ; « Enregistrer et
   suivant » y ouvre le prospect suivant. Plus d'onglet Rappels : les
   rappels sont en tête de liste, point bleu. Styles al- + ao-.
   13/10/2026 (2) — « pas assez épuré, regarde Attio » : la page Notes /
   Attio telle quelle (onglets, barre fine, rien d'encadré), et la séance
   comme une fiche d'Attio — à gauche le prospect, les quatre temps en
   onglets de Notes, la réplique, les notes ; à droite une colonne
   « Détails » (Appeler, téléphone, dirigeant, secteur, commune, à vendre,
   liens) puis l'issue en liste à cocher et « Enregistrer ». Styles at-.
   13/10/2026 — refaite encore, retour de Teo : « un truc simple, vraiment
   simple, épuré et pro ; là il faut défiler toute la page pour tout voir ».
   Tout tient dans un écran, sans défiler : une seule barre (vue | chiffres,
   secteur, sélecteur ⌃⌄), puis un cadre qui remplit la hauteur — le
   prospect sur une ligne (‹ 1 / 40 ›, numéro, « Appeler », « ··· »), le
   script (les quatre temps sur une ligne, la réplique, « C'est dit ») et
   les notes côte à côte, l'issue en bas. Plus de grand titre ni de file
   à gauche. Styles dans appels.css (préfixe ap3-).
   12/10/2026 — refaite à la demande de Teo (« je n'aime pas du tout le
   design de la page Appels, fais un autre truc, sobre et propre comme
   Vercel / Attio ») : l'en-tête et les vues comme avant, puis un seul
   cadre à filet fin, en deux colonnes — à gauche la file d'appels (nom,
   commune, « à rappeler »), à droite la fiche du prospect comme un
   enregistrement d'Attio (nom, ligne grise, numéro, « Appeler », « ··· »),
   le script et les notes côte à côte, l'issue dans une barre en bas.
   Le script (12/10, retour de Teo sur les onglets soulignés) : un déroulé
   vertical comme les étapes d'un déploiement Vercel — étapes passées
   cochées, l'étape en cours ouverte (la réplique, le conseil, « C'est
   dit »), les suivantes en une ligne d'aperçu. Styles dans appels.css (préfixe ap2-).
   11/10/2026 (2) — allégée sur les principes de la page Notes, même
   dessin : plus d'avatar, d'étiquette du moteur (il passe dans la ligne
   du prospect) ni de surtitre au-dessus de la phrase ; les liens Google,
   Avis, Fiche passent dans « ··· » ; le compteur garde appels et
   rendez-vous.
   11/10/2026 — allégée à la demande de Teo, même dessin : plus d'aides à
   la conversation, de « Si ça bloque » ni des trois cartes du bas
   (objections et méthode restent dans le sélecteur ⌃⌄ de la page,
   l'historique dans l'onglet Historique).
   Écarts assumés avec la maquette : pas d'onglets soulignés (refusés par
   Teo, un sélecteur segmenté à la place) ; pas de carte « Transcription »,
   que rien n'enregistre aujourd'hui.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, Building2, Check, ChevronDown, ChevronRight, History, LayoutGrid, Phone, Plus, Search, X } from "lucide-react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { createClient } from "@/lib/supabase/client";
import "@/components/espace2/notes.css";
import "./activite.css";
import "./appels.css";
import { ItemMenu, MenuDeroulant, SectionMenu } from "@/components/espace2/ui";
import { CONSEILS, ETAPES, textesScript } from "./ScriptAppel";
import type { Ligne } from "./Tableaux";
import type { Prospect, Secteur } from "@/lib/omega/donnees";

const I = { width: 16, height: 16, strokeWidth: 1.6, "aria-hidden": true } as const;
const jour = (d: Date) => d.toISOString().slice(0, 10);


type Issue = { cle: string; libelle: string; statut: string; date?: "rdv" | "rappel" };
const ISSUES: Issue[] = [
  { cle: "RDV pris", libelle: "RDV pris", statut: "Audit réservé", date: "rdv" },
  { cle: "Rappeler", libelle: "À rappeler", statut: "Rappeler", date: "rappel" },
  { cle: "Pas de réponse", libelle: "Sans réponse", statut: "Rappeler" },
];
const AUTRES: Issue[] = [
  { cle: "Pas intéressé", libelle: "Pas intéressé", statut: "Pas intéressé" },
  { cle: "Ne plus appeler", libelle: "Ne plus appeler", statut: "Ne plus contacter" },
];
type Vue = "file" | "historique" | "analyse";
const VUES: { cle: Vue; libelle: string; icone: typeof Phone }[] = [
  { cle: "file", libelle: "À appeler", icone: Phone },
  { cle: "historique", libelle: "Historique", icone: History },
  { cle: "analyse", libelle: "Analyse", icone: BarChart3 },
];

const dateCourte = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "");
const heure = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "");

export default function ModeAppels({ file: initiale, secteurs, secteur, lignes: initiales_, selecteur }: { file: Prospect[]; secteurs: Secteur[]; secteur?: string; lignes: Ligne[]; selecteur: React.ReactNode }) {
  const [file, setFile] = useState(initiale);
  const [lignes, setLignes] = useState(initiales_);
  const [vue, setVue] = useState<Vue>("file");
  const [ouvert, setOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [note, setNote] = useState("");
  const [issue, setIssue] = useState<Issue | null>(null);
  const [dateRdv, setDateRdv] = useState("");
  const [etape, setEtape] = useState(0);
  const [etat, setEtat] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [maintenant] = useState(() => new Date());
  const aujourdhui = jour(maintenant);
  const p = file[0] ?? null;
  const actif = secteurs.find((s) => s.secteur === secteur) ?? null;

  const tousAppels = lignes.filter((l) => l.tableau === "appels").sort((a, b) => (b.donnees["Date"] ?? "").localeCompare(a.donnees["Date"] ?? ""));
  const appels = tousAppels.filter((l) => (l.donnees["Date"] ?? "").startsWith(aujourdhui));
  const rdv = appels.filter((l) => l.donnees["Issue"] === "RDV pris").length;
  const objections = lignes.filter((l) => l.tableau === "objections").sort((a, b) => Number(b.donnees["Fois"] || 0) - Number(a.donnees["Fois"] || 0));

  const nom = p ? p.enseigne || p.entreprise : "";
  const dirigeant = p?.dirigeant?.replace(/\s*\(.*\)$/, "");
  const { textes, douleurs } = textesScript(dirigeant ? dirigeant.split(" ").slice(-1)[0] : "", p?.moteurs[0]);

  function choisirProspect(id: number) {
    setFile((f) => {
      const i = f.findIndex((x) => x.id === id);
      return i <= 0 ? f : [f[i], ...f.slice(0, i), ...f.slice(i + 1)];
    });
    setNote("");
    setIssue(null);
    setDateRdv("");
    setEtape(0);
  }
  function ouvrir(id: number) {
    choisirProspect(id);
    setOuvert(true);
  }
  function suivant(sens: 1 | -1) {
    setFile((f) => (f.length < 2 ? f : sens === 1 ? [...f.slice(1), f[0]] : [f[f.length - 1], ...f.slice(0, -1)]));
    setNote("");
    setIssue(null);
    setDateRdv("");
    setEtape(0);
  }

  async function enregistrer() {
    if (!p || !issue || envoi) return;
    /* BAMFAM (Hormozi) : on ne raccroche jamais sans savoir quand on se reparle */
    if (issue.date && !dateRdv) return setEtat(issue.date === "rdv" ? "Choisis la date du rendez-vous avant d'enregistrer." : "Fixe la date du rappel : jamais de prospect sans prochaine date.");
    setEnvoi(true);
    const sb = createClient();
    const quandMaintenant = new Date();
    const rappel = issue.cle === "Rappeler" && dateRdv ? new Date(dateRdv).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "";
    const texteNote = [note.trim(), rappel ? `Rappeler le ${rappel}` : ""].filter(Boolean).join(" — ");
    const donnees = { Date: quandMaintenant.toISOString(), Entreprise: nom, Secteur: p.secteur, Issue: issue.cle, Note: texteNote, Prospect: String(p.id) };
    const ordre = Math.floor(quandMaintenant.getTime() / 1000);
    const [a, b] = await Promise.all([
      sb.from("omega_lignes").insert({ tableau: "appels", ordre, donnees }).select("id, tableau, ordre, donnees").single(),
      sb.from("omega_prospects").update({ statut: issue.statut, note: texteNote ? [p.note, `${quandMaintenant.toLocaleDateString("fr-FR")} : ${texteNote}`].filter(Boolean).join("\n") : p.note, maj: quandMaintenant.toISOString() }).eq("id", p.id),
    ]);
    if (issue.cle === "RDV pris") {
      const quand = dateRdv ? new Date(dateRdv) : null;
      await Promise.all([
        sb.from("omega_contacts").insert({ nom: dirigeant || nom, entreprise: nom, role: p.dirigeant?.match(/\((.*)\)/)?.[1] ?? null, type: "Prospect", telephone: p.telephone, courriel: p.courriel, commune: p.commune, secteur: p.secteur, etape: "Audit réservé", source: "Mode appels", prospect_id: p.id, prochaine_action: "Audit", prochaine_date: dateRdv ? dateRdv.slice(0, 10) : null, note: `À vendre : ${p.moteurs.join(", ")}${note.trim() ? `\n${note.trim()}` : ""}` }),
        sb.from("omega_lignes").insert({ tableau: "rdv", ordre, donnees: { Date: quand ? quand.toLocaleDateString("fr-FR") : "", Heure: quand && dateRdv.length > 10 ? dateRdv.slice(11, 16) : "", Personne: dirigeant || "", Entreprise: nom, Type: "Audit", Statut: "Prévu", "Ce qui en sort": note.trim() } }),
      ]);
    }
    setEnvoi(false);
    if (a.error || b.error) return setEtat("Échec de l'enregistrement : vérifiez votre connexion.");
    setLignes((ls) => [...ls, a.data as Ligne]);
    setFile((f) => f.slice(1));
    setNote("");
    setIssue(null);
    setDateRdv("");
    setEtape(0);
    setEtat(`${nom} : ${issue.libelle.toLowerCase()}${issue.cle === "RDV pris" ? " — ajouté aux contacts et aux rendez-vous" : ""}`);
  }

  async function creerTache() {
    if (!p) return;
    const ajouts = lignes.filter((l) => l.tableau === "ajouts");
    const n = Math.max(0, ...ajouts.map((l) => Number(l.donnees["N°"]?.replace(/\D/g, "")) || 0)) + 1;
    const echeance = new Date(Date.now() + 2 * 86_400_000);
    const donnees = { "N°": `A${n}`, Tâche: `Suivre ${nom}${note.trim() ? ` (${note.trim().split("\n")[0].slice(0, 80)})` : ""}`, Statut: "À faire", Catégorie: "Prospection", Semaine: "S1", Échéance: `${String(echeance.getDate()).padStart(2, "0")}/${String(echeance.getMonth() + 1).padStart(2, "0")}` };
    const { data, error } = await createClient().from("omega_lignes").insert({ tableau: "ajouts", ordre: Math.floor(Date.now() / 1000), donnees }).select("id, tableau, ordre, donnees").single();
    if (error || !data) return setEtat("Échec de la création de la tâche.");
    setLignes((ls) => [...ls, data as Ligne]);
    setEtat(`Tâche créée : « ${donnees.Tâche} » (dans Tâches)`);
  }

  const lien = (s?: string) => (s ? `/omega/appels?secteur=${encodeURIComponent(s)}` : "/omega/appels");

  /* la liste garde l'ordre de la file du jour (« Rappeler » d'abord) : ouvrir un prospect ne la réordonne pas */
  const restants = new Set(file.map((x) => x.id));
  const q = recherche.trim().toLowerCase();
  const liste = initiale.filter((x) => restants.has(x.id)).filter((x) => !q || `${x.enseigne ?? ""} ${x.entreprise} ${x.commune ?? ""} ${x.dirigeant ?? ""}`.toLowerCase().includes(q));
  const VUE = VUES.find((v) => v.cle === vue)!;
  const coche = (oui: boolean) => (oui ? <Check width={14} height={14} aria-label="choisi" /> : null);

  return (
    <div className="no-page al-page v2-arrivee">
      <h1 className="v2-sr">Appels</h1>

      {/* la barre, comme Activité : la vue et le secteur | les chiffres et la recherche */}
      <div className="no-barre ao-barre">
        <div className="ao-groupe">
          <MenuDeroulant
            etiquette={`Vue : ${VUE.libelle}. Changer de vue`}
            classe="no-bouton"
            placement="bottom start"
            largeur={200}
            declencheur={
              <>
                <VUE.icone {...I} width={14} height={14} />
                {VUE.libelle}
                <ChevronDown {...I} width={14} height={14} />
              </>
            }
          >
            {VUES.map((v) => (
              <ItemMenu key={v.cle} id={v.cle} textValue={v.libelle} icone={<v.icone {...I} width={14} height={14} />} onAction={() => setVue(v.cle)} suffixe={coche(vue === v.cle)}>
                {v.libelle}
              </ItemMenu>
            ))}
          </MenuDeroulant>
          <MenuDeroulant
            etiquette={`Secteur : ${actif?.secteur ?? "Tous les secteurs"}. Changer de secteur`}
            classe="no-bouton"
            placement="bottom start"
            largeur={320}
            declencheur={
              <>
                <Building2 {...I} width={14} height={14} />
                {actif?.secteur ?? "Tous les secteurs"}
                <ChevronDown {...I} width={14} height={14} />
              </>
            }
          >
            <ItemMenu id="tous" href={lien()} textValue="Tous les secteurs" icone={<LayoutGrid {...I} />} suffixe={coche(!actif)}>
              Tous les secteurs
            </ItemMenu>
            <SectionMenu titre="Secteurs">
              {secteurs.map((s) => (
                <ItemMenu key={s.secteur} id={s.secteur} href={lien(s.secteur)} textValue={s.secteur} icone={<Building2 {...I} />} suffixe={<span className="v2-gris">{s.avec_tel.toLocaleString("fr-FR")}</span>}>
                  {s.secteur}
                </ItemMenu>
              ))}
            </SectionMenu>
          </MenuDeroulant>
          {selecteur}
        </div>
        <div className="ao-groupe ao-groupe--droite">
          <p className="ao-etat">
            {appels.length} appel{appels.length > 1 ? "s" : ""} · {rdv} RDV aujourd&apos;hui
          </p>
          {vue === "file" ? (
            <label className="ao-recherche">
              <Search {...I} width={14} height={14} />
              <span className="v2-sr">Rechercher un prospect</span>
              <input type="search" value={recherche} placeholder="Rechercher" autoComplete="off" spellCheck={false} onChange={(e) => setRecherche(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setRecherche("")} />
            </label>
          ) : null}
        </div>
      </div>
      {etat ? (
        <p className="al-etat" role="status">
          {etat}
        </p>
      ) : (
        <p className="v2-sr" role="status" />
      )}

      {vue === "file" ? (
        liste.length ? (
          <ul className="ao-liste al-liste">
            {liste.map((x) => {
              const statut = file.find((y) => y.id === x.id)?.statut ?? x.statut;
              return (
                <li key={x.id} className="ao-ligne">
                  <button type="button" onClick={() => ouvrir(x.id)}>
                    <span className="ao-ligne-titre">
                      <strong>{x.enseigne || x.entreprise}</strong>
                      <span>{[x.dirigeant?.replace(/\s*\(.*\)$/, ""), x.commune].filter(Boolean).join(" · ") || x.secteur}</span>
                    </span>
                    <span className="ao-statut">
                      <span className="ao-point" data-teinte={statut === "Rappeler" ? "bleu" : undefined} aria-hidden="true" />
                      {statut === "Rappeler" ? "À rappeler" : "À appeler"}
                    </span>
                    <span className="ao-produit">
                      <span className="ao-tag">
                        <Building2 {...I} width={14} height={14} />
                        {x.secteur}
                      </span>
                    </span>
                    <span className="ao-ligne-date al-tel">{x.telephone}</span>
                    <ChevronRight {...I} width={14} height={14} className="ao-chevron" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="ao-vide ao-vide--liste">
            {q ? (
              "Aucun prospect ne correspond."
            ) : (
              <>
                File vide pour ce secteur : tout le monde a été appelé.&nbsp;<Link href={lien()}>Voir tous les secteurs</Link>
              </>
            )}
          </p>
        )
      ) : vue === "historique" ? (
        <Historique appels={tousAppels} />
      ) : (
        <div className="al-analyse">
          <Analyse appels={tousAppels} objections={objections} aujourdhui={aujourdhui} maintenant={maintenant.getTime()} />
        </div>
      )}

      {/* l'appel, sur le côté comme la fiche d'Activité ; « Enregistrer » passe au suivant sans le fermer */}
      <ModalOverlay isOpen={ouvert && !!p} onOpenChange={(o) => !o && setOuvert(false)} isDismissable className="v2-jetons ao-voile">
        <Modal className="ao-fiche al-fiche">
          <Dialog className="ao-fiche-dialogue" aria-label={p ? `Appel : ${nom}` : "Appel"}>
            {p ? (
              <>
                <div className="ao-fiche-haut">
                  <span className="ao-fiche-type">Appel</span>
                  <button type="button" className="ao-icone" aria-label="Fermer" onClick={() => setOuvert(false)}>
                    <X {...I} />
                  </button>
                </div>
                <div key={p.id} className="ao-fiche-corps al-corps">
                  <div>
                    <h2 className="al-nom">{nom}</h2>
                    <p className="al-sous">{[dirigeant, p.commune, p.secteur].filter(Boolean).join(" · ")}</p>
                  </div>
                  <a className="no-principal al-appeler" href={`tel:${p.telephone}`}>
                    <Phone {...I} width={14} height={14} />
                    Appeler {p.telephone}
                  </a>

                  <h3 className="ao-fiche-section">Script</h3>
                  <div className="al-temps" role="tablist" aria-label="Temps de l'appel">
                    {ETAPES.map((e, i) => (
                      <button key={e} type="button" role="tab" aria-selected={i === etape} className="no-onglet" onClick={() => setEtape(i)}>
                        {i < etape ? <Check width={12} height={12} strokeWidth={2.5} aria-hidden="true" /> : null}
                        {e}
                      </button>
                    ))}
                  </div>
                  <p className="al-replique">{textes[etape]}</p>
                  <p className="al-conseil">{CONSEILS[etape]}</p>
                  {etape === 3 ? (
                    <p className="al-conseil">Pistes : {douleurs.join(", ")}.</p>
                  ) : (
                    <button type="button" className="al-texte-bouton" onClick={() => setEtape(etape + 1)}>
                      C&apos;est dit, suite : {ETAPES[etape + 1]}
                      <ArrowRight width={14} height={14} aria-hidden="true" />
                    </button>
                  )}

                  <h3 className="ao-fiche-section">Issue</h3>
                  <div className="al-issues" role="radiogroup" aria-label="Issue de l'appel">
                    {[...ISSUES, ...AUTRES].map((x) => (
                      <button key={x.cle} type="button" role="radio" aria-checked={issue?.cle === x.cle} onClick={() => setIssue(x)}>
                        <span className="al-radio" aria-hidden="true" />
                        {x.libelle}
                      </button>
                    ))}
                  </div>
                  {issue?.date ? (
                    <label className="al-date">
                      <span>{issue.date === "rdv" ? "Date du rendez-vous" : "Date du rappel"}</span>
                      <input type="datetime-local" value={dateRdv} onChange={(e) => setDateRdv(e.target.value)} />
                    </label>
                  ) : null}

                  <h3 className="ao-fiche-section">Notes</h3>
                  <textarea className="al-zone" placeholder="Ce qu'il a dit, quand rappeler…" value={note} rows={3} aria-label="Notes" onChange={(e) => setNote(e.target.value)} />
                  <button type="button" className="al-texte-bouton" onClick={creerTache}>
                    <Plus {...I} width={14} height={14} />
                    Créer une tâche
                  </button>
                </div>
                <div className="ao-fiche-pied">
                  <button type="button" className="al-texte-bouton" onClick={() => suivant(1)}>
                    Passer
                  </button>
                  <button type="button" className="no-principal" disabled={!issue || envoi} onClick={enregistrer}>
                    Enregistrer et suivant
                    <ArrowRight {...I} width={14} height={14} />
                  </button>
                </div>
              </>
            ) : null}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </div>
  );
}

const TEINTE_ISSUE: Record<string, string> = { "RDV pris": "vert", Rappeler: "bleu", "Pas intéressé": "rouge", "Ne plus appeler": "rouge" };

function Historique({ appels }: { appels: Ligne[] }) {
  if (!appels.length) return <p className="ao-vide ao-vide--liste">Aucun appel enregistré pour l&apos;instant.</p>;
  return (
    <ul className="ao-liste al-liste al-historique">
      {appels.slice(0, 60).map((l) => (
        <li key={l.id} className="ao-ligne">
          <div className="al-ligne">
            <span className="ao-ligne-titre">
              <strong>{l.donnees["Entreprise"]}</strong>
              <span>{l.donnees["Note"] || l.donnees["Secteur"]}</span>
            </span>
            <span className="ao-statut">
              <span className="ao-point" data-teinte={TEINTE_ISSUE[l.donnees["Issue"]]} aria-hidden="true" />
              {l.donnees["Issue"]}
            </span>
            <span className="ao-produit">{l.donnees["Secteur"]}</span>
            <span className="ao-ligne-date">
              {dateCourte(l.donnees["Date"])} · {heure(l.donnees["Date"])}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Analyse({ appels, objections, aujourdhui, maintenant }: { appels: Ligne[]; objections: Ligne[]; aujourdhui: string; maintenant: number }) {
  const semaine = appels.filter((l) => maintenant - Date.parse(l.donnees["Date"] ?? "") < 7 * 86_400_000);
  const par = (ls: Ligne[]) => {
    const total = ls.length;
    const echanges = ls.filter((l) => l.donnees["Issue"] !== "Pas de réponse").length;
    const rdv = ls.filter((l) => l.donnees["Issue"] === "RDV pris").length;
    return { total, echanges, rdv, taux: echanges ? Math.round((rdv / echanges) * 100) : 0 };
  };
  const j = par(appels.filter((l) => (l.donnees["Date"] ?? "").startsWith(aujourdhui)));
  const s = par(semaine);
  const issues = ["RDV pris", "Rappeler", "Pas de réponse", "Pas intéressé", "Ne plus appeler"].map((cle) => ({ cle, n: semaine.filter((l) => l.donnees["Issue"] === cle).length }));
  const max = Math.max(1, ...issues.map((x) => x.n));
  return (
    <div className="om-ap-analyse">
      {[
        { titre: "Aujourd'hui", v: j },
        { titre: "7 derniers jours", v: s },
      ].map(({ titre, v }) => (
        <section key={titre} className="v2-carte om-ap-chiffres" aria-label={titre}>
          <h2>{titre}</h2>
          <dl>
            <div>
              <dt>Appels</dt>
              <dd>{v.total}</dd>
            </div>
            <div>
              <dt>Échanges</dt>
              <dd>{v.echanges}</dd>
            </div>
            <div>
              <dt>Rendez-vous</dt>
              <dd>{v.rdv}</dd>
            </div>
            <div>
              <dt>Échanges → RDV</dt>
              <dd>{v.taux} %</dd>
            </div>
          </dl>
        </section>
      ))}
      <section className="v2-carte om-ap-repartition" aria-label="Issues sur 7 jours">
        <h2>Issues sur 7 jours</h2>
        <ul>
          {issues.map((x) => (
            <li key={x.cle}>
              <span>{x.cle}</span>
              <span className="om-ap-barre" aria-hidden="true">
                <span style={{ width: `${(x.n / max) * 100}%` }} />
              </span>
              <b>{x.n}</b>
            </li>
          ))}
        </ul>
      </section>
      <section className="v2-carte om-ap-repartition" aria-label="Objections les plus entendues">
        <h2>Objections les plus entendues</h2>
        <ul>
          {objections.slice(0, 5).map((o) => (
            <li key={o.id}>
              <span>{o.donnees["Objection"]}</span>
              <b>{o.donnees["Fois"] || 0}</b>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
