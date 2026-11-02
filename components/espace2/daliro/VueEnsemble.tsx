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
   Les données : components/espace2/daliro/donnees (exemple ou base réelle).

   01/11/2026 — copie 1:1 (règles de Teo, docs/refonte-metiers/REGLES.md) :
   le cadre et les mesures sont ceux de linear-home.md, styles ./dal.css et
   ./dal-home.css (préfixes dal-, dal-h-), icônes du sprite de Linear
   (./DalIcone). Les chantiers en cours sont les rangées de « Team
   resources » (les plus pressés d'abord) ; les quatre familles (B03) sont
   les premiers liens « Aller à » de la colonne droite, avec leur compte ;
   « Nouveau chantier » (F01) est le « + » de la section et une entrée du
   menu « … » ; le point du mois (B06) est le deuxième onglet.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { HardHat } from "lucide-react";
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
import { jourLocal, resume, type TeinteClair } from "./enClair";
import { DalCarte, DalMenu } from "./DalCadre";
import { EtoilePleine } from "./IconesProjet";
import { useFavoris } from "./navigateur";
import MeteoSemaine from "./MeteoSemaine";
import { DalIcone, type NomDalIcone } from "./DalIcone";
import "./dal-home.css";

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

const FAMILLE_CLAIRE: Record<Famille, string> = { bloque: "Bloqués", a_signer: "Avenant à faire signer", a_confirmer: "Intervenant à relancer", ouvert: "En cours" };
const URGENCE: Record<TeinteClair, number> = { rouge: 0, ambre: 1, bleu: 2, gris: 3, vert: 4 };
const ICONES: Record<Famille, NomDalIcone> = { bloque: "Alert", a_signer: "Signature", a_confirmer: "Calendar", ouvert: "Crane" };

export default function VueEnsemble() {
  const { source, pret, erreur, client, liste, tableau, premier, demander, demanderTous, maitresOuvrage, creer } = useDaliro();
  const auj = useMemo(() => jourLocal(), []);
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
    if (source !== "reelle" || !pret) return;
    const cle = liste.map((c) => c.id).join(",");
    if (demandes.current === cle) return;
    demandes.current = cle;
    demanderTous();
  }, [source, pret, liste, demanderTous]);

  /* B03 : les familles, exclusives (un chantier compte dans la première qui le concerne) */
  const comptes = useMemo(() => {
    const c: Record<Famille, number> = { bloque: 0, a_signer: 0, a_confirmer: 0, ouvert: 0 };
    for (const ch of liste) {
      const f = famille(ch);
      if (f) c[f]++;
    }
    return c;
  }, [liste]);
  /* les chantiers, les plus pressés d'abord, chacun avec sa phrase */
  const chantiers = useMemo(
    () =>
      liste
        .filter((c) => c.statut !== "clos" && c.statut !== "annule")
        .map((c) => ({ c, r: resume(c, tableau(c.id), auj) }))
        .sort((a, b) => URGENCE[a.r.teinte] - URGENCE[b.r.teinte] || a.c.nom.localeCompare(b.c.nom, "fr")),
    [liste, tableau, auj],
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
  /* l'avatar de « Membres » : vous (le compte ne porte pas de nom lisible ici) */
  const initiales = "VO";
  const voitPrix = premier ? premier.voit_prix : true;
  const pointVisible = voitPrix && (source === "exemple" || !!client);

  const aller: { cle: string; libelle: string; icone: NomDalIcone; href: string; compte?: number }[] = [
    ...FAMILLES.map((fa) => ({ cle: fa.cle, libelle: FAMILLE_CLAIRE[fa.cle], icone: ICONES[fa.cle], href: `${BASE}/chantiers?famille=${fa.cle}`, compte: comptes[fa.cle] })),
    { cle: "a-ranger", libelle: "À ranger", icone: "Triage" as const, href: `${BASE}/a-ranger` },
    { cle: "a-faire", libelle: "À faire", icone: "Issues" as const, href: `${BASE}/a-faire` },
    { cle: "reglages", libelle: "Réglages", icone: "Roue" as const, href: `${BASE}/reglages` },
  ];
  /* les épinglés (étoile des pages et des fiches, ./navigateur) : en tête, comme une section de ressources */
  const favoris = useFavoris();
  const titreVue = vue === "point" ? "Point du mois" : "Vue d'ensemble";
  const vueEpinglee = favoris.estEpingle("vue", `daliro-${vue}`);
  const epingles = favoris.favoris.filter((x) => !(x.type === "vue" && x.id === `daliro-${vue}`));
  const ICONE_EPINGLE: Record<string, NomDalIcone> = { btp_chantiers: "Project", btp_avenants: "Signature", btp_situations: "Spreadsheet", vue: "CustomView", btp_messages: "Chat", btp_tiers: "Users" };
  const pilules = (avecChevron: boolean) =>
    aller.map((a) => (
      <Link key={a.cle} href={a.href} className="dal-h-pilule">
        <span className="dal-h-pilule-icone">
          <DalIcone nom={a.icone} />
        </span>
        <span>{a.libelle}</span>
        {a.compte !== undefined ? <span className="dal-h-pilule-compte">{a.compte}</span> : null}
        {avecChevron ? <DalIcone nom="Chevron" className="dal-h-chevron" /> : null}
      </Link>
    ));

  return (
    <DalCarte>
      <h1 className="v2-sr">Chantiers</h1>
      <header className="dal-tete">
        <div className="dal-ligne1">
          <Link href={BASE} className="dal-fil" aria-current="page">
            <DalIcone nom="Crane" style={{ color: "var(--dal-equipe)" }} />
            <span>Chantiers</span>
          </Link>
          {/* étoile « Add to favorites » → Épingler la vue ouverte : elle rejoint « Épinglés » */}
          <button
            type="button"
            className="dal-rond"
            role="switch"
            aria-checked={vueEpinglee}
            aria-label={vueEpinglee ? `Désépingler « ${titreVue} »` : `Épingler « ${titreVue} »`}
            title={vueEpinglee ? `Désépingler « ${titreVue} »` : `Épingler « ${titreVue} » dans les épinglés`}
            onClick={() => favoris.basculer({ type: "vue", id: `daliro-${vue}`, titre: titreVue, href: vue === "point" ? `${BASE}?vue=point` : BASE })}
          >
            {vueEpinglee ? <EtoilePleine /> : <DalIcone nom="Etoile" taille={14} />}
          </button>
          <DalMenu
            libelle="Actions sur les chantiers"
            options={[
              { libelle: "Nouveau chantier", icone: "Plus", action: ouvrirNouveau },
              { libelle: "Réglages", icone: "Roue", href: `${BASE}/reglages` },
            ]}
          />
          <span className="dal-pousse" />
          <button type="button" className="dal-rond" aria-label="Copier le lien de la page" title="Copier le lien de la page" onClick={copierLien}>
            <DalIcone nom="LienUrl" />
          </button>
        </div>
        <nav className="dal-ligne2" aria-label="Vues">
          <Link href={BASE} scroll={false} className="dal-onglet" aria-current={vue === "ensemble" ? "page" : undefined}>
            Vue d&apos;ensemble
          </Link>
          <Link href={`${BASE}?vue=point`} scroll={false} className="dal-onglet" aria-current={vue === "point" ? "page" : undefined}>
            Point du mois
          </Link>
          <Link href={`${BASE}/equipes`} className="dal-onglet">
            Équipes
          </Link>
          <Link href={`${BASE}/annuaire`} className="dal-onglet">
            Annuaire
          </Link>
        </nav>
      </header>

      <div className="dal-defile">
        {vue === "point" ? (
          <div className="dal-h-corps">
            <div className="dal-h-principal">
              <section className="dal-h-section" aria-labelledby="dal-h-point">
                <div className="dal-h-section-tete">
                  <h2 id="dal-h-point" className="dal-h-section-titre">
                    Point du mois
                  </h2>
                </div>
                <p className="dal-h-aide">Les travaux repérés sur le terrain, ceux qui sont signés, ce qui reste à relancer et à facturer, chantier par chantier.</p>
                {!pret ? (
                  <p className="dal-h-aide">Lecture des chantiers…</p>
                ) : pointVisible ? (
                  <div style={{ marginTop: 16 }}>
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
                  <p className="dal-h-aide">Le point du mois montre des montants : il est réservé aux comptes qui voient les prix.</p>
                )}
              </section>
            </div>
          </div>
        ) : (
          <div className="dal-h-corps">
            <div className="dal-h-principal">
              <div className="dal-h-titre">
                <span className="dal-h-tuile" aria-hidden="true">
                  <DalIcone nom="Crane" taille={24} />
                </span>
                <p className="dal-h-nom">Chantiers</p>
              </div>
              <div className="dal-h-description">
                <p>Les chantiers de l&apos;entreprise : le planning, les passages à confirmer, les avenants à signer et les situations de fin de mois.</p>
              </div>
              <nav className="dal-h-replis" aria-label="Aller à">
                {pilules(false)}
              </nav>

              {epingles.length ? (
                <section className="dal-h-section" aria-labelledby="dal-h-epingles">
                  <div className="dal-h-section-tete">
                    <h2 id="dal-h-epingles" className="dal-h-section-titre">
                      Épinglés
                    </h2>
                  </div>
                  <ul className="dal-h-liste">
                    {epingles.map((x) => (
                      <li key={`${x.type}:${x.id}`}>
                        <Link href={x.href} className="dal-h-rangee" title="Retirez-le avec l'étoile de sa page">
                          <DalIcone nom={ICONE_EPINGLE[x.type] ?? "Page"} />
                          <span className="dal-h-rangee-texte">{x.titre}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              <section className="dal-h-section" aria-labelledby="dal-h-chantiers">
                <div className="dal-h-section-tete">
                  <h2 id="dal-h-chantiers" className="dal-h-section-titre">
                    Vos chantiers
                  </h2>
                  <button type="button" className="dal-rond" aria-label="Nouveau chantier" title="Nouveau chantier" onClick={ouvrirNouveau}>
                    <DalIcone nom="Plus" />
                  </button>
                  <Link href={`${BASE}/chantiers`} className="dal-rond" aria-label="Voir tous les chantiers" title="Voir tous les chantiers">
                    <DalIcone nom="Section" />
                  </Link>
                </div>
                {erreur ? (
                  <p className="dal-h-aide" role="alert">
                    La base réelle n&apos;a pas répondu. {erreur}
                  </p>
                ) : !pret ? (
                  <p className="dal-h-aide">Lecture des chantiers…</p>
                ) : chantiers.length === 0 ? (
                  <p className="dal-h-aide">Aucun chantier en cours. Créez le premier : nom, code postal et commune suffisent.</p>
                ) : (
                  <ul className="dal-h-liste">
                    {chantiers.map(({ c }) => (
                      <li key={c.id}>
                        <Link href={`${BASE}/chantiers/${encodeURIComponent(c.id)}`} className="dal-h-rangee">
                          <DalIcone nom="Page" />
                          <span className="dal-h-rangee-texte">{c.nom}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <MeteoSemaine />
            </div>

            <aside className="dal-h-droite" aria-label="Équipe et raccourcis">
              <div className="dal-h-droite-bloc">
                <section className="dal-h-droite-section">
                  <h2 className="dal-h-libelle">Membres</h2>
                  <div className="dal-h-membres">
                    <Link href={`${BASE}/equipes`} className="dal-h-membre" title="Vos équipes">
                      <span className="dal-h-avatar">{initiales}</span>
                      <DalIcone nom="Chevron" taille={12} />
                    </Link>
                    <Link href={`${BASE}/annuaire`} className="dal-rond" aria-label="Ajouter un intervenant" title="Ajouter un intervenant">
                      <DalIcone nom="Plus" />
                    </Link>
                  </div>
                </section>
                <section className="dal-h-droite-section">
                  <h2 className="dal-h-libelle">Aller à</h2>
                  <nav className="dal-h-aller" aria-label="Aller à">
                    {pilules(true)}
                  </nav>
                </section>
              </div>
            </aside>
          </div>
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
    </DalCarte>
  );
}
