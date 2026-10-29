"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO — la vue d'ensemble (29/10/2026, refonte des pages métiers)

   La page « Home » d'une équipe de Linear (onglet Overview), au 1:1 :
   relevé docs/refonte-metiers/releves/linear-home.md, mesures dans
   components/espace2/lin/linear-home.css (préfixe lh-).

   Ce qu'elle reprend de l'écran d'avant (components/espace/daliro/EcranDaliro) :
     · B01 : le titre « Chantiers », sa phrase, et « Nouveau chantier » ;
     · B02 : « C'est fait. » après la création (un toast : la page mène
       ensuite à la fiche du nouveau chantier) ;
     · B03 : les quatre familles (bloqués, avenants à signer, passages à
       confirmer, ouverts sur le quota), chacune mène à la liste des
       chantiers filtrée (?famille=<clé>) ; comptes exclusifs, comme le
       filtre de la liste (liste.ts, famille()) ;
     · B06 : l'onglet « Point du mois » (?vue=point), la carte de l'écran
       d'avant reprise habillée ;
     · F01 / G01 : la fenêtre « Nouveau chantier », mêmes champs et même
       validation, puis useDaliro().creer et la fiche du chantier.
   Les liens « Aller à » mènent aux sous-pages (modules.ts, onglets de daliro).
   Les données : components/espace2/daliro/donnees (exemple ou base réelle).
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, BookUser, CalendarClock, Copy, FileSignature, HardHat, Inbox, ListTodo, OctagonAlert, Plus, Settings, Users } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis } from "@/components/espace/ui";
import { FAMILLES, type Famille } from "@/components/espace/daliro/etats";
import { famille } from "@/components/espace/daliro/liste";
import type { Tableau } from "@/components/espace/daliro/types";
import PointMensuelCarte from "@/components/espace/daliro/PointMensuelCarte";
import { HabilleSb } from "../Habille";
import { RACINE } from "../modules";
import { useToast } from "../Toasts";
import { useDaliro, type NouveauChantier } from "./donnees";
import "../lin/lin.css";
import "../lin/linear-home.css";

const BASE = `${RACINE}/daliro`;

const MO_TYPES = [
  { cle: "professionnel", libelle: "Professionnel (promoteur, SCI, entreprise)" },
  { cle: "particulier", libelle: "Particulier" },
  { cle: "acheteur_public", libelle: "Acheteur public (commune, bailleur, État)" },
];
const PLACES = [
  { cle: "titulaire", libelle: "Titulaire du marché" },
  { cle: "cotraitant", libelle: "Cotraitant (groupement)" },
  { cle: "sous_traitant", libelle: "Sous-traitant d'une entreprise principale" },
];
const VIDE: NouveauChantier = { nom: "", reference: "", adresse: "", code_postal: "", commune: "", maitre_ouvrage_type: "professionnel", place_client: "titulaire", maitre_ouvrage_id: "" };

/* la teinte d'une famille (etats.ts) dans les jetons du gabarit */
const TEINTES: Record<Famille, string> = { bloque: "var(--lin-rouge)", a_signer: "var(--lin-jaune)", a_confirmer: "var(--lin-fait)", ouvert: "var(--lin-vert)" };
const ICONES: Record<Famille, React.ReactNode> = {
  bloque: <OctagonAlert aria-hidden="true" />,
  a_signer: <FileSignature aria-hidden="true" />,
  a_confirmer: <CalendarClock aria-hidden="true" />,
  ouvert: <HardHat aria-hidden="true" />,
};

export default function VueEnsemble() {
  const { source, pret, erreur, client, liste, tableau, premier, demander, demanderTous, quota, maitresOuvrage, creer } = useDaliro();
  const params = useSearchParams();
  const routeur = useRouter();
  const toast = useToast();
  const vue = params.get("vue") === "point" ? "point" : "ensemble";

  /* en base réelle, le quota, le choix du maître d'ouvrage (F01) et la bibliothèque
     se lisent dans un tableau : on lit le premier chantier s'il ne l'est pas encore */
  useEffect(() => {
    if (source === "reelle" && pret && !premier && liste[0]) demander(liste[0].id);
  }, [source, pret, premier, liste, demander]);

  /* le point du mois lit tous les tableaux (formule, droits) : une fois par liste */
  const demandes = useRef("");
  useEffect(() => {
    if (vue !== "point" || source !== "reelle" || !pret) return;
    const cle = liste.map((c) => c.id).join(",");
    if (demandes.current === cle) return;
    demandes.current = cle;
    demanderTous();
  }, [vue, source, pret, liste, demanderTous]);

  /* B03 : les familles, exclusives (un chantier compte dans la première qui le concerne) */
  const comptes = useMemo(() => {
    const c: Record<Famille, number> = { bloque: 0, a_signer: 0, a_confirmer: 0, ouvert: 0 };
    for (const ch of liste) {
      const f = famille(ch);
      if (f) c[f]++;
    }
    return c;
  }, [liste]);
  const ouverts = liste.filter((c) => c.statut === "ouvert" || c.statut === "suspendu").length;
  const avenantsEnCours = liste.reduce((s, c) => s + (c.nb_avenants_en_cours ?? 0), 0);
  const prixProposes = (premier?.bibliotheque ?? []).filter((p) => p.statut === "propose").length;

  const liens: { libelle: string; href: string; icone: React.ReactNode; compte?: number }[] = [
    { libelle: "Chantiers", href: `${BASE}/chantiers`, icone: <HardHat aria-hidden="true" />, compte: liste.length },
    { libelle: "À ranger", href: `${BASE}/a-ranger`, icone: <Inbox aria-hidden="true" /> },
    { libelle: "À faire", href: `${BASE}/a-faire`, icone: <ListTodo aria-hidden="true" /> },
    { libelle: "Avenants et situations", href: `${BASE}/avenants`, icone: <FileSignature aria-hidden="true" />, compte: avenantsEnCours || undefined },
    { libelle: "Annuaire", href: `${BASE}/annuaire`, icone: <BookUser aria-hidden="true" />, compte: premier?.tiers.length },
    { libelle: "Équipes", href: `${BASE}/equipes`, icone: <Users aria-hidden="true" /> },
    { libelle: "Réglages", href: `${BASE}/reglages`, icone: <Settings aria-hidden="true" />, compte: prixProposes || undefined },
  ];
  const listeLiens = (replies?: boolean) => (
    <ul className={replies ? "lh-liens lh-liens--replies" : "lh-liens"} aria-label={replies ? "Aller à" : undefined}>
      {liens.map((l) => (
        <li key={l.href}>
          <Link href={l.href} className="lh-lien">
            {l.icone}
            {l.libelle}
            {l.compte !== undefined ? <span className="lh-lien-compte">{l.compte}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  );

  /* ——— F01 : nouveau chantier ——— */
  const [nouveau, setNouveau] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreurNouveau, setErreurNouveau] = useState<string | null>(null);
  const [f, setF] = useState<NouveauChantier>(VIDE);
  const ouvrirNouveau = () => {
    setErreurNouveau(null);
    setF(VIDE);
    setNouveau(true);
  };
  const complet = f.nom.trim().length > 0 && /^[0-9]{5}$/.test(f.code_postal) && f.commune.trim().length > 0;
  const lancerCreation = async () => {
    setEnvoi(true);
    setErreurNouveau(null);
    try {
      const id = await creer(f);
      toast(`C'est fait. ${f.nom.trim()} est créé, en préparation : posez ses lots, son marché, puis ouvrez-le.`, "vert");
      setNouveau(false);
      routeur.push(`${BASE}/chantiers/${encodeURIComponent(id)}`);
    } catch (e) {
      setErreurNouveau(e instanceof Error ? e.message : "La création a échoué.");
    } finally {
      setEnvoi(false);
    }
  };

  const copierLien = () => {
    void navigator.clipboard?.writeText(window.location.href).then(
      () => toast("Lien copié"),
      () => toast("Le lien n'a pas pu être copié.", "rouge"),
    );
  };

  /* B06 : la carte se masque sans le droit de voir les prix, ou sans compte en base réelle */
  const voitPrix = premier ? premier.voit_prix : true;
  const pointVisible = voitPrix && (source === "exemple" || !!client);

  return (
    <div className="lin lh">
      <h1 className="v2-sr">Chantiers</h1>

      <header className="lh-titre">
        <nav aria-label="Fil d'Ariane">
          <Link href={BASE} className="lh-fil" aria-current="page">
            <HardHat aria-hidden="true" />
            <span>Chantiers</span>
          </Link>
        </nav>
        <div className="lh-titre-droite">
          <button type="button" className="lh-rond" aria-label="Nouveau chantier" title="Nouveau chantier" onClick={ouvrirNouveau}>
            <Plus aria-hidden="true" />
          </button>
          <button type="button" className="lh-rond" aria-label="Copier le lien de la page" title="Copier le lien de la page" onClick={copierLien}>
            <Copy aria-hidden="true" />
          </button>
        </div>
      </header>

      <nav className="lh-onglets" aria-label="Vues">
        <Link href={BASE} scroll={false} className="lh-onglet" aria-current={vue === "ensemble" ? "page" : undefined}>
          Vue d&apos;ensemble
        </Link>
        <Link href={`${BASE}?vue=point`} scroll={false} className="lh-onglet" aria-current={vue === "point" ? "page" : undefined}>
          Point du mois
        </Link>
      </nav>

      <div className="lh-corps">
        {vue === "point" ? (
          <div className="lh-principal lh-principal--large">
            <section className="lh-section lh-point" aria-labelledby="lh-point-titre">
              <div className="lh-section-tete">
                <h2 id="lh-point-titre" className="lh-section-titre">
                  Point du mois
                </h2>
              </div>
              <p className="lh-aide">Les travaux repérés sur le terrain, ceux qui sont signés, ce qui reste à relancer et à facturer, chantier par chantier.</p>
              {!pret ? (
                <p className="lh-aide">Lecture des chantiers…</p>
              ) : pointVisible ? (
                <div className="lh-point-carte">
                  <HabilleSb>
                    <PointMensuelCarte
                      key={`point-${source}:${client?.client_id ?? ""}`}
                      source={source}
                      client={source === "reelle" ? (client?.client_id ?? null) : null}
                      tableaux={liste.map((c) => tableau(c.id)).filter((t): t is Tableau => t !== null)}
                    />
                  </HabilleSb>
                </div>
              ) : (
                <p className="lh-aide">Le point du mois montre des montants : il est réservé aux comptes qui voient les prix.</p>
              )}
            </section>
          </div>
        ) : (
          <>
            <div className="lh-principal">
              <div className="lh-entete">
                <span className="lh-tuile" aria-hidden="true">
                  <HardHat />
                </span>
                <p className="lh-nom">Chantiers</p>
              </div>
              <div className="lh-description">
                <p>Le marché vérifié ligne à ligne, les travaux supplémentaires chiffrés sur vos prix et signés avant exécution, les passages confirmés à J-2, les factures rattachées à leurs lots.</p>
              </div>
              {listeLiens(true)}

              <section className="lh-section" aria-labelledby="lh-regarder">
                <div className="lh-section-tete">
                  <h2 id="lh-regarder" className="lh-section-titre">
                    À regarder
                  </h2>
                  <div className="lh-section-boutons">
                    <Link href={`${BASE}/chantiers`} className="lh-rond lh-rond--plein" aria-label="Tous les chantiers" title="Tous les chantiers">
                      <ArrowUpRight aria-hidden="true" />
                    </Link>
                  </div>
                </div>
                {erreur ? (
                  <p className="lh-aide" data-erreur="" role="alert">
                    La base réelle n&apos;a pas répondu. {erreur}
                  </p>
                ) : !pret ? (
                  <p className="lh-aide">Lecture des chantiers…</p>
                ) : (
                  <ul className="lh-rangees">
                    {FAMILLES.map((fa) => {
                      const n = comptes[fa.cle];
                      const meta = fa.cle === "ouvert" && quota ? `${ouverts} ouvert${ouverts > 1 ? "s" : ""} sur un quota de ${quota}` : fa.sous;
                      return (
                        <li key={fa.cle}>
                          <Link href={`${BASE}/chantiers?famille=${fa.cle}`} className="lh-rangee" data-vide={n ? undefined : ""} style={{ "--lin-teinte": TEINTES[fa.cle] } as React.CSSProperties}>
                            <span className="lh-rangee-icone">{ICONES[fa.cle]}</span>
                            <span className="lh-rangee-texte">
                              <span className="lh-rangee-nom">{fa.libelle}</span>
                              <span className="lh-rangee-meta">{meta}</span>
                            </span>
                            <span className="lh-rangee-compte">{n}</span>
                            <ArrowUpRight className="lh-rangee-fleche" aria-hidden="true" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="lh-section" aria-labelledby="lh-nouveau">
                <div className="lh-section-tete">
                  <h2 id="lh-nouveau" className="lh-section-titre">
                    Nouveau chantier
                  </h2>
                  <div className="lh-section-boutons">
                    <button type="button" className="lh-rond lh-rond--plein" aria-label="Nouveau chantier" title="Nouveau chantier" onClick={ouvrirNouveau}>
                      <Plus aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <p className="lh-aide">Le chantier naît en préparation : son nom, son adresse, son maître d&apos;ouvrage. Vous posez ensuite ses lots et son marché, puis vous l&apos;ouvrez.</p>
                <ul className="lh-rangees">
                  <li>
                    <button type="button" className="lh-rangee" onClick={ouvrirNouveau}>
                      <span className="lh-rangee-icone">
                        <Plus aria-hidden="true" />
                      </span>
                      <span className="lh-rangee-texte">
                        <span className="lh-rangee-nom">Créer un chantier</span>
                        <span className="lh-rangee-meta">nom, code postal et commune suffisent</span>
                      </span>
                    </button>
                  </li>
                </ul>
              </section>
            </div>

            <aside className="lh-droite" aria-label="Aller à">
              <div className="lh-droite-bloc">
                <section className="lh-droite-section">
                  <h2 className="lh-droite-titre">Aller à</h2>
                  {listeLiens()}
                </section>
              </div>
            </aside>
          </>
        )}
      </div>

      <Dialog open={nouveau} onOpenChange={(o) => !o && setNouveau(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <HardHat width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Nouveau chantier</DialogTitle>
            <DialogDescription>Le chantier naît en préparation. Le département, le territoire et le régime de TVA se déduisent du code postal ; une entité « site » lui est ouverte.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">
                Nom <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} placeholder="Résidence Les Tilleuls" />
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">
                  Référence interne
                  <input className="rv-champ" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} placeholder="TIL-2026" />
                </label>
                <label className="rv-libelle">
                  Code postal <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" inputMode="numeric" value={f.code_postal} onChange={(e) => setF({ ...f, code_postal: e.target.value.replace(/\D/g, "").slice(0, 5) })} placeholder="69100" />
                </label>
              </div>
              <label className="rv-libelle">
                Commune <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={f.commune} onChange={(e) => setF({ ...f, commune: e.target.value })} placeholder="Villeurbanne" />
              </label>
              <label className="rv-libelle">
                Adresse
                <input className="rv-champ" value={f.adresse} onChange={(e) => setF({ ...f, adresse: e.target.value })} placeholder="14 rue des Tilleuls" />
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">
                  Maître d&apos;ouvrage
                  <select className="rv-champ" value={f.maitre_ouvrage_type} onChange={(e) => setF({ ...f, maitre_ouvrage_type: e.target.value })}>
                    {MO_TYPES.map((o) => (
                      <option key={o.cle} value={o.cle}>
                        {o.libelle}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="rv-libelle">
                  Notre place
                  <select className="rv-champ" value={f.place_client} onChange={(e) => setF({ ...f, place_client: e.target.value })}>
                    {PLACES.map((o) => (
                      <option key={o.cle} value={o.cle}>
                        {o.libelle}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="rv-libelle">
                Qui signe (annuaire, rôle maître d&apos;ouvrage)
                <select className="rv-champ" value={f.maitre_ouvrage_id} onChange={(e) => setF({ ...f, maitre_ouvrage_id: e.target.value })}>
                  <option value="">À désigner plus tard (le chantier ne pourra pas s&apos;ouvrir sans lui)</option>
                  {maitresOuvrage.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nom}
                    </option>
                  ))}
                </select>
              </label>
              {erreurNouveau ? (
                <Avis teinte="rouge" role="alert">
                  {erreurNouveau}
                </Avis>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!complet || envoi} onClick={lancerCreation}>
              {envoi ? <Loader variant="spin" /> : null} Créer le chantier
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
