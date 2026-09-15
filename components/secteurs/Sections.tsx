import Link from "next/link";
import { FAITS, REFUS } from "./donnees";

/* ══════════════════════════════════════════════════════════════════════
   Les sections fixes de /secteurs, décalquées de Northstar
   (daliagency-anonymized.vercel.app). Aucune n'a d'état : elles restent
   des composants serveur, seul `Metiers.tsx` passe au client.

   L'ORDRE, et pourquoi il ne s'intervertit pas :
     · le héros pose la thèse — « votre logiciel sait, personne ne prévient » ;
     · 01 / Métiers : les douze d'un coup d'œil, pour que le lecteur trouve
       le sien avant qu'on lui explique quoi que ce soit ;
     · 02 / Le détail : le rail et son panneau ;
     · la bande SOMBRE porte ce que nous refusons. Elle vient AVANT la
       section « La ligne » : une page qui énumère douze métiers puis
       annonce ses limites tout à la fin se lit comme un argumentaire
       rattrapé ;
     · 03 / La ligne : le cadrage et le sur-mesure, à la manière de
       l'« About » de la référence — grand paragraphe à gauche, liste
       numérotée à droite.
   ══════════════════════════════════════════════════════════════════════ */

export function Heros() {
  return (
    <section id="top" className="relative">
      <div className="n-cadre">
        <div className="n-centre" style={{ padding: "clamp(4rem,8vw,7rem) 1rem clamp(3.5rem,6vw,6rem)" }}>
          {/* Le titre de la référence coupe en deux lignes portées par des
              `<span>` : la seconde prend l'accent. Ce n'est pas décoratif —
              c'est la moitié qui retourne la phrase. */}
          <h1 className="n-h1">
            <span className="block text-balance">Votre logiciel sait.</span>
            <span className="block text-balance">
              <span className="n-accentue">Personne ne prévient.</span>
            </span>
          </h1>
          <p className="n-chapo mx-auto mt-8">
            Le planning sait qu’il manque quelqu’un ce matin. Le garage sait que
            la pièce n’est pas arrivée. Reste la conversation que personne n’a
            le temps d’avoir — et elle ne se ressemble pas d’un métier à l’autre.
          </p>
          <div className="n-boutons" style={{ marginTop: "2.25rem" }}>
            <Link href="#metiers" className="n-btn n-btn--plein">
              Voir les douze métiers
            </Link>
            <Link href="/reserver-un-audit" className="n-btn n-btn--creux">
              Réserver un audit
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* Bandeau de faits, à l'emplacement où la référence aligne ses logos
   clients. Règles maison : aucune preuve sociale, aucun compteur de
   traction. Quatre faits de conception, vérifiables, dont le libellé tient
   sur UNE ligne — une rangée dont deux cellules passent à deux lignes se
   lit comme un défaut d'alignement, pas comme un chiffre. */
export function Faits() {
  return (
    <section className="border-[rgba(17,19,18,0.15)] border-y">
      <div className="n-cadre">
        <dl className="n-faits">
          {FAITS.map((f) => (
            <div key={f.libelle} className="n-fait">
              <dd className="n-fait-valeur">{f.valeur}</dd>
              <dt className="n-fait-libelle">{f.libelle}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* La bande sombre de la référence, pleine largeur : elle sort du cadre par
   `grid-column: 1 / -1`, ce pour quoi `.n-cadre` est une grille à trois
   colonnes et non un simple `max-width`. */
export function Refus() {
  return (
    <section className="n-cadre">
      <div className="n-pleine n-sombre">
        <div className="n-cadre">
          <div className="py-20 md:py-28">
            <h2 className="n-etiquette" data-on="dark">
              La limite
            </h2>
            <p className="mt-6 max-w-[42rem] text-[clamp(1.375rem,2.6vw,2.25rem)] leading-[1.15] tracking-[-0.035em]">
              Le logiciel gère l’état des choses. Nous gérons les conversations
              qu’il déclenche.
            </p>
            <p className="mt-6 max-w-[40rem] text-[15px] text-white/60 leading-relaxed">
              C’est la seule question que nous posons à un métier : y a-t-il,
              là, une conversation que personne n’a le temps d’avoir ? Quand la
              réponse est non, nous le disons — et voici les trois endroits où
              elle est non.
            </p>

            <div className="n-refus-grille" style={{ marginTop: "3rem" }}>
              {REFUS.map((r) => (
                <div key={r.titre} className="n-carte-sombre">
                  <h3 className="font-medium text-[17px] leading-6">{r.titre}</h3>
                  <p className="mt-3 text-[14px] text-white/60 leading-relaxed">
                    {r.texte}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "3rem" }}>
              <Link href="/reserver-un-audit" className="n-btn n-btn--plein">
                Réserver un audit
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* La section « About » de la référence : grand paragraphe à gauche, liste
   numérotée à droite, un filet entre les deux. Ici, le sur-mesure — et le
   dire des métiers que nous ne prenons pas. */
export function Ligne() {
  return (
    <section id="ligne" className="py-20 md:py-28">
      <div className="n-cadre">
        <div>
          <h2 className="n-etiquette">03 / La ligne</h2>

          <div className="n-ligne-grille" style={{ marginTop: "2.5rem" }}>
            <div>
              <p className="n-propos-corps">
                Vingt-six métiers ont été passés en revue. Douze sont sur cette
                page, et les quatorze autres n’en sont pas absents par hasard.
              </p>
              <p className="mt-6 max-w-[38rem] text-[15px] text-[#687170] leading-relaxed">
                Dans plusieurs d’entre eux — l’officine, le cabinet de soins, le
                dépannage d’urgence — toute la charge arrive par la voix : un
                appel à six heures du matin, qui ne laisse pas de message et ne
                rappelle pas. Nos quatre systèmes travaillent sur l’écrit. Nous
                ne prétendrons pas le contraire pour tenir une page de plus.
              </p>
              <div className="n-boutons n-boutons--gauche" style={{ marginTop: "2rem" }}>
                <Link href="/offres/sur-mesure" className="n-btn n-btn--plein">
                  Le sur-mesure
                </Link>
                <Link href="/offres" className="n-btn n-btn--creux">
                  Les quatre systèmes
                </Link>
              </div>
            </div>

            <div>
              <h3 className="n-etiquette">Ce que nous faisons, en trois temps</h3>
              <ol className="n-liste mt-5">
                {[
                  "Nous lisons ce que vos outils savent déjà — facturier, messagerie, formulaire du site.",
                  "Nous écrivons ce qui en découle : la réponse, la relance, le classement, sous vos règles.",
                  "Rien ne part sans vous tant que vous ne l’avez pas décidé, et tout reste au journal.",
                ].map((t, i) => (
                  <li key={t}>
                    <span className="n-liste-index" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Cloture() {
  return (
    <section className="border-[rgba(17,19,18,0.15)] border-t py-20 md:py-28">
      <div className="n-cadre">
        <div className="n-centre">
          <p className="max-w-[30rem] text-[clamp(1.75rem,3.4vw,3rem)] leading-[1.05] tracking-[-0.045em]">
            Trente minutes pour <span className="n-accentue">situer le vôtre</span>.
          </p>
          <p className="n-chapo mx-auto mt-6 max-w-[34rem]">
            On regarde ce qui arrive chez vous, par quel canal, et ce qui reste
            sans réponse. Vous repartez avec la liste, que la suite se fasse
            avec nous ou non.
          </p>
          <div className="n-boutons" style={{ marginTop: "2rem" }}>
            <Link href="/reserver-un-audit" className="n-btn n-btn--plein">
              Réserver un audit
            </Link>
            <Link href="/contact" className="n-btn n-btn--creux">
              Nous écrire
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
