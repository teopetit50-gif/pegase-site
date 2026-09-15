import Link from "next/link";
import { cn } from "@/lib/cn";
import "./AppelOutil.css";

/* ══════════════════════════════════════════════════════════════════════
   <AppelOutil> — dernière section de /integrations, « l'outil manquant »
   (14/09/2026)

   ORIGINE. Bloc `cta4` de shadcnblocks : dans une carte plate `bg-muted`,
   deux blocs mis en regard par `flex-col md:flex-row justify-between` — à
   gauche titre, chapô et bouton primaire fléché ; à droite une colonne de
   cinq avantages précédés d'un `Check` de lucide.

   POURQUOI ICI. La carte actuelle est centrée, et c'est la troisième
   section d'affilée à l'être : le bouton finit posé dans un vide, sans rien
   qui l'amène. `cta4` apporte ce qui manque à une dernière section — une
   composition ASYMÉTRIQUE, la phrase à gauche, l'action sur son propre axe
   ancrée au bord droit. L'œil descend le chapô puis part vers le bouton au
   lieu de retomber dessus. C'est aussi le seul des deux blocs proposés qui
   tienne sans image : `cta11` est bâti autour d'un visuel `md:max-w-md`,
   nous n'en avons aucun, et l'y mettre reviendrait à inventer ou à
   re-servir la capture d'une autre page. Privé d'image, `cta11` n'est plus
   que la carte d'aujourd'hui plus une pastille d'icône.

   CE QUI EST JETÉ. La colonne de cinq avantages, soit la moitié droite de
   la source : toute étiquette que nous y écririons serait inventée, ou la
   redite des quatre étapes de la section 3 — c'est le BOUTON qui prend sa
   place dans le regard. Partent avec elle les `Check`, la `ArrowRight` du
   bouton (ici le primaire n'en porte pas, seul le fantôme du hero a un
   chevron), le bouton secondaire, `bg-muted` / `text-muted-foreground` et
   `container` (inexistants ici), le `py-32`, le `max-w-5xl` imbriqué et le
   jeu de props par défaut : les textes sont ceux de la page.

   ÉCARTS ASSUMÉS. La carte passe de `.o-card` (blanche, ombre à quatre
   passes) à `.o-card-soft` — le contenant des quatre cartes juste au-dessus,
   donc aucun troisième type de carte ni l'ombre que la charte refuse. La
   matière ajoutée est la trame `.o-dots` à 5,5 % d'encre, masquée en quart
   de cercle dans le coin bas-droit : le seul coin mort des deux mises en
   page, et la seule des trois pistes qui n'ajoute ni un mot ni un second
   trait. Bascule à deux colonnes à `lg` et non à `md` comme la source : à
   768 px le titre tombait sur trois lignes. Les trois `data-reveal` restent
   sur les trois mêmes blocs — <PageMotion> les anime, rien d'ajouté ici ; la
   trame en est exclue, elle doit être là sans JavaScript. Seul écart au
   texte : l'insécable devant le point d'interrogation.
   ══════════════════════════════════════════════════════════════════════ */

export default function AppelOutil({ className }: { className?: string }) {
  return (
    <section data-monde="clair" className={cn("pb-[120px]", className)}>
      <div className="o-wrap">
        <div className="o-card-soft px-8 py-12 sm:px-12 sm:py-14 lg:px-16 lg:py-16">
          {/* la trame : posée avant le corps, clipée par l'arrondi de la
              carte (`.o-card-soft` est en overflow hidden), jamais révélée */}
          <div aria-hidden className="o-dots am-trame" />

          {/* `relative` obligatoire : sans lui le corps, non positionné,
              se peindrait SOUS la trame, qui est absolue (même piège que
              `.o-num-fantome` dans globals.css) */}
          <div className="relative flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-14">
            <div className="max-w-[620px]">
              <h2 data-reveal className="o-h2">
                Votre outil n&apos;est pas dans la liste&nbsp;?
              </h2>
              <p data-reveal className="o-lead mt-5">
                Cette liste recense ce qui est déjà raccordé, pas une limite. Dès qu&apos;un outil expose ses données, un système peut s&apos;y connecter. Dans le cas contraire, nous le disons pendant le diagnostic, pas après.
              </p>
            </div>
            <div data-reveal className="shrink-0">
              <Link href="/commencer" className="o-btn o-btn--primary">
                En parler lors du diagnostic
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
