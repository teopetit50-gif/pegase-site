import { Building2, Minus } from "lucide-react";
import Lien from "@/components/Lien";
import { BoutonReservation } from "./ModeleUrl";
import InfoBulle from "./InfoBulle";
import { ICONES_FORMAT, ICONE_DEFAUT } from "./icones";
import { COMPARATIF, PROFILS, lienContact } from "@/lib/reservation";
import "./TableauFormats.css";

/* ══════════════════════════════════════════════════════════════════════
   <TableauFormats> — « Comparer les formats », /reserver-un-audit
   (27/09/2026 — Teo : « la page audit est mal faite, refais tout
   proprement avec des composants », la première section exceptée)

   ORIGINE. `comparison-3` de @7ovr sur 21st.dev (registre ouvert, lu le
   27/09) : un vrai <table> — une colonne de libellés, une colonne par
   offre, l'offre recommandée teintée de haut en bas, une pastille posée
   sur sa tête, des familles de lignes en bandeau, et un bouton au pied de
   chaque colonne.

   CE QUI EST REPRIS : la table elle-même (et non une grille de <div> :
   un lecteur d'écran annonce la colonne à chaque cellule), la colonne
   teintée, les familles en bandeau, la tête « nom · grand chiffre ·
   sous-ligne », les boutons au pied.

   CE QUI EST JETÉ, et pourquoi —
   · les PRIX : le grand chiffre est une DURÉE, comme sur les cartes du
     haut de page ; la sous-ligne dit ce que coûte le format (« Gratuit »,
     « Sur devis ») sans montant ;
   · les COCHES et les CROIX : nos valeurs sont des phrases, et la seule
     absence du tableau (le point de suivi du Cadrage) se dit par un tiret
     gris, jamais une croix — une croix se lit comme un reproche
     (lib/reservation.ts, 02/08) ;
   · la pastille « Most Popular » posée en absolu à `left: 68%` : elle
     vit ici DANS la tête de sa colonne, qui la suit quelle que soit la
     largeur ;
   · le défilement horizontal du tableau sur mobile. Sous 768 px, un
     sélecteur à trois segments choisit la colonne affichée — le geste de
     la page de référence de Qonto. Il est écrit en boutons radio natifs
     et en `:has()`, sans JavaScript : il marche avant l'hydratation.

   CE QUI REMPLACE L'ANCIEN BENTO (<ComparerFormats>, 15/09). Le bento à
   sélecteur ne montrait qu'un format à la fois, même sur un écran de
   1 440 px : on ne comparait plus rien. Les lignes identiques d'un
   format à l'autre (délai de réponse, engagement, confidentialité)
   quittent le tableau pour le protocole, plus bas — ce sont des
   engagements, pas des différences.

   Le bandeau « Vous ne savez pas quel format choisir ? », qui faisait
   une section à lui seul entre les cartes et le comparatif, se range au
   pied du tableau : c'est après avoir lu les trois colonnes qu'on hésite.

   Composant SERVEUR : les seuls îlots clients sont les bulles d'aide et
   <BoutonReservation>, qui emporte le modèle, l'estimation et la formule
   de site lus dans l'URL.
   ══════════════════════════════════════════════════════════════════════ */

export default function TableauFormats() {
  /* PROFILS[1] : cette page ne parle qu'aux organisations depuis le 28/08 */
  const p = PROFILS[1];
  const formats = p.formules;
  /* la colonne affichée d'abord sur mobile : la recommandée */
  const parDefaut = Math.max(
    0,
    formats.findIndex((f) => f.phare),
  );
  const teinte = (i: number) => (formats[i].phare ? "" : undefined);

  return (
    <section id="comparatif" data-monde="clair" className="r-blanc tb">
      <div className="r-wrap py-16 sm:py-24">
        <div className="tb-tete">
          <span className="tb-pastille">
            <Building2 aria-hidden strokeWidth={1.4} />
            {p.label}
          </span>
          <h2 className="r-h2 tb-titre">Comparer les formats</h2>
          <p className="r-lead tb-chapo">
            Les trois formats côte à côte, point par point&nbsp;: comment se
            déroule l&apos;entretien, et ce que vous recevez ensuite.
          </p>
        </div>

        {/* ═══ sélecteur mobile — masqué dès 768 px ═══ */}
        <fieldset className="tb-choix">
          <legend className="sr-only">Format affiché dans le tableau</legend>
          {formats.map((f, i) => (
            <label key={f.id} className="tb-choix-seg">
              <input
                type="radio"
                name="tb-format"
                value={f.id}
                defaultChecked={i === parDefaut}
                data-choix={i}
                className="sr-only"
              />
              {f.nom}
            </label>
          ))}
        </fieldset>

        <div data-reveal className="tb-cadre">
          <table className="tb-table">
            <caption className="sr-only">
              Comparaison des trois formats d&apos;audit, point par point
            </caption>

            <thead>
              <tr>
                <th scope="col" className="tb-coin">
                  <span className="tb-etiquette">Point par point</span>
                </th>
                {formats.map((f, i) => {
                  const Icone = ICONES_FORMAT[f.id] ?? ICONE_DEFAUT;
                  return (
                    <th
                      key={f.id}
                      scope="col"
                      data-col={i}
                      data-phare={teinte(i)}
                      className="tb-format"
                    >
                      <span className="tb-format-corps">
                        {f.badge ? (
                          <span className="tb-badge">{f.badge}</span>
                        ) : null}
                        <span aria-hidden className="tb-icone">
                          <Icone strokeWidth={1.4} />
                        </span>
                        <span className="tb-nom">{f.nom}</span>
                        <span className="num tb-duree">{f.duree}</span>
                        <span className="tb-conditions">{f.conditions}</span>
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {COMPARATIF.map((g) => (
              <tbody key={g.titre}>
                <tr className="tb-famille">
                  <th scope="rowgroup" colSpan={4}>
                    {g.titre}
                  </th>
                </tr>
                {g.lignes.map((l) => (
                  <tr key={l.libelle} className="tb-ligne">
                    <th scope="row" className="tb-libelle">
                      <span className="tb-libelle-texte">{l.libelle}</span>
                      <InfoBulle libelle={l.libelle}>{l.aide}</InfoBulle>
                    </th>
                    {l.valeurs.map((v, i) => (
                      <td key={i} data-col={i} data-phare={teinte(i)}>
                        {v === "—" ? (
                          <>
                            <Minus aria-hidden className="tb-absent" strokeWidth={1.6} />
                            <span className="sr-only">Non compris</span>
                          </>
                        ) : (
                          v
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}

            <tfoot>
              <tr className="tb-actions">
                <td className="tb-coin" />
                {formats.map((f, i) => (
                  <td key={f.id} data-col={i} data-phare={teinte(i)}>
                    <BoutonReservation
                      formule={f.id}
                      className={`r-btn w-full ${f.phare ? "r-btn--noir" : "r-btn--fil"}`}
                    >
                      {f.cta}
                    </BoutonReservation>
                    <span className="tb-souscta">{f.souscta}</span>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ═══ l'orientation, au pied du tableau ═══ */}
        <div data-reveal className="tb-conseil">
          <p className="tb-conseil-texte">
            <span className="tb-conseil-fort">
              Vous ne savez pas quel format choisir&nbsp;?
            </span>{" "}
            Décrivez votre situation en deux lignes&nbsp;: votre activité, ce qui
            vous coûte le plus cher. Nous vous répondons le jour même avec le
            format adapté.
          </p>
          {/* <Lien> et non <a> : lienContact() rend une adresse INTERNE */}
          <Lien href={lienContact("avant")} className="r-btn r-btn--fil tb-conseil-btn">
            Décrire ma situation
          </Lien>
        </div>
      </div>
    </section>
  );
}
