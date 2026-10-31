"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAMILA › Arrivées (30/10/2026, refonte des pages métiers)

   Le Triage de Linear, au 1:1 : relevé docs/refonte-metiers/releves/
   linear-triage.md, mesures dans components/espace2/lin/linear-triage.css
   (préfixe ltr-). La liste à gauche (400), l'élément ouvert à droite ;
   l'avis ouvert est dans l'adresse (?avis=), Échap revient à la liste.

   Ce qu'elle reprend de l'écran d'avant (AvisEntrantsTamila, B7, B8, G7,
   G8 ; entrées E5, E15) : les avis RPVA reçus par courriel, leur sujet,
   le type supposé, le dossier proposé (même n° RG, déchiffré ici avec les
   clairs déjà connus du layout), reçu le, pièces jointes, date
   d'effacement, la notice de transit en clair ; « Rattacher » (fenêtre :
   dossier, type, chiffrement de chaque pièce jointe puis rattacherAvis)
   et « Écarter » (fenêtre : motif ; avocats). Mêmes portes, même code.
   Les avis déjà lus dans un dossier (B35) restent dans son onglet
   Procédure : ils n'ont plus rien à ranger.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, Clock, FolderLock, Inbox, Link2, Mail, Paperclip, X } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis } from "@/components/espace/ui";
import { dateCourte } from "@/components/espace/format";
import { EXEMPLE, MOTIFS_ECART, rgCite } from "@/components/espace/tamila/AvisEntrantsTamila";
import { chiffrerOctets, empreinte } from "@/components/espace/tamila/chiffrement";
import * as portes from "@/components/espace/tamila/portes";
import { TYPES_AVIS } from "@/components/espace/tamila/regles";
import { useToast } from "../Toasts";
import { lienDossier, jourCourt } from "./commun";
import { useTamila } from "./donnees";
import "@/components/espace/espace.css";
import "../lin/lin.css";
import "../lin/linear-triage.css";

const normaliserRg = (rg: string) => rg.replace(/[^0-9/]/g, "");
const typeDe = (t: string | null) => (t ? (TYPES_AVIS[t as keyof typeof TYPES_AVIS] ?? t) : null);

export default function Arrivees() {
  const { source, pret, installe, avocat, clientId, lignes, cleDe, oublierDossier } = useTamila();
  const params = useSearchParams();
  const chemin = usePathname();
  const routeur = useRouter();
  const toast = useToast();
  const id = params.get("avis");
  const lienId = (x: string | null) => (x ? `${chemin}?avis=${encodeURIComponent(x)}` : chemin);

  /* undefined : lecture ; null : la base n'a pas b4_10 */
  const [avis, setAvis] = useState<portes.AvisEntrant[] | null | undefined>(() => (source === "exemple" ? EXEMPLE : undefined));
  const [sourceAvant, setSourceAvant] = useState(source);
  if (source !== sourceAvant) {
    setSourceAvant(source);
    setAvis(source === "exemple" ? EXEMPLE : undefined);
  }
  const visible = source === "exemple" || (installe && avocat);
  useEffect(() => {
    if (source !== "reelle" || !visible) return;
    let actif = true;
    const t = window.setTimeout(async () => {
      const a = await portes.chargerAvisEntrants();
      if (actif) setAvis(a);
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source, visible]);

  /* les dossiers vivants où l'on peut rattacher (E:661) */
  const dossiers = useMemo(() => lignes.filter((x) => ["attente", "ouvert", "audit"].includes(x.dossier.statut)), [lignes]);
  const proposes = useMemo(() => {
    const p: Record<string, string> = {};
    for (const a of avis ?? []) {
      const rg = rgCite(`${a.reception?.sujet ?? ""} ${a.reception?.corps ?? ""}`);
      if (!rg) continue;
      const d = dossiers.find((x) => x.clair?.numero_rg && normaliserRg(x.clair.numero_rg) === normaliserRg(rg));
      if (d) p[a.id] = d.dossier.id;
    }
    return p;
  }, [avis, dossiers]);
  const refDe = (x: string) => dossiers.find((d) => d.dossier.id === x)?.clair?.reference ?? "dossier chiffré";

  const liste = avis ?? [];
  const choisi = liste.find((a) => a.id === id) ?? null;

  useEffect(() => {
    if (!choisi) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("[role=dialog]")) routeur.push(lienId(null), { scroll: false });
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  });

  /* ——— les gestes (G7, G8) ——— */
  const [ouvert, setOuvert] = useState<{ type: "rattacher" | "ecarter"; avis: portes.AvisEntrant } | null>(null);
  const [choix, setChoix] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const ouvrir = (type: "rattacher" | "ecarter", a: portes.AvisEntrant) => {
    setErreur(null);
    setChoix({ dossier: proposes[a.id] ?? "", type: a.type_suppose ?? "", motif: "pas_un_avis" });
    setOuvert({ type, avis: a });
  };
  const retirer = (a: portes.AvisEntrant) => {
    setAvis((x) => (x ? x.filter((y) => y.id !== a.id) : x));
    setOuvert(null);
    if (id === a.id) routeur.push(lienId(null), { scroll: false });
  };

  const rattacher = async (a: portes.AvisEntrant) => {
    const dossier = choix.dossier;
    if (!dossier) return setErreur("Choisissez le dossier.");
    setEnvoi(true);
    setErreur(null);
    try {
      if (source === "reelle") {
        const cle = await cleDe(dossier);
        if (!cle) throw new Error("La clé de ce dossier n'est pas ouverte (phrase du cabinet ou coffre) : la pièce ne peut pas être chiffrée.");
        const pieces: string[] = [];
        for (const p of a.reception?.pieces ?? []) {
          const clair = await portes.telecharger(p.chemin);
          const chiffre = await chiffrerOctets(cle, clair);
          clair.fill(0);
          const sha = await empreinte(chiffre);
          const lieu = `${clientId}/tamila_dossier/${dossier}/${p.nom}.${sha.slice(0, 12)}.chiffre`;
          await portes.televerser(lieu, chiffre);
          const r = await portes.deposerPiece(dossier, p.nom, p.mime || "application/octet-stream", chiffre.length, sha, lieu, choix.type || null);
          pieces.push(r.piece_id);
        }
        if (!pieces.length) throw new Error("Ce courriel n'a pas de pièce jointe à rattacher : écartez-le, et saisissez l'avis à la main dans le dossier.");
        await portes.rattacherAvis(a.id, dossier, pieces);
        oublierDossier(dossier);
      } else {
        await new Promise((r) => setTimeout(r, 400));
      }
      retirer(a);
      toast(`Avis rattaché au dossier ${refDe(dossier)} : la pièce y est chiffrée, la copie reçue par courriel est effacée.`, "vert");
      routeur.push(lienDossier(dossier, "pieces"));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Le rattachement a échoué.");
    } finally {
      setEnvoi(false);
    }
  };

  const ecarter = async (a: portes.AvisEntrant) => {
    setEnvoi(true);
    setErreur(null);
    try {
      if (source === "reelle") await portes.ecarterAvis(a.id, choix.motif || "pas_un_avis");
      else await new Promise((r) => setTimeout(r, 300));
      retirer(a);
      toast("Avis écarté : sa copie reçue par courriel est effacée.", "vert");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé.");
    } finally {
      setEnvoi(false);
    }
  };

  const chargement = source === "reelle" && (!pret || (visible && avis === undefined));

  const colonneListe = (
    <section className="ltr-liste" aria-label="Avis RPVA à rattacher">
      <header className="ltr-tete">
        <h2 className="ltr-tete-titre">Arrivées</h2>
        {liste.length ? <span className="ltr-tete-compte">{liste.length}</span> : null}
      </header>
      {chargement ? (
        <ul className="ltr-lignes" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="ltr-ligne" aria-hidden="true">
              <span className="ltr-ligne-int">
                <span className="ltr-squelette" style={{ width: "70%" }} />
                <span className="ltr-squelette" style={{ width: "40%", height: 10 }} />
              </span>
            </li>
          ))}
        </ul>
      ) : liste.length ? (
        <ul className="ltr-lignes">
          {liste.map((a) => (
            <li key={a.id}>
              <Link href={lienId(a.id)} scroll={false} className="ltr-ligne" data-actif={a.id === id ? "" : undefined} aria-current={a.id === id ? "true" : undefined}>
                <span className="ltr-ligne-int">
                  <span className="ltr-l1">
                    <span className="ltr-l1-titre">{a.reception?.sujet ?? "Avis reçu par courriel"}</span>
                    <span className="ltr-l1-id">{proposes[a.id] ? refDe(proposes[a.id]) : "RPVA"}</span>
                  </span>
                  <span className="ltr-l2">
                    <span className="ltr-qui">
                      <Mail width={14} height={14} aria-hidden="true" />
                      <span>{a.reception?.de_nom ?? a.reception?.de_adresse ?? "e-barreau"}</span>
                    </span>
                    <span className="ltr-quand">{jourCourt(a.recu_le)}</span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ltr-liste-vide">{!visible && pret ? "Les avis reçus par courriel se rattachent par un avocat du cabinet, Tamila installé." : avis === null ? "La file des avis reçus par courriel n'est pas encore posée sur cette base." : "Aucun avis à rattacher."}</p>
      )}
    </section>
  );

  const panneauVide = (
    <section className="ltr-detail" aria-label="Aucun avis ouvert">
      <header className="ltr-tete" />
      <div className="ltr-vide">
        <div className="ltr-vide-texte">
          {chargement ? (
            <p className="ltr-vide-titre">Lecture des arrivées…</p>
          ) : liste.length ? (
            <>
              <p className="ltr-vide-titre">
                {liste.length} avis à rattacher
              </p>
              <p className="ltr-vide-aide">L&apos;avis transite en clair chez le prestataire de courriel, sept jours au plus ; dès qu&apos;il est rattaché ou écarté, cette copie est effacée.</p>
              <Link className="ltr-vide-bouton" href={lienId(liste[0].id)} scroll={false}>
                <Inbox aria-hidden="true" />
                Ouvrir le premier
              </Link>
            </>
          ) : (
            <>
              <p className="ltr-vide-titre">Rien à rattacher</p>
              <p className="ltr-vide-aide">Les avis RPVA reçus par courriel arrivent ici, avec le dossier qui porte le même n° RG.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );

  function detail(a: portes.AvisEntrant) {
    const rg = rgCite(`${a.reception?.sujet ?? ""} ${a.reception?.corps ?? ""}`);
    const propose = proposes[a.id];
    const type = typeDe(a.type_suppose);
    return (
      <section className="ltr-detail" aria-label={a.reception?.sujet ?? "Avis reçu par courriel"}>
        <header className="ltr-tete">
          <Link className="ltr-rond ltr-retour" href={lienId(null)} scroll={false} aria-label="Revenir à la liste">
            <ChevronLeft aria-hidden="true" />
          </Link>
          <span className="ltr-fil">
            <h2>
              <span className="ltr-fil-id">RPVA</span>
              <span className="ltr-fil-nom">{a.reception?.sujet ?? "Avis reçu par courriel"}</span>
            </h2>
          </span>
          <div className="ltr-ronds">
            <span className="ltr-bulle" data-bulle="Rattacher au dossier">
              <button type="button" className="ltr-rond" aria-label="Rattacher l'avis à son dossier" disabled={envoi} onClick={() => ouvrir("rattacher", a)}>
                <Check aria-hidden="true" />
              </button>
            </span>
            {avocat ? (
              <span className="ltr-bulle" data-bulle="Écarter">
                <button type="button" className="ltr-rond" aria-label="Écarter l'avis" disabled={envoi} onClick={() => ouvrir("ecarter", a)}>
                  <X aria-hidden="true" />
                </button>
              </span>
            ) : null}
          </div>
        </header>

        <div className="ltr-corps">
          <h3 className="ltr-titre">{a.reception?.sujet ?? "Avis reçu par courriel"}</h3>

          <div className="ltr-pilules">
            <span className="ltr-pilule" title="Expéditeur">
              <Mail aria-hidden="true" />
              <span>{a.reception?.de_nom ?? a.reception?.de_adresse ?? "e-barreau"}</span>
            </span>
            <span className="ltr-pilule" title="Reçu le">
              <Clock aria-hidden="true" />
              <span>{dateCourte(a.recu_le)}</span>
            </span>
            <span className="ltr-pilule" title="Pièces jointes" data-vide={a.nb_pieces ? undefined : ""}>
              <Paperclip aria-hidden="true" />
              <span>
                {a.nb_pieces} pièce{a.nb_pieces > 1 ? "s" : ""} jointe{a.nb_pieces > 1 ? "s" : ""}
              </span>
            </span>
            {type ? (
              <span className="ltr-pilule" title="Type supposé">
                <span>{type}</span>
              </span>
            ) : null}
            {propose ? (
              <Link className="ltr-pilule" href={lienDossier(propose)} title="Même n° RG">
                <FolderLock aria-hidden="true" />
                <span>Dossier {refDe(propose)}</span>
              </Link>
            ) : (
              <span className="ltr-pilule" data-vide="" title="Dossier">
                <FolderLock aria-hidden="true" />
                <span>{rg ? `RG ${rg} : aucun dossier lisible` : "Dossier à choisir"}</span>
              </span>
            )}
          </div>

          <div className="ltr-desc">
            {a.reception?.corps ? <p>{a.reception.corps.slice(0, 600)}</p> : null}
            <p className="ltr-second">
              Effacé le {dateCourte(a.expire_le)} s&apos;il n&apos;est pas rattaché. L&apos;avis transite en clair chez le prestataire de courriel, sept jours au plus ; dès qu&apos;il est rattaché ou écarté, cette copie est effacée.
            </p>
          </div>

          {a.reception?.pieces?.length ? (
            <div className="ltr-pieces">
              {a.reception.pieces.map((p) => (
                <span key={p.chemin} className="ltr-pilule">
                  <Paperclip aria-hidden="true" />
                  <span className="ltr-piece-texte">{p.nom}</span>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  const a = ouvert?.avis ?? null;

  return (
    <div className="lin ltr" data-ouvert={choisi ? "" : undefined}>
      <h1 className="v2-sr">Arrivées</h1>
      <div className="ltr-carte">
        {colonneListe}
        {choisi ? detail(choisi) : panneauVide}
      </div>

      <Dialog open={!!ouvert} onOpenChange={(o) => !o && !envoi && setOuvert(null)}>
        <DialogContent>
          {a && ouvert ? (
            <>
              <DialogHeader>
                <DialogIcone>{ouvert.type === "rattacher" ? <Link2 width={18} height={18} aria-hidden="true" /> : <Inbox width={18} height={18} aria-hidden="true" />}</DialogIcone>
                <DialogTitle>{ouvert.type === "rattacher" ? "Rattacher l'avis à son dossier" : "Écarter l'avis"}</DialogTitle>
                <DialogDescription>{a.reception?.sujet ?? "Avis reçu par courriel"}</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <div className="esp-form">
                  {ouvert.type === "rattacher" ? (
                    <>
                      <label className="rv-libelle">
                        Dossier
                        <select className="rv-champ" value={choix.dossier ?? ""} onChange={(e) => setChoix((c) => ({ ...c, dossier: e.target.value }))}>
                          <option value="">— choisir —</option>
                          {dossiers.map((d) => (
                            <option key={d.dossier.id} value={d.dossier.id}>
                              {d.clair ? `${d.clair.reference} — ${d.clair.intitule}` : `Dossier chiffré (${d.dossier.id.slice(0, 8)})`}
                              {proposes[a.id] === d.dossier.id ? " · proposé" : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="rv-libelle">
                        Type d&apos;avis
                        <select className="rv-champ" value={choix.type ?? ""} onChange={(e) => setChoix((c) => ({ ...c, type: e.target.value }))}>
                          <option value="">— à lire par le lecteur —</option>
                          {(Object.keys(TYPES_AVIS) as (keyof typeof TYPES_AVIS)[]).map((t) => (
                            <option key={t} value={t}>
                              {TYPES_AVIS[t]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Avis teinte="bleu">Chaque pièce jointe ({a.nb_pieces}) est chiffrée dans votre navigateur avec la clé du dossier, puis déposée ; le lecteur la lira et posera les délais. La copie reçue en clair est ensuite effacée.</Avis>
                    </>
                  ) : (
                    <label className="rv-libelle">
                      Motif
                      <select className="rv-champ" value={choix.motif ?? "pas_un_avis"} onChange={(e) => setChoix((c) => ({ ...c, motif: e.target.value }))}>
                        {Object.entries(MOTIFS_ECART).map(([k, l]) => (
                          <option key={k} value={k}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {erreur ? (
                    <Avis teinte="rouge" role="alert">
                      {erreur}
                    </Avis>
                  ) : null}
                </div>
              </DialogBody>
              <DialogFooter>
                <button type="button" className="r-btn r-btn--fil" disabled={envoi} onClick={() => setOuvert(null)}>
                  Fermer
                </button>
                <button type="button" className={`r-btn ${ouvert.type === "ecarter" ? "r-btn--rouge" : "r-btn--noir"}`} disabled={envoi} onClick={() => (ouvert.type === "rattacher" ? void rattacher(a) : void ecarter(a))}>
                  {envoi ? <Loader variant="spin" /> : null} {ouvert.type === "rattacher" ? "Chiffrer et rattacher" : "Écarter"}
                </button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
