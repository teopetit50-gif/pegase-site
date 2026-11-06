"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO — Appels (05/11/2026, demande de Teo avant l'audit de Corail BTP :
   « pourquoi on n'a pas une page où il peut voir tous les appels qu'il a ? »)

   Référence validée par Teo : Linear, Inbox — la liste à gauche, le ticket
   ouvert à droite. Les styles sont ceux des copies 1:1 déjà relevées pour
   Tavaro (tav-inbox.css → ./dal-inbox.css, préfixe dal-ap- ; tav-ticket.css
   → ./dal-ticket.css, préfixe dal-tk-), sans aucune mesure nouvelle.

   Une ligne par appel, comme une notification de Linear : pastille « non
   lu » = un geste attend, numéro, appelant et objet, icône de statut ;
   dessous comment l'appel a été pris, le chantier, la priorité et l'âge.
   À droite, la page du ticket : titre, propriétés, résumé et transcription
   en description, « Suites de l'appel » en sous-tickets, activité.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { dateHeure, relatif } from "@/components/espace/format";
import { RACINE } from "../modules";
import { copierEtDire } from "../Toasts";
import { DalCarte, DalMenu, type OptionMenu } from "./DalCadre";
import { DalIcone, type NomDalIcone } from "./DalIcone";
import { APPELS_EXEMPLE, ETATS, ISSUES, PRIORITES, type Appel, type EtatAppel, type EtatSuite, type IssueAppel } from "./exemplesAppels";
import "./dal-inbox.css";
import "./dal-ticket.css";

const BASE = `${RACINE}/daliro`;

const ICONE_ETAT: Record<EtatAppel | EtatSuite, NomDalIcone> = { tri: "IssueStatusTriage", cours: "IssueStatusStarted", fait: "IssueStatusDone", afaire: "IssueStatusTodo" };
const ICONE_ISSUE: Record<IssueAppel, NomDalIcone> = { agent: "Agent", bureau: "Phone", rappele: "Refresh", messagerie: "Mic", filtre: "Shield" };
const ICONE_PRIORITE: NomDalIcone[] = ["Priority0", "Priority1", "Priority2", "Priority3"];
const FILTRES = ["tous", "agent", "a-traiter"] as const;
type Filtre = (typeof FILTRES)[number];
const LIB_FILTRE: Record<Filtre, string> = { tous: "Tous les appels", agent: "Pris par l'agent", "a-traiter": "À traiter" };

/* l'âge court de Linear, comme Tavaro (Retours.tsx) */
function age(iso: string, maintenant: number): string {
  const s = Math.max(0, (maintenant - Date.parse(iso)) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} j`;
}

function Statut({ etat }: { etat: EtatAppel | EtatSuite }) {
  return (
    <span className="dal-tk-statut" data-etat={etat}>
      <DalIcone nom={ICONE_ETAT[etat]} taille={14} />
    </span>
  );
}

function Pilule({ icone, etat, children, vide, href }: { icone?: NomDalIcone; etat?: EtatAppel; children: React.ReactNode; vide?: boolean; href?: string }) {
  const contenu = (
    <>
      {etat ? <Statut etat={etat} /> : icone ? <DalIcone nom={icone} taille={16} /> : null}
      <span>{children}</span>
    </>
  );
  return href ? (
    <Link href={href} className="dal-tk-pilule">
      {contenu}
    </Link>
  ) : (
    <span className="dal-tk-pilule" data-vide={vide || undefined}>
      {contenu}
    </span>
  );
}

function texteAppel(a: Appel): string {
  return [
    `${a.numero} — ${a.titre}`,
    `${a.appelant} (${a.qualite}), ${a.telephone}`,
    `${dateHeure(a.quand)} · ${a.duree} · ${ISSUES[a.issue]}${a.pris_par ? ` (${a.pris_par})` : ""}`,
    a.chantier_nom ? `Chantier : ${a.chantier_nom}` : null,
    "",
    `Résumé : ${a.resume}`,
    "",
    "Transcription :",
    ...a.transcription.map(([qui, t, txt]) => `[${t}] ${qui} : ${txt}`),
    "",
    "Suites :",
    ...a.suites.map((s) => `- ${s.libelle}${s.detail ? ` (${s.detail})` : ""} : ${s.etat === "fait" ? "fait" : s.etat === "cours" ? "en cours" : s.etat === "tri" ? "à décider" : "à faire"}`),
  ]
    .filter((x) => x !== null)
    .join("\n");
}

/* ——— la page d'un appel : Linear, page d'un ticket (copie de Tavaro, ./dal-ticket.css) ——— */
export function FicheAppel({ appel: a, volet = false, retour }: { appel: Appel; volet?: boolean; retour?: { libelle: string; href: string } }) {
  const [ouvert, setOuvert] = useState(true);
  const faites = a.suites.filter((s) => s.etat === "fait").length;
  const lien = `${BASE}/appels/${a.id}`;
  return (
    <div className="dal-tk" data-volet={volet || undefined}>
      <header className="dal-tk-tete">
        <nav className="dal-tk-fil" aria-label="Fil d'Ariane">
          {retour ? (
            <>
              <Link href={retour.href} className="dal-tk-fil-lien">
                {retour.libelle}
              </Link>
              <span className="dal-tk-fil-sep" aria-hidden="true">
                ›
              </span>
            </>
          ) : null}
          <Link href={lien} className="dal-tk-fil-ticket" aria-current={volet ? undefined : "page"}>
            <h2>
              <span className="dal-tk-fil-id">{a.numero}</span>
              {a.titre}
            </h2>
          </Link>
        </nav>
        <DalMenu
          libelle="Actions sur l'appel"
          options={[
            { libelle: "Copier l'appel (résumé et transcription)", icone: "Page", action: () => copierEtDire(texteAppel(a), "Appel copié.") },
            { libelle: "Copier le numéro de l'appelant", icone: "Phone", action: () => copierEtDire(a.telephone.replace(/\s/g, ""), "Numéro copié.") },
            ...(a.chantier_id ? (["sep", { libelle: `Ouvrir ${a.chantier_nom}`, icone: "Crane", href: `${BASE}/chantiers/${a.chantier_id}` }] as OptionMenu[]) : []),
          ]}
        />
        <span className="dal-pousse" />
        <div className="dal-tk-actions">
          <a className="dal-tk-action" href={`tel:${a.telephone.replace(/\s/g, "")}`}>
            <DalIcone nom="Phone" taille={14} />
            <span>Rappeler</span>
          </a>
          {a.chantier_id ? (
            <Link className="dal-tk-action" href={`${BASE}/chantiers/${a.chantier_id}`}>
              <DalIcone nom="Crane" taille={14} />
              <span>Le chantier</span>
            </Link>
          ) : null}
        </div>
      </header>

      <div className="dal-tk-defile">
        <div className="dal-tk-outils">
          <button type="button" className="dal-rond dal-rond--plein" aria-label="Copier le lien de l'appel" title="Copier le lien de l'appel" onClick={() => copierEtDire(`${window.location.origin}${lien}`, "Lien copié.")}>
            <DalIcone nom="LienUrl" />
          </button>
          <button type="button" className="dal-rond dal-rond--plein" aria-label="Copier la transcription" title="Copier la transcription" onClick={() => copierEtDire(a.transcription.map(([qui, t, txt]) => `[${t}] ${qui} : ${txt}`).join("\n"), "Transcription copiée.")}>
            <DalIcone nom="Page" />
          </button>
        </div>
        <div className="dal-tk-corps">
          <div className="dal-tk-principal">
            <h1 className="dal-tk-titre">{a.titre}</h1>
            <div className="dal-tk-replis">
              <Pilule etat={a.etat}>{ETATS[a.etat]}</Pilule>
              <Pilule icone={ICONE_ISSUE[a.issue]}>{ISSUES[a.issue]}</Pilule>
              {a.chantier_id ? <Pilule icone="Crane" href={`${BASE}/chantiers/${a.chantier_id}`}>{a.chantier_nom}</Pilule> : null}
            </div>

            <div className="dal-tk-description">
              <p>{a.resume}</p>
              {a.transcription.map(([qui, t, txt], i) => (
                <p key={i}>
                  <strong>{qui}</strong> <span className="dal-tk-gris">{t}</span> — {txt}
                </p>
              ))}
            </div>

            <section className="dal-tk-bloc" aria-label="Suites de l'appel">
              <div className="dal-tk-bloc-tete">
                <button type="button" className="dal-tk-repli" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
                  <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true" style={{ transform: ouvert ? undefined : "rotate(-90deg)" }}>
                    <path d="M1 2.5h6L4 6z" fill="currentColor" />
                  </svg>
                  <span>Suites de l&apos;appel</span>
                </button>
                <span className="dal-tk-bloc-compte">
                  {faites}/{a.suites.length}
                </span>
              </div>
              {ouvert ? (
                <ul className="dal-tk-rangees">
                  {a.suites.map((s, i) => (
                    <li key={i}>
                      <div className="dal-tk-rangee dal-tk-rangee--fixe">
                        <span className="dal-tk-rangee-icone">
                          <Statut etat={s.etat} />
                        </span>
                        <span className="dal-tk-rangee-titre">
                          {s.libelle}
                          {s.detail ? <span className="dal-tk-gris"> · {s.detail}</span> : null}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            <hr className="dal-tk-filet" />
            <div className="dal-tk-activite-tete">
              <h3>Activité</h3>
            </div>
            <ul className="dal-tk-evenements">
              {a.journal.map((e, i) => (
                <li key={i} className="dal-tk-evenement">
                  <DalIcone nom={i === 0 ? "Phone" : "Updated"} taille={14} />
                  <span className="dal-tk-qui">{e.qui}</span>
                  <span>{e.quoi}</span>
                  <span aria-hidden="true">·</span>
                  <span title={dateHeure(e.quand)}>{relatif(e.quand)}</span>
                </li>
              ))}
            </ul>
          </div>
          <aside className="dal-tk-proprietes" aria-label="Propriétés de l'appel">
            <h3 className="dal-tk-prop-titre">Propriétés</h3>
            <div className="dal-tk-prop-liste">
              <Pilule etat={a.etat}>{ETATS[a.etat]}</Pilule>
              <Pilule icone={ICONE_PRIORITE[a.priorite]} vide={a.priorite === 0}>{PRIORITES[a.priorite]}</Pilule>
              <Pilule icone={ICONE_ISSUE[a.issue]}>{a.pris_par ? `${ISSUES[a.issue]} · ${a.pris_par}` : ISSUES[a.issue]}</Pilule>
              <Pilule icone="Clock">{`${dateHeure(a.quand)} · ${a.duree}`}</Pilule>
            </div>
            <h3 className="dal-tk-prop-titre">Appelant</h3>
            <div className="dal-tk-prop-liste">
              <Pilule icone="Users">{a.appelant}</Pilule>
              <Pilule icone="Phone">{a.telephone}</Pilule>
              <Pilule icone="Briefcase">{`${a.qualite}${a.connu ? " · déjà connu" : " · nouveau"}`}</Pilule>
            </div>
            <h3 className="dal-tk-prop-titre">Chantier</h3>
            <div className="dal-tk-prop-liste">
              {a.chantier_id ? <Pilule icone="Crane" href={`${BASE}/chantiers/${a.chantier_id}`}>{a.chantier_nom}</Pilule> : <Pilule icone="Crane" vide>Aucun chantier</Pilule>}
            </div>
            <h3 className="dal-tk-prop-titre">Étiquettes</h3>
            <div className="dal-tk-prop-etiquettes">
              <span className="dal-tk-etiquette">
                <span className="dal-tk-pastille" style={{ background: a.priorite === 1 ? "lch(58% 73 29)" : "lch(66 80 48)" }} />
                {a.motif}
              </span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ——— la page : Linear, Inbox ——— */
export default function Appels() {
  const params = useSearchParams();
  const routeur = useRouter();
  const brut = params.get("filtre");
  const filtre: Filtre = (FILTRES as readonly string[]).includes(brut ?? "") ? (brut as Filtre) : "tous";
  const choix = params.get("appel");
  const [maintenant] = useState(() => Date.now());
  const liste = useRef<HTMLUListElement>(null);

  const visibles = useMemo(
    () => APPELS_EXEMPLE.filter((a) => (filtre === "agent" ? a.issue === "agent" || a.issue === "rappele" || a.issue === "filtre" : filtre === "a-traiter" ? a.etat !== "fait" : true)),
    [filtre],
  );
  const appel = visibles.find((a) => a.id === choix) ?? null;
  const adresse = useCallback((f: Filtre, id: string | null) => {
    const q = new URLSearchParams();
    if (f !== "tous") q.set("filtre", f);
    if (id) q.set("appel", id);
    const s = q.toString();
    return `${BASE}/appels${s ? `?${s}` : ""}`;
  }, []);
  const ouvrir = useCallback(
    (a: Appel | null) => {
      if (a && window.matchMedia("(max-width: 768px)").matches) {
        routeur.push(`${BASE}/appels/${a.id}`);
        return;
      }
      routeur.replace(adresse(filtre, a?.id ?? null), { scroll: false });
    },
    [routeur, adresse, filtre],
  );

  /* ↑ ↓ et Échap, comme les Retours de Tavaro */
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (cible && (cible.closest("input, textarea, select, [role=dialog], [role=menu]") || cible.isContentEditable)) return;
      if (e.key === "Escape" && appel) {
        ouvrir(null);
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const i = appel ? visibles.indexOf(appel) : -1;
      const j = e.key === "ArrowDown" ? Math.min(visibles.length - 1, i + 1) : Math.max(0, i - 1);
      const a = visibles[j];
      if (a) {
        ouvrir(a);
        liste.current?.querySelector<HTMLElement>(`[data-appel="${a.id}"]`)?.scrollIntoView({ block: "nearest" });
      }
    };
    document.addEventListener("keydown", touche);
    return () => document.removeEventListener("keydown", touche);
  }, [appel, visibles, ouvrir]);

  const aTraiter = APPELS_EXEMPLE.filter((a) => a.etat !== "fait").length;
  const parAgent = APPELS_EXEMPLE.filter((a) => a.issue === "agent" || a.issue === "rappele" || a.issue === "filtre").length;
  const optionsFiltre: OptionMenu[] = FILTRES.map((f) => ({
    libelle: `${LIB_FILTRE[f]} · ${f === "tous" ? APPELS_EXEMPLE.length : f === "agent" ? parAgent : aTraiter}`,
    icone: (filtre === f ? "IssueStatusDone" : f === "agent" ? "Agent" : f === "a-traiter" ? "IssueStatusTriage" : "Inbox") as NomDalIcone,
    href: adresse(f, null),
  }));

  return (
    <DalCarte>
      <h1 className="v2-sr">Appels</h1>
      <div className="dal-ap">
        <section className="dal-ap-liste" aria-label="Appels reçus" data-ouvert={appel ? "" : undefined}>
          <header className="dal-ap-tete">
            <h2 className="dal-ap-titre">{filtre === "tous" ? "Appels" : LIB_FILTRE[filtre]}</h2>
            <DalMenu
              libelle="Actions sur les appels"
              options={[
                { libelle: "Copier les appels à traiter", icone: "Page", action: () => copierEtDire(APPELS_EXEMPLE.filter((a) => a.etat !== "fait").map(texteAppel).join("\n\n———\n\n"), "Appels à traiter copiés.") },
                "sep",
                { libelle: "Vue d'ensemble", icone: "Home", href: BASE },
                { libelle: "À faire", icone: "MyIssues", href: `${BASE}/a-faire` },
              ]}
            />
            <span className="dal-pousse" />
            <DalMenu libelle="Filtrer les appels" icone="Filtre" alignement="droite" options={optionsFiltre} actif={filtre !== "tous"} />
          </header>
          <div className="dal-ap-defile">
            <p className="dal-ap-avis">
              {APPELS_EXEMPLE.length} appels cette semaine · {parAgent} pris par l&apos;agent quand personne ne pouvait décrocher · {aTraiter} à traiter.
            </p>
            {visibles.length === 0 ? (
              <p className="dal-ap-avis">Aucun appel dans cette vue.</p>
            ) : (
              <ul ref={liste} className="dal-ap-lignes">
                {visibles.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={adresse(filtre, a.id)}
                      replace
                      scroll={false}
                      data-appel={a.id}
                      className="dal-ap-ligne"
                      data-lu={a.etat === "fait" ? "" : undefined}
                      aria-current={appel?.id === a.id ? "true" : undefined}
                      onClick={(e) => {
                        if (window.matchMedia("(max-width: 768px)").matches) {
                          e.preventDefault();
                          ouvrir(a);
                        }
                      }}
                    >
                      <span className="dal-ap-avatar" aria-hidden="true">
                        <DalIcone nom={ICONE_ISSUE[a.issue]} taille={20} />
                      </span>
                      <span className="dal-ap-texte">
                        <span className="dal-ap-l1">
                          {a.etat !== "fait" ? <span className="dal-ap-point" aria-label="à traiter" /> : null}
                          <span className="dal-ap-id">{a.numero}</span>
                          <span className="dal-ap-sujet">
                            {a.appelant} — {a.titre}
                          </span>
                          <span className="dal-ap-statut" data-etat={a.etat}>
                            <DalIcone nom={ICONE_ETAT[a.etat]} taille={14} />
                          </span>
                        </span>
                        <span className="dal-ap-l2">
                          <span className="dal-ap-sous">{[ISSUES[a.issue], a.duree, a.chantier_nom ?? a.qualite].join(" · ")}</span>
                          {a.priorite === 1 ? (
                            <span className="dal-ap-priorite" aria-label="urgent">
                              <DalIcone nom="Priority1" taille={14} />
                            </span>
                          ) : null}
                          <span className="dal-ap-age">{age(a.quand, maintenant)}</span>
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
        <section className="dal-ap-droite" aria-label="Appel ouvert">
          {appel ? (
            <FicheAppel key={appel.id} appel={appel} volet retour={{ libelle: filtre === "tous" ? "Appels" : LIB_FILTRE[filtre], href: adresse(filtre, null) }} />
          ) : (
            <div className="dal-ap-vide">
              <DalIcone nom="Phone" taille={96} className="dal-ap-illustration" />
              <p>
                {aTraiter} appel{aTraiter > 1 ? "s" : ""} à traiter
              </p>
            </div>
          )}
        </section>
      </div>
    </DalCarte>
  );
}
