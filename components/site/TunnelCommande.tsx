"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ConnexionInline from "@/components/compte/ConnexionInline";
import MiniSite from "@/components/modeles/MiniSite";
import {
  CATEGORIES,
  MODELES,
  parCategorie,
  type Modele,
} from "@/components/modeles/donnees";
import {
  signalerSession,
  utilisateurDepuis,
  type Utilisateur,
} from "@/lib/compte";
import { SECTEURS } from "@/lib/creneaux";
import {
  BUCKET_BRIEFS,
  ERREURS_SITE,
  MAX_IMAGES,
  OBJECTIFS,
  PAGES_SITE,
  PRIX_SITE_EUR,
  TAILLE_MAX_OCTETS,
  TYPES_ACCEPTES,
  cheminBrief,
  commander,
  type InfosBrief,
} from "@/lib/site-commande";
import { createClient } from "@/lib/supabase/client";
import "./TunnelCommande.css";

/* ══════════════════════════════════════════════════════════════════════
   <TunnelCommande> — le tunnel de /site/commande, refait sur la SAISIE
   (15/09/2026)

   ORIGINE. Deux pièces de la bibliothèque, lues avant d'écrire.
   `reactbits/Stepper` (chiffres-et-statistiques) donne le fil conducteur :
   un rail de pastilles reliées, un connecteur qui se remplit derrière
   l'étape franchie, une pastille active qui se distingue de l'à-venir.
   `shadcn/field` (formulaires-et-saisie) donne la discipline de formulaire
   qui manquait : des champs GROUPÉS sous une légende, une description
   rattachée au champ, et surtout une erreur portée par un élément
   `role="alert"` — dans la source c'est `FieldError`, ici c'est le bandeau
   `.rv-erreur` qui reçoit enfin ce rôle.

   POURQUOI ICI. /site/commande engage une commande à 990 €, et le rendu du
   07/09 (components/site/CommandeSite.tsx) était déjà juste sur le fond :
   un panneau, un rail d'étapes, cinq blocs numérotés. Ce qui manquait
   n'était pas de la forme en plus, c'était trois manques de FOND de
   formulaire — ce composant ne traite QUE ceux-là :
     1. sur téléphone, le modèle acheté disparaissait dès le premier
        défilement du brief : le récapitulatif n'était collant qu'à partir
        de 1024 px. Une barre collante (.tn-barre) porte désormais la
        vignette, le nom et le prix tout au long de la saisie ;
     2. aucune erreur d'envoi n'était annoncée : `messageErreur` était un
        `<p>` muet. Quatre bandeaux reçoivent `role="alert"`, et une région
        `aria-live` permanente dit l'étape courante et l'envoi en cours ;
     3. le bouton d'envoi était éteint sans dire pourquoi. Il reste éteint
        — la règle ne bouge pas d'un caractère — mais une ligne annoncée le
        motive, rattachée au bouton par `aria-describedby`.
   Le reste (deux colonnes, rail, blocs 01-05, puces, zones de dépôt) est
   repris tel quel, dans les classes existantes de app/globals.css.

   CE QUI EST JETÉ. Du Stepper : tout, sauf le dessin. Son état interne
   (`currentStep`) ferait doublon avec `etape`, qui est déjà piloté par la
   session et par les erreurs du serveur ; son `StepContentWrapper` pose le
   contenu en `position:absolute` dans une hauteur mesurée, ce qu'un
   formulaire qui grandit (huit vignettes d'images, un bandeau d'erreur)
   fait mentir à chaque frappe ; sa `SlideTransition` remonte la hauteur au
   parent depuis un `useLayoutEffect` — un setState d'effet, que l'ESLint du
   dépôt refuse. Ses boutons Back/Complete et ses pastilles cliquables
   partent aussi : on ne saute pas à « Paiement » en cliquant une pastille.
   Du `shadcn/field` : `cva`, `class-variance-authority`, les `data-slot`,
   les requêtes de conteneur `@md/field-group` et les jetons shadcn, absents
   de ce dépôt — seuls restent le groupement natif et `role="alert"`.

   ÉCARTS ASSUMÉS. AUCUNE ligne de logique n'est retouchée : état, dépôt des
   fichiers, `commander()`, relecture du jeton, pot de miel, garde synchrone
   contre le double envoi, `onAuthStateChange`, `lancerPaiement` et le point
   d'accroche Stripe sont recopiés au caractère près depuis CommandeSite.
   Remplaçant à prise identique : mêmes props, même rendu d'étapes — la page
   n'a qu'un import à changer. Aucune dépendance ajoutée, aucun `@keyframes`
   (la page anime déjà, et `.rv-apparait` existe). Deux mots sont ajoutés au
   texte, signalés au rapport : « (obligatoire) » sur le seul champ requis,
   et la phrase qui motive le bouton éteint.
   ══════════════════════════════════════════════════════════════════════ */

type Etape = "modele" | "compte" | "brief" | "paiement";

/* 07/09 — le filtre de la grille : les quatre familles du catalogue, en
   un mot chacune (les titres de CATEGORIES font une phrase) */
const FAMILLES_COURTES: Record<Modele["cat"], string> = {
  chantier: "Réalisations",
  rendezvous: "Réservation",
  cabinet: "Expertise",
  produit: "Service en ligne",
};

const LIBELLES_ETAPES: Record<Etape, string> = {
  modele: "Votre modèle",
  compte: "Votre compte",
  brief: "Votre brief",
  paiement: "Paiement",
};

/* un fichier choisi, avant et après dépôt */
type Piece = {
  id: string;
  fichier: File;
  /* URL d'objet pour l'aperçu — null pour un PDF */
  apercu: string | null;
};

type Props = {
  /* la session lue côté serveur (app/site/commande/page.tsx) ; null :
     personne de connecté */
  utilisateur: Utilisateur | null;
  /* ?modele=<slug>, déjà vérifié par la page */
  modeleInitial?: string;
};

/* un identifiant de dossier — crypto.randomUUID n'existe qu'en contexte
   sécurisé (https, localhost) ; ailleurs, un repli suffisant pour nommer
   un dossier */
function nouveauDossier(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function verifierFichier(f: File): string | null {
  if (!TYPES_ACCEPTES.includes(f.type)) {
    return `« ${f.name} » n'est pas accepté : PNG, JPEG, WebP, SVG ou PDF seulement.`;
  }
  if (f.size > TAILLE_MAX_OCTETS) {
    return `« ${f.name} » dépasse 10 Mo.`;
  }
  return null;
}

function tailleLisible(octets: number): string {
  if (octets < 1024 * 1024)
    return `${Math.max(1, Math.round(octets / 1024))} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

export default function TunnelCommande({ utilisateur, modeleInitial }: Props) {
  const [util, setUtil] = useState<Utilisateur | null>(utilisateur ?? null);
  const [etape, setEtape] = useState<Etape>("modele");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [commandeId, setCommandeId] = useState<string | null>(null);

  /* ——— a) le modèle ——— */
  const [slug, setSlug] = useState<string | null>(() =>
    MODELES.some((m) => m.slug === modeleInitial)
      ? (modeleInitial as string)
      : null,
  );
  const modele: Modele | null = MODELES.find((m) => m.slug === slug) ?? null;

  /* 02/09 (Teo : « quand on choisit un modèle, les autres doivent se
     replier — devoir défiler jusqu'à Continuer, c'est pas pro ») — dès
     qu'un modèle est choisi, la grille des modèles se REPLIE sur le
     modèle retenu, avec « Continuer » juste à côté ; « Choisir un autre
     modèle » rouvre la grille. Pré-sélectionné depuis la galerie
     (?modele=) : on arrive directement replié. */
  const [grilleOuverte, setGrilleOuverte] = useState<boolean>(
    () => !MODELES.some((m) => m.slug === modeleInitial),
  );
  const refEtapeModele = useRef<HTMLDivElement | null>(null);
  /* 07/09 — la famille affichée dans la grille (« tous » = tout le catalogue) */
  const [famille, setFamille] = useState<"tous" | Modele["cat"]>("tous");
  const choisirModele = (s: string) => {
    setSlug(s);
    setErreur(null);
    setGrilleOuverte(false);
    /* la grille vient de se replier : on ramène le haut de l'étape à
       l'écran, sous le header collant (scroll-mt), sans animation si
       l'utilisateur demande moins de mouvement */
    const reduit = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.requestAnimationFrame(() =>
      refEtapeModele.current?.scrollIntoView({
        block: "start",
        behavior: reduit ? "auto" : "smooth",
      }),
    );
  };

  /* ——— c) le brief ——— */
  const [b, setB] = useState({
    entreprise: util?.entreprise ?? "",
    secteur: "",
    telephone: util?.telephone ?? "",
    commune: "",
    activite: "",
    ambiance: "",
    domaine: "",
    reseaux: "",
    informations: "",
    site_web: "", // pot de miel — un humain ne le voit jamais
  });
  const [objectifs, setObjectifs] = useState<string[]>([]);
  const [pages, setPages] = useState<string[]>([
    "accueil",
    "prestations",
    "contact",
  ]);
  const [logo, setLogo] = useState<Piece | null>(null);
  const [images, setImages] = useState<Piece[]>([]);
  const [erreurFichier, setErreurFichier] = useState<string | null>(null);
  const maj =
    (cle: keyof typeof b) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setB((prev) => ({ ...prev, [cle]: e.target.value }));
  const cocher = (
    liste: string[],
    poser: (l: string[]) => void,
    valeur: string,
  ) =>
    poser(
      liste.includes(valeur)
        ? liste.filter((x) => x !== valeur)
        : [...liste, valeur],
    );

  /* le dossier temporaire du brief dans le bucket — un par ouverture du
     brief, jamais régénéré : un fichier déjà déposé garde son chemin */
  const dossier = useRef<string | null>(null);
  /* chemins déjà déposés, par pièce — pour ne pas renvoyer un fichier si
     la commande échoue après le dépôt et qu'on réessaie */
  const deposes = useRef(new Map<string, string>());
  /* toutes les URL d'aperçu créées, à libérer au démontage */
  const urls = useRef<string[]>([]);
  useEffect(() => {
    const liste = urls.current;
    return () => liste.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const nouvellePiece = (f: File): Piece => {
    const apercu = f.type === "application/pdf" ? null : URL.createObjectURL(f);
    if (apercu) urls.current.push(apercu);
    return {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      fichier: f,
      apercu,
    };
  };

  const choisirLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const pb = verifierFichier(f);
    setErreurFichier(pb);
    if (pb) return;
    setLogo(nouvellePiece(f));
  };

  const ajouterImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const choisis = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!choisis.length) return;
    const place = MAX_IMAGES - images.length;
    if (place <= 0) {
      setErreurFichier(`${MAX_IMAGES} images au plus.`);
      return;
    }
    const gardes: Piece[] = [];
    let pb: string | null = null;
    for (const f of choisis) {
      const p = verifierFichier(f);
      if (p) {
        pb = pb ?? p;
        continue;
      }
      if (gardes.length < place) gardes.push(nouvellePiece(f));
      else
        pb =
          pb ??
          `${MAX_IMAGES} images au plus : les dernières n'ont pas été ajoutées.`;
    }
    setErreurFichier(pb);
    if (gardes.length) setImages((prev) => [...prev, ...gardes]);
  };

  const retirerImage = (id: string) =>
    setImages((prev) => prev.filter((p) => p.id !== id));

  /* ——— la session ——— */

  /* la connexion (inline, ou dans un autre onglet) : on retient
     l'utilisateur, on remplit ce qui vient du profil sans écraser ce qui
     est déjà tapé, et si on attendait à l'étape « compte », on passe au
     brief. Appelée depuis les rappels, jamais depuis un effet. */
  const connecter = (u: Utilisateur | null) => {
    setUtil(u);
    if (!u) return;
    setB((prev) => ({
      ...prev,
      entreprise: prev.entreprise || u.entreprise || "",
      telephone: prev.telephone || u.telephone || "",
    }));
    setEtape((e) => {
      if (e !== "compte") return e;
      dossier.current ??= nouveauDossier();
      return "brief";
    });
  };

  useEffect(() => {
    const { data } = createClient().auth.onAuthStateChange((evt, session) => {
      /* INITIAL_SESSION sans session : le serveur a peut-être vu un jeton
         valide dans les cookies — on ne contredit pas le rendu initial sur
         un événement qui ne prouve rien. Tout autre événement fait foi. */
      if (evt === "INITIAL_SESSION" && !session) return;
      const u = session?.user ? utilisateurDepuis(session.user) : null;
      /* 02/09 (bug vu par Teo : « la création de compte ne demande pas de
         mot de passe ») — le code à six chiffres ouvre la session AVANT
         que le mot de passe soit choisi : SIGNED_IN arrivait ici, on tenait
         la personne pour connectée et l'étape passait au brief, en
         démontant le module avant son écran « Votre mot de passe ». Une
         session SANS mot de passe défini n'est donc pas prise ici : le
         module la termine lui-même et prévient par onConnecte ; le
         USER_UPDATED qui suit l'enregistrement du mot de passe repasse par
         ici avec le drapeau posé. */
      if (u && !u.mdpDefini) return;
      connecter(u);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  /* « Ce n'est pas vous ? » — sortir d'une session prise dans un autre
     onglet sans quitter la page : le modèle et le brief restent. */
  const [changement, setChangement] = useState(false);
  const changerDeCompte = async () => {
    if (changement) return;
    setChangement(true);
    try {
      await createClient().auth.signOut();
    } catch {
      /* déjà déconnecté, ou réseau absent : on se déconnecte quand même
         localement — l'envoi exigera un vrai jeton */
    }
    setChangement(false);
    setErreur(null);
    connecter(null);
    signalerSession();
    setEtape("compte");
  };

  /* ——— les transitions ——— */
  const ouvrirBrief = () => {
    dossier.current ??= nouveauDossier();
    setErreur(null);
    setEtape("brief");
  };
  const continuerDepuisModele = () => {
    if (!modele) return;
    setErreur(null);
    if (util) ouvrirBrief();
    else setEtape("compte");
  };

  /* ══ POINT D'ACCROCHE STRIPE (02/09) ═════════════════════════════════
     Aujourd'hui : la commande est enregistrée (statut a_payer) et cet
     écran dit la vérité — le paiement en ligne n'existe pas encore, Teo
     appelle pour régler et lancer la production.
     Demain, quand Stripe sera connecté : cette fonction demandera une
     session Stripe Checkout à un Route Handler (POST /api/stripe/checkout,
     à créer — la clé secrète ne quitte pas le serveur) avec
     client_reference_id = commandeId, puis redirigera vers l'URL de la
     session ; le webhook Stripe passera la ligne à `paye` (colonnes
     stripe_checkout_id / stripe_payment_intent déjà en base). L'écran
     ci-dessous deviendra alors le retour « paiement reçu ».
     ═══════════════════════════════════════════════════════════════════ */
  const lancerPaiement = (id: string) => {
    setCommandeId(id);
    setEtape("paiement");
  };

  /* ——— l'envoi ——— */
  const briefOk = Boolean(
    modele && b.entreprise.trim() && b.entreprise.trim().length <= 120,
  );
  /* garde SYNCHRONE contre le double envoi : un état React ne l'est pas
     (voir PriseDeCreneau, revue du 02/09 n° 2) */
  const enCours = useRef(false);

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!briefOk || envoi || enCours.current) return;
    enCours.current = true;
    setEnvoi(true);
    setErreur(null);
    try {
      await envoyerVraiment();
    } finally {
      enCours.current = false;
      setEnvoi(false);
    }
  };

  const envoyerVraiment = async () => {
    if (!modele) return;
    /* robot pris au pot de miel : on fait comme si tout allait bien, sans
       rien écrire nulle part */
    if (b.site_web) {
      setEtape("paiement");
      return;
    }
    if (!util) {
      setErreur("connexion_requise");
      return;
    }
    const { data } = await createClient().auth.getSession();
    const jeton = data.session?.access_token;
    if (!jeton) {
      setUtil(null);
      setErreur("connexion_requise");
      return;
    }

    /* les fichiers d'abord — dans le dossier du compte, sinon la fonction
       SQL les refuserait de toute façon (fichier_invalide) */
    const dossierId = (dossier.current ??= nouveauDossier());
    const stockage = createClient().storage.from(BUCKET_BRIEFS);
    const deposer = async (
      p: Piece,
      prefixe: string,
    ): Promise<string | null> => {
      const deja = deposes.current.get(p.id);
      if (deja) return deja;
      const chemin = cheminBrief(util.id, dossierId, prefixe, p.fichier.name);
      const { error } = await stockage.upload(chemin, p.fichier, {
        contentType: p.fichier.type,
        upsert: false,
      });
      if (error) return null;
      deposes.current.set(p.id, chemin);
      return chemin;
    };

    let cheminLogo: string | null = null;
    if (logo) {
      cheminLogo = await deposer(logo, "logo");
      if (!cheminLogo) {
        setErreur("televersement");
        return;
      }
    }
    const cheminsImages: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const c = await deposer(images[i], `image-${i + 1}`);
      if (!c) {
        setErreur("televersement");
        return;
      }
      cheminsImages.push(c);
    }

    const infos: InfosBrief = {
      activite: b.activite.trim() || undefined,
      objectifs: objectifs.length ? objectifs : undefined,
      pages: pages.length ? pages : undefined,
      ambiance: b.ambiance.trim() || undefined,
      domaine: b.domaine.trim() || undefined,
      reseaux: b.reseaux.trim() || undefined,
      informations: b.informations.trim() || undefined,
    };

    const rep = await commander(
      {
        modele: modele.slug,
        entreprise: b.entreprise.trim(),
        secteur: b.secteur || undefined,
        telephone: b.telephone.trim() || undefined,
        commune: b.commune.trim() || undefined,
        infos,
        logo: cheminLogo,
        images: cheminsImages,
      },
      jeton,
    );

    if (rep.ok) {
      /* entreprise et téléphone rangés sur le compte pour la prochaine
         fois — au mieux, sans bloquer : la commande est déjà enregistrée */
      const profil = {
        entreprise: b.entreprise.trim(),
        telephone: b.telephone.trim() || undefined,
      };
      if (
        profil.entreprise !== (util.entreprise ?? "") ||
        (profil.telephone ?? "") !== (util.telephone ?? "")
      ) {
        void createClient()
          .auth.updateUser({ data: profil })
          .catch(() => {});
      }
      lancerPaiement(rep.id);
      return;
    }
    setErreur(rep.erreur);
    /* la session a sauté entre-temps : retour au module de connexion, le
       modèle et le brief restent */
    if (rep.erreur === "connexion_requise") {
      setUtil(null);
      setEtape("compte");
    }
    if (rep.erreur === "modele_invalide") setEtape("modele");
  };

  /* ——— le fil d'étapes : « Votre compte » n'y est que sans session ——— */
  const cles: Etape[] = util
    ? ["modele", "brief", "paiement"]
    : ["modele", "compte", "brief", "paiement"];
  const idxEtape = Math.max(0, cles.indexOf(etape));

  const messageErreur = erreur
    ? (ERREURS_SITE[erreur] ?? ERREURS_SITE.reseau)
    : null;

  /* 07/09 — la grille se filtre par famille (les quatre du catalogue),
     au lieu d'empiler toutes les cartes sous quatre intertitres */
  const visibles = famille === "tous" ? MODELES : parCategorie(famille);
  const familleCourante = CATEGORIES.find((c) => c.cle === famille) ?? null;

  const revenirAuModele = () => {
    setErreur(null);
    setEtape("modele");
  };

  /* la jauge du rail : calculée au RENDU, donc juste dès le HTML du serveur
     — aucun script ne vient l'ajouter après coup */
  const avancement = Math.round(((idxEtape + 1) / cles.length) * 100);

  /* la seule région qui parle toute seule : elle dit où l'on en est, et que
     l'envoi est parti. Dérivée du rendu — pas un setState d'effet. */
  const annonce = envoi
    ? "Envoi de votre commande en cours."
    : etape === "paiement"
      ? "Commande enregistrée."
      : `Étape ${idxEtape + 1} sur ${cles.length} : ${LIBELLES_ETAPES[etape]}.`;

  const numeroEtape = (
    <div className="tn-numero">
      Étape {idxEtape + 1} sur {cles.length}
    </div>
  );

  /* ——— le récapitulatif : UN seul objet, servi deux fois ———
     · au-dessus de 1024 px, la colonne collante (tn-flanc-tete visible) ;
     · en dessous, sa tête laisse la place à la barre collante .tn-barre et
       seule la suite (chèque TIC, mention de l'offre) reste en flux.
     Aucun des deux n'est jamais dans l'arbre d'accessibilité en même temps
     que l'autre : celui qui ne sert pas est en `display: none`. */
  const recap = (
    <aside className="tn-flanc">
      <div className="tn-flanc-collant">
        <div className="tn-flanc-tete">
          <div className="tn-flanc-titre">Votre commande</div>
          {modele ? (
            <div className="tn-flanc-modele">
              <MiniSite
                m={modele}
                ton="clair"
                sizes="(max-width: 1024px) 90vw, 300px"
              />
              <div className="tn-flanc-ligne">
                <span className="tn-flanc-nom">{modele.nom}</span>
                {etape !== "paiement" ? (
                  <button
                    type="button"
                    onClick={revenirAuModele}
                    className="tn-lien-court"
                    aria-label="Modifier le modèle choisi"
                  >
                    Modifier
                  </button>
                ) : null}
              </div>
              <p className="tn-flanc-style">{modele.style}</p>
            </div>
          ) : null}
          <dl className="tn-flanc-prix">
            <div className="tn-flanc-rangee">
              <dt>Site catalogue</dt>
              <dd className="num">{PRIX_SITE_EUR}&nbsp;€</dd>
            </div>
          </dl>
          <p className="tn-note">TTC, une fois — pas d&apos;abonnement</p>
        </div>

        <div className="tn-flanc-suite">
          <div className="tn-flanc-sous">Chèque TIC</div>
          <p className="tn-flanc-texte">
            Si vous êtes éligible, il reste de 198 à 594&nbsp;€ à votre charge
            selon le taux financé. On le vérifie avec vous, avant tout
            règlement.
          </p>
          <p className="tn-note tn-note--bas">
            Contenu réécrit à votre métier, nom de domaine compris la première
            année.{" "}
            <Link href="/tarifs/site" className="tn-lien-souligne">
              Le détail de l&apos;offre
            </Link>
          </p>
        </div>
      </div>
    </aside>
  );

  /* la barre collante de téléphone et tablette : ce qu'on achète, visible
     pendant toute la saisie — c'était le trou du rendu du 07/09 */
  const barre =
    etape !== "paiement" ? (
      <div className="tn-barre">
        {modele ? (
          <div className="tn-barre-vignette">
            <MiniSite m={modele} ton="clair" cadre={false} sizes="56px" />
          </div>
        ) : null}
        <div className="tn-barre-texte">
          <span className="tn-barre-nom">
            {modele ? modele.nom : "Votre commande"}
          </span>
          <span className="tn-barre-prix num">
            {PRIX_SITE_EUR}&nbsp;€ TTC
          </span>
        </div>
        {modele ? (
          <button
            type="button"
            onClick={revenirAuModele}
            className="tn-lien-court tn-barre-modifier"
            aria-label="Modifier le modèle choisi"
          >
            Modifier
          </button>
        ) : null}
      </div>
    ) : null;

  return (
    <div className="tn-panneau">
      {/* la seule région qui parle : étape courante, envoi en cours */}
      <p className="tn-sr" role="status" aria-live="polite">
        {annonce}
      </p>

      {/* ═══ le rail d'étapes — en tête du panneau ═══ */}
      <div className="tn-rail">
        <ol className="cs-etapes" aria-label="Étapes de la commande">
          {cles.map((c, i) => (
            <li key={c} className="contents">
              {i > 0 ? (
                <span
                  aria-hidden
                  className="cs-etape-lien"
                  data-fait={i <= idxEtape}
                />
              ) : null}
              <span
                className="cs-etape"
                data-etat={
                  i === idxEtape ? "active" : i < idxEtape ? "faite" : "avenir"
                }
                aria-current={i === idxEtape ? "step" : undefined}
              >
                <i>
                  {i < idxEtape ? (
                    <svg
                      width="10"
                      height="8"
                      viewBox="0 0 10 8"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M1 4 3.8 6.8 9 1.2"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </i>
                <span className="cs-etape-nom">{LIBELLES_ETAPES[c]}</span>
              </span>
            </li>
          ))}
        </ol>
        {/* le doublon visuel du rail, pour les largeurs où les noms des
            étapes à venir s'effacent. Décoratif : le <ol> ci-dessus reste
            la seule source lue à voix haute. */}
        <div className="tn-jauge" aria-hidden>
          <span
            className="tn-jauge-remplie"
            style={{ width: `${avancement}%` }}
          />
        </div>
      </div>

      <div className="tn-scene">
        {/* ——— a) le modèle ——— */}
        {etape === "modele" ? (
          <div ref={refEtapeModele} className="rv-apparait scroll-mt-24">
            {/* ——— replié : le modèle retenu, et Continuer sans défiler ——— */}
            {modele && !grilleOuverte ? (
              <div className="rv-apparait grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr] lg:items-center lg:gap-12">
                <MiniSite
                  m={modele}
                  ton="clair"
                  priority
                  sizes="(max-width: 1024px) 90vw, 420px"
                />
                <div>
                  {numeroEtape}
                  <div className="tn-suretitre">Votre modèle</div>
                  <h3 className="r-h4 mt-2">{modele.nom}</h3>
                  <p className="mt-1 text-[14px] leading-[21px] text-[#616161]">
                    {modele.style}
                  </p>
                  <p className="mt-4 max-w-[52ch] text-[15px] leading-[23px] text-[#3d3d3d]">
                    {modele.pour}. C&apos;est celui-ci qui sera réécrit à votre
                    métier — vous pouvez encore en changer.
                  </p>
                  {modele.reserve ? (
                    <p className="mt-3 inline-block rounded-[6px] bg-black/[0.045] px-2.5 py-1.5 text-[12px] leading-snug text-[#3d3d3d]">
                      {modele.reserve}
                    </p>
                  ) : null}
                  {messageErreur ? (
                    <p className="rv-erreur mt-4" role="alert">
                      {messageErreur}
                    </p>
                  ) : null}
                  <p className="r-note mt-5">
                    Étape suivante&nbsp;:{" "}
                    {util
                      ? "votre brief : ce que vous faites, vos pages, votre logo."
                      : "votre compte, puis votre brief."}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                    <button
                      type="button"
                      onClick={continuerDepuisModele}
                      className="r-btn r-btn--noir w-full sm:w-auto sm:min-w-[220px]"
                    >
                      Continuer
                    </button>
                    <button
                      type="button"
                      onClick={() => setGrilleOuverte(true)}
                      className="r-lien !text-[15px]"
                    >
                      Choisir un autre modèle
                    </button>
                    <a
                      href={modele.demo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="r-lien !text-[15px]"
                      aria-label={`Visiter la démo du modèle ${modele.nom} dans un nouvel onglet`}
                    >
                      Voir la démonstration&nbsp;↗
                    </a>
                  </div>
                </div>
              </div>
            ) : null}

            {/* ——— ouvert : la grille, filtrée par famille ——— */}
            <div className={modele && !grilleOuverte ? "hidden" : ""}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  {numeroEtape}
                  <h3 className="r-h4 mt-2">Choisissez votre modèle</h3>
                  <p className="mt-2 max-w-[56ch] text-[15px] leading-[23px] text-[#3d3d3d]">
                    Un parti pris visuel, pas un métier imposé&nbsp;: vous
                    choisissez l&apos;allure, on réécrit tout le contenu au
                    vôtre. Chaque démo se visite en vrai.
                  </p>
                </div>
                <div
                  className="r-seg flex w-full flex-wrap sm:inline-flex sm:w-auto"
                  role="group"
                  aria-label="Filtrer par famille"
                >
                  <button
                    type="button"
                    className="r-seg-btn flex-1 text-center sm:flex-none"
                    data-actif={famille === "tous"}
                    aria-pressed={famille === "tous"}
                    onClick={() => setFamille("tous")}
                  >
                    Tous
                  </button>
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.cle}
                      type="button"
                      className="r-seg-btn flex-1 text-center sm:flex-none"
                      data-actif={famille === c.cle}
                      aria-pressed={famille === c.cle}
                      onClick={() => setFamille(c.cle)}
                    >
                      {FAMILLES_COURTES[c.cle]}
                    </button>
                  ))}
                </div>
              </div>
              {familleCourante ? (
                <p className="mt-4 text-[13px] leading-[19px] text-[#616161]">
                  <span className="font-semibold text-[#050505]">
                    {familleCourante.titre}.
                  </span>{" "}
                  {familleCourante.pour}
                </p>
              ) : null}
              {messageErreur ? (
                <p className="rv-erreur mt-4" role="alert">
                  {messageErreur}
                </p>
              ) : null}

              {/* keyé sur la famille : la grille rejoue son apparition à
                  chaque filtre, comme à la réouverture */}
              <fieldset
                key={`${famille}-${grilleOuverte ? "ouverte" : "repliee"}`}
                className="rv-apparait m-0 mt-7 min-w-0 border-0 p-0"
              >
                <legend className="sr-only">Le modèle de votre site</legend>
                <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {visibles.map((m) => {
                    const choisi = slug === m.slug;
                    return (
                      <div key={m.slug} className="flex min-w-0 flex-col">
                        <label
                          className={`cs-modele ${choisi ? "cs-modele--choisi" : ""}`}
                        >
                          <input
                            type="radio"
                            name="modele"
                            value={m.slug}
                            checked={choisi}
                            onChange={() => choisirModele(m.slug)}
                            className="sr-only"
                          />
                          <span className="cs-modele-cadre">
                            <MiniSite
                              m={m}
                              ton="clair"
                              sizes="(max-width: 640px) 90vw, (max-width: 1280px) 40vw, 260px"
                            />
                            <span className="cs-modele-coche" aria-hidden>
                              <svg
                                width="10"
                                height="8"
                                viewBox="0 0 10 8"
                                fill="none"
                              >
                                <path
                                  d="M1 4 3.8 6.8 9 1.2"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </span>
                          </span>
                          <span className="mt-3 flex items-baseline justify-between gap-3">
                            <span className="text-[15px] font-medium text-[#050505]">
                              {m.nom}
                            </span>
                            <span className="min-w-0 truncate text-[12.5px] text-[#616161]">
                              {m.style}
                            </span>
                          </span>
                          <span className="mt-1 text-[13px] leading-[19px] text-[#3d3d3d]">
                            {m.pour}
                          </span>
                          {m.reserve ? (
                            <span className="mt-2 self-start rounded-[6px] bg-black/[0.045] px-2.5 py-1.5 text-[12px] leading-snug text-[#3d3d3d]">
                              {m.reserve}
                            </span>
                          ) : null}
                        </label>
                        <a
                          href={m.demo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 self-start text-[13px] font-medium text-[#050505] underline-offset-4 hover:underline"
                          aria-label={`Visiter la démo du modèle ${m.nom} dans un nouvel onglet`}
                        >
                          Voir la démonstration&nbsp;↗
                        </a>
                      </div>
                    );
                  })}
                </div>
              </fieldset>

              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#ececec] pt-6">
                <button
                  type="button"
                  disabled={!modele}
                  onClick={continuerDepuisModele}
                  className={`r-btn w-full sm:w-auto sm:min-w-[220px] ${modele ? "r-btn--noir" : "rv-btn--attente"}`}
                >
                  {modele ? "Continuer" : "Choisissez un modèle"}
                </button>
                <Link href="/modeles" className="r-lien !text-[15px]">
                  Parcourir la galerie
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {/* ——— b) le compte ——— */}
        {etape === "compte" ? (
          <div className="rv-apparait tn-corps">
            {barre}
            {recap}

            <div className="tn-colonne">
              {numeroEtape}
              <h3 className="r-h4 mt-2">Votre compte</h3>
              <p className="mt-3 max-w-[56ch] text-[15px] leading-[23px] text-[#3d3d3d]">
                Votre site est rattaché à un compte&nbsp;: c&apos;est là que
                vous suivrez votre commande, puis que vous retrouverez vos
                accès. Une adresse, un code reçu par e-mail, un mot de passe —
                une minute.
              </p>
              {messageErreur ? (
                <p className="rv-erreur mt-5" role="alert">
                  {messageErreur}
                </p>
              ) : null}
              <div className="mt-6">
                <ConnexionInline
                  modeInitial="connexion"
                  portes
                  avecProfil={false}
                  onConnecte={connecter}
                  intro="Connectez-vous pour rattacher la commande à votre compte."
                />
              </div>
              <button
                type="button"
                onClick={revenirAuModele}
                className="r-lien mt-6 !text-[15px]"
              >
                ← Revenir au modèle
              </button>
            </div>
          </div>
        ) : null}

        {/* ——— c) le brief ——— */}
        {etape === "brief" ? (
          <div className="rv-apparait tn-corps">
            {barre}
            {recap}

            <div className="tn-colonne">
              {/* la session a sauté pendant la saisie : la connexion d'abord,
                  le formulaire (désactivé) dessous — HORS du <form>, le
                  module a ses propres formulaires */}
              {!util ? (
                <div className="mb-8">
                  <ConnexionInline
                    modeInitial="connexion"
                    avecProfil={false}
                    onConnecte={connecter}
                    intro="Votre session s'est fermée. Reconnectez-vous pour envoyer votre brief, tout ce que vous avez saisi est conservé."
                  />
                </div>
              ) : null}

              <form onSubmit={envoyer} noValidate>
                {numeroEtape}
                <h3 className="r-h4 mt-2">Votre brief</h3>
                <p className="mt-3 max-w-[56ch] text-[15px] leading-[23px] text-[#3d3d3d]">
                  Ce qu&apos;il nous faut pour écrire votre site. Seul le nom de
                  l&apos;entreprise est obligatoire&nbsp;: le reste se complète
                  au téléphone si besoin.
                </p>
                {messageErreur ? (
                  <p className="rv-erreur mt-4" role="alert">
                    {messageErreur}
                  </p>
                ) : null}
                {util ? (
                  <p className="r-note mt-3">
                    Connecté avec {util.email}. Ce n&apos;est pas vous&nbsp;?{" "}
                    <button
                      type="button"
                      className="underline underline-offset-2"
                      onClick={changerDeCompte}
                      disabled={changement || envoi}
                    >
                      {changement ? "Un instant…" : "Changer de compte"}
                    </button>
                  </p>
                ) : null}

                <fieldset
                  disabled={!util || envoi}
                  className={`m-0 min-w-0 border-0 p-0 ${!util ? "opacity-50" : ""}`}
                >
                  {/* ——— 1 · l'entreprise ——— */}
                  <div className="cs-bloc">
                    <div className="cs-bloc-tete">
                      <span className="cs-bloc-num">01</span>
                      <h4 className="cs-bloc-titre">Votre entreprise</h4>
                    </div>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="rv-libelle" htmlFor="cs-entreprise">
                          Nom de l&apos;entreprise <small>(obligatoire)</small>
                        </label>
                        <input
                          id="cs-entreprise"
                          className="rv-champ"
                          autoComplete="organization"
                          maxLength={120}
                          value={b.entreprise}
                          onChange={maj("entreprise")}
                          required
                          aria-required="true"
                        />
                      </div>
                      <div>
                        <label className="rv-libelle" htmlFor="cs-secteur">
                          Secteur d&apos;activité <small>(recommandé)</small>
                        </label>
                        <select
                          id="cs-secteur"
                          className="rv-champ"
                          value={b.secteur}
                          onChange={maj("secteur")}
                        >
                          <option value="">Choisir…</option>
                          {SECTEURS.map((s) => (
                            <option key={s.valeur} value={s.valeur}>
                              {s.libelle}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="rv-libelle" htmlFor="cs-tel">
                          Téléphone / WhatsApp{" "}
                          <small>(recommandé, nous vous appelons)</small>
                        </label>
                        <input
                          id="cs-tel"
                          type="tel"
                          className="rv-champ"
                          autoComplete="tel"
                          placeholder="06 12 34 56 78"
                          value={b.telephone}
                          onChange={maj("telephone")}
                        />
                      </div>
                      <div>
                        <label className="rv-libelle" htmlFor="cs-commune">
                          Commune <small>(facultatif)</small>
                        </label>
                        <input
                          id="cs-commune"
                          className="rv-champ"
                          autoComplete="address-level2"
                          value={b.commune}
                          onChange={maj("commune")}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="rv-libelle" htmlFor="cs-activite">
                          Ce que vous faites, en deux phrases{" "}
                          <small>(facultatif)</small>
                        </label>
                        <textarea
                          id="cs-activite"
                          rows={3}
                          className="rv-champ resize-y"
                          maxLength={600}
                          value={b.activite}
                          onChange={maj("activite")}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ——— 2 · ce que le site doit obtenir ——— */}
                  {/* le filet du bloc vit sur le <div>, pas sur le <fieldset> :
                      une bordure de fieldset se dessine au milieu de sa legend */}
                  <div className="cs-bloc">
                    <fieldset className="m-0 min-w-0 border-0 p-0">
                      <legend className="cs-bloc-tete">
                        <span className="cs-bloc-num">02</span>
                        <span className="cs-bloc-titre">
                          Ce que le site doit obtenir
                        </span>
                      </legend>
                      <p className="mt-1 text-[13px] leading-[19px] text-[#616161]">
                        Plusieurs réponses possibles.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {OBJECTIFS.map((o) => {
                          const actif = objectifs.includes(o.valeur);
                          return (
                            <label
                              key={o.valeur}
                              className={`cs-puce ${actif ? "cs-puce--active" : ""}`}
                            >
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={actif}
                                onChange={() =>
                                  cocher(objectifs, setObjectifs, o.valeur)
                                }
                              />
                              {o.libelle}
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  </div>

                  {/* ——— 3 · les pages ——— */}
                  {/* le filet du bloc vit sur le <div>, pas sur le <fieldset> :
                      une bordure de fieldset se dessine au milieu de sa legend */}
                  <div className="cs-bloc">
                    <fieldset className="m-0 min-w-0 border-0 p-0">
                      <legend className="cs-bloc-tete">
                        <span className="cs-bloc-num">03</span>
                        <span className="cs-bloc-titre">
                          Les pages que vous voulez
                        </span>
                      </legend>
                      <p className="mt-1 text-[13px] leading-[19px] text-[#616161]">
                        Nous ajustons ensemble.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {PAGES_SITE.map((p) => {
                          const actif = pages.includes(p.valeur);
                          return (
                            <label
                              key={p.valeur}
                              className={`cs-puce ${actif ? "cs-puce--active" : ""}`}
                            >
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={actif}
                                onChange={() =>
                                  cocher(pages, setPages, p.valeur)
                                }
                              />
                              {p.libelle}
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  </div>

                  {/* ——— 4 · l'allure, le domaine, les réseaux ——— */}
                  <div className="cs-bloc">
                    <div className="cs-bloc-tete">
                      <span className="cs-bloc-num">04</span>
                      <h4 className="cs-bloc-titre">
                        L&apos;allure et les détails
                      </h4>
                    </div>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="rv-libelle" htmlFor="cs-ambiance">
                          Couleurs, ambiance{" "}
                          <small>
                            — facultatif : « sobre et clair », « comme mon logo
                            »…
                          </small>
                        </label>
                        <input
                          id="cs-ambiance"
                          className="rv-champ"
                          maxLength={300}
                          value={b.ambiance}
                          onChange={maj("ambiance")}
                        />
                      </div>
                      <div>
                        <label className="rv-libelle" htmlFor="cs-domaine">
                          Nom de domaine souhaité <small>(facultatif)</small>
                        </label>
                        <input
                          id="cs-domaine"
                          className="rv-champ"
                          inputMode="url"
                          placeholder="mon-entreprise.gp"
                          maxLength={120}
                          value={b.domaine}
                          onChange={maj("domaine")}
                        />
                      </div>
                      <div>
                        <label className="rv-libelle" htmlFor="cs-reseaux">
                          Vos réseaux sociaux <small>(facultatif)</small>
                        </label>
                        <input
                          id="cs-reseaux"
                          className="rv-champ"
                          placeholder="Instagram, Facebook…"
                          maxLength={300}
                          value={b.reseaux}
                          onChange={maj("reseaux")}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="rv-libelle" htmlFor="cs-infos">
                          Informations importantes{" "}
                          <small>
                            — horaires, zone d&apos;intervention, ce qu&apos;il
                            ne faut surtout pas oublier
                          </small>
                        </label>
                        <textarea
                          id="cs-infos"
                          rows={5}
                          className="rv-champ resize-y"
                          maxLength={4000}
                          value={b.informations}
                          onChange={maj("informations")}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ——— 5 · les fichiers ——— */}
                  <div className="cs-bloc">
                    <div className="cs-bloc-tete">
                      <span className="cs-bloc-num">05</span>
                      <h4 className="cs-bloc-titre">
                        Votre logo et vos images
                      </h4>
                    </div>
                    <p className="mt-1 text-[13px] leading-[19px] text-[#616161]">
                      PNG, JPEG, WebP, SVG ou PDF, 10&nbsp;Mo par fichier. Vos
                      fichiers ne sont visibles que de vous et de nous.
                    </p>
                    {erreurFichier ? (
                      <p className="rv-erreur mt-3" role="alert">
                        {erreurFichier}
                      </p>
                    ) : null}

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      {/* le logo — un seul fichier */}
                      {logo ? (
                        <div className="flex items-center gap-3 rounded-[12px] border border-[#e3e3e3] p-3">
                          <Apercu piece={logo} />
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#616161]">
                              Logo
                            </div>
                            <div className="truncate text-[13px] font-medium text-[#050505]">
                              {logo.fichier.name}
                            </div>
                            <div className="text-[12px] text-[#616161]">
                              {tailleLisible(logo.fichier.size)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setLogo(null)}
                            className="shrink-0 text-[13px] underline underline-offset-2"
                            aria-label={`Retirer le logo ${logo.fichier.name}`}
                          >
                            Retirer
                          </button>
                        </div>
                      ) : (
                        <label className="cs-zone" htmlFor="cs-logo">
                          <input
                            id="cs-logo"
                            type="file"
                            accept={TYPES_ACCEPTES.join(",")}
                            onChange={choisirLogo}
                            className="sr-only"
                          />
                          <span className="cs-zone-icone" aria-hidden>
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />
                            </svg>
                          </span>
                          <span className="cs-zone-titre">Votre logo</span>
                          <span className="cs-zone-aide">
                            un fichier — cliquer pour choisir
                          </span>
                        </label>
                      )}

                      {/* les images — jusqu'à huit */}
                      <label
                        className={`cs-zone ${images.length >= MAX_IMAGES ? "cs-zone--pleine" : ""}`}
                        htmlFor="cs-images"
                      >
                        <input
                          id="cs-images"
                          type="file"
                          multiple
                          accept={TYPES_ACCEPTES.join(",")}
                          onChange={ajouterImages}
                          disabled={images.length >= MAX_IMAGES}
                          className="sr-only"
                        />
                        <span className="cs-zone-icone" aria-hidden>
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="3" y="5" width="18" height="14" rx="2" />
                            <path d="m3 16 5-5 4 4 3-3 6 6" />
                            <circle cx="16" cy="9" r="1.5" />
                          </svg>
                        </span>
                        <span className="cs-zone-titre">Vos images</span>
                        <span className="cs-zone-aide">
                          {images.length} / {MAX_IMAGES} — vos réalisations,
                          votre équipe, vos locaux
                        </span>
                      </label>
                    </div>

                    {images.length ? (
                      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {images.map((p) => (
                          <li
                            key={p.id}
                            className="rounded-[12px] border border-[#e3e3e3] p-2"
                          >
                            <Apercu piece={p} large />
                            <div
                              className="mt-2 truncate text-[12px] text-[#3d3d3d]"
                              title={p.fichier.name}
                            >
                              {p.fichier.name}
                            </div>
                            <button
                              type="button"
                              onClick={() => retirerImage(p.id)}
                              className="mt-1 text-[12px] underline underline-offset-2"
                              aria-label={`Retirer l'image ${p.fichier.name}`}
                            >
                              Retirer
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>

                  {/* pot de miel — jamais visible, jamais rempli par un humain.
                      Libellé neutre, nom sans signification, autocomplete
                      « one-time-code » : rien qu'un gestionnaire de mots de
                      passe puisse reconnaître (voir PriseDeCreneau). */}
                  <div className="rv-miel" aria-hidden="true">
                    <label htmlFor="cs-x7">Ne pas remplir</label>
                    <input
                      id="cs-x7"
                      name="cs-x7"
                      tabIndex={-1}
                      autoComplete="one-time-code"
                      value={b.site_web}
                      onChange={maj("site_web")}
                    />
                  </div>

                  <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#ececec] pt-6">
                    <button
                      type="submit"
                      disabled={!briefOk || envoi}
                      aria-describedby="tn-motif-envoi"
                      className={`r-btn w-full sm:w-auto sm:min-w-[240px] ${!briefOk || envoi ? "rv-btn--attente" : "r-btn--noir"}`}
                    >
                      {envoi ? "Envoi…" : "Enregistrer ma commande"}
                    </button>
                    <button
                      type="button"
                      onClick={revenirAuModele}
                      className="r-lien !text-[15px]"
                    >
                      ← Revenir au modèle
                    </button>
                  </div>
                  {/* pourquoi le bouton est éteint — la règle ne change pas,
                      elle se dit. Vide, la ligne ne prend aucune place
                      (`:empty` dans la feuille). */}
                  <p className="tn-motif" id="tn-motif-envoi" aria-live="polite">
                    {!briefOk && !envoi && util
                      ? "Indiquez le nom de votre entreprise pour enregistrer la commande."
                      : ""}
                  </p>
                </fieldset>

                <p className="r-note mt-4 max-w-[60ch]">
                  Votre brief et vos fichiers sont rattachés à votre compte et
                  ne servent qu&apos;à écrire votre site&nbsp;; entreprise et
                  téléphone y sont gardés pour vos prochaines demandes. Rien
                  n&apos;est revendu. Voir{" "}
                  <Link
                    href="/vos-donnees"
                    className="underline underline-offset-2"
                  >
                    où vont vos données
                  </Link>
                  .
                </p>
              </form>
            </div>
          </div>
        ) : null}

        {/* ——— d) le paiement : l'écran d'attente ——— */}
        {etape === "paiement" ? (
          <div className="rv-apparait mx-auto flex max-w-[560px] flex-col items-center py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#050505]">
              <svg
                aria-hidden
                width="18"
                height="14"
                viewBox="0 0 18 14"
                fill="none"
              >
                <path
                  d="M1.5 7.5 6.5 12.5 16.5 1.5"
                  stroke="#fff"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="r-h3 mt-6">Commande enregistrée.</h3>
            <p className="mt-4 max-w-[46ch] text-[15px] leading-[24px] text-[#3d3d3d]">
              Le paiement en ligne arrive. Votre commande est enregistrée&nbsp;:
              on vous appelle pour la régler et lancer la production.
            </p>

            <div className="mt-8 w-full rounded-[16px] border border-[#e3e3e3] p-5 text-left">
              {modele ? (
                <div className="flex items-center gap-4">
                  <div className="w-[120px] shrink-0">
                    <MiniSite
                      m={modele}
                      ton="clair"
                      cadre={false}
                      sizes="120px"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#616161]">
                      Modèle
                    </div>
                    <div className="text-[15px] font-medium text-[#050505]">
                      {modele.nom}
                    </div>
                    <div className="text-[13px] text-[#616161]">
                      {modele.style}
                    </div>
                  </div>
                </div>
              ) : null}
              <dl className="mt-4 border-t border-[#ececec]">
                <div className="flex items-baseline justify-between gap-4 py-2.5 text-[14px] leading-[20px] text-[#050505]">
                  <dt className="text-[#616161]">Entreprise</dt>
                  <dd className="text-right font-medium">
                    {b.entreprise.trim() || "—"}
                  </dd>
                </div>
                {commandeId ? (
                  <div className="flex items-baseline justify-between gap-4 border-t border-[#ececec] py-2.5 text-[14px] leading-[20px] text-[#050505]">
                    <dt className="text-[#616161]">Référence</dt>
                    <dd className="num text-right font-medium">
                      {commandeId.slice(0, 8)}
                    </dd>
                  </div>
                ) : null}
                <div className="flex items-baseline justify-between gap-4 border-t border-[#050505] py-3">
                  <dt className="text-[14px] font-semibold leading-[20px] text-[#050505]">
                    Site catalogue
                  </dt>
                  <dd className="num shrink-0 text-[22px] font-semibold leading-[28px] text-[#050505]">
                    {PRIX_SITE_EUR}&nbsp;€{" "}
                    <span className="text-[13px] font-normal text-[#616161]">
                      TTC
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
            <p className="r-note mt-3 max-w-md">
              Chèque TIC&nbsp;: si vous êtes éligible, il reste de 198 à
              594&nbsp;€ à votre charge selon le taux financé — on le vérifie
              avec vous avant tout règlement.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3">
              <Link href="/compte" className="r-btn r-btn--noir">
                Suivre ma commande
              </Link>
              <Link href="/" className="r-lien self-center !text-[15px]">
                Retour à l&apos;accueil
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* l'aperçu d'un fichier : l'image elle-même (URL d'objet — pas next/image,
   qui ne sait pas optimiser un blob), ou une vignette « PDF » */
function Apercu({ piece, large = false }: { piece: Piece; large?: boolean }) {
  const taille = large ? "aspect-[4/3] w-full" : "h-12 w-12 shrink-0";
  if (!piece.apercu) {
    return (
      <div
        className={`${taille} flex items-center justify-center rounded-md bg-[#f1f1f1] font-mono text-[11px] uppercase tracking-[0.1em] text-[#616161]`}
      >
        PDF
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={piece.apercu}
      alt=""
      className={`${taille} rounded-md bg-[#f1f1f1] object-contain`}
    />
  );
}
