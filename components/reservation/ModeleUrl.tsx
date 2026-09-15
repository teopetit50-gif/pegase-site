"use client";

/* ══════════════════════════════════════════════════════════════════════
   LE MODÈLE DE SITE, LU DANS L'URL SANS RENDRE LA PAGE DYNAMIQUE.
   15/09/2026, second passage.

   Le 15/09 au matin, /reserver-un-audit lisait `?modele=` par
   `searchParams` : la page passait en ƒ (rendue à chaque visite, plus
   jamais servie par le cache). C'est cher payé pour une ligne de rappel
   et un paramètre à recopier, sur une page d'entrée du site.

   Le paramètre se lit donc ICI, au montage, sur `window.location.search`
   — le motif déjà employé par FormulaireContact pour `?sujet=` : pas de
   `useSearchParams`, donc pas de Suspense, donc la page reste ○.

   Ce qu'on accepte en échange : pendant les quelques dizaines de
   millisecondes qui précèdent l'hydratation, la ligne n'est pas encore
   là et les boutons pointent sur /reserver sans le modèle. Un clic dans
   cet intervalle perd le modèle — exactement ce qui se passait avant le
   15/09, jamais pire.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useState } from "react";
import { lienReservation } from "@/lib/reservation";

/** Le slug présent dans l'URL, ou "" tant qu'on ne le sait pas.
 *
 *  La vérification demande la liste des modèles, et cette liste est
 *  grosse : l'importer ici ferait entrer tout le catalogue (83 entrées
 *  avec leurs démos et leurs descriptions) dans le paquet client. Seul
 *  l'appelant qui en a besoin la reçoit du serveur — <ModeleRetenu>,
 *  pour n'afficher aucun nom inventé.
 *
 *  Conséquence assumée sur les BOUTONS : un slug fantaisiste tapé à la
 *  main reste dans leur URL. Il n'y produit rien — /reserver le vérifie
 *  contre MODELES avant d'en faire quoi que ce soit — et personne n'y
 *  arrive autrement qu'en l'écrivant soi-même. */
function useModeleUrl(noms?: Record<string, string>) {
  const [slug, setSlug] = useState("");
  useEffect(() => {
    try {
      const brut = (new URLSearchParams(window.location.search).get("modele") ?? "").trim();
      if (brut && (!noms || noms[brut])) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- une seule fois au montage, depuis l'URL (système externe) : pas de cascade
        setSlug(brut);
      }
    } catch {
      /* pas de window : rien à reprendre */
    }
  }, [noms]);
  return slug;
}

/** Ce que le visiteur a déclaré au calculateur de /tarifs, lu dans l'URL
 *  au montage — même motif que le modèle, et pour la même raison : la
 *  page reste statique.
 *
 *  On ne lit QUE des postes connus et un volume plausible. Le PRIX n'est
 *  pas dans l'URL et ne doit jamais y être : il se recalcule à l'arrivée
 *  (/reserver), sinon n'importe qui se fabriquerait un tarif en tapant
 *  dans la barre d'adresse. */
function useEstimationUrl(noms?: Record<string, string>) {
  const [ctx, setCtx] = useState<{ postes: string[]; pieces: number }>({
    postes: [],
    pieces: 0,
  });
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const postes = (q.get("postes") ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter((x) => x && (!noms || noms[x]));
      const pieces = Number.parseInt(q.get("pieces") ?? "", 10);
      const volume = Number.isFinite(pieces) && pieces > 0 ? pieces : 0;
      if (postes.length || volume) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- une seule fois au montage, depuis l'URL (système externe) : pas de cascade
        setCtx({ postes, pieces: volume });
      }
    } catch {
      /* pas de window : rien à reprendre */
    }
  }, [noms]);
  return ctx;
}

/** Le rappel de l'estimation, en tête de la page d'audit. Il dit ce qui
 *  part avec la demande — et il ne porte PAS de montant : le prix n'est
 *  pas ce qu'on vend ici, c'est ce que l'audit vérifie. Les noms des
 *  postes viennent du serveur, pour ne pas embarquer lib/paliers dans le
 *  paquet client d'une page d'entrée. */
export function EstimationRetenue({ noms }: { noms: Record<string, string> }) {
  const { postes, pieces } = useEstimationUrl(noms);
  if (!postes.length && !pieces) return null;
  return (
    <section data-monde="clair" className="r-wrap pt-10 sm:pt-12">
      <p className="r-note">
        Votre estimation nous arrive&nbsp;:{" "}
        {postes.length ? (
          <strong className="font-medium text-[#050505]">
            {postes.map((id) => noms[id]).join(", ")}
          </strong>
        ) : null}
        {postes.length && pieces ? ", " : null}
        {pieces ? (
          <strong className="font-medium text-[#050505]">
            {pieces.toLocaleString("fr-FR")} pièces par mois
          </strong>
        ) : null}
        . Elle part avec votre demande&nbsp;: l&apos;entretien commence sur vos chiffres au lieu
        de les redemander, et c&apos;est lui qui fixe le prix.{" "}
        <Link href="/tarifs" className="underline underline-offset-4 hover:text-[#050505]">
          Refaire l&apos;estimation
        </Link>
      </p>
    </section>
  );
}

/** La ligne de rappel, en tête de page. Une ligne, pas une carte : c'est
 *  un rappel, pas une étape du parcours. */
export function ModeleRetenu({ noms }: { noms: Record<string, string> }) {
  const slug = useModeleUrl(noms);
  if (!slug) return null;
  return (
    <section data-monde="clair" className="r-wrap pt-10 sm:pt-12">
      <p className="r-note">
        Modèle de site retenu&nbsp;:{" "}
        <strong className="font-medium text-[#050505]">{noms[slug]}</strong> — il part avec
        votre demande, et reste modifiable jusqu&apos;à la livraison.{" "}
        <Link href="/modeles" className="underline underline-offset-4 hover:text-[#050505]">
          Changer de modèle
        </Link>
      </p>
    </section>
  );
}

/** Tout bouton « Réserver ce créneau » de la page d'audit : il emporte le
 *  modèle s'il y en a un. Le rendu sans JavaScript, et celui d'avant
 *  l'hydratation, restent le lien nu — donc toujours cliquable. */
export function BoutonReservation({
  formule,
  className,
  children,
}: {
  formule: string;
  className?: string;
  children: React.ReactNode;
}) {
  const slug = useModeleUrl();
  /* 15/09 — le bouton emporte AUSSI l'estimation de /tarifs (postes et
     volume), sans quoi elle s'arrêterait à cette page et l'audit repartirait
     de zéro. Les noms ne sont pas vérifiés ici : /reserver les revalide
     contre POSTES avant d'en faire une phrase. */
  const { postes, pieces } = useEstimationUrl();
  return (
    <Link
      href={lienReservation(formule, slug || undefined, {
        postes: postes.length ? postes.join(",") : undefined,
        pieces: pieces ? String(pieces) : undefined,
      })}
      className={className}
    >
      {children}
    </Link>
  );
}

/** Pour les composants DÉJÀ clients (comparatif, simulateur) qui
 *  fabriquent leur lien eux-mêmes. */
export { useModeleUrl, useEstimationUrl };
