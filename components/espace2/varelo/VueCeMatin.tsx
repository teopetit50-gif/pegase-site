"use client";

/* ══════════════════════════════════════════════════════════════════════
   VARELO — « Ce matin » (/espace2/varelo), 02/11/2026, refonte des pages
   métiers : la page « Home » d'une équipe de Linear (onglet Overview), au
   1:1. Relevé : docs/refonte-metiers/releves/linear-home.md ; styles
   ./var.css (carte, en-tête, menu) et ./var-home.css (corps).

   Ce qu'elle reprend de l'écran d'avant (inventaire docs/refonte-metiers/
   varelo.md) :
     · bloc 4 et ses sept sous-blocs (4.1-4.7) : chaque sous-bloc est une
       section de « Team resources » (titre 18/500, rangées de 40) ; ses
       lignes, 5 au plus, puis « … et N de plus » ; la gravité de la ligne
       prend l'icône de priorité de Linear (urgent, haute, basse) ; vide :
       la phrase d'aide grise de la référence ;
     · le compteur « N points à regarder… » est la description de l'équipe ;
     · bloc 22 (le renvoi vers la file de validation) suit la description ;
     · bloc 3 (Varelo pas installé, base réelle) : une phrase d'aide qui
       mène à « Sources et structure », où se trouve « Installer Varelo » ;
     · les liens des titres (ancres #vrl-*) mènent à la sous-page qui
       montre le sujet ; une ligne qui porte un objet (base réelle) passe
       par l'aiguillage ;
     · « Members » : la personne connectée ; « Go to » : les autres
       sous-pages et la file de validation, avec leur compte.
   Les chiffres du groupe (blocs 5 et 6) sont dans « Groupe » et « Finance ».
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useMemo } from "react";
import { BLOCS_MATIN, useCeMatin } from "@/components/espace/varelo/CeMatin";
import type { Ligne, Matin } from "@/components/espace/varelo/matin";
import { aiguiller } from "../aiguillage";
import { RACINE } from "../modules";
import { useToast } from "../Toasts";
import { useVarelo } from "./donnees";
import { VarCarte, VarMenu } from "./VarCadre";
import { VarIcone, type NomVarIcone } from "./VarIcone";
import "./var-home.css";

export const BASE = `${RACINE}/varelo`;

/* où se traite chaque sous-bloc du point */
const PAGE_DU_BLOC: Record<keyof Matin, string> = {
  decisions: `${RACINE}/validations`,
  groupe: `${BASE}/groupe`,
  reserves: `${BASE}/operations`,
  reportings: `${BASE}/operations`,
  contrats: `${BASE}/contrats`,
  encours: `${BASE}/finance`,
  reciproques: `${BASE}/finance`,
};
const ICONE_GRAVITE: Record<Ligne["gravite"], NomVarIcone> = { critique: "Priority1", attention: "Priority2", info: "Priority4" };
const LIBELLE_GRAVITE: Record<Ligne["gravite"], string> = { critique: "Critique", attention: "À regarder", info: "Pour information" };

type LigneReelle = Ligne & { objet_type?: string | null; objet_id?: string | null };

/* l'en-tête commun des sous-pages faites sur l'accueil d'équipe de Linear */
export function OngletsVarelo({ actif }: { actif: "matin" | "groupe" | "referentiel" | "finance" }) {
  const onglets: { cle: typeof actif; libelle: string; href: string }[] = [
    { cle: "matin", libelle: "Ce matin", href: BASE },
    { cle: "groupe", libelle: "Groupe", href: `${BASE}/groupe` },
    { cle: "referentiel", libelle: "Référentiel", href: `${BASE}/referentiel` },
    { cle: "finance", libelle: "Finance", href: `${BASE}/finance` },
  ];
  return (
    <nav className="var-ligne2" aria-label="Vues">
      {onglets.map((o) => (
        <Link key={o.cle} href={o.href} className="var-onglet" aria-current={o.cle === actif ? "page" : undefined}>
          {o.libelle}
        </Link>
      ))}
    </nav>
  );
}

export default function VueCeMatin() {
  const v = useVarelo();
  const toast = useToast();
  const { matin, erreur } = useCeMatin(v.source, v.client_id, !!v.reel?.installation, v.donnees?.codes ?? [], v.donnees?.objets ?? []);
  const nonInstalle = v.source === "reelle" && !!v.reel && !v.reel.installation;
  const total = matin ? Object.values(matin).reduce((s, l) => s + l.length, 0) : 0;
  const description = erreur ? "Le point du matin n'a pas pu être lu." : !matin ? (nonInstalle ? "Varelo n'est pas installé pour votre organisation." : "Lecture du point du matin…") : total ? `${total} point${total > 1 ? "s" : ""} à regarder, comme dans le point du matin des directions.` : "Rien à signaler ce matin.";

  const comptes = useMemo(() => {
    const m = matin;
    const n = (k: keyof Matin) => m?.[k].length ?? 0;
    return { decisions: n("decisions"), operations: n("reserves") + n("reportings"), contrats: n("contrats"), finance: n("encours") + n("reciproques"), groupe: n("groupe"), lots: v.lotsOuverts };
  }, [matin, v.lotsOuverts]);

  const aller: { cle: string; libelle: string; icone: NomVarIcone; href: string; compte?: number }[] = [
    { cle: "validations", libelle: "Décisions à valider", icone: "Triage", href: `${RACINE}/validations`, compte: comptes.decisions },
    { cle: "referentiel", libelle: "Référentiel", icone: "Users", href: `${BASE}/referentiel`, compte: comptes.lots },
    { cle: "finance", libelle: "Finance", icone: "Euro", href: `${BASE}/finance`, compte: comptes.finance },
    { cle: "contrats", libelle: "Contrats", icone: "Signature", href: `${BASE}/contrats`, compte: comptes.contrats },
    { cle: "operations", libelle: "Opérations", icone: "Box", href: `${BASE}/operations`, compte: comptes.operations },
    { cle: "groupe", libelle: "Groupe", icone: "Initiative", href: `${BASE}/groupe`, compte: comptes.groupe },
    { cle: "sources", libelle: "Sources et structure", icone: "Roue", href: `${BASE}/sources` },
  ];
  const pilules = (avecChevron: boolean) =>
    aller.map((a) => (
      <Link key={a.cle} href={a.href} className="var-h-pilule">
        <span className="var-h-pilule-icone">
          <VarIcone nom={a.icone} />
        </span>
        <span>{a.libelle}</span>
        {a.compte ? <span className="var-h-pilule-compte">{a.compte}</span> : null}
        {avecChevron ? <VarIcone nom="Chevron" className="var-h-chevron" /> : null}
      </Link>
    ));

  const copierLien = () => {
    void navigator.clipboard?.writeText(window.location.href).then(
      () => toast("Lien copié"),
      () => toast("Le lien n'a pas pu être copié.", "rouge"),
    );
  };
  const cible = (cle: keyof Matin, l: LigneReelle) => (l.objet_type && l.objet_id ? (aiguiller({ module: "varelo", objet_type: l.objet_type, objet_id: l.objet_id }) ?? PAGE_DU_BLOC[cle]) : PAGE_DU_BLOC[cle]);

  return (
    <VarCarte>
      <h1 className="v2-sr">Ce matin</h1>
      <header className="var-tete">
        <div className="var-ligne1">
          <Link href={BASE} className="var-fil" aria-current="page">
            <VarIcone nom="Factory" style={{ color: "var(--var-equipe)" }} />
            <span>Référentiel du groupe</span>
          </Link>
          <VarMenu
            libelle="Actions sur le groupe"
            options={[
              { libelle: "Sources et structure", icone: "Roue", href: `${BASE}/sources` },
              { libelle: "Ouvrir l'ancien écran", icone: "Archive", href: `${BASE}?ancien=1` },
            ]}
          />
          <span className="var-pousse" />
          <button type="button" className="var-rond" aria-label="Copier le lien de la page" title="Copier le lien de la page" onClick={copierLien}>
            <VarIcone nom="LienUrl" />
          </button>
        </div>
        <OngletsVarelo actif="matin" />
      </header>

      <div className="var-defile">
        <div className="var-h-corps">
          <div className="var-h-principal">
            <div className="var-h-titre">
              <span className="var-h-tuile" aria-hidden="true">
                <VarIcone nom="Factory" taille={24} />
              </span>
              <p className="var-h-nom">Ce matin</p>
            </div>
            <div className="var-h-description">
              <p>
                {description}{" "}
                {nonInstalle ? (
                  <>
                    L&apos;installation se fait dans <Link href={`${BASE}/sources`}>Sources et structure</Link>.
                  </>
                ) : (
                  <>
                    Les lots se décident dans <Link href={`${RACINE}/validations`}>la file de validation</Link>, chacun par la direction que sa règle désigne.
                  </>
                )}
              </p>
            </div>
            <nav className="var-h-replis" aria-label="Aller à">
              <span className="var-h-membre" title="Vous">
                <span className="var-h-avatar">VO</span>
              </span>
              {pilules(false)}
            </nav>

            {matin
              ? BLOCS_MATIN.map((b) => {
                  const lignes = matin[b.cle] as LigneReelle[];
                  const page = PAGE_DU_BLOC[b.cle];
                  return (
                    <section key={b.cle} className="var-h-section" aria-labelledby={`var-h-${b.cle}`}>
                      <div className="var-h-section-tete">
                        <h2 id={`var-h-${b.cle}`} className="var-h-section-titre">
                          {b.titre}
                        </h2>
                        <Link href={page} className="var-rond" aria-label={`Ouvrir : ${b.titre}`} title={`Ouvrir : ${b.titre}`}>
                          <VarIcone nom="Section" />
                        </Link>
                      </div>
                      {lignes.length === 0 ? (
                        <p className="var-h-aide">{b.vide}</p>
                      ) : (
                        <ul className="var-h-liste">
                          {lignes.slice(0, 5).map((l, i) => (
                            <li key={i}>
                              <Link href={cible(b.cle, l)} className="var-h-rangee" title={l.texte}>
                                <VarIcone nom={ICONE_GRAVITE[l.gravite]} />
                                <span className="var-h-rangee-texte">
                                  <span className="v2-sr">{LIBELLE_GRAVITE[l.gravite]} : </span>
                                  {l.texte}
                                </span>
                              </Link>
                            </li>
                          ))}
                          {lignes.length > 5 ? (
                            <li>
                              <Link href={page} className="var-h-rangee">
                                <VarIcone nom="Points" />
                                <span className="var-h-rangee-texte">… et {lignes.length - 5} de plus</span>
                              </Link>
                            </li>
                          ) : null}
                        </ul>
                      )}
                    </section>
                  );
                })
              : null}
          </div>

          <aside className="var-h-droite" aria-label="Personne et raccourcis">
            <div className="var-h-droite-bloc">
              <section className="var-h-droite-section">
                <h2 className="var-h-libelle">Membres</h2>
                <div className="var-h-membres">
                  <Link href={`${BASE}/sources`} className="var-h-membre" title="Vous">
                    <span className="var-h-avatar">VO</span>
                  </Link>
                </div>
              </section>
              <section className="var-h-droite-section">
                <h2 className="var-h-libelle">Aller à</h2>
                <nav className="var-h-aller" aria-label="Aller à">
                  {pilules(true)}
                </nav>
              </section>
            </div>
          </aside>
        </div>
      </div>
    </VarCarte>
  );
}
