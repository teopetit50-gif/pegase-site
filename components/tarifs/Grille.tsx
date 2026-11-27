/* ══════════════════════════════════════════════════════════════════════
   27/11/2026 — LES CARTES D'AGENTS PARTENT (pitch deck du 27/11 ; Teo :
   « tout remplacer »). Il ne reste ici que l'en-tête de page et les trois
   prix publics. Les quatre packs d'automatisations vivent dans
   components/tarifs/Packs.tsx. Le sélecteur PME | Groupes, qui ne
   distinguait que le chiffrage des agents, part avec eux ; le sur-mesure
   devient une ligne sous les packs. L'historique ci-dessous décrit
   l'ancienne grille.
   ══════════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════════
   /tarifs v4 — la grille : trois paliers, choix des postes DANS la carte
   (28/08/2026)

   Chaque carte est autonome : « Un poste » se choisit comme une radio,
   « Trois postes » coche jusqu'à trois cases, « Tout Omega » n'a rien à
   choisir. Le bouton reste éteint tant que le compte n'y est pas — il
   affiche ce qui manque plutôt qu'un « continuer » grisé muet.

   Le CTA n'ouvre PAS WhatsApp et ne demande aucun paiement : il emmène
   vers /installation, la page de réservation de la réunion d'installation,
   avec les postes choisis dans l'URL. Le client enregistre carte ou mandat
   SEPA sur l'écran « Créneau réservé » de /installation (Stripe, rien de
   débité), et le premier prélèvement part quand l'agence finalise
   l'installation.

   02/09 — MENSUEL | ANNUEL (Teo : « un bouton en haut des cards pour
   switch, un pourcentage en moins pour l'annuel, met en évidence le prix
   économisé »). L'état est UN pour la grille — pas un par carte : on ne
   compare pas un palier mensuel à un palier annuel. En annuel, chaque
   carte montre le mensuel barré, le mensuel équivalent en grand, « facturé
   N € par an » et la ligne verte « Vous économisez … ». Le CTA porte
   `&periodicite=annuel` : /installation le lit et le récap le reprend,
   modifiable jusqu'au bout. Les montants sont DÉRIVÉS de lib/paliers.ts
   (prixAnnuel & co), jamais écrits ici.

   03/09 (relecture) — la périodicité fait aussi le chemin RETOUR :
   « Modifier mes postes » sur /installation renvoie `?periodicite=annuel`
   et la grille le relit dans l'URL. Lecture par useSyncExternalStore
   plutôt que useSearchParams : la page /tarifs reste STATIQUE (prix dans
   le HTML servi, pas de bascule client jusqu'au Suspense) et il n'y a ni
   effet qui pose un état, ni divergence d'hydratation — React rend
   d'abord l'instantané serveur (mensuel), puis celui du navigateur.

   ═══ 14/09/2026, SECONDE PASSE DU JOUR — LE MODÈLE « PRICING-MODULE »
   (Teo, composant de référence fourni : module de prix shadcn à cartes
   cernées, interrupteur de facturation annuelle, listes à coches). Le
   design change, la mécanique de vente non (sélection exclusive, URL,
   périodicité, prix animés).

   Ce que la référence impose, et qui est repris :
     · l'en-tête repasse AU CENTRE — pastille, titre, chapô — après une
       matinée où il vivait à gauche (modèle « pricing-section-3 ») ;
     · le sélecteur segmenté Mensuel | Annuel devient UN INTERRUPTEUR
       (components/ui/switch) suivi de son libellé « Facturation
       annuelle » et de la pastille de remise : c'est le geste de la
       référence, et un choix binaire n'a pas besoin de deux boutons ;
     · les trois cartes sont UNIFORMES — filet, coins 12, ombre au survol,
       tête centrée avec une icône de 32 px, le nom, la promesse ; plus de
       cadre gris commun, plus de carte noire ;
     · la carte phare se détache comme sur la référence : filet d'encre,
       halo d'un pixel, ombre posée et pastille pleine ;
     · les pastilles « Recommandé » / « Le plus complet » passent EN HAUT
       DE CARTE, à cheval sur le filet (`-top-3`), là où la référence pose
       la sienne ;
     · le bloc de prix est centré, gros chiffre puis « par mois » ;
     · les listes reprennent le couple Aperçu / Points forts de la
       référence : les postes d'abord, les points du palier ensuite, tous
       à coches.

   Écarts assumés :
     1. LE BOUTON EST EN PIED DE CARTE, pas au-dessus des listes comme
        chez la référence. Ici le bouton dépend d'un choix qui se fait
        DANS la carte : le placer avant la liste des postes mettrait la
        commande au-dessus de ce qui l'active. En pied, il aligne aussi
        les trois CTA sur une même ligne (`mt-auto`), ce que la grille de
        la référence ne garantit pas.
     2. UN POSTE QUE LE QUOTA INTERDIT prend la croix de la référence
        (`X`, gris) mais PAS son texte barré : barré, il se lirait « exclu
        du palier » alors qu'il s'agit d'un état passager — il suffit de
        décocher un autre poste.
     3. LE `scale-[1.03]` DE LA RÉFÉRENCE N'EST PAS REPRIS. Trois cartes
        claires alignées : 3 % d'échelle ne se lit pas comme une mise en
        avant, il se lit comme un défaut d'alignement — le prix, le début
        des listes et le bouton de la carte du milieu tombent 7 à 20 px
        plus bas que ceux de ses voisines. C'est déjà ce qui avait fait
        retirer le `scale-105` du 09/09. Le filet d'encre, le halo,
        l'ombre et la pastille à l'étoile suffisent. En échange, les trois
        cartes partagent leurs rangées (`grid-rows-subgrid` dès lg) : tête,
        prix, listes et bouton tombent exactement sur les mêmes lignes,
        ce que la grille de la référence ne fait pas.
     4. Les jetons shadcn de la référence (`bg-background`, `text-primary`,
        `border-muted`, `text-muted-foreground`) ne peignent rien sur ce
        site : les couleurs de `.resa` sont écrites en clair (#050505,
        #3d3d3d, #616161, filet #e3e3e3).
     5. Le prix garde NumberFlow : les chiffres roulent à la bascule
        mensuel / annuel. La référence se contente d'une transition d'un
        tiers de seconde ; l'animation existait déjà ici et c'est elle qui
        rend la remise lisible.
     6. L'icône de tête est une icône lucide neutre par palier (Zap,
        Layers, Boxes), pas un logo de moteur : Teo a écarté les logos des
        postes le 09/09 (« c'est censé être simple »).

   Ce qui part avec cette passe : le cadre au dégradé gris, la carte
   noire, le sélecteur segmenté (`SelecteurPeriodicite`), le titre en
   rideau (`VerticalCutReveal`) et la cascade floutée (`TimelineContent`)
   — un en-tête centré n'a pas de rideau mot à mot, et les entrées
   repassent au `data-reveal` du site. Les deux composants restent au
   dépôt, d'autres pages s'en servent.
   ═══ 15/09/2026 — UNE QUATRIÈME CARTE : SUR MESURE (Teo)
   La grille affichait trois paliers chiffrés, et le sur-mesure n'existait
   qu'en cinquième ligne de chaque carte (07/09). Il devient une carte à
   part entière, en quatrième colonne, avec « Sur devis » là où les autres
   portent un montant — la règle de la v3 qui interdit d'afficher un prix
   quand plusieurs services se partagent la validation (PORTES) reprend sa
   place, visible, au lieu d'être reléguée au bandeau du dessous.

   Trois conséquences, toutes assumées :
     a. LA LIGNE SUR-MESURE SORT DES TROIS CARTES. Elle disait la même
        chose que la nouvelle carte, en plus petit et quatre fois ; les
        cartes étaient déjà jugées denses, et une colonne entière porte
        désormais le message. `SUR_MESURE` continue de servir /offres et
        la page Mon compte ; seule la ligne dans la grille part.
     b. LE PALIER N'ENTRE PAS DANS `PALIERS` (voir lib/paliers.ts) : cette
        liste est le barème, et le comparatif, `prixPour` et la fonction
        SQL en dépendent. La carte est rendue à part, ici.
     c. LA GRILLE PASSE À QUATRE COLONNES, mais seulement à partir de
        1280 px — à 1024 px quatre colonnes tombaient à 208 px de large.
        Entre les deux, deux colonnes de deux : la sous-grille qui aligne
        têtes, prix, listes et boutons s'applique alors sur DEUX bandes de
        quatre rangées (d'où le gabarit de huit rangées à `md`).
   Le comparatif du bas reste à trois colonnes : le sur-mesure répondrait
   « ça dépend » sur chacune de ses quinze lignes.

   ═══ 15/09/2026, SECONDE PASSE — LES DEUX MONDES (Teo : « un autre bouton
   pour changer le truc, soit on est PME soit grosse structure, ce qui
   changerait du coup les prix »). Un sélecteur segmenté Indépendant & PME |
   Grande structure est posé À CÔTÉ de l'interrupteur de facturation, et il
   bascule toute la page entre les deux portes de `PORTES` (voir le bloc
   MONDES / GRANDE_STRUCTURE de lib/paliers.ts pour l'arbitrage).

   Ce qui bascule, ici :
     · le titre, la pastille et le chapô ;
     · le prix des quatre cartes → « Sur devis », et la rangée « Compris
       dans le palier » → les points du devis (aucune promesse de la
       grille PME n'est reprise sans avoir été posée pour ce monde) ;
     · le bouton → « Réserver un diagnostic », toujours actif : le choix
       des postes reste offert mais ne conditionne plus rien, puisqu'il
       n'y a plus de commande à passer ;
     · la note de bas de grille, et le bandeau d'orientation.
   Ce qui DISPARAÎT côté grande structure : l'interrupteur mensuel /
   annuel, « Le quatrième poste pour N € de plus », et le comparatif du
   bas — quinze lignes de prix, de réunion de 45 minutes et de satisfait
   ou remboursé qui n'ont pas été promis de ce côté-là.
   La périodicité, elle, n'est pas remise à zéro : on revient côté PME
   avec la formule qu'on y avait laissée.

   Ce qui reste : « Le quatrième poste pour N € de plus » sur Tout Omega,
   tous les textes de Teo, l'ancre #grille et le scroll-mt, la sélection
   exclusive entre paliers, et les sections 2 et 3 (bandeau d'orientation,
   comparatif) telles quelles.
   → 15/09, TROISIÈME PASSE : l'état du monde SORT de ce fichier pour
   components/tarifs/monde.tsx. Il ne commandait que la grille, alors que le
   Chèque TIC et l'appel final, plus bas sur le même écran, continuaient de
   dire « Réserver un audit ». Ici, rien d'autre ne change : même lecture par
   useSyncExternalStore, même instantané serveur « pme », même page statique.
   ═══ 15/09/2026, PASSE DE REGISTRE — LE VOCABULAIRE D'UNE PAGE DE PRIX
   (Teo : « les phrases de la page tarif sont trop amateur ; il faut du
   plus pro, genre Qonto, des vrais SaaS, des termes précis »). Aucun fait
   nouveau, aucune promesse de plus, aucun montant touché : seul le
   registre change, sur toute la page.

   Ce que la passe applique, et qu'il ne faut pas défaire :
     · LE VOCABULAIRE DE LA FACTURATION remplace celui du récit —
       tarification à l'usage, volumétrie, pièce traitée, échéance,
       périmètre, plafond, résiliation, réversibilité, mise en service.
       « Satisfait ou remboursé » devient « garantie de remboursement
       sous 30 jours », « le point du matin » garde son nom mais s'annonce
       comme « rapport quotidien » dans un libellé de tableau.
     · LES CHUTES APHORISTIQUES SAUTENT. « Ce qui est à vous reste à
       vous », « nous avons intérêt à relancer juste, pas à relancer
       fort », « un prix affiché ne veut plus rien dire » disaient un ton,
       pas un mécanisme (doctrine §12, règles 5 et 6).
     · LES VERBES D'ACTION REMPLACENT LES VERBES DE CHOIX dans les
       commandes : « Sélectionnez un poste », « Renseignez vos volumes ».
     · « ça », « on » et les fragments nominaux sortent de la prose rendue
       (ils restent dans ces commentaires, qui ne s'affichent pas).
   La charte est la partie III de OMEGA/DOCTRINE-TEXTES-SAAS.md.
   ═══════════════════════════════════════════════════════════════════════ */

/* ═══ 25/11/2026 — LA CHARTE DE L'ACCUEIL (docs/charte-accueil.md, § 4.2,
   ligne 5). Le dessin change, la mécanique non : sélection exclusive entre
   paliers, quotas, URL de l'audit, bascule des deux mondes, textes.
     · le héros centré (HeroSection) devient l'en-tête de page de l'accueil
       (EnTeteSection niveau 1, disposition « côte ») : pastille « Tarifs »,
       titre en deux tons, chapô à droite, bouton blanc ;
     · les trois prix publics et les quatre cartes d'agents deviennent des
       colonnes jointives séparées par des filets, sur le modèle de la
       grille de prix de l'accueil (nom en 22 / 450, description grise,
       pied à filet) — plus de cartes blanches espacées ni d'ombres ;
     · les pastilles de palier passent dans la rangée du nom (la sombre
       pour la carte phare), les icônes de tête partent ;
     · tous les boutons sont les `ch-btn` blancs du kit ; le sélecteur
       PME | Groupes prend la piste #eeeee8 de l'accueil, l'état actif en
       blanc. Le dessin vit dans components/charte/pages/tarifs.css. ═══ */

import Section from "@/components/charte/Section";
import EnTeteSection from "@/components/charte/EnTeteSection";
import Bouton from "@/components/charte/Bouton";
import TroisPrix from "@/components/tarifs/TroisPrix";

export default function Grille() {
  return (
    /* 25/11/2026 — charte de l'accueil : le héros est l'en-tête de page
       (h1 en deux tons), les trois prix publics tombent dessous, dans la
       même section. 27/11 : l'ERP s'écrit « ERX », comme dans le deck. */
    <Section>
      <EnTeteSection
        niveau={1}
        haut
        disposition="pile"
        pastille="Tarifs"
        titre="Un prix simple."
        suite={"34,90 € par utilisateur et par mois."}
        chapo={"Tout l'ERX est compris, des ventes à la comptabilité, dès le premier utilisateur. Les automatisations se prennent par pack\u00a0: l'installation se paie une fois, à partir de 1\u00a0750 €, puis l'IA se paie à la pièce. Prix hors taxes."}
        actions={
          <>
            <Bouton href="/reserver-un-audit" icone="calendrier">
              Réserver un audit
            </Bouton>
            <p className="tf-souscta">30 minutes, gratuit, sans engagement</p>
          </>
        }
      />
      <TroisPrix />
    </Section>
  );
}
