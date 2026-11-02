"use client";

/* ══════════════════════════════════════════════════════════════════════
   Réseau Omega — Membres : l'annuaire vérifié (02/11/2026)

   Composition des résultats de recherche de pappers.be (relevés dans
   Chromium le 02/11/2026) : un grand champ de recherche, une rangée de
   filtres en pastilles (dont des menus), le titre des résultats et leur
   nombre, puis une carte par entreprise — en-tête (tuile, nom, activité),
   un filet, une grille de libellés et de valeurs, un filet, l'action à
   droite. Tout l'habillage est celui d'Espace 2 (jetons --v2-*, v2-btn,
   v2-carte, v2-popover, v2-menu), rien de la référence.

   Les filtres vivent dans l'adresse (?q=&ile=&secteur=&propose=&cherche=
   &badge=). En base réelle, l'annuaire est vide (le réseau n'a encore
   aucune table) : jamais les membres d'exemple.
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, ChevronDown, MessageSquare, Search, SearchX, X } from "lucide-react";
import { Button, Menu, MenuItem, MenuTrigger, Popover, type Selection } from "react-aria-components";
import { useSource } from "@/components/espace/source";
import { Vide } from "../ui";
import { MEMBRES, type Membre } from "./membres";
import { reseauEnExemple } from "./source";
import { BadgeVerifie, Monogramme, ReseauFerme } from "./membres-ui";
import { PanneauVisibilite } from "./membres-panneau";
import { FILTRES_VIDES, ILES, PROPOSITIONS, RECHERCHES, SECTEURS, adresseDe, badgesLus, filtrer, filtresDe, lienEcrire, lienMembre, moisEnClair, nbFiltres, type CleBadge, type Filtres } from "./membres-donnees";
import "./membres.css";

export function MembresListe() {
  const { source } = useSource();
  const exemple = reseauEnExemple(source);
  return (
    <div className="v2-page rm-page">
      <header className="rm-tete">
        <p className="rm-etiquette">Réseau Omega</p>
        <h1 className="rm-titre">Membres</h1>
        <p className="rm-intro">L&apos;annuaire vérifié des entreprises clientes d&apos;Omega. Chacune ne montre que ce qu&apos;elle a accepté de montrer, et ses badges sont calculés sur ses vraies données.</p>
      </header>
      {exemple ? <Annuaire /> : <ReseauFerme />}
    </div>
  );
}

function Annuaire() {
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();
  const filtres = useMemo(() => filtresDe(new URLSearchParams(params.toString())), [params]);
  /* le champ de recherche garde sa frappe localement ; l'adresse suit */
  const [frappe, setFrappe] = useState(filtres.q);
  const appliquer = (f: Filtres) => router.replace(`${chemin}${adresseDe(f)}`, { scroll: false });
  const changer = (partiel: Partial<Filtres>) => appliquer({ ...filtres, q: frappe, ...partiel });
  const resultats = useMemo(() => filtrer(MEMBRES, { ...filtres, q: frappe }), [filtres, frappe]);
  const actifs = nbFiltres(filtres) + (frappe.trim() ? 1 : 0);
  const toutEffacer = () => {
    setFrappe("");
    appliquer(FILTRES_VIDES);
  };
  const basculerBadge = (b: CleBadge) => changer({ badges: filtres.badges.includes(b) ? filtres.badges.filter((x) => x !== b) : [...filtres.badges, b] });

  return (
    <div className="rm-disposition">
      <aside className="rm-colonne-moi" aria-label="Votre fiche dans le réseau">
        <PanneauVisibilite />
      </aside>

      <section className="rm-colonne-liste" aria-labelledby="rm-resultats-titre">
        <div className="rm-recherche">
          <label className="v2-champ rm-recherche-champ">
            <Search width={16} height={16} aria-hidden="true" />
            <input
              type="search"
              value={frappe}
              placeholder="Nom, activité, commune, ce qu'il propose…"
              aria-label="Rechercher un membre"
              onChange={(e) => setFrappe(e.target.value)}
              onBlur={() => changer({})}
              onKeyDown={(e) => {
                if (e.key === "Enter") changer({});
              }}
            />
          </label>
        </div>

        <div className="rm-filtres" role="group" aria-label="Filtres">
          <FiltreUnique etiquette="Île" valeur={filtres.ile} options={ILES} onChange={(ile) => changer({ ile: ile as Filtres["ile"] })} />
          <FiltreUnique etiquette="Secteur" valeur={filtres.secteur} options={SECTEURS} onChange={(secteur) => changer({ secteur })} />
          <FiltreMultiple etiquette="Propose" valeurs={filtres.propose} options={PROPOSITIONS} onChange={(propose) => changer({ propose })} />
          <FiltreMultiple etiquette="Cherche" valeurs={filtres.cherche} options={RECHERCHES} onChange={(cherche) => changer({ cherche })} />
          <span className="rm-filtres-separateur" aria-hidden="true" />
          <button type="button" className="v2-btn v2-btn--petit rm-pastille" aria-pressed={filtres.badges.includes("bonPayeur")} onClick={() => basculerBadge("bonPayeur")}>
            {filtres.badges.includes("bonPayeur") ? <Check width={14} height={14} aria-hidden="true" /> : null}
            Bon payeur
          </button>
          <button type="button" className="v2-btn v2-btn--petit rm-pastille" aria-pressed={filtres.badges.includes("reponseRapide")} onClick={() => basculerBadge("reponseRapide")}>
            {filtres.badges.includes("reponseRapide") ? <Check width={14} height={14} aria-hidden="true" /> : null}
            Réponse rapide
          </button>
          {actifs ? (
            <button type="button" className="v2-btn v2-btn--petit v2-btn--fantome rm-effacer" onClick={toutEffacer}>
              <X width={14} height={14} aria-hidden="true" />
              Effacer
            </button>
          ) : null}
        </div>

        <div className="rm-compte">
          <h2 className="rm-h2" id="rm-resultats-titre">
            Membres trouvés
          </h2>
          <p aria-live="polite">
            <strong>{resultats.length}</strong> {resultats.length > 1 ? "membres correspondent" : resultats.length === 1 ? "membre correspond" : "membre ne correspond"} à votre recherche, sur {MEMBRES.length}.
          </p>
        </div>

        {resultats.length ? (
          <ul className="rm-cartes">
            {resultats.map((m) => (
              <CarteMembre key={m.slug} membre={m} />
            ))}
          </ul>
        ) : (
          <Vide
            icone={<SearchX width={20} height={20} strokeWidth={1.6} />}
            titre="Aucun membre ne correspond"
            action={
              <button type="button" className="v2-btn" onClick={toutEffacer}>
                Effacer la recherche et les filtres
              </button>
            }
          >
            Essayez un autre mot, ou retirez un filtre.
          </Vide>
        )}
      </section>
    </div>
  );
}

/* ——— une carte de résultat, sur la composition pappers ——— */

function CarteMembre({ membre: m }: { membre: Membre }) {
  const badges = badgesLus(m.badges);
  return (
    <li className="v2-carte rm-carte">
      <div className="rm-carte-tete">
        <Monogramme nom={m.nom} />
        <h3 className="rm-carte-nom">
          <Link href={lienMembre(m.slug)}>{m.nom}</Link>
        </h3>
        <span className="rm-carte-secteur">{m.secteur}</span>
      </div>
      <dl className="rm-carte-grille">
        <div>
          <dt>Lieu</dt>
          <dd>
            {m.commune}
            <small>{m.ile}</small>
          </dd>
        </div>
        <div>
          <dt>Dans le réseau depuis</dt>
          <dd>{moisEnClair(m.depuis)}</dd>
        </div>
        <div className="rm-carte-large">
          <dt>Badges vérifiés</dt>
          <dd>
            {badges.length ? (
              <span className="rm-badges">
                {badges.map((b) => (
                  <BadgeVerifie key={b.cle} badge={b} />
                ))}
              </span>
            ) : (
              <span className="rm-sourdine">Aucun badge montré</span>
            )}
          </dd>
        </div>
        <div className="rm-carte-large">
          <dt>Propose</dt>
          <dd>{m.propose.join(" · ")}</dd>
        </div>
        <div className="rm-carte-large">
          <dt>Cherche</dt>
          <dd>{m.cherche.join(" · ")}</dd>
        </div>
      </dl>
      <div className="rm-carte-pied">
        <Link href={lienEcrire(m.slug)} className="v2-btn v2-btn--petit v2-btn--fantome">
          <MessageSquare width={14} height={14} aria-hidden="true" />
          Écrire
        </Link>
        <Link href={lienMembre(m.slug)} className="v2-btn v2-btn--petit" aria-label={`Voir la fiche de ${m.nom}`}>
          Voir la fiche
          <ArrowRight width={14} height={14} aria-hidden="true" />
        </Link>
      </div>
    </li>
  );
}

/* ——— les filtres en pastilles : un menu par filtre (react-aria) ——— */

function Pastille({ etiquette, resume, actif }: { etiquette: string; resume: string | null; actif: boolean }) {
  return (
    <Button className="v2-btn v2-btn--petit rm-pastille" data-actif={actif || undefined}>
      <span>
        {etiquette}
        {resume ? <span className="rm-pastille-valeur"> : {resume}</span> : null}
      </span>
      <ChevronDown width={14} height={14} aria-hidden="true" />
    </Button>
  );
}

function FiltreUnique({ etiquette, valeur, options, onChange }: { etiquette: string; valeur: string | null; options: string[]; onChange: (v: string | null) => void }) {
  const TOUS = "__tous__";
  return (
    <MenuTrigger>
      <Pastille etiquette={etiquette} resume={valeur} actif={!!valeur} />
      <Popover placement="bottom start" offset={6} className="v2-jetons v2-popover rm-menu-filtre">
        <Menu
          className="v2-menu"
          aria-label={`Filtrer par ${etiquette.toLowerCase()}`}
          selectionMode="single"
          selectedKeys={[valeur ?? TOUS]}
          onSelectionChange={(s: Selection) => {
            const k = s === "all" ? TOUS : String([...s][0] ?? TOUS);
            onChange(k === TOUS ? null : k);
          }}
        >
          <ItemFiltre id={TOUS}>{etiquette === "Île" ? "Les deux îles" : "Tous les secteurs"}</ItemFiltre>
          {options.map((o) => (
            <ItemFiltre key={o} id={o}>
              {o}
            </ItemFiltre>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}

function FiltreMultiple({ etiquette, valeurs, options, onChange }: { etiquette: string; valeurs: string[]; options: string[]; onChange: (v: string[]) => void }) {
  const resume = valeurs.length === 1 ? valeurs[0] : valeurs.length > 1 ? `${valeurs.length} choix` : null;
  return (
    <MenuTrigger>
      <Pastille etiquette={etiquette} resume={resume} actif={valeurs.length > 0} />
      <Popover placement="bottom start" offset={6} className="v2-jetons v2-popover rm-menu-filtre">
        <Menu
          className="v2-menu"
          aria-label={`Filtrer sur ce que les membres ${etiquette === "Propose" ? "proposent" : "cherchent"}`}
          selectionMode="multiple"
          selectedKeys={valeurs}
          onSelectionChange={(s: Selection) => onChange(s === "all" ? options : [...s].map(String))}
        >
          {options.map((o) => (
            <ItemFiltre key={o} id={o}>
              {o}
            </ItemFiltre>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}

function ItemFiltre({ id, children }: { id: string; children: string }) {
  return (
    <MenuItem id={id} textValue={children} className="v2-menu-item rm-menu-item">
      {({ isSelected }) => (
        <>
          <span className="rm-menu-coche" aria-hidden="true">
            {isSelected ? <Check width={14} height={14} /> : null}
          </span>
          <span>{children}</span>
        </>
      )}
    </MenuItem>
  );
}
