import "./PageLegale.css";

/* ══════════════════════════════════════════════════════════════════════
   <PageLegale> — la mise en page des pages de texte légal (15/09/2026)

   ORIGINE. Aucune : le brief ne désigne aucun composant de la
   bibliothèque, et il n'y avait rien à décalquer — un sommaire d'ancres
   n'est pas un objet visuel, c'est une liste de liens. Les deux gestes
   viennent donc du site lui-même : la colonne de titre COLLANTE de
   /contact (« Selon votre besoin », `lg:sticky lg:top-28`), qui prouve
   que `position: sticky` survit à l'`overflow-x-clip` de PageShell ; et
   les liens d'ancre du pied de page de /vos-donnees (« Le trajet d'une
   donnée » → #trajet), qui sont déjà la façon dont ce site renvoie à une
   section. Le reste est le monde `.resa` tel quel.

   POURQUOI ICI. /mentions-legales était restée sur l'ancien thème sombre
   — `text-white`, `text-muted`, `border-line-soft` — quand tout le site
   est passé au clair : un visiteur qui clique « Mentions légales » dans le
   pied de page tombait sur une page d'un autre site. Et elle n'avait
   aucun moyen d'atteindre une section : onze titres, aucune ancre, aucun
   sommaire. Les deux défauts sont de FORME, et c'est exactement pourquoi
   ils sortent de page.tsx : le fond juridique (les textes, leur ordre, la
   date de mise à jour, le nom de l'hébergeur) reste seul dans la page, où
   il est intouchable et relisible d'un coup d'œil ; la forme vit ici, où
   la corriger ne fait courir aucun risque à une mention à valeur légale.
   Le composant ne compose AUCUNE phrase juridique : il reçoit le titre, la
   ligne de mise à jour et les sections tels quels, et n'en concatène rien.
   Le jour où une page de CGV ou de politique de confidentialité arrivera,
   elle se posera dessus sans une ligne de CSS de plus.

   CE QUI EST JETÉ. Le monde sombre en entier. Le `max-w-3xl` (768 px) qui
   servait de mesure de lecture : à 15 px il donnait près de 100 signes par
   ligne, l'œil perdait la ligne suivante — la colonne vaut désormais 600 px
   pour ≈ 75 signes. Les `space-y-10` plats entre sections, remplacés par un
   filet et une vraie respiration. Aucun scroll-spy, aucune surbrillance
   `:target`, aucun `data-reveal` : la page n'a pas de <PageMotion/> et n'en
   reçoit pas — une page légale se lit.

   ÉCARTS ASSUMÉS. Composant SERVEUR : aucun état, aucun hook, zéro octet de
   JavaScript envoyé. Le sommaire est onze `<a href="#…">` et il fonctionne
   avec le JavaScript coupé — c'est aussi ce qui le rend indifférent à
   Lenis, construit sans l'option `anchors`. Seule concession au mouvement :
   le bloc de titre porte le `data-arrivee="titre"` que toute page du site
   porte (components/Arrivee.tsx, un fondu de 0,5 s sur le premier écran,
   désactivé en mouvement réduit et jamais posé par le CSS) — ne pas le
   mettre aurait fait de cette page la seule qui apparaît d'un bloc. Le
   numéro à gauche de chaque entrée du sommaire est `aria-hidden` : il
   compte des sections que le fond juridique ne numérote pas.
   ══════════════════════════════════════════════════════════════════════ */

export type SectionLegale = {
  /** ancre de la section : sert d'`id` sur le <h2> et de cible au sommaire */
  id: string;
  /** titre de section — fond juridique, recopié tel quel */
  h: string;
  /** corps de section — fond juridique, recopié tel quel */
  p: string;
};

export default function PageLegale({
  titre,
  maj,
  sections,
}: {
  titre: string;
  maj: string;
  sections: readonly SectionLegale[];
}) {
  return (
    <div className="resa">
      {/* ═══ 1 — le titre, sur le gris de page ═══ */}
      <section data-monde="clair" className="r-wrap pb-12 pt-12 sm:pb-16 sm:pt-20">
        <div data-arrivee="titre" className="leg-cadre">
          <h1 className="r-h1">{titre}</h1>
          <p className="leg-maj">{maj}</p>
        </div>
      </section>

      {/* ═══ 2 — le document, sur la bande blanche ═══ */}
      <div className="r-blanc">
        <section data-monde="clair" className="r-wrap pb-20 pt-12 sm:pb-28 sm:pt-16">
          <div className="leg-cadre leg-grille">
            <nav aria-label="Sommaire" className="leg-sommaire">
              <p className="leg-sommaire-titre">Sommaire</p>
              <ol className="leg-sommaire-liste">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="leg-sommaire-lien">
                      <span className="leg-sommaire-num" aria-hidden="true">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{s.h}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="leg-corps">
              {sections.map((s) => (
                <section key={s.id} className="leg-section">
                  <h2 id={s.id} className="r-h4 leg-titre">
                    {s.h}
                  </h2>
                  <p className="leg-texte">{s.p}</p>
                </section>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
