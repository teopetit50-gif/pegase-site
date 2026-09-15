import Link from "next/link";
import { FAITS, REFUS } from "./donnees";

/* ══════════════════════════════════════════════════════════════════════
   Les quatre sections fixes de /secteurs — héros, cadrage, sur-mesure,
   clôture. Aucune n'a d'état : elles restent des composants serveur, seul
   `Metiers.tsx` passe au client.

   L'ORDRE DE LECTURE, et pourquoi il ne s'intervertit pas :
     1. le héros pose la thèse — « le logiciel sait, personne ne prévient » ;
     2. le CADRAGE pose la limite AVANT les douze métiers. Une page qui
        énumère douze métiers puis annonce ses limites à la fin se lit comme
        un argumentaire rattrapé ; la même page qui pose sa limite d'abord
        rend les douze crédibles ;
     3. les douze métiers ;
     4. le sur-mesure ramasse ceux qui n'y sont pas, en disant pourquoi.
   ══════════════════════════════════════════════════════════════════════ */

/* La bande hachurée de la référence : la respiration entre deux sections
   blanches, sans quoi elles se lisent comme une seule. */
export function Hachure() {
  return (
    <div
      aria-hidden="true"
      className="sec-hachure h-10 border-[#e6e6e6] border-y border-dashed md:h-14"
    />
  );
}

export function Heros() {
  return (
    <section className="border-[#e6e6e6] border-b border-dashed">
      <div className="px-6 py-20 sm:px-8 md:py-28 lg:px-12">
        <div className="mx-auto max-w-3xl text-center">
          <p className="sec-sourcil">Secteurs</p>
          <h1 className="sec-h1 mt-6">Chaque métier a ses conversations à tenir.</h1>
          <p className="sec-lead mx-auto mt-6 max-w-2xl">
            Le planning sait qu’il manque quelqu’un ce matin, le garage sait que
            la pièce n’est pas arrivée. Reste la conversation qui va avec, et elle
            ne se ressemble pas d’un métier à l’autre.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="#metiers" className="sec-btn sec-btn--plein">
              Voir les douze métiers
            </Link>
            <Link href="/reserver-un-audit" className="sec-btn sec-btn--creux">
              Réserver un audit
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* Bandeau de faits — à l'emplacement où la référence aligne des logos
   clients. Règles maison : pas de preuve sociale, pas de compteur de
   traction. Ce sont quatre faits de conception, vérifiables. */
export function Faits() {
  return (
    <section className="border-[#e6e6e6] border-b border-dashed">
      <div className="px-6 sm:px-8 lg:px-12">
        <dl className="grid grid-cols-2 lg:grid-cols-4">
          {FAITS.map((f, i) => (
            <div
              key={f.libelle}
              className={[
                "flex flex-col gap-1.5 px-2 py-8 text-center",
                /* filets intérieurs seulement : la dernière colonne de
                   chaque rangée n'en porte pas, sinon il doublerait le
                   cadre de la section */
                i % 2 === 0 ? "border-[#e6e6e6] border-r border-dashed" : "",
                i < 2 ? "border-[#e6e6e6] border-b border-dashed lg:border-b-0" : "",
                "lg:border-r lg:border-dashed lg:last:border-r-0",
              ].join(" ")}
            >
              <dd className="font-semibold text-[28px] leading-8 tracking-[-0.02em]">
                {f.valeur}
              </dd>
              {/* Un libellé de bandeau doit tenir sur UNE ligne : une rangée
                  dont deux cellules passent à deux lignes se lit comme un
                  défaut d'alignement, pas comme un chiffre. */}
              <dt className="text-[13px] text-[#737373] leading-5">{f.libelle}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function Cadrage() {
  return (
    <section className="border-[#e6e6e6] border-b border-dashed">
      <div className="px-6 py-20 sm:px-8 md:py-24 lg:px-12">
        <div className="mx-auto max-w-3xl text-center">
          <p className="sec-sourcil">La ligne</p>
          <h2 className="sec-h2 mt-5">
            Le logiciel gère l’état des choses. Nous gérons les conversations
            qu’il déclenche.
          </h2>
          <p className="sec-lead mx-auto mt-6 max-w-2xl">
            C’est la seule question que nous posons à un métier : y a-t-il, là,
            une conversation que personne n’a le temps d’avoir ? Quand la
            réponse est non, nous le disons.
          </p>
        </div>

        {/* Le sourcil est posé UNE fois, au-dessus des trois cellules — et non
            répété dans chacune. Première version : « Ce que nous ne prenons
            pas » sur les trois cartes. À trois colonnes il se lisait comme
            un en-tête de colonne bégayé ; empilé sur téléphone, il revenait
            trois fois en dix centimètres. */}
        <div className="mt-14 border-[#e6e6e6] border-t border-dashed">
          <p className="sec-sourcil px-5 pt-8 lg:px-7">Ce que nous ne prenons pas</p>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-3">
            {REFUS.map((r, i) => (
              <div
                key={r.titre}
                className={[
                  "flex flex-col gap-3 px-5 py-8 lg:px-7",
                  "border-[#e6e6e6] border-b border-dashed last:border-b-0 md:border-b-0",
                  i < REFUS.length - 1 ? "md:border-[#e6e6e6] md:border-r md:border-dashed" : "",
                ].join(" ")}
              >
                <h3 className="font-medium text-[17px] leading-6">{r.titre}</h3>
                <p className="sec-body text-[#171717]/85">{r.texte}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function SurMesure() {
  return (
    <section className="border-[#e6e6e6] border-b border-dashed">
      <div className="px-6 py-20 sm:px-8 md:py-24 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <p className="sec-sourcil">Si le vôtre n’y est pas</p>
          <h2 className="sec-h2 mt-5">
            Vingt-six métiers ont été passés en revue. Douze sont sur cette page.
          </h2>
          <div className="mt-6 flex flex-col gap-4">
            <p className="sec-lead">
              Les quatorze autres ne sont pas absents par hasard. Dans plusieurs
              d’entre eux — l’officine, le cabinet de soins, le dépannage
              d’urgence — toute la charge arrive par la voix : un appel à six
              heures du matin, qui ne laisse pas de message et ne rappelle pas.
              Nos quatre systèmes travaillent sur l’écrit. Nous ne prétendrons
              pas le contraire pour tenir une page de plus.
            </p>
            <p className="sec-lead">
              Pour les autres, la réponse se construit : c’est le cadrage, puis
              le système propre à votre organisation. Il commence par la même
              question que les douze ci-dessus — ce qui vous échappe, et ce qui
              doit rester chez vous.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/offres/sur-mesure" className="sec-btn sec-btn--plein">
              Le sur-mesure
            </Link>
            <Link href="/offres" className="sec-btn sec-btn--creux">
              Les quatre systèmes
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Cloture() {
  return (
    <section>
      <div className="px-6 py-24 sm:px-8 md:py-32 lg:px-12">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="sec-h2">Trente minutes pour situer le vôtre.</h2>
          <p className="sec-lead mx-auto mt-6 max-w-xl">
            Un audit sans engagement : on regarde ce qui arrive chez vous, par
            quel canal, et ce qui reste sans réponse. Vous repartez avec la
            liste, que la suite se fasse avec nous ou non.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/reserver-un-audit" className="sec-btn sec-btn--plein">
              Réserver un audit
            </Link>
            <Link href="/contact" className="sec-btn sec-btn--creux">
              Nous écrire
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
