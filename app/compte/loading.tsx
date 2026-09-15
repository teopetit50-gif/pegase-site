import { Loader } from "@/components/ui/loader";

/* ══════════════════════════════════════════════════════════════════════
   /compte — l'écran d'attente (15/09/2026)

   La route est servie dynamiquement : elle lit la session puis quatre
   tables avant de rendre quoi que ce soit. Sans ce fichier, Next n'a rien
   à montrer pendant ce temps et le navigateur RESTE sur la page
   précédente — un clic sans effet visible, le reproche le plus courant
   sur un espace client.

   Le fond et la hauteur recopient ceux de la coque
   (`components/compte/coque.css` : #f6f6f5, `100dvh` moins un header de
   64 px, 72 à partir de `sm`) pour que le passage à l'écran réel ne
   saute pas. L'entête caméléon prélève la couleur sous lui à l'intérieur
   de <main> : ce fond clair suffit à le faire passer en verre clair, ici
   comme sur la page qui suit.

   Le témoin s'annonce ici (pas d'`aria-hidden`) : il est seul, aucun
   texte ne dit l'attente à sa place.
   ══════════════════════════════════════════════════════════════════════ */

export default function ChargementCompte() {
  return (
    <main className="flex min-h-[calc(100dvh-64px)] w-full items-center justify-center bg-[#f6f6f5] text-[#050505] sm:min-h-[calc(100dvh-72px)]">
      <Loader size="lg" aria-label="Chargement de votre compte…" />
    </main>
  );
}
