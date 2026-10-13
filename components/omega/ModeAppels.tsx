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
import { ArrowRight, Building2, Check, ChevronLeft, ChevronRight, ChevronsUpDown, LayoutGrid, Phone, Plus, SkipForward } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import "@/components/espace2/notes.css";
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
type Vue = "session" | "historique" | "rappels" | "analyse";
const VUES: { cle: Vue; libelle: string }[] = [
  { cle: "session", libelle: "Session" },
  { cle: "historique", libelle: "Historique" },
  { cle: "rappels", libelle: "Rappels" },
  { cle: "analyse", libelle: "Analyse" },
];

const initiales = (s: string) =>
  s
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]!.toUpperCase())
    .join("") || "?";
const dateCourte = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "");
const heure = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "");

export default function ModeAppels({ file: initiale, secteurs, secteur, lignes: initiales_, selecteur }: { file: Prospect[]; secteurs: Secteur[]; secteur?: string; lignes: Ligne[]; selecteur: React.ReactNode }) {
  const [file, setFile] = useState(initiale);
  const [lignes, setLignes] = useState(initiales_);
  const [vue, setVue] = useState<Vue>("session");
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
  const rechercheGoogle = p ? `https://www.google.com/search?q=${encodeURIComponent(`${nom} ${p.commune ?? ""}`)}` : "";

  const position = Math.min(file.length, Math.max(1, initiale.length - file.length + 1));

  return (
    <div className="no-page om-ap at-page v2-arrivee">
      <h1 className="v2-sr">Appels</h1>

      {/* les onglets, comme Notes · Modèles */}
      <div className="no-onglets" role="tablist" aria-label="Vue">
        {VUES.map((v) => (
          <button key={v.cle} type="button" role="tab" aria-selected={vue === v.cle} className="no-onglet" onClick={() => setVue(v.cle)}>
            {v.libelle}
            {v.cle === "rappels" ? <span className="no-compte">{file.filter((x) => x.statut === "Rappeler").length}</span> : null}
          </button>
        ))}
      </div>

      {/* la barre : la file et le secteur | les chiffres du jour */}
      <div className="no-barre">
        <div className="at-barre-gauche">
          {vue === "session" && p ? (
            <span className="at-file">
              <button type="button" className="at-icone" aria-label="Prospect précédent" onClick={() => suivant(-1)}>
                <ChevronLeft {...I} width={14} height={14} />
              </button>
              <button type="button" className="at-icone" aria-label="Prospect suivant" onClick={() => suivant(1)}>
                <ChevronRight {...I} width={14} height={14} />
              </button>
              <span>
                {position} sur {Math.max(file.length, position)}
              </span>
            </span>
          ) : null}
          <MenuDeroulant
            etiquette={`Secteur : ${actif?.secteur ?? "Tous les secteurs"}. Changer de secteur`}
            classe="no-bouton"
            placement="bottom start"
            largeur={320}
            declencheur={
              <>
                <Building2 {...I} width={14} height={14} />
                {actif?.secteur ?? "Tous les secteurs"}
                <ChevronsUpDown width={14} height={14} aria-hidden="true" />
              </>
            }
          >
            <ItemMenu id="tous" href={lien()} textValue="Tous les secteurs" icone={<LayoutGrid {...I} />}>
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
        <p className="at-chiffres">
          {appels.length} appel{appels.length > 1 ? "s" : ""} · {rdv} RDV aujourd&apos;hui
        </p>
      </div>

      {etat ? (
        <p className="at-etat" role="status">
          {etat}
        </p>
      ) : (
        <p className="v2-sr" role="status" />
      )}

      {vue === "session" ? (
        p ? (
          <div key={p.id} className="at-fiche">
            {/* à gauche : le prospect, le script, les notes */}
            <section className="at-principal" aria-label={`Appel : ${nom}`}>
              <header className="at-tete">
                <span className="at-avatar" aria-hidden="true">
                  {initiales(nom)}
                </span>
                <div className="at-qui">
                  <h2>{nom}</h2>
                  <p>{[dirigeant, p.commune].filter(Boolean).join(" · ")}</p>
                </div>
              </header>

              <div className="at-temps" role="tablist" aria-label="Temps de l'appel">
                {ETAPES.map((e, i) => (
                  <button key={e} type="button" role="tab" aria-selected={i === etape} className="no-onglet" onClick={() => setEtape(i)}>
                    {i < etape ? <Check width={12} height={12} strokeWidth={2.5} aria-hidden="true" /> : null}
                    {e}
                  </button>
                ))}
              </div>

              <div className="at-script">
                <p className="at-replique">{textes[etape]}</p>
                <p className="at-conseil">{CONSEILS[etape]}</p>
                {etape === 3 ? (
                  <div className="at-pistes">
                    {douleurs.map((d) => (
                      <span key={d} className="at-pastille">
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <button type="button" className="at-texte-bouton" onClick={() => setEtape(etape + 1)}>
                    C&apos;est dit, suite : {ETAPES[etape + 1]}
                    <ArrowRight width={14} height={14} aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="at-notes">
                <label className="at-libelle" htmlFor="at-notes">
                  Notes
                </label>
                <textarea id="at-notes" className="at-zone" placeholder="Ce qu'il a dit, ce qui l'intéresse, quand rappeler…" value={note} onChange={(e) => setNote(e.target.value)} />
                <button type="button" className="at-texte-bouton" onClick={creerTache}>
                  <Plus {...I} width={14} height={14} />
                  Créer une tâche
                </button>
              </div>
            </section>

            {/* à droite : les détails et l'issue, comme la colonne d'une fiche Attio */}
            <aside className="at-cote" aria-label="Détails et issue">
              <a className="no-principal at-appeler" href={`tel:${p.telephone}`}>
                <Phone {...I} width={14} height={14} />
                Appeler {p.telephone}
              </a>

              <h3 className="at-libelle">Détails</h3>
              <dl className="at-details">
                <div>
                  <dt>Téléphone</dt>
                  <dd className="at-mono">{p.telephone}</dd>
                </div>
                {dirigeant ? (
                  <div>
                    <dt>Dirigeant</dt>
                    <dd>{dirigeant}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Secteur</dt>
                  <dd>{p.secteur}</dd>
                </div>
                {p.commune ? (
                  <div>
                    <dt>Commune</dt>
                    <dd>{p.commune}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>À vendre</dt>
                  <dd className="at-pastilles">
                    {p.moteurs.map((m) => (
                      <span key={m} className="at-pastille">
                        {m.toUpperCase()}
                      </span>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt>Préparer</dt>
                  <dd className="at-liens">
                    <a href={rechercheGoogle} target="_blank" rel="noreferrer">
                      Google
                    </a>
                    <a href={`https://www.google.com/maps/search/${encodeURIComponent(`${nom} ${p.commune ?? ""}`)}`} target="_blank" rel="noreferrer">
                      Avis
                    </a>
                    <a href={`https://annuaire-entreprises.data.gouv.fr/rechercher?terme=${encodeURIComponent(p.entreprise)}`} target="_blank" rel="noreferrer">
                      Fiche
                    </a>
                  </dd>
                </div>
              </dl>

              <h3 className="at-libelle">Issue de l&apos;appel</h3>
              <div className="at-issues" role="radiogroup" aria-label="Issue de l'appel">
                {[...ISSUES, ...AUTRES].map((x) => (
                  <button key={x.cle} type="button" role="radio" aria-checked={issue?.cle === x.cle} onClick={() => setIssue(x)}>
                    <span className="at-radio" aria-hidden="true" />
                    {x.libelle}
                  </button>
                ))}
              </div>
              {issue?.date ? (
                <label className="at-date">
                  <span>{issue.date === "rdv" ? "Date du rendez-vous" : "Date du rappel"}</span>
                  <input type="datetime-local" value={dateRdv} onChange={(e) => setDateRdv(e.target.value)} />
                </label>
              ) : null}
              <button type="button" className="no-bouton at-enregistrer" disabled={!issue || envoi} onClick={enregistrer}>
                Enregistrer et passer au suivant
                <ArrowRight {...I} width={14} height={14} />
              </button>
              <button type="button" className="at-texte-bouton at-passer" onClick={() => suivant(1)}>
                <SkipForward {...I} width={14} height={14} />
                Passer sans noter
              </button>
            </aside>
          </div>
        ) : (
          <p className="at-vide">
            File vide pour ce secteur : tous les établissements avec un téléphone ont été appelés.{" "}
            <Link href={lien()}>Voir tous les secteurs</Link>
          </p>
        )
      ) : (
        <div className="at-autre">
          {vue === "historique" ? (
            <Historique appels={tousAppels} />
          ) : vue === "rappels" ? (
            <section className="v2-carte om-ap-table" aria-label="Rappels">
              {file.filter((x) => x.statut === "Rappeler").length ? (
                <ul>
                  {file
                    .filter((x) => x.statut === "Rappeler")
                    .map((x) => (
                      <li key={x.id}>
                        <span className="om-ap-avatar om-ap-avatar--petit" aria-hidden="true">
                          {initiales(x.enseigne || x.entreprise)}
                        </span>
                        <span className="om-ap-table-nom">
                          <strong>{x.enseigne || x.entreprise}</strong>
                          <small>{[x.secteur, x.commune].filter(Boolean).join(" · ")}</small>
                        </span>
                        <span className="om-ap-table-note">{x.note?.split("\n").slice(-1)[0] ?? ""}</span>
                        <button
                          type="button"
                          className="v2-btn v2-btn--petit"
                          onClick={() => {
                            choisirProspect(x.id);
                            setVue("session");
                          }}
                        >
                          <Phone width={14} height={14} aria-hidden="true" />
                          Rappeler
                        </button>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="om-ap-vide-texte">Aucun rappel en attente dans ce secteur.</p>
              )}
            </section>
          ) : (
            <Analyse appels={tousAppels} objections={objections} aujourdhui={aujourdhui} maintenant={maintenant.getTime()} />
          )}
        </div>
      )}
    </div>
  );
}

function Historique({ appels }: { appels: Ligne[] }) {
  return (
    <section className="v2-carte om-ap-table" aria-label="Historique des appels">
      {appels.length ? (
        <ul>
          {appels.slice(0, 60).map((l) => (
            <li key={l.id}>
              <span className="om-ap-table-date">
                {dateCourte(l.donnees["Date"])}
                <small>{heure(l.donnees["Date"])}</small>
              </span>
              <span className="om-ap-table-nom">
                <strong>{l.donnees["Entreprise"]}</strong>
                <small>{l.donnees["Secteur"]}</small>
              </span>
              <span className="om-ap-table-note">{l.donnees["Note"]}</span>
              <span className="om-ap-pastille" data-rdv={l.donnees["Issue"] === "RDV pris" ? "" : undefined}>
                {l.donnees["Issue"]}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="om-ap-vide-texte">Aucun appel enregistré pour l&apos;instant.</p>
      )}
    </section>
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
