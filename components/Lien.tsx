import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

/* ══════════════════════════════════════════════════════════════════════
   Lien — 14/09/2026 (chantier rapidité)

   CE QUE ÇA RÉPARE. Une dizaine d'endroits du site écrivaient leurs liens
   en `<a href={...}>` brut parce que la destination vient d'une donnée et
   qu'on ne sait pas, à l'écriture, si elle sort du site : `m.demo`,
   `l.href`, `MARQUE.audit`, `lienContact()`, `lienReservation()`. Or la
   moitié de ces valeurs sont INTERNES — `lienContact()` rend
   `/contact?sujet=…#ecrire` depuis le 14/09, `lienReservation()` rend
   `/reserver?formule=…`, `MARQUE.audit` rend `/reserver-un-audit`. Un
   `<a>` brut sur une adresse interne fait RECHARGER TOUT LE SITE : le
   navigateur jette la page, redemande le document, refait les polices,
   réexécute ~1 Mo de JavaScript — une seconde et demie pour un clic qui
   devrait en coûter deux cents millisecondes. Et c'étaient les boutons
   les plus cliqués du site : « Réserver un audit », « Nous écrire ».

   CE QUE ÇA FAIT. Une adresse qui commence par `/` part en <Link> Next —
   navigation client, préchargement au survol, transition de page. Tout le
   reste (http(s), mailto:, tel:, wa.me, une ancre `#`) reste un <a> nu,
   qui est exactement ce qu'il faut pour ces cas-là.

   À UTILISER dès qu'un href vient d'une donnée. Quand l'adresse est
   écrite en clair dans le JSX et qu'elle est interne, <Link> directement
   reste plus lisible.
   ══════════════════════════════════════════════════════════════════════ */

type Props = ComponentPropsWithoutRef<"a">;

export default function Lien({ href, children, ...reste }: Props) {
  /* `//exemple.fr` est un lien PROTOCOLE-RELATIF, donc sortant : le test
     doit exclure le double slash, sans quoi on l'enverrait au routeur.
     `href` absent est possible (un item de menu qui n'en porte pas) : <Link>
     l'interdit, <a> l'accepte — on retombe donc sur <a>, comme avant. */
  const interne = !!href && href.startsWith("/") && !href.startsWith("//");

  if (interne && href) {
    return (
      <Link href={href} {...reste}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} {...reste}>
      {children}
    </a>
  );
}
