"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › fiche d'un chantier : l'onglet Argent, sur le tableau de bord
   de CASHD (05/11/2026, choix de Teo entre la boîte et le tableau de bord
   de ses modules ; gabarit components/espace2/cashd/Debiteurs.tsx, vue
   « Aperçu », classes lin-projet-, lin-maj-, lin-cartes-droite de
   ../lin/lin.css).

   À gauche : la tuile, « Argent », la phrase (vendu, facturé, reste), les
   propriétés en pastilles (marché, avenants à signer, situations,
   factures), la carte « À faire » (ce qui attend un geste), l'avancement
   facturé par lot en barres, puis les avenants, les situations et les
   factures en listes, et la feuille des heures. À droite : le détail de
   l'élément choisi (posé par les cartes du chantier), Propriétés,
   Parcours des avenants et la courbe Vendu / Facturé.

   Aucun geste n'est réécrit : les cartes du chantier (ChantierVue) sont
   montées cachées ; leurs détails se posent à droite (Detail → cible) et
   leurs boutons sont déclenchés par leur libellé ; leurs fenêtres
   s'ouvrent en surcouche.
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import { ArrowRight, CheckCheck, FileText, Receipt, Signature } from "lucide-react";
import ChantierVue, { type FormChantier } from "@/components/espace/daliro/ChantierVue";
import type { Avenant, Situation, Tableau } from "@/components/espace/daliro/types";
import type { Source } from "@/components/espace/source";
import { STATUTS_AVENANT } from "@/components/espace/daliro/etats";
import { dateCourte, montant } from "@/components/espace/format";
import Habille from "@/components/espace2/Habille";
import { CarteDroite, GraphiqueProgres, MenuOptions, type Option } from "../lin/Lin";
import { useToast } from "../Toasts";
import { lignesLots } from "./ApercuChantier";
import { DalIcone } from "./DalIcone";

const RACINE_DAL = "/espace2/daliro";
const SITUATION: Record<Situation["statut"], { libelle: string; teinte: string }> = {
  brouillon: { libelle: "En préparation", teinte: "gris" },
  soumise: { libelle: "Envoyée", teinte: "bleu" },
  validee: { libelle: "Validée", teinte: "vert" },
  refusee: { libelle: "Refusée", teinte: "rouge" },
  annulee: { libelle: "Annulée", teinte: "gris" },
};
const TEINTE: Record<string, string> = { vert: "var(--lin-graph-vert, #4cb782)", bleu: "var(--lin-graph-bleu, #5e6ad2)", rouge: "#eb5757", gris: "var(--lin-second)", ambre: "#f2c94c", jaune: "#f2c94c" };

function Losange({ atteint }: { atteint: boolean }) {
  return (
    <svg className="lin-losange" data-atteint={atteint ? "" : undefined} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.8 12.9 8 8 14.2 3.1 8z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeOpacity={atteint ? 0.4 : 1} />
    </svg>
  );
}

function Etat({ teinte, children }: { teinte: string; children: string }) {
  return (
    <span className="dal-ag-etat" style={{ color: TEINTE[teinte] ?? TEINTE.gris }}>
      <span className="dal-ag-point" aria-hidden="true" />
      {children}
    </span>
  );
}

type Props = {
  t: Tableau;

  source: Source;
  onLocal: Parameters<typeof ChantierVue>[0]["onLocal"];
  relire: () => Promise<void>;
  geste: (f: FormChantier) => void;
  cible: Dispatch<SetStateAction<HTMLElement | null>>;
  choisie: string | null;
  choisir: (cle: string | null) => void;
};

export function ArgentChantier({ t, source, onLocal, relire, geste, cible, choisie, choisir }: Props) {
  const toast = useToast();
  const cache = useRef<HTMLDivElement>(null);
  const prix = t.voit_prix;
  const marche = t.marches[0] ?? null;
  const avenants = useMemo(() => t.avenants.slice().sort((a, b) => b.numero - a.numero), [t.avenants]);
  const situations = useMemo(() => (t.situations ?? []).slice().sort((a, b) => b.numero - a.numero), [t.situations]);
  const factures = useMemo(() => t.factures.filter((f) => f.statut === "rattachee").sort((a, b) => (b.date_emission ?? "").localeCompare(a.date_emission ?? "")), [t.factures]);
  const lots = useMemo(() => lignesLots(t).sort((a, b) => a.lot.rang - b.lot.rang), [t]);

  const somme = (xs: (number | null | undefined)[]) => xs.reduce<number>((s, x) => s + (x ?? 0), 0);
  const signes = avenants.filter((a) => a.statut === "signe");
  const aSigner = avenants.filter((a) => a.statut === "soumis");
  const aChiffrer = avenants.filter((a) => a.statut === "brouillon");
  const venduMarche = marche?.total_ht_lignes ?? 0;
  const vendu = venduMarche + somme(signes.map((a) => a.montant_ht));
  const validees = situations.filter((s) => s.statut === "validee");
  const facture = validees.length ? Math.max(...validees.map((s) => s.cumul_ht)) : 0;
  const reste = vendu - facture;
  const ouvertes = situations.filter((s) => s.statut === "brouillon" || s.statut === "soumise");
  const lignesARevoir = marche ? marche.lignes.filter((l) => l.controle !== "ok" && !l.ecart_accepte) : [];
  const avenantPossible = t.chantier.statut === "ouvert" || t.chantier.statut === "suspendu";

  /* les boutons des cartes montées cachées, déclenchés par leur libellé */
  const declencher = (libelle: string) => {
    const b = [...(cache.current?.querySelectorAll("button") ?? [])].find((x) => (x.textContent ?? "").trim().startsWith(libelle));
    if (!b || b.disabled) return toast(`« ${libelle} » n'est pas possible pour l'instant.`);
    b.click();
  };

  const resume = !marche
    ? `Pas encore de marché : les avenants et les situations se chiffrent une fois le marché signé saisi puis vérifié.${avenants.length ? ` ${avenants.length} avenant${avenants.length > 1 ? "s" : ""} déjà ouvert${avenants.length > 1 ? "s" : ""}.` : ""}`
    : prix
      ? `${montant(vendu)} HT vendus${signes.length ? `, dont ${montant(somme(signes.map((a) => a.montant_ht)))} d'avenants signés` : ""} : ${montant(facture)} facturés, reste ${montant(reste)} à facturer.`
      : `Marché ${marche.statut === "verifie" ? "vérifié" : "à vérifier"}, ${avenants.length} avenant${avenants.length > 1 ? "s" : ""}, ${validees.length} situation${validees.length > 1 ? "s" : ""} validée${validees.length > 1 ? "s" : ""}.`;

  /* ce qui attend un geste, pour la carte « À faire » */
  const aFaire: { cle: string; qui: string; quoi: string; ouvrir: () => void }[] = [
    ...aSigner.map((a) => ({ cle: `avenant:${a.id}`, qui: `Avenant n° ${a.numero}`, quoi: `À signer${prix && a.montant_ht !== null ? ` · ${montant(a.montant_ht)}` : ""}`, ouvrir: () => choisir(`avenant:${a.id}`) })),
    ...aChiffrer.map((a) => ({ cle: `avenant:${a.id}`, qui: `Avenant n° ${a.numero}`, quoi: `À chiffrer · ${a.objet}`, ouvrir: () => choisir(`avenant:${a.id}`) })),
    ...ouvertes.map((s) => ({ cle: `situation:${s.id}`, qui: `Situation n° ${s.numero}`, quoi: `${SITUATION[s.statut].libelle}${prix ? ` · ${montant(s.net_a_payer)}` : ""}`, ouvrir: () => choisir(`situation:${s.id}`) })),
    ...lignesARevoir.slice(0, 3).map((l) => ({ cle: `ligne:${l.id}`, qui: `Ligne ${l.numero ?? l.ordre} du marché`, quoi: `À revoir · ${l.designation}`, ouvrir: () => choisir(`ligne:${l.id}`) })),
  ];

  const optionsAvenants = (liste: Avenant[]): Option[] =>
    liste.map((a) => ({ cle: a.id, libelle: `n° ${a.numero} · ${a.objet}`, meta: prix && a.montant_ht !== null ? montant(a.montant_ht) : STATUTS_AVENANT[a.statut].libelle, icone: <Losange atteint={a.statut === "signe"} />, action: () => choisir(`avenant:${a.id}`) }));

  /* la courbe : le vendu, et le facturé cumulé situation après situation */
  const chrono = situations.filter((s) => s.statut === "validee" || s.statut === "soumise").sort((a, b) => a.numero - b.numero);
  const etiquettes = ["Début", ...chrono.map((s) => `n° ${s.numero}`)];
  const parcours = [
    { cle: "brouillon", libelle: "À chiffrer", n: aChiffrer.length },
    { cle: "soumis", libelle: "Soumis au client", n: aSigner.length },
    { cle: "signe", libelle: "Signés", n: signes.length },
    { cle: "refuse", libelle: "Refusés ou abandonnés", n: avenants.filter((a) => a.statut === "refuse" || a.statut === "abandonne").length },
  ];

  const ligne = (cle: string, icone: React.ReactNode, titre: string, etat: React.ReactNode, meta: string | null) => (
    <li key={cle}>
      <button type="button" className="lin-projet-lien dal-ag-lien" data-actif={choisie === cle ? "" : undefined} aria-pressed={choisie === cle} onClick={() => choisir(choisie === cle ? null : cle)}>
        {icone}
        <span className="dal-ag-lien-titre">{titre}</span>
        {etat}
        {meta ? <span className="lin-meta">{meta}</span> : null}
      </button>
    </li>
  );

  return (
    <div className="lin-projet dal-ag">
      <article className="lin-projet-texte">
        <span className="lin-tuile" style={{ background: "color-mix(in srgb, #4cb782 18%, transparent)", color: "#4cb782" }}>
          <DalIcone nom="Euro" taille={20} />
        </span>
        <h2 className="lin-projet-h1">Argent</h2>
        <p className="lin-projet-resume">{resume}</p>

        <div className="lin-projet-ligne">
          <span className="lin-projet-etiquette">Propriétés</span>
          <MenuOptions
            titre="Marché…"
            teinte={marche?.statut === "verifie" ? "vert" : marche ? "jaune" : undefined}
            declencheur={
              <>
                <FileText width={14} height={14} aria-hidden="true" />
                {marche ? (marche.statut === "verifie" ? "Marché vérifié" : `Marché à vérifier${lignesARevoir.length ? ` · ${lignesARevoir.length} ligne${lignesARevoir.length > 1 ? "s" : ""}` : ""}`) : "Pas de marché"}
              </>
            }
            options={marche ? [{ cle: "verifier", libelle: marche.statut === "verifie" ? "Rouvrir le marché" : "Vérifier le marché", icone: <CheckCheck width={14} height={14} />, action: () => declencher(marche.statut === "verifie" ? "Rouvrir" : "Vérifier le marché") }, { cle: "ligne", libelle: "Ajouter une ligne", icone: <FileText width={14} height={14} />, action: () => declencher("Ajouter une ligne") }] : [{ cle: "saisir", libelle: "Saisir le marché", icone: <FileText width={14} height={14} />, action: () => declencher("Saisir le marché") }]}
          />
          <MenuOptions
            titre="Avenants…"
            teinte={aSigner.length ? "jaune" : undefined}
            declencheur={
              <>
                <Losange atteint={!aSigner.length} />
                {aSigner.length ? `${aSigner.length} à signer` : `${avenants.length} avenant${avenants.length > 1 ? "s" : ""}`}
              </>
            }
            options={[...optionsAvenants(avenants), ...(avenantPossible ? [{ cle: "nouveau", libelle: "Ouvrir un avenant", icone: <Signature width={14} height={14} />, action: () => geste({ type: "avenant" }) }] : [])]}
            largeur={340}
          />
          <MenuOptions
            titre="Situations…"
            teinte={ouvertes.length ? "bleu" : undefined}
            declencheur={
              <>
                <DalIcone nom="Calendar" taille={14} />
                {situations[0] ? `Situation n° ${situations[0].numero} au ${dateCourte(situations[0].periode_fin)}` : "Aucune situation"}
              </>
            }
            options={[...situations.map((s): Option => ({ cle: s.id, libelle: `Situation n° ${s.numero}`, meta: SITUATION[s.statut].libelle, icone: <DalIcone nom="Calendar" taille={14} />, action: () => choisir(`situation:${s.id}`) })), { cle: "nouvelle", libelle: "Nouvelle situation", icone: <FileText width={14} height={14} />, action: () => declencher("Nouvelle situation") }]}
            largeur={300}
          />
        </div>
        <div className="lin-projet-ligne">
          <span className="lin-projet-etiquette">Factures</span>
          <MenuOptions
            titre="Factures fournisseurs…"
            declencheur={
              <>
                <Receipt width={14} height={14} aria-hidden="true" />
                {factures.length ? `${factures.length} facture${factures.length > 1 ? "s" : ""} rattachée${factures.length > 1 ? "s" : ""}` : "Aucune facture rattachée"}
              </>
            }
            options={[...factures.map((f): Option => ({ cle: f.id, libelle: f.fournisseur_nom ?? "Fournisseur inconnu", meta: prix ? montant(f.montant_ht) : dateCourte(f.date_emission), icone: <Receipt width={14} height={14} />, action: () => choisir(`facture:${f.id}`) })), { cle: "rattacher", libelle: "Rattacher une facture", icone: <Receipt width={14} height={14} />, action: () => geste({ type: "facture" }) }]}
            largeur={320}
          />
        </div>

        <details className="lin-maj" open aria-label="À faire sur ce chantier">
          <summary className="lin-maj-tete">
            <span className="lin-maj-titre">
              À faire sur ce chantier
              <svg className="lin-maj-fleche" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M5.2 6.4h5.6L8 9.6z" fill="currentColor" />
              </svg>
            </span>
            <Link href={`${RACINE_DAL}/avenants`} className="lin-maj-lien">
              <ArrowRight width={14} height={14} aria-hidden="true" /> Avenants et situations
            </Link>
          </summary>
          <p className="lin-maj-auteur">
            <span data-teinte={aFaire.length ? "jaune" : "vert"}>{aFaire.length ? `${aFaire.length} élément${aFaire.length > 1 ? "s" : ""} en attente` : "Rien en attente"}</span>
            <span className="lin-avatar-auteur" aria-hidden="true">
              <DalIcone nom="Crane" taille={11} />
            </span>
            <span className="lin-maj-gris">DALIRO</span>
            <span className="lin-maj-gris">aujourd&apos;hui</span>
          </p>
          <p className="lin-maj-texte">Un travail en plus devient un avenant à chiffrer puis à faire signer ; chaque mois, la situation facture l&apos;avancement des lots.</p>
          {aFaire.length ? (
            <dl className="lin-maj-citation dal-ag-citation">
              {aFaire.slice(0, 6).map((x) => (
                <div key={x.cle}>
                  <dt>
                    <button type="button" onClick={x.ouvrir}>
                      {x.qui}
                    </button>
                  </dt>
                  <dd>{x.quoi}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <footer className="lin-maj-pied">
            <button type="button" className="lin-maj-pied-btn" aria-label="Ouvrir un avenant" title={avenantPossible ? "Ouvrir un avenant" : "Un avenant se prépare sur un chantier ouvert"} disabled={!avenantPossible} onClick={() => geste({ type: "avenant" })}>
              <Signature width={16} height={16} aria-hidden="true" />
            </button>
            <button type="button" className="lin-maj-pied-rond" aria-label="Nouvelle situation" title="Nouvelle situation" onClick={() => declencher("Nouvelle situation")}>
              <FileText width={16} height={16} aria-hidden="true" />
            </button>
          </footer>
        </details>

        <h3 className="lin-projet-h2">Avancement facturé par lot</h3>
        <ul className="lin-projet-liste">
          {lots.map((x) => (
            <li key={x.lot.id}>
              <span className="lin-tranche-nom" title={`${x.lot.code} ${x.lot.libelle}`}>
                {x.lot.code} {x.lot.libelle}
              </span>
              <span className="lin-tranche-barre" aria-hidden="true">
                <span style={{ width: `${x.pct ?? 0}%` }} />
              </span>
              <span className="lin-meta">{x.pct === null ? "—" : `${x.pct} %`}</span>
            </li>
          ))}
        </ul>

        <h3 className="lin-projet-h2">Avenants</h3>
        {avenants.length ? (
          <ul className="lin-projet-liste">
            {avenants.map((a) => ligne(`avenant:${a.id}`, <Signature width={14} height={14} aria-hidden="true" className="dal-ag-icone" />, `n° ${a.numero} · ${a.objet}`, <Etat teinte={STATUTS_AVENANT[a.statut].teinte}>{STATUTS_AVENANT[a.statut].libelle}</Etat>, prix ? montant(a.montant_ht) : null))}
          </ul>
        ) : (
          <p className="lin-maj-texte lin-maj-gris">Aucun avenant : un travail en plus, demandé sur le chantier, devient ici un avenant.</p>
        )}

        <h3 className="lin-projet-h2">Situations de travaux</h3>
        {situations.length ? (
          <ul className="lin-projet-liste">
            {situations.map((s) => ligne(`situation:${s.id}`, <DalIcone nom="Calendar" taille={14} className="dal-ag-icone" />, `Situation n° ${s.numero} au ${dateCourte(s.periode_fin)}`, <Etat teinte={SITUATION[s.statut].teinte}>{SITUATION[s.statut].libelle}</Etat>, prix ? montant(s.net_a_payer) : null))}
          </ul>
        ) : (
          <p className="lin-maj-texte lin-maj-gris">Aucune situation : la première se prépare depuis le marché vérifié.</p>
        )}

        <h3 className="lin-projet-h2">Factures fournisseurs</h3>
        {factures.length ? (
          <ul className="lin-projet-liste">
            {factures.map((f) => ligne(`facture:${f.id}`, <Receipt width={14} height={14} aria-hidden="true" className="dal-ag-icone" />, `${f.fournisseur_nom ?? "Fournisseur inconnu"}${f.lot_code ? ` · lot ${f.lot_code}` : ""}`, <span className="lin-meta">{f.facture_numero ? `n° ${f.facture_numero}` : ""}</span>, prix ? montant(f.montant_ht) : dateCourte(f.date_emission)))}
          </ul>
        ) : (
          <p className="lin-maj-texte lin-maj-gris">Aucune facture fournisseur rattachée à ce chantier.</p>
        )}

        <div className="dal-ag-heures lit-gestes">
          <Habille>
            <ChantierVue key={`heures-${source}-${t.chantier.id}`} tableau={t} source={source} onLocal={onLocal} relire={relire} sections={["heures"]} />
          </Habille>
        </div>
      </article>

      <aside className="lin-cartes-droite dal-ag-droite" aria-label="Les chiffres et l'élément choisi">
        <div ref={cible} className="lvp-cible dal-ag-cible" />
        <CarteDroite titre="Propriétés">
          <dl className="lin-props">
            <div>
              <dt>Marché</dt>
              <dd>{marche ? (prix ? montant(venduMarche) : marche.statut === "verifie" ? "Vérifié" : "À vérifier") : "Aucun"}</dd>
            </div>
            <div>
              <dt>Avenants signés</dt>
              <dd>
                {signes.length}
                {prix && signes.length ? ` · ${montant(somme(signes.map((a) => a.montant_ht)))}` : ""}
              </dd>
            </div>
            <div>
              <dt>Facturé</dt>
              <dd>{prix ? montant(facture) : `${validees.length} situation${validees.length > 1 ? "s" : ""}`}</dd>
            </div>
            {prix && marche ? (
              <div>
                <dt>Reste à facturer</dt>
                <dd data-teinte={reste < 0 ? "rouge" : undefined}>{montant(reste)}</dd>
              </div>
            ) : null}
            <div>
              <dt>Factures reçues</dt>
              <dd>
                {factures.length}
                {prix && factures.length ? ` · ${montant(somme(factures.map((f) => f.montant_ht)))}` : ""}
              </dd>
            </div>
          </dl>
        </CarteDroite>

        <CarteDroite titre="Parcours des avenants">
          <ul className="lin-jalons">
            {parcours.map((p) => (
              <li key={p.cle}>
                <Losange atteint={p.n === 0} />
                <span className="lin-jalon-nom">{p.libelle}</span>
                <span className="lin-meta">
                  {p.n} avenant{p.n > 1 ? "s" : ""}
                </span>
              </li>
            ))}
          </ul>
        </CarteDroite>

        {prix && marche ? (
          <CarteDroite titre="Facturation">
            <dl className="lin-kpis lin-kpis--trois">
              <div data-teinte="gris">
                <dt>
                  <span className="lin-carre" style={{ background: "var(--lin-graph-gris)" }} />
                  Vendu
                </dt>
                <dd>{montant(vendu)}</dd>
              </div>
              <div data-teinte="bleu">
                <dt>
                  <span className="lin-carre" style={{ background: "var(--lin-graph-bleu)" }} />
                  Facturé
                </dt>
                <dd>{montant(facture)}</dd>
              </div>
              <div data-teinte="jaune">
                <dt>
                  <span className="lin-carre" style={{ background: "var(--lin-graph-jaune)" }} />
                  Reste
                </dt>
                <dd>{montant(reste)}</dd>
              </div>
            </dl>
            <GraphiqueProgres
              libelle={`Vendu ${montant(vendu)}, facturé ${montant(facture)} au fil des situations`}
              etiquettes={etiquettes.length > 1 ? etiquettes : ["Début", "Aujourd'hui"]}
              series={[
                { cle: "vendu", teinte: "gris", valeurs: (etiquettes.length > 1 ? etiquettes : [0, 0]).map(() => vendu) },
                { cle: "facture", teinte: "bleu", aire: true, valeurs: etiquettes.length > 1 ? [0, ...chrono.map((s) => s.cumul_ht)] : [0, facture] },
              ]}
            />
          </CarteDroite>
        ) : null}
      </aside>

      {/* les cartes du chantier, cachées : leurs détails se posent à droite, leurs boutons sont déclenchés ici */}
      <div ref={cache} hidden>
        <Habille>
          <ChantierVue key={`argent-${source}-${t.chantier.id}`} tableau={t} source={source} onLocal={onLocal} relire={relire} sections={["avenants", "situations", "factures", "lots", "marche"]} />
        </Habille>
      </div>
    </div>
  );
}
