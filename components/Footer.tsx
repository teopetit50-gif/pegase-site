import Link from "next/link";

/* Footer v4 (22/07, Teo : « pro c'est genre rien, y a trop de trucs ») —
   réduction à l'os. Une seule rangée : le copyright à gauche, trois liens à
   droite. Ont été retirés : le pégase, la signature « Omega » + sa ligne de
   positionnement, les liens Audit gratuit / Démo / Articles (tous atteignables
   depuis le header et le corps des pages), les deux réseaux (ils pointaient
   sur /contact, pas sur des profils) et la pastille de statut. Mentions
   légales reste : c'est une obligation, pas une décoration. */

const LIENS: { label: string; href: string }[] = [
  { label: "Nos offres", href: "/offres" },
  { label: "Intégrations", href: "/integrations" },
  /* 17/09 — « L'application » retirée du pied (demande de Teo). La page
     /application reste en ligne : elle est appelée par Mon compte, l'écran
     « Créneau réservé » et l'e-mail de bienvenue du cockpit, ainsi que par
     la ligne « Installer l'application » de /contact. */
  /* 08/09 — « Service client » : la page /contact, WhatsApp + contact@omegaai.fr.
     Le lien WhatsApp du pied reste, c'est le geste le plus court. */
  { label: "Service client", href: "/contact" },
  /* 07/08 — quatrième entrée, malgré la règle « à l'os » du 22/07. La page
     /vos-donnees n'est appelée par rien d'autre : elle n'est pas dans le
     header (qui ne porte que des entrées commerciales) et aucune page ne la
     cite. Le pied est le seul endroit où on la cherche — c'est là qu'un
     client va lire les mentions légales, et c'est la même question. */
  { label: "Où vont vos données", href: "/vos-donnees" },
];

/* 24/09 — le pied passe au BLANC (Teo : « change la section noire en blanc,
   et ça sur tout le site »). Il n'avait pas de fond à lui : il laissait voir
   le `bg-panel` noir de PageShell, colonne de 1440 et bandes latérales
   comprises. Il sort donc du cadre en 100vw (même technique que le hero
   de /offres ; l'`overflow-x-clip` de PageShell absorbe la barre) et remet
   son contenu dans la colonne de 1440. */
export default function Footer() {
  return (
    <footer className="mx-[calc(50%-50vw)] border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-6 py-10 text-[13px] sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div className="text-neutral-500">© 2026 Omega.AI</div>
        <nav className="flex flex-wrap items-center gap-x-7 gap-y-2">
          {LIENS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-neutral-500 transition hover:text-neutral-900"
            >
              {l.label}
            </Link>
          ))}
          {/* 08/09 — le lien WhatsApp du pied part : « Service client »
              (/contact) le remplace, avec les deux canaux. */}
        </nav>
      </div>
    </footer>
  );
}
