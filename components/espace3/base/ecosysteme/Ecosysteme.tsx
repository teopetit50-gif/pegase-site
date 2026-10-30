"use client";

/* ══════════════════════════════════════════════════════════════════════
   Écosystème — la page interne du compte gérant d'Omega (18/10/2026)

   Une page, cinq onglets (CASHD, REPUT, OFFLOAD, FILED, le socle). Pour
   chaque moteur : le compteur en tête (promesses par niveau), le flux
   réception → traitement → validation → envoi → journal, où c'est, puis
   chaque promesse du site en ligne dépliable : texte exact, mécanisme,
   niveau, ce qui manque.

   Les données vivent dans lib/ecosysteme.ts, écrites à la main depuis le
   chiffrage du 06/10 et les NOTES des ouvriers ; rien n'est lu en base.
   Le dessin : les cartes et les boutons de /espace3 (finition Attio :
   32 px, filet fin, coins 6 px ; une vue se choisit dans un menu, pas
   dans des onglets soulignés).
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Filter, Layers, Search, UnfoldVertical } from "lucide-react";
import { ECOSYSTEME, GENRES, NIVEAUX, compter, manquesDe, promessesDe, RELEVE, type GenreManque, type Moteur, type Niveau, type Promesse } from "@/lib/ecosysteme";
import "./ecosysteme.css";

const I = { width: 16, height: 16, strokeWidth: 1.6, "aria-hidden": true } as const;
const NIVEAUX_LISTE: Niveau[] = [1, 2, 3, 0];
const GENRES_LISTE = Object.keys(GENRES) as GenreManque[];

/* le gabarit des boutons-menus de /espace3 (Selecteur de Validations.tsx) */
function Selecteur({
  icone: Icone,
  valeur,
  changer,
  tous,
  options,
}: {
  icone: typeof Filter;
  valeur: string;
  changer: (v: string) => void;
  tous: string;
  options: { cle: string; libelle: string }[];
}) {
  const choisi = options.find((o) => o.cle === valeur)?.libelle ?? tous;
  return (
    <label className="v2-val-bouton" data-actif={valeur ? "" : undefined}>
      <Icone {...I} />
      <span>{choisi}</span>
      <ChevronDown width={14} height={14} aria-hidden="true" className="v2-val-bouton-chevron" />
      <select value={valeur} onChange={(e) => changer(e.target.value)} aria-label={tous}>
        <option value="">{tous}</option>
        {options.map((o) => (
          <option key={o.cle} value={o.cle}>
            {o.libelle}
          </option>
        ))}
      </select>
    </label>
  );
}

function BadgeNiveau({ niveau, moyen }: { niveau: Niveau; moyen?: boolean }) {
  const n = NIVEAUX[niveau];
  return (
    <span className={`v2-badge eco-badge${moyen ? " v2-badge--moyen" : ""}`} data-teinte={n.teinte} title={n.libelle}>
      {niveau > 0 ? `${niveau} · ` : ""}
      {n.court}
    </span>
  );
}

function Ligne({ promesse, moteur, ouverte, basculer }: { promesse: Promesse; moteur: Moteur; ouverte: boolean; basculer: () => void }) {
  const manques = manquesDe(promesse, moteur);
  const explicites = promesse.manque ?? [];
  const genres = Array.from(new Set(explicites.map((m) => m.genre)));
  const id = `eco-${moteur.cle}-${promesse.id.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <li className="eco-ligne" data-ouvert={ouverte ? "" : undefined} data-niveau={promesse.niveau}>
      <button type="button" className="eco-ligne-tete" aria-expanded={ouverte} aria-controls={id} onClick={basculer}>
        <span className="eco-niv">
          <BadgeNiveau niveau={promesse.niveau} />
        </span>
        <span className="eco-texte">
          <span>{promesse.texte}</span>
          <small>
            {promesse.id} · {promesse.ou}
          </small>
        </span>
        <span className="eco-chips" aria-label={genres.length ? `Manque : ${genres.map((g) => GENRES[g].libelle).join(", ")}` : undefined}>
          {genres.map((g) => (
            <span key={g} className="v2-badge" title={GENRES[g].libelle}>
              {GENRES[g].court}
            </span>
          ))}
        </span>
        <ChevronRight {...I} className="eco-chevron" />
      </button>
      {ouverte ? (
        <div className="eco-corps" id={id}>
          <dl>
            <dt>Mécanisme</dt>
            <dd>{promesse.mecanisme}</dd>
            <dt>Niveau</dt>
            <dd>
              <BadgeNiveau niveau={promesse.niveau} /> <span className="v2-gris">{NIVEAUX[promesse.niveau].libelle}</span>
            </dd>
            {promesse.note ? (
              <>
                <dt>Réserve</dt>
                <dd>{promesse.note}</dd>
              </>
            ) : null}
            {promesse.atteste !== undefined ? (
              <>
                <dt>Catalogue</dt>
                <dd>
                  <code className="eco-code">atteste: {promesse.atteste ? "true" : "false"}</code>
                  <span className="v2-gris"> — le drapeau de la ligne dans lib/produits/capacites</span>
                </dd>
              </>
            ) : null}
            <dt>{manques.length ? "Ce qui manque" : "Il ne manque rien"}</dt>
            <dd>
              {manques.length ? (
                <ul className="eco-manques">
                  {manques.map((m, i) => (
                    <li key={i}>
                      <span className="v2-badge" title={GENRES[m.genre].libelle}>
                        {GENRES[m.genre].court}
                      </span>
                      <span>{m.texte}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="v2-gris">Rien de plus que le niveau atteint.</span>
              )}
            </dd>
          </dl>
        </div>
      ) : null}
    </li>
  );
}

export default function Ecosysteme() {
  const [cle, setCle] = useState(ECOSYSTEME[0].cle);
  const [niveau, setNiveau] = useState("");
  const [genre, setGenre] = useState("");
  const [recherche, setRecherche] = useState("");
  const [ouvertes, setOuvertes] = useState<Set<string>>(() => new Set());

  /* l'onglet se retrouve dans l'adresse (#reput), sans rechargement : lu
     après l'hydratation (le serveur ne connaît pas le fragment), puis à
     chaque changement de fragment */
  useEffect(() => {
    const lire = () => {
      const h = window.location.hash.slice(1);
      if (ECOSYSTEME.some((m) => m.cle === h)) setCle(h);
    };
    const t = window.setTimeout(lire, 0);
    window.addEventListener("hashchange", lire);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("hashchange", lire);
    };
  }, []);
  const choisir = (c: string) => {
    setCle(c);
    setOuvertes(new Set());
    window.history.replaceState(null, "", `#${c}`);
  };

  const moteur = ECOSYSTEME.find((m) => m.cle === cle) ?? ECOSYSTEME[0];
  const comptes = useMemo(() => compter(moteur), [moteur]);
  const total = promessesDe(moteur).length;
  const totaux = useMemo(() => {
    const t: Record<Niveau, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
    for (const m of ECOSYSTEME) {
      const c = compter(m);
      for (const n of NIVEAUX_LISTE) t[n] += c[n];
    }
    return t;
  }, []);

  const q = recherche.trim().toLowerCase();
  const garder = (x: Promesse) =>
    (niveau === "" || String(x.niveau) === niveau) &&
    (genre === "" || (x.manque ?? []).some((m) => m.genre === genre)) &&
    (q === "" || `${x.id} ${x.texte} ${x.mecanisme} ${x.ou}`.toLowerCase().includes(q));
  const familles = moteur.familles.map((f) => ({ ...f, visibles: f.promesses.filter(garder) }));
  const visibles = familles.reduce((n, f) => n + f.visibles.length, 0);

  const basculer = (id: string) =>
    setOuvertes((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toutes = familles.flatMap((f) => f.visibles.map((x) => `${f.nom}/${x.id}`));
  const toutOuvert = toutes.length > 0 && toutes.every((id) => ouvertes.has(id));
  const deplierTout = () => setOuvertes(toutOuvert ? new Set() : new Set(toutes));

  return (
    <div className="v2-page v2-arrivee eco">
      <div className="eco-tete">
        <div>
          <h1>Écosystème</h1>
          <p>
            Ce que le site promet, le mécanisme qui le tient, à quel niveau de preuve, et ce qui manque sinon. {RELEVE.phrase}
          </p>
        </div>
        <div className="eco-legende" aria-label="Les niveaux">
          {NIVEAUX_LISTE.map((n) => (
            <span key={n} className="eco-legende-item">
              <BadgeNiveau niveau={n} />
              <small>{totaux[n]}</small>
            </span>
          ))}
        </div>
      </div>

      <div className="eco-moteurs" role="group" aria-label="Choisir un moteur">
        {ECOSYSTEME.map((m) => {
          const c = compter(m);
          const n = promessesDe(m).length;
          return (
            <button key={m.cle} type="button" className="v2-stat eco-moteur" aria-pressed={m.cle === cle} onClick={() => choisir(m.cle)}>
              <span className="eco-moteur-nom">
                {m.nom} <small>· {m.libelle}</small>
              </span>
              <span className="eco-compte">
                {n} <small>promesse{n > 1 ? "s" : ""}</small>
              </span>
              <span className="eco-niveaux" aria-label="Par niveau">
                {NIVEAUX_LISTE.map((niv) => (
                  <span key={niv} className="v2-badge" data-teinte={NIVEAUX[niv].teinte} title={NIVEAUX[niv].libelle}>
                    {c[niv]} {NIVEAUX[niv].court.toLowerCase()}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <section className="eco-carte eco-moteur-tete" aria-labelledby="eco-moteur-titre">
        <h2 id="eco-moteur-titre">
          {moteur.nom} <small>· {moteur.libelle}</small>
        </h2>
        <p className="eco-but">{moteur.but}</p>
        <ol className="eco-flux" aria-label="Le flux">
          {moteur.flux.map((e) => (
            <li key={e.nom}>
              <strong>{e.nom}</strong>
              <span>{e.detail}</span>
            </li>
          ))}
        </ol>
        <dl className="eco-infos">
          <dt>Crons</dt>
          <dd>{moteur.crons.join(" · ")}</dd>
          <dt>Où c&apos;est</dt>
          <dd>
            <ul>
              {moteur.ou.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </dd>
          <dt>Vers le vrai</dt>
          <dd>{moteur.versLeVrai}</dd>
          <dt>Compte</dt>
          <dd>
            {total} promesses : {NIVEAUX_LISTE.map((n) => `${comptes[n]} ${NIVEAUX[n].court.toLowerCase()}`).join(" · ")}
          </dd>
        </dl>
      </section>

      <div className="eco-filtres">
        <Selecteur icone={Layers} valeur={niveau} changer={setNiveau} tous="Tous les niveaux" options={NIVEAUX_LISTE.map((n) => ({ cle: String(n), libelle: `${n > 0 ? `${n} · ` : ""}${NIVEAUX[n].court} (${comptes[n]})` }))} />
        <Selecteur icone={Filter} valeur={genre} changer={setGenre} tous="Tout ce qui manque" options={GENRES_LISTE.map((g) => ({ cle: g, libelle: GENRES[g].libelle }))} />
        <label className="v2-val-recherche">
          <Search {...I} />
          <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Une phrase, un lot, une table…" aria-label="Chercher dans les promesses" />
        </label>
        <div className="v2-val-droite">
          <span className="v2-gris eco-compteur-filtre">
            {visibles} / {total}
          </span>
          <button type="button" className="v2-val-bouton" onClick={deplierTout} disabled={visibles === 0}>
            <UnfoldVertical {...I} />
            {toutOuvert ? "Tout replier" : "Tout déplier"}
          </button>
        </div>
      </div>

      {visibles === 0 ? (
        <div className="eco-carte eco-vide">Aucune promesse ne correspond à ces filtres.</div>
      ) : (
        familles
          .filter((f) => f.visibles.length > 0)
          .map((f) => (
            <section key={f.nom} className="eco-carte" aria-label={f.nom}>
              <h3 className="eco-groupe">
                <span>{f.nom}</span>
                <small>
                  {f.visibles.length}
                  {f.visibles.length !== f.promesses.length ? ` sur ${f.promesses.length}` : ""}
                </small>
              </h3>
              {f.description ? <p className="eco-groupe-desc">{f.description}</p> : null}
              <ul className="eco-liste">
                {f.visibles.map((x) => {
                  const id = `${f.nom}/${x.id}`;
                  return <Ligne key={x.id} promesse={x} moteur={moteur} ouverte={ouvertes.has(id)} basculer={() => basculer(id)} />;
                })}
              </ul>
            </section>
          ))
      )}
    </div>
  );
}
