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
import { ArrowRight, ArrowUpRight, Building2, CalendarDays, Check, ChevronLeft, ChevronRight, ChevronsUpDown, LayoutGrid, MoreHorizontal, Phone, Plus, SkipForward } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import "./appels.css";
import { ItemMenu, MenuDeroulant, SectionMenu, SeparateurMenu } from "@/components/espace2/ui";
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

  const jourLong = maintenant.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).replace(/^./, (c) => c.toUpperCase());

  return (
    <div className="v2-page v2-arrivee om-page om-page--large om-ap ap2-page">
      {/* ——— l'en-tête : le titre et la date ; la vue et le secteur ——— */}
      <div className="ap2-tete">
        <div>
          <h1>Appels</h1>
          <p>{jourLong}</p>
        </div>
        <div className="ap2-tete-droite">
          {selecteur}
          <MenuDeroulant
            etiquette={`Secteur : ${actif?.secteur ?? "Tous les secteurs"}. Changer de secteur`}
            classe="v2-portee om-portee-secteur om-ap-bouton"
            placement="bottom end"
            largeur={340}
            declencheur={
              <>
                {actif ? <Building2 {...I} /> : <LayoutGrid {...I} />}
                <span className="v2-portee-nom">{actif?.secteur ?? "Tous les secteurs"}</span>
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
        </div>
      </div>

      {/* ——— les vues et le compteur du jour ——— */}
      <div className="ap2-nav">
        <div className="ap2-segments" role="tablist" aria-label="Vue">
          {VUES.map((v) => (
            <button key={v.cle} type="button" role="tab" aria-selected={vue === v.cle} onClick={() => setVue(v.cle)}>
              {v.libelle}
              {v.cle === "rappels" && file.some((x) => x.statut === "Rappeler") ? <span className="ap2-compte">{file.filter((x) => x.statut === "Rappeler").length}</span> : null}
            </button>
          ))}
        </div>
        <p className="ap2-chiffres">
          <span>
            <b>{appels.length}</b> appel{appels.length > 1 ? "s" : ""}
          </span>
          <span>
            <b>{rdv}</b> rendez-vous
          </span>
        </p>
      </div>

      <p className="om-etat ap2-etat" role="status">
        {etat}
      </p>

      {vue === "session" ? (
        p ? (
          <div className="ap2">
            {/* ——— la file : qui appeler ensuite ——— */}
            <aside className="ap2-file" aria-label="File d'appels">
              <div className="ap2-file-tete">
                <span>File d&apos;appels</span>
                <span className="ap2-compte">{file.length}</span>
              </div>
              <ul>
                {file.slice(0, 40).map((x, i) => (
                  <li key={x.id}>
                    <button type="button" className="ap2-file-ligne" aria-current={i === 0 ? "true" : undefined} onClick={() => choisirProspect(x.id)}>
                      <span className="ap2-file-nom">{x.enseigne || x.entreprise}</span>
                      <span className="ap2-file-sous">
                        {x.statut === "Rappeler" ? <span className="ap2-point" aria-hidden="true" /> : null}
                        {x.statut === "Rappeler" ? "À rappeler · " : ""}
                        {x.commune ?? x.secteur}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>

            {/* ——— la fiche du prospect ——— */}
            <section key={p.id} className="ap2-fiche" aria-label={`Appel : ${nom}`}>
              <header className="ap2-fiche-tete">
                <div className="ap2-identite">
                  <h2>{nom}</h2>
                  <p>
                    {[dirigeant, p.secteur, p.commune].filter(Boolean).join(" · ")}
                    {p.moteurs.map((m) => (
                      <span key={m} className="ap2-etiquette">
                        {m.toUpperCase()}
                      </span>
                    ))}
                  </p>
                </div>
                <div className="ap2-actions">
                  <span className="ap2-fleches">
                    <button type="button" className="ap2-icone" aria-label="Prospect précédent" onClick={() => suivant(-1)}>
                      <ChevronLeft {...I} width={14} height={14} />
                    </button>
                    <button type="button" className="ap2-icone" aria-label="Prospect suivant" onClick={() => suivant(1)}>
                      <ChevronRight {...I} width={14} height={14} />
                    </button>
                  </span>
                  <span className="ap2-numero">{p.telephone}</span>
                  <a className="ap2-appeler" href={`tel:${p.telephone}`}>
                    <Phone {...I} width={14} height={14} />
                    Appeler
                  </a>
                  <MenuDeroulant etiquette="Préparer et autres actions" classe="ap2-icone ap2-icone--cadre" largeur={240} declencheur={<MoreHorizontal {...I} />}>
                    <SectionMenu titre="Préparer l'appel">
                      {p.site ? (
                        <ItemMenu id="site" href={p.site.startsWith("http") ? p.site : `https://${p.site}`} target="_blank" icone={<ArrowUpRight {...I} />}>
                          Site web
                        </ItemMenu>
                      ) : null}
                      <ItemMenu id="google" href={rechercheGoogle} target="_blank" icone={<ArrowUpRight {...I} />}>
                        Google
                      </ItemMenu>
                      <ItemMenu id="avis" href={`https://www.google.com/maps/search/${encodeURIComponent(`${nom} ${p.commune ?? ""}`)}`} target="_blank" icone={<ArrowUpRight {...I} />}>
                        Avis
                      </ItemMenu>
                      <ItemMenu id="fiche" href={`https://annuaire-entreprises.data.gouv.fr/rechercher?terme=${encodeURIComponent(p.entreprise)}`} target="_blank" icone={<ArrowUpRight {...I} />}>
                        Fiche de l&apos;entreprise
                      </ItemMenu>
                    </SectionMenu>
                    <SeparateurMenu />
                    <ItemMenu id="passer" icone={<SkipForward {...I} />} onAction={() => suivant(1)}>
                      Passer sans noter
                    </ItemMenu>
                  </MenuDeroulant>
                </div>
              </header>

              <div className="ap2-corps">
                {/* le script : un déroulé vertical, comme les étapes d'un déploiement Vercel */}
                <div className="ap2-script">
                  <ol className="ap2-deroule" aria-label="Le déroulé de l'appel">
                    {ETAPES.map((e, i) => {
                      const etat = i < etape ? "fait" : i === etape ? "actif" : "a-venir";
                      return (
                        <li key={e} data-etat={etat}>
                          <button type="button" className="ap2-deroule-tete" aria-expanded={i === etape} onClick={() => setEtape(i)}>
                            <span className="ap2-pastille" aria-hidden="true">
                              {i < etape ? <Check width={11} height={11} strokeWidth={3} /> : i + 1}
                            </span>
                            <span className="ap2-deroule-titre">{e}</span>
                            {i !== etape ? <span className="ap2-apercu">{textes[i]}</span> : null}
                          </button>
                          {i === etape ? (
                            <div className="ap2-deroule-corps">
                              <p className="ap2-replique">{textes[i]}</p>
                              <p className="ap2-conseil">{CONSEILS[i]}</p>
                              {i === 3 ? (
                                <ul className="ap2-pistes" aria-label="Les douleurs à creuser">
                                  {douleurs.map((d) => (
                                    <li key={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</li>
                                  ))}
                                </ul>
                              ) : (
                                <button type="button" className="ap2-dit" onClick={() => setEtape(i + 1)}>
                                  <Check width={14} height={14} strokeWidth={2.2} aria-hidden="true" />
                                  C&apos;est dit — {ETAPES[i + 1]}
                                </button>
                              )}
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ol>
                </div>

                {/* les notes de l'échange */}
                <div className="ap2-notes">
                  <label htmlFor="ap2-notes" className="ap2-libelle">
                    Notes
                  </label>
                  <textarea id="ap2-notes" className="ap2-zone" placeholder="Ce qu'il a dit, ce qui l'intéresse, quand rappeler…" value={note} onChange={(e) => setNote(e.target.value)} />
                  <button type="button" className="ap2-lien" onClick={creerTache}>
                    <Plus {...I} width={14} height={14} />
                    Créer une tâche
                  </button>
                </div>
              </div>

              {/* l'issue de l'appel */}
              <footer className="ap2-pied">
                <div className="ap2-issues" role="radiogroup" aria-label="Issue de l'appel">
                  {ISSUES.map((x) => (
                    <button key={x.cle} type="button" role="radio" aria-checked={issue?.cle === x.cle} onClick={() => setIssue(x)}>
                      {x.libelle}
                    </button>
                  ))}
                  <MenuDeroulant etiquette="Autres issues" classe="ap2-issue-autre" placement="top start" largeur={200} declencheur={issue && AUTRES.includes(issue) ? <span>{issue.libelle}</span> : <MoreHorizontal {...I} width={14} height={14} />}>
                    {AUTRES.map((x) => (
                      <ItemMenu key={x.cle} id={x.cle} onAction={() => setIssue(x)}>
                        {x.libelle}
                      </ItemMenu>
                    ))}
                  </MenuDeroulant>
                </div>
                {issue?.date ? (
                  <label className="ap2-date">
                    <CalendarDays {...I} width={14} height={14} />
                    <input type="datetime-local" aria-label={issue.date === "rdv" ? "Date et heure du rendez-vous" : "Date et heure du rappel"} value={dateRdv} onChange={(e) => setDateRdv(e.target.value)} />
                  </label>
                ) : null}
                <button type="button" className="ap2-enregistrer" disabled={!issue || envoi} onClick={enregistrer}>
                  Enregistrer et suivant
                  <ArrowRight {...I} width={14} height={14} />
                </button>
              </footer>
            </section>
          </div>
        ) : (
          <section className="ap2 ap2--vide">
            <p>File vide pour ce secteur : tous les établissements avec un téléphone ont été appelés.</p>
            <Link className="v2-btn v2-btn--petit" href={lien()}>
              Voir tous les secteurs
            </Link>
          </section>
        )
      ) : vue === "historique" ? (
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
