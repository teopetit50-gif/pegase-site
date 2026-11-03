"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAVARO — la vue d'ensemble (02/11/2026, refonte des pages métiers)

   La page « Home » d'une équipe de Linear (onglet Overview), au 1:1 :
   relevé docs/refonte-metiers/releves/linear-home.md, styles ./tav.css et
   ./tav-home.css (préfixes tav-, tav-h-), icônes du sprite de Linear
   (./TavIcone). Seul le contenu change :
     · la tuile et le nom de l'équipe → « Location » (B01), sa phrase → la
       description ; l'ancien titre reste pour les lecteurs d'écran ;
     · les « Team resources » → les analyses du matin, une section par
       analyse (B39 Véhicules inactifs, B40 Réservations à risque, B41
       Contrats à risque, B42 Montée en gamme), une rangée par ligne, les
       plus risquées d'abord ; les ancres #tavaro-inactifs… sont gardées ;
       B38 (une lecture refusée) en texte d'aide sous la première section ;
     · « Members » → « Agences » : une puce par agence, le filtre d'agence
       (B07), qui vaut pour toutes les sous-pages (§ 8.3-5) ;
     · « Go to » → « Aller à » : les quatre compteurs-filtres (B02) et « À
       encaisser » (B03), qui mènent aux Retours à facturer, puis les
       autres sous-pages ;
     · les onglets → Vue d'ensemble, Questions (B33, ?vue=questions), puis
       deux sous-pages ; le menu « … » → Réglages et l'écran d'avant.
   Gestes : G56 « Noter le contrôle » (F26) au clic sur un contrat à risque ;
   G43 « Poser la question » par le « + » de la section Questions.
   B04 / B05 (base muette, session sans compte) : texte d'aide.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MessageCircleQuestion } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis } from "@/components/espace/ui";
import { dateHeure, montant } from "@/components/espace/format";
import { FAMILLES, type Famille } from "@/components/espace/tavaro/etats";
import { DialogueControle } from "@/components/espace/tavaro/AnalysesParc";
import { EXEMPLES, STATUTS } from "@/components/espace/tavaro/QuestionsVue";
import { chargerQuestions, poserQuestion, type Question } from "@/components/espace/tavaro/portes";
import type { ContratRisque } from "@/components/espace/tavaro/analyses";
import { RACINE } from "../modules";
import { useToast } from "../Toasts";
import { useTavaro } from "./donnees";
import { useAnalyses } from "./analyses";
import { TavAgences, TavCarte, TavMenu } from "./TavCadre";
import { TavIcone, type NomTavIcone } from "./TavIcone";
import { useFavoris } from "./navigateur";
import { ecrireStockage, useStockage } from "../Collection";
import "./tav-home.css";

export const BASE = `${RACINE}/tavaro`;

const ICONE_FAMILLE: Record<Famille, NomTavIcone> = { a_chiffrer: "Calculator", a_valider: "Signature", bloquee: "Alert", reste: "Folder" };
const RANG = { fort: 0, moyen: 1, faible: 2 } as const;

function quand(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);
}
const pct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${Math.round(v * 100)} %`);

/* une rangée de « Team resources » : icône 16, texte 13/500 ; le complément en tertiaire */
function Rangee({ icone, texte, suite, onClick, href, titre }: { icone: NomTavIcone; texte: string; suite?: string; onClick?: () => void; href?: string; titre?: string }) {
  const contenu = (
    <>
      <TavIcone nom={icone} />
      <span className="tav-h-rangee-texte" title={titre || undefined}>{texte}</span>
      {suite ? <span className="tav-h-rangee-suite">{suite}</span> : null}
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className="tav-h-rangee">
          {contenu}
        </Link>
      ) : onClick ? (
        <button type="button" className="tav-h-rangee" onClick={onClick}>
          {contenu}
        </button>
      ) : (
        <div className="tav-h-rangee tav-h-rangee--fixe">{contenu}</div>
      )}
    </li>
  );
}

function Section({ id, titre, aide, vide, children, boutons }: { id: string; titre: string; aide?: string | null; vide: string; children: React.ReactNode[]; boutons?: React.ReactNode }) {
  return (
    <section id={id} className="tav-h-section" aria-labelledby={`${id}-titre`}>
      <div className="tav-h-section-tete">
        <h2 id={`${id}-titre`} className="tav-h-section-titre">
          {titre}
        </h2>
        {boutons}
      </div>
      {aide ? <p className="tav-h-aide">{aide}</p> : null}
      {children.length ? <ul className="tav-h-liste">{children}</ul> : <p className="tav-h-aide">{vide}</p>}
    </section>
  );
}

/* ——— B33 : les Questions (code de QuestionsVue : relecture toutes les 5 s tant qu'une attend) ——— */
function useQuestions(source: "exemple" | "reelle") {
  const [liste, setListe] = useState<Question[] | null>(null);
  const relire = useCallback(async () => {
    try {
      setListe((await chargerQuestions()) ?? []);
    } catch {
      setListe([]);
    }
  }, []);
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (source === "exemple") setListe(EXEMPLES);
      else void relire();
    }, 0);
    return () => window.clearTimeout(t);
  }, [source, relire]);
  const attente = (liste ?? []).some((q) => q.statut === "a_traiter" || q.statut === "en_cours");
  useEffect(() => {
    if (source !== "reelle" || !attente) return;
    const t = window.setInterval(() => void relire(), 5000);
    return () => window.clearInterval(t);
  }, [source, attente, relire]);
  const poser = async (q: string) => {
    if (source === "reelle") {
      await poserQuestion(q);
      await relire();
      return "La question est posée : la réponse arrive en général en moins d'une minute.";
    }
    setListe((l) => [{ id: crypto.randomUUID(), entite_id: null, question: q, statut: "a_traiter", reponse: null, erreur: null, posee_par: null, posee_le: new Date().toISOString(), repondue_le: null }, ...(l ?? [])]);
    return "En exemple, la question n'est pas envoyée : aucune IA n'est appelée. Les deux réponses montrent la forme d'une réponse.";
  };
  return { liste, poser };
}

function DialogueQuestion({ ouvert, fermer, poser, peut }: { ouvert: boolean; fermer: () => void; poser: (q: string) => Promise<string>; peut: boolean }) {
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const toast = useToast();
  const envoyer = async () => {
    const q = texte.trim().replace(/\s+/g, " ");
    if (q.length < 5 || q.length > 500) {
      setErreur("Une question tient en 5 à 500 caractères.");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      toast(await poser(q), "vert");
      setTexte("");
      fermer();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé.");
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && fermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone>
            <MessageCircleQuestion width={18} height={18} aria-hidden="true" />
          </DialogIcone>
          <DialogTitle>Poser une question</DialogTitle>
          <DialogDescription>Une question en français sur vos chiffres : la réponse les cite, dit la cause de l&apos;écart et la décision proposée. Rien n&apos;est jamais écrit.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            <label className="esp-form">
              <span className="rv-libelle">Votre question</span>
              <textarea className="rv-champ" rows={3} value={texte} disabled={!peut} onChange={(e) => setTexte(e.target.value)} placeholder="Pourquoi a-t-on facturé moins de dommages ce mois-ci ?" />
            </label>
            {!peut ? <Avis teinte="ambre">Un compte en lecture seule ne pose pas de question.</Avis> : null}
            {erreur ? (
              <Avis teinte="rouge" role="alert">
                {erreur}
              </Avis>
            ) : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" className="r-btn r-btn--noir" disabled={envoi || !peut} onClick={envoyer}>
            {envoi ? <Loader variant="spin" /> : null} Poser la question
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogueReponse({ q, fermer }: { q: Question | null; fermer: () => void }) {
  const r = q?.reponse;
  return (
    <Dialog open={!!q} onOpenChange={(o) => !o && fermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone>
            <MessageCircleQuestion width={18} height={18} aria-hidden="true" />
          </DialogIcone>
          <DialogTitle>{q?.question}</DialogTitle>
          <DialogDescription>
            {q ? `Posée le ${dateHeure(q.posee_le)} · ${STATUTS[q.statut].libelle}` : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            {r ? (
              <>
                <p>{r.reponse}</p>
                {r.chiffres?.length ? (
                  <ul className="esp-liste">
                    {r.chiffres.map((c) => (
                      <li key={c.libelle} className="esp-item" style={{ cursor: "default" }}>
                        <span className="esp-item-haut">
                          <span>{c.libelle}</span>
                          <strong>{c.valeur}</strong>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {r.cause ? <p>Cause : {r.cause}</p> : null}
                {r.decision ? <p>Décision proposée : {r.decision}</p> : null}
              </>
            ) : q?.erreur ? (
              <Avis teinte="rouge">{q.erreur}</Avis>
            ) : (
              <p>La réponse arrive en général en moins d&apos;une minute.</p>
            )}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

export default function VueEnsemble() {
  const { source, pret, erreur, moi, role, agences, agence, setAgence, compteurs, nomAgenceDe } = useTavaro();
  const params = useSearchParams();
  const vue = params.get("vue") === "questions" ? "questions" : "ensemble";
  const toast = useToast();
  const { analyses: a, visibles, erreurs, peutNoter, noter } = useAnalyses(source, moi, role);
  const [cible, setCible] = useState<ContratRisque | null>(null);
  const questions = useQuestions(source);
  const [poser, setPoser] = useState(false);
  const [reponse, setReponse] = useState<Question | null>(null);
  const peut = role !== null && role !== "lecteur";

  /* le filtre d'agence vaut aussi pour les analyses (elles portent le nom de l'agence) */
  const choisie = agences.find((x) => x.entite_id === agence) ?? null;
  const deLAgence = useCallback(
    <T extends { agence: string | null }>(l: T[]) => (choisie ? l.filter((x) => x.agence === choisie.code || x.agence === choisie.nom || x.agence === nomAgenceDe(choisie.entite_id)) : l),
    [choisie, nomAgenceDe],
  );
  const lignes = useMemo(() => {
    if (!a) return null;
    return {
      inactifs: deLAgence([...(a.inactifs?.vehicules ?? [])]).sort((x, y) => RANG[x.niveau] - RANG[y.niveau] || y.probabilite - x.probabilite),
      reservations: deLAgence([...(a.reservations?.reservations ?? [])]).sort((x, y) => RANG[x.niveau] - RANG[y.niveau]),
      contrats: deLAgence([...(a.contrats?.contrats ?? [])]).sort((x, y) => y.score - x.score),
      offres: deLAgence([...(a.montee?.offres ?? [])]),
    };
  }, [a, deLAgence]);

  const agenceStockee = useStockage("espace2:agence:tavaro");
  const agenceParDefaut = !!agence && agenceStockee === agence;
  const favoris = useFavoris();

  const copierLien = () => {
    void navigator.clipboard?.writeText(window.location.href).then(
      () => toast("Lien copié"),
      () => toast("Le lien n'a pas pu être copié.", "rouge"),
    );
  };

  const aller: { cle: string; libelle: string; icone: NomTavIcone; href: string; compte?: string }[] = [
    ...FAMILLES.map((f) => ({ cle: f.cle, libelle: f.libelle, icone: ICONE_FAMILLE[f.cle], href: `${BASE}/retours?famille=${f.cle}`, compte: String(compteurs[f.cle]) })),
    /* « à encaisser » mène à la vue Factures, celle qui porte les impayés — pas à la liste des contrats */
    { cle: "encaisser", libelle: "À encaisser", icone: "Euro", href: `${BASE}/retours?vue=factures&factures=impayees`, compte: montant(compteurs.encaisser) },
    { cle: "parc", libelle: "Parc et atelier", icone: "Car", href: `${BASE}/parc` },
    { cle: "amendes", libelle: "Amendes et péages", icone: "Triage", href: `${BASE}/amendes` },
    { cle: "incidents", libelle: "Incidents", icone: "Bandage", href: `${BASE}/incidents` },
    { cle: "reseau", libelle: "Réseau et flotte", icone: "Initiative", href: `${BASE}/reseau` },
    { cle: "reglages", libelle: "Réglages", icone: "Roue", href: `${BASE}/reglages` },
  ];
  const pilules = (avecChevron: boolean) =>
    aller.map((x) => (
      <Link key={x.cle} href={x.href} className="tav-h-pilule">
        <span className="tav-h-pilule-icone">
          <TavIcone nom={x.icone} />
        </span>
        <span>{x.libelle}</span>
        {x.compte !== undefined ? <span className="tav-h-pilule-compte">{x.compte}</span> : null}
        {avecChevron ? <TavIcone nom="Chevron" className="tav-h-chevron" /> : null}
      </Link>
    ));

  const avisBase = erreur ? `La base réelle n'a pas répondu. ${erreur}` : source === "reelle" && pret && !moi ? "Aucun compte rattaché à cette session : la lecture passe, les gestes resteront gris." : null;

  return (
    <TavCarte>
      <h1 className="v2-sr">Location : retours et factures</h1>
      <header className="tav-tete">
        <div className="tav-ligne1">
          <Link href={BASE} className="tav-fil" aria-current="page">
            <TavIcone nom="Car" style={{ color: "var(--tav-equipe)" }} />
            <span>Location</span>
          </Link>
          <button type="button" className="tav-rond" aria-pressed={agenceParDefaut} aria-label={agenceParDefaut ? "Ne plus ouvrir sur cette agence" : agence ? "Ouvrir toujours sur cette agence" : "Ouvrir toujours sur toutes les agences"} title={agenceParDefaut ? "Ne plus ouvrir sur cette agence" : "Garder ce choix d'agence à l'ouverture"} onClick={() => { ecrireStockage("espace2:agence:tavaro", agenceParDefaut ? "" : (agence ?? "")); toast(agenceParDefaut ? "La location s'ouvrira sur toutes les agences." : agence ? `La location s'ouvrira sur ${nomAgenceDe(agence).split(" — ").pop()}.` : "La location s'ouvrira sur toutes les agences."); }}>
            <TavIcone nom={agenceParDefaut ? "Favorite" : "Etoile"} />
          </button>
          <TavMenu
            libelle="Actions sur la location"
            options={[
              { libelle: "Réglages", icone: "Roue", href: `${BASE}/reglages` },
              { libelle: "Ouvrir l'écran d'avant", icone: "Archive", href: `${BASE}?ancien=1` },
            ]}
          />
          <span className="tav-pousse" />
          <button type="button" className="tav-rond" aria-label="Copier le lien de la page" title="Copier le lien de la page" onClick={copierLien}>
            <TavIcone nom="LienUrl" />
          </button>
        </div>
        <nav className="tav-ligne2" aria-label="Vues">
          <Link href={BASE} scroll={false} className="tav-onglet" aria-current={vue === "ensemble" ? "page" : undefined}>
            Vue d&apos;ensemble
          </Link>
          <Link href={`${BASE}?vue=questions`} scroll={false} className="tav-onglet" aria-current={vue === "questions" ? "page" : undefined}>
            Questions
          </Link>
          <Link href={`${BASE}/retours`} className="tav-onglet">
            Retours
          </Link>
          <Link href={`${BASE}/parc`} className="tav-onglet">
            Parc
          </Link>
        </nav>
      </header>

      <div className="tav-defile">
        <div className="tav-h-corps">
          <div className="tav-h-principal">
            <div className="tav-h-titre">
              <span className="tav-h-tuile" aria-hidden="true">
                <TavIcone nom="Car" taille={24} />
              </span>
              <p className="tav-h-nom">{vue === "questions" ? "Questions" : "Location"}</p>
            </div>
            <div className="tav-h-description">
              <p>
                {vue === "questions"
                  ? "Une question en français sur vos chiffres : la réponse les cite, avec la cause de l'écart et la décision proposée. Rien n'est jamais écrit."
                  : "Chaque retour est comparé à l'état des lieux de départ et chiffré sur votre barème ; l'agence valide la facture avant tout envoi."}
              </p>
            </div>
            <nav className="tav-h-replis" aria-label="Aller à">
              {agences.length > 1 ? <TavAgences agences={agences} agence={agence} setAgence={setAgence} /> : null}
              {pilules(false)}
            </nav>

            {avisBase ? <p className="tav-h-aide tav-h-aide--seul">{avisBase}</p> : null}

            {vue !== "questions" && favoris.liste.length ? (
              <Section id="tavaro-epingles" titre="Épinglés" vide="">
                {favoris.liste.map((x) => (
                  <Rangee key={x.cle} icone="Favorite" texte={x.libelle} suite={x.detail} href={x.href} />
                ))}
              </Section>
            ) : null}

            {vue === "questions" ? (
              <Section
                id="tavaro-questions"
                titre="Questions"
                vide={questions.liste === null ? "Lecture des questions…" : "Aucune question pour l'instant."}
                boutons={
                  <button type="button" className="tav-rond" aria-label="Poser une question" title="Poser une question" onClick={() => setPoser(true)} disabled={!peut}>
                    <TavIcone nom="Plus" />
                  </button>
                }
              >
                {(questions.liste ?? []).map((q) => (
                  <Rangee key={q.id} icone="Chat" texte={q.question} suite={STATUTS[q.statut].libelle} onClick={() => setReponse(q)} />
                ))}
              </Section>
            ) : !visibles ? (
              <p className="tav-h-aide tav-h-aide--seul">{source === "reelle" && pret && !moi ? "" : "Lecture des analyses du parc…"}</p>
            ) : !lignes ? (
              <p className="tav-h-aide tav-h-aide--seul">Lecture des analyses du parc…</p>
            ) : (
              <>
                <Section
                  id="tavaro-inactifs"
                  titre="Véhicules inactifs"
                  aide={erreurs.length ? `Certaines analyses n'ont pas pu être lues : ${erreurs.join(" ; ")}` : null}
                  vide="Tous les véhicules au parc ont un départ dans les 72 heures."
                  boutons={
                    <>
                      <Link href={`${BASE}?vue=questions`} className="tav-rond" aria-label="Poser une question" title="Poser une question">
                        <TavIcone nom="Plus" />
                      </Link>
                      <Link href={`${BASE}/parc`} className="tav-rond" aria-label="Ouvrir le parc et l'atelier" title="Ouvrir le parc et l'atelier">
                        <TavIcone nom="Section" />
                      </Link>
                    </>
                  }
                >
                  {lignes.inactifs.map((v) => (
                    <Rangee
                      key={v.vehicule_id}
                      icone="Car"
                      texte={`${v.immatriculation} · ${pct(v.probabilite)} sur 72 h · ${v.action.libelle}`}
                      suite={`${v.modele ? `${v.modele}, ` : ""}${v.agence}, ${v.jours_parking} j au parking`}
                    />
                  ))}
                </Section>
                <Section id="tavaro-reservations-risque" titre="Réservations à risque" vide="Rien à confirmer avant les départs des trois prochains jours.">
                  {lignes.reservations.map((r) => (
                    <Rangee key={r.reservation_id} icone="Calendar" texte={`${r.client} · ${r.action}`} suite={`départ ${quand(r.depart_prevu_le)}, ${r.agence}`} />
                  ))}
                </Section>
                <Section id="tavaro-contrats-risque" titre="Contrats à risque" vide="Les contrats en cours n'appellent aucune précaution particulière.">
                  {lignes.contrats.map((c) => (
                    <Rangee
                      key={c.contrat_id}
                      icone="Shield"
                      texte={`${c.numero} · ${c.client} · score ${c.score} · ${c.action}`}
                      titre={c.raisons.join(", ")}
                      suite={c.controle ? (c.controle.identite === "conforme" && c.controle.permis === "conforme" ? "pièces conformes" : "pièce non conforme") : "pièces à contrôler"}
                      onClick={peutNoter ? () => setCible(c) : undefined}
                    />
                  ))}
                </Section>
                <Section id="tavaro-montee-en-gamme" titre="Montée en gamme" vide="Aucun véhicule supérieur n'est libre pour les départs des deux prochains jours.">
                  {lignes.offres.map((o) => (
                    <Rangee key={o.reservation_id} icone="Rank" texte={`${o.client} · proposer une ${o.offre.libelle.toLowerCase()}`} suite={`${o.categorie} → ${o.offre.categorie}, départ ${quand(o.depart_prevu_le)}`} />
                  ))}
                </Section>
              </>
            )}
          </div>

          <aside className="tav-h-droite" aria-label="Agences et liens">
            <div className="tav-h-droite-bloc">
              {agences.length > 1 ? (
                <div className="tav-h-droite-section">
                  <span className="tav-h-libelle">Agences</span>
                  <div className="tav-h-membres">
                    <TavAgences agences={agences} agence={agence} setAgence={setAgence} />
                    <Link href={`${BASE}/reglages?vue=regles`} className="tav-rond" aria-label="Responsables des remises, par agence" title="Responsables des remises, par agence">
                      <TavIcone nom="Plus" />
                    </Link>
                  </div>
                </div>
              ) : null}
              <div className="tav-h-droite-section">
                <span className="tav-h-libelle">Aller à</span>
                <nav className="tav-h-aller" aria-label="Aller à">
                  {pilules(true)}
                </nav>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <DialogueControle contrat={cible} fermer={() => setCible(null)} noter={noter} />
      <DialogueQuestion ouvert={poser} fermer={() => setPoser(false)} poser={questions.poser} peut={peut} />
      <DialogueReponse q={reponse} fermer={() => setReponse(null)} />
    </TavCarte>
  );
}
