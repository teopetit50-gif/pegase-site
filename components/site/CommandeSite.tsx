"use client";

/* ══════════════════════════════════════════════════════════════════════
   Commande de site — le tunnel en quatre étapes (02/09/2026)

   Demande Teo : depuis /tarifs/site, « Commander mon site » mène ici. Le
   client choisit un modèle, prouve qu'il a un compte, dépose son brief
   (nom, secteur, ce qu'il attend du site, logo, images), et arrive sur
   une page de paiement — qui, aujourd'hui, ne fait qu'attendre : Stripe
   sera branché plus tard, la commande est enregistrée et Teo appelle.

   Même squelette que PriseDeCreneau (components/reservation) : deux
   colonnes .rv-cadre, le récapitulatif à gauche, le fil d'étapes
   .rv-etape numéroté à droite, tout en état React — aucune navigation
   entre les étapes, rien à re-choisir.

   Étapes :
     a) « Votre modèle » — les vingt et un modèles du catalogue en cartes
        radio (clavier : flèches entre les cartes, Entrée/Espace) ;
        ?modele=<slug> pré-sélectionne. Les deux entrées « reserve »
        restent sélectionnables mais gardent leur mention — on ne les
        maquille pas en vitrines.
     b) « Votre compte » — sans session, le module ConnexionInline
        (e-mail + mot de passe, ou création : code puis mot de passe,
        avecProfil={false} — le brief collecte le reste). Connecté à
        l'arrivée (prop `utilisateur` lue par le serveur) : l'étape n'est
        pas dans le fil. onAuthStateChange prend le relais pour une
        connexion faite en ligne ou dans un autre onglet.
     c) « Votre brief » — le formulaire. Les fichiers partent dans le
        bucket privé briefs-site, dossier <user_id>/<dossier temporaire>/
        (créé à l'ouverture du brief, un UUID par commande) ; les chemins
        sont ensuite passés à commander_site, qui revérifie qu'ils sont
        bien dans le dossier du compte. Un fichier déjà déposé n'est pas
        renvoyé si l'envoi de la commande échoue et qu'on réessaie.
     d) « Paiement » — l'écran d'attente, honnête : la commande est
        enregistrée, on vous appelle. C'est lancerPaiement() qui y mène —
        le point d'accroche de Stripe Checkout.

   Une commande est un ACHAT : le jeton de session est relu au moment de
   l'envoi (getSession rafraîchit s'il a expiré pendant la saisie), et la
   fonction SQL refuse tout appel anonyme. Garde synchrone (useRef) contre
   le double envoi, pot de miel contre les robots — comme PriseDeCreneau.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ConnexionInline from "@/components/compte/ConnexionInline";
import MiniSite from "@/components/modeles/MiniSite";
import { CATEGORIES, MODELES, parCategorie, type Modele } from "@/components/modeles/donnees";
import { signalerSession, utilisateurDepuis, type Utilisateur } from "@/lib/compte";
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

type Etape = "modele" | "compte" | "brief" | "paiement";

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
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
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
  if (octets < 1024 * 1024) return `${Math.max(1, Math.round(octets / 1024))} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

export default function CommandeSite({ utilisateur, modeleInitial }: Props) {
  const [util, setUtil] = useState<Utilisateur | null>(utilisateur ?? null);
  const [etape, setEtape] = useState<Etape>("modele");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [commandeId, setCommandeId] = useState<string | null>(null);

  /* ——— a) le modèle ——— */
  const [slug, setSlug] = useState<string | null>(() =>
    MODELES.some((m) => m.slug === modeleInitial) ? (modeleInitial as string) : null,
  );
  const modele: Modele | null = MODELES.find((m) => m.slug === slug) ?? null;

  /* 02/09 (Teo : « quand on choisit un modèle, les autres doivent se
     replier — devoir défiler jusqu'à Continuer, c'est pas pro ») — dès
     qu'un modèle est choisi, la grille des vingt et un se REPLIE sur le
     modèle retenu, avec « Continuer » juste à côté ; « Choisir un autre
     modèle » rouvre la grille. Pré-sélectionné depuis la galerie
     (?modele=) : on arrive directement replié. */
  const [grilleOuverte, setGrilleOuverte] = useState<boolean>(
    () => !MODELES.some((m) => m.slug === modeleInitial),
  );
  const refEtapeModele = useRef<HTMLDivElement | null>(null);
  const choisirModele = (s: string) => {
    setSlug(s);
    setErreur(null);
    setGrilleOuverte(false);
    /* la grille vient de se replier : on ramène le haut de l'étape à
       l'écran, sous le header collant (scroll-mt), sans animation si
       l'utilisateur demande moins de mouvement */
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.requestAnimationFrame(() =>
      refEtapeModele.current?.scrollIntoView({ block: "start", behavior: reduit ? "auto" : "smooth" }),
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
  const [pages, setPages] = useState<string[]>(["accueil", "prestations", "contact"]);
  const [logo, setLogo] = useState<Piece | null>(null);
  const [images, setImages] = useState<Piece[]>([]);
  const [erreurFichier, setErreurFichier] = useState<string | null>(null);
  const maj =
    (cle: keyof typeof b) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setB((prev) => ({ ...prev, [cle]: e.target.value }));
  const cocher = (liste: string[], poser: (l: string[]) => void, valeur: string) =>
    poser(liste.includes(valeur) ? liste.filter((x) => x !== valeur) : [...liste, valeur]);

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
    return { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, fichier: f, apercu };
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
      else pb = pb ?? `${MAX_IMAGES} images au plus : les dernières n'ont pas été ajoutées.`;
    }
    setErreurFichier(pb);
    if (gardes.length) setImages((prev) => [...prev, ...gardes]);
  };

  const retirerImage = (id: string) => setImages((prev) => prev.filter((p) => p.id !== id));

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
  const briefOk = Boolean(modele && b.entreprise.trim() && b.entreprise.trim().length <= 120);
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
    const deposer = async (p: Piece, prefixe: string): Promise<string | null> => {
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
      const profil = { entreprise: b.entreprise.trim(), telephone: b.telephone.trim() || undefined };
      if (profil.entreprise !== (util.entreprise ?? "") || (profil.telephone ?? "") !== (util.telephone ?? "")) {
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
  const cles: Etape[] = util ? ["modele", "brief", "paiement"] : ["modele", "compte", "brief", "paiement"];
  const idxEtape = Math.max(0, cles.indexOf(etape));

  const messageErreur = erreur ? (ERREURS_SITE[erreur] ?? ERREURS_SITE.reseau) : null;

  return (
    <div className="rv-cadre">
      {/* ═══ colonne récapitulatif ═══ */}
      <aside className="r-carte !p-7">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#616161]">
          Votre commande
        </div>
        <h2 className="r-h4 mt-2">Le site catalogue</h2>
        <p className="num mt-1 text-[14px] leading-[22px] text-[#3d3d3d]">
          {PRIX_SITE_EUR}&nbsp;€ TTC, une fois — pas d&apos;abonnement
        </p>

        <div className="mt-5 border-t border-[#e3e3e3] pt-4">
          <div className="text-[14px] font-semibold text-[#050505]">Modèle choisi</div>
          {modele ? (
            <div className="mt-3">
              <MiniSite m={modele} ton="clair" sizes="(max-width: 1024px) 90vw, 320px" />
              <div className="mt-3 flex items-baseline justify-between gap-3">
                <span className="text-[15px] font-medium text-[#050505]">{modele.nom}</span>
                {etape !== "paiement" && etape !== "modele" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setErreur(null);
                      setEtape("modele");
                    }}
                    className="text-[13px] font-medium text-[#050505] underline underline-offset-2"
                  >
                    Modifier
                  </button>
                ) : null}
              </div>
              <p className="mt-1 text-[13px] leading-[19px] text-[#616161]">{modele.style}</p>
            </div>
          ) : (
            <p className="mt-2 text-[14px] leading-[21px] text-[#616161]">
              Aucun pour l&apos;instant — choisissez-le dans la liste.
            </p>
          )}
        </div>

        <div className="mt-5 border-t border-[#e3e3e3] pt-4">
          <div className="text-[14px] font-semibold text-[#050505]">Chèque TIC</div>
          <p className="mt-1.5 text-[13px] leading-[19px] text-[#3d3d3d]">
            Si vous êtes éligible, il reste de 198 à 594&nbsp;€ à votre charge selon le taux financé.
            On vérifie votre éligibilité avec vous, avant tout règlement.
          </p>
        </div>

        <p className="r-note mt-4">
          Le contenu est intégralement réécrit à votre métier, le nom de domaine est compris la
          première année.{" "}
          <Link href="/tarifs/site" className="underline underline-offset-2">
            Le détail de l&apos;offre
          </Link>
        </p>
      </aside>

      {/* ═══ colonne principale ═══ */}
      <div className="r-carte !p-7 sm:!p-9">
        <ol className="rv-etapes mb-7 list-none p-0" aria-label="Étapes de la commande">
          {cles.map((c, i) => (
            <li key={c} className="contents">
              {i > 0 && <span aria-hidden className="rv-etape-lien" />}
              <span
                className={`rv-etape ${
                  i === idxEtape ? "rv-etape--active" : i < idxEtape ? "rv-etape--faite" : ""
                }`}
                aria-current={i === idxEtape ? "step" : undefined}
              >
                <i>{i < idxEtape ? "✓" : i + 1}</i>
                {LIBELLES_ETAPES[c]}
              </span>
            </li>
          ))}
        </ol>

        {/* ——— a) le modèle ——— */}
        {etape === "modele" ? (
          <div ref={refEtapeModele} className="rv-apparait scroll-mt-24">
            <h3 className="r-h4">{modele && !grilleOuverte ? "Votre modèle" : "Choisissez votre modèle"}</h3>
            <p className="mt-2 max-w-[56ch] text-[15px] leading-[23px] text-[#3d3d3d]">
              {modele && !grilleOuverte
                ? "C'est celui-ci qui sera réécrit à votre métier. Vous pouvez encore en changer."
                : "Un parti pris visuel, pas un métier imposé : vous choisissez l'allure, on réécrit tout le contenu au vôtre. Chaque démo se visite en vrai."}
            </p>
            {messageErreur ? <p className="rv-erreur mt-4">{messageErreur}</p> : null}

            {/* ——— replié : le modèle retenu, et Continuer sans défiler ——— */}
            {modele && !grilleOuverte ? (
              <div className="rv-apparait mt-6 grid gap-5 sm:grid-cols-[minmax(0,320px)_1fr] sm:items-start">
                <div className="rounded-[12px] border border-[#050505] bg-[#fdf3dd] p-3">
                  <MiniSite
                    m={modele}
                    ton="clair"
                    cadre={false}
                    sizes="(max-width: 640px) 90vw, 320px"
                  />
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[15px] font-medium text-[#050505]">{modele.nom}</span>
                    <span
                      aria-hidden
                      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-[#050505] bg-[#050505]"
                    >
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4 3.8 6.8 9 1.2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-[19px] text-[#3d3d3d]">{modele.pour}</p>
                  {modele.reserve ? (
                    <p className="mt-2 rounded-[6px] bg-black/[0.045] px-2.5 py-1.5 text-[12px] leading-snug text-[#3d3d3d]">
                      {modele.reserve}
                    </p>
                  ) : null}
                  <a
                    href={modele.demo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#050505] underline-offset-4 hover:underline"
                    aria-label={`Visiter la démo du modèle ${modele.nom} dans un nouvel onglet`}
                  >
                    Visiter la démo
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path d="M5.5 10.5 10.5 5.5M6.5 5.5h4v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                </div>
                <div className="flex flex-col gap-4 sm:pt-2">
                  <p className="text-[14px] leading-[21px] text-[#3d3d3d]">
                    Étape suivante&nbsp;: {util ? "votre brief — ce que vous faites, vos pages, votre logo." : "votre compte, puis votre brief."}
                  </p>
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
                    className="self-start text-[14px] font-medium text-[#050505] underline underline-offset-4"
                  >
                    Choisir un autre modèle
                  </button>
                </div>
              </div>
            ) : null}

            {/* keyé sur l'état replié/ouvert : la grille remonte et rejoue
                son apparition quand on la rouvre */}
            <fieldset
              key={grilleOuverte ? "ouverte" : "repliee"}
              className={`rv-apparait m-0 min-w-0 border-0 p-0 ${modele && !grilleOuverte ? "hidden" : ""}`}
            >
              <legend className="sr-only">Le modèle de votre site</legend>
              {CATEGORIES.map((cat) => (
                <div key={cat.cle} className="mt-8 first:mt-6">
                  <h4 className="text-[15px] font-semibold text-[#050505]">{cat.titre}</h4>
                  <p className="mt-1 text-[13px] leading-[19px] text-[#616161]">{cat.pour}</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {parCategorie(cat.cle).map((m) => {
                      const choisi = slug === m.slug;
                      return (
                        <div
                          key={m.slug}
                          className={`flex flex-col rounded-[12px] border p-3 transition-[border-color,opacity] ${
                            choisi
                              ? "border-[#050505] bg-[#fdf3dd]"
                              : `border-[#e3e3e3] bg-white hover:border-[#050505] ${slug ? "opacity-70 hover:opacity-100" : ""}`
                          } has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#050505]`}
                        >
                          <label className="flex flex-1 cursor-pointer flex-col">
                            <input
                              type="radio"
                              name="modele"
                              value={m.slug}
                              checked={choisi}
                              onChange={() => choisirModele(m.slug)}
                              className="sr-only"
                            />
                            <MiniSite
                              m={m}
                              ton="clair"
                              cadre={false}
                              sizes="(max-width: 640px) 90vw, (max-width: 1280px) 40vw, 240px"
                            />
                            <span className="mt-3 flex items-center justify-between gap-2">
                              <span className="text-[15px] font-medium text-[#050505]">{m.nom}</span>
                              {/* la coche : à part de .rv-coche, dont les règles
                                  .resa battraient les utilitaires */}
                              <span
                                aria-hidden
                                className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] ${
                                  choisi ? "border-[#050505] bg-[#050505]" : "border-[#b5b5b5] bg-white"
                                }`}
                              >
                                {choisi ? (
                                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                    <path d="M1 4 3.8 6.8 9 1.2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                ) : null}
                              </span>
                            </span>
                            <span className="mt-1.5 text-[13px] leading-[19px] text-[#3d3d3d]">{m.pour}</span>
                            {m.reserve ? (
                              <span className="mt-2 rounded-[6px] bg-black/[0.045] px-2.5 py-1.5 text-[12px] leading-snug text-[#3d3d3d]">
                                {m.reserve}
                              </span>
                            ) : null}
                          </label>
                          <a
                            href={m.demo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-[#050505] underline-offset-4 hover:underline"
                            aria-label={`Visiter la démo du modèle ${m.nom} dans un nouvel onglet`}
                          >
                            Visiter la démo
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                              <path d="M5.5 10.5 10.5 5.5M6.5 5.5h4v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </fieldset>

            {/* grille ouverte : le bouton du bas ne sert qu'à qui rouvre la
                grille pour comparer et garde son choix ; replié, Continuer
                est déjà à côté du modèle */}
            <div className={`mt-8 flex flex-wrap items-center gap-4 ${modele && !grilleOuverte ? "hidden" : ""}`}>
              <button
                type="button"
                disabled={!modele}
                onClick={continuerDepuisModele}
                className={`r-btn w-full sm:w-auto ${modele ? "r-btn--noir" : "rv-btn--attente"}`}
              >
                Continuer
              </button>
              <Link href="/modeles" className="r-lien">
                Parcourir la galerie
              </Link>
            </div>
          </div>
        ) : null}

        {/* ——— b) le compte ——— */}
        {etape === "compte" ? (
          <div className="rv-apparait">
            <h3 className="r-h4">Votre compte</h3>
            {messageErreur ? <p className="rv-erreur mt-4">{messageErreur}</p> : null}
            <div className="mt-5">
              <ConnexionInline
                modeInitial="connexion"
                avecProfil={false}
                onConnecte={connecter}
                intro={
                  "Votre site est rattaché à un compte : c'est là que vous suivrez votre commande, puis que vous retrouverez vos accès. Connectez-vous, ou créez votre compte en une minute — votre adresse, un code reçu par e-mail, un mot de passe."
                }
              />
            </div>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => {
                  setErreur(null);
                  setEtape("modele");
                }}
                className="r-lien"
              >
                ← Revenir au modèle
              </button>
            </div>
          </div>
        ) : null}

        {/* ——— c) le brief ——— */}
        {etape === "brief" ? (
          <div className="rv-apparait">
            {/* la session a sauté pendant la saisie : la connexion d'abord,
                le formulaire (désactivé) dessous — HORS du <form>, le
                module a ses propres formulaires */}
            {!util ? (
              <div className="mb-8">
                <ConnexionInline
                  modeInitial="connexion"
                  avecProfil={false}
                  onConnecte={connecter}
                  intro="Votre session s'est fermée. Reconnectez-vous pour envoyer votre brief — tout ce que vous avez saisi est conservé."
                />
              </div>
            ) : null}

            <form onSubmit={envoyer} noValidate>
              <h3 className="r-h4">Votre brief</h3>
              <p className="mt-2 max-w-[56ch] text-[15px] leading-[23px] text-[#3d3d3d]">
                Ce qu&apos;il nous faut pour écrire votre site. Seul le nom de l&apos;entreprise est
                obligatoire&nbsp;: le reste se complète au téléphone si besoin.
              </p>
              {messageErreur ? <p className="rv-erreur mt-4">{messageErreur}</p> : null}
              {util ? (
                <p className="r-note mt-2">
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

              <fieldset disabled={!util || envoi} className={`m-0 min-w-0 border-0 p-0 ${!util ? "opacity-50" : ""}`}>
                {/* ——— l'entreprise ——— */}
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="rv-libelle" htmlFor="cs-entreprise">Nom de l&apos;entreprise</label>
                    <input id="cs-entreprise" className="rv-champ" autoComplete="organization" maxLength={120} value={b.entreprise} onChange={maj("entreprise")} required />
                  </div>
                  <div>
                    <label className="rv-libelle" htmlFor="cs-secteur">
                      Secteur d&apos;activité <small>— conseillé</small>
                    </label>
                    <select id="cs-secteur" className="rv-champ" value={b.secteur} onChange={maj("secteur")}>
                      <option value="">Choisir…</option>
                      {SECTEURS.map((s) => (
                        <option key={s.valeur} value={s.valeur}>{s.libelle}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="rv-libelle" htmlFor="cs-tel">
                      Téléphone / WhatsApp <small>— conseillé, on vous appelle</small>
                    </label>
                    <input id="cs-tel" type="tel" className="rv-champ" autoComplete="tel" placeholder="0690 …" value={b.telephone} onChange={maj("telephone")} />
                  </div>
                  <div>
                    <label className="rv-libelle" htmlFor="cs-commune">
                      Commune <small>— facultatif</small>
                    </label>
                    <input id="cs-commune" className="rv-champ" autoComplete="address-level2" value={b.commune} onChange={maj("commune")} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="rv-libelle" htmlFor="cs-activite">
                      Ce que vous faites, en deux phrases <small>— facultatif</small>
                    </label>
                    <textarea id="cs-activite" rows={3} className="rv-champ resize-y" maxLength={600} value={b.activite} onChange={maj("activite")} />
                  </div>
                </div>

                {/* ——— ce que le site doit obtenir ——— */}
                <fieldset className="m-0 mt-6 min-w-0 border-0 p-0">
                  <legend className="rv-libelle">
                    Ce que le site doit obtenir <small>— plusieurs réponses possibles</small>
                  </legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {OBJECTIFS.map((o) => {
                      const actif = objectifs.includes(o.valeur);
                      return (
                        <label key={o.valeur} className={`rv-case ${actif ? "rv-case--actif" : ""}`}>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={actif}
                            onChange={() => cocher(objectifs, setObjectifs, o.valeur)}
                          />
                          <span className="rv-coche" aria-hidden />
                          <span className="text-[14px] leading-[20px] text-[#050505]">{o.libelle}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                {/* ——— les pages ——— */}
                <fieldset className="m-0 mt-6 min-w-0 border-0 p-0">
                  <legend className="rv-libelle">
                    Les pages que vous voulez <small>— on ajuste ensemble</small>
                  </legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {PAGES_SITE.map((p) => {
                      const actif = pages.includes(p.valeur);
                      return (
                        <label key={p.valeur} className={`rv-case ${actif ? "rv-case--actif" : ""}`}>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={actif}
                            onChange={() => cocher(pages, setPages, p.valeur)}
                          />
                          <span className="rv-coche" aria-hidden />
                          <span className="text-[14px] leading-[20px] text-[#050505]">{p.libelle}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                {/* ——— l'allure, le domaine, les réseaux ——— */}
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="rv-libelle" htmlFor="cs-ambiance">
                      Couleurs, ambiance <small>— facultatif : « sobre et clair », « comme mon logo »…</small>
                    </label>
                    <input id="cs-ambiance" className="rv-champ" maxLength={300} value={b.ambiance} onChange={maj("ambiance")} />
                  </div>
                  <div>
                    <label className="rv-libelle" htmlFor="cs-domaine">
                      Nom de domaine souhaité <small>— facultatif</small>
                    </label>
                    <input id="cs-domaine" className="rv-champ" inputMode="url" placeholder="mon-entreprise.gp" maxLength={120} value={b.domaine} onChange={maj("domaine")} />
                  </div>
                  <div>
                    <label className="rv-libelle" htmlFor="cs-reseaux">
                      Vos réseaux sociaux <small>— facultatif</small>
                    </label>
                    <input id="cs-reseaux" className="rv-champ" placeholder="Instagram, Facebook…" maxLength={300} value={b.reseaux} onChange={maj("reseaux")} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="rv-libelle" htmlFor="cs-infos">
                      Informations importantes{" "}
                      <small>— horaires, zone d&apos;intervention, ce qu&apos;il ne faut surtout pas oublier</small>
                    </label>
                    <textarea id="cs-infos" rows={5} className="rv-champ resize-y" maxLength={4000} value={b.informations} onChange={maj("informations")} />
                  </div>
                </div>

                {/* ——— les fichiers ——— */}
                <div className="mt-6 border-t border-[#e3e3e3] pt-6">
                  <div className="text-[14px] font-semibold text-[#050505]">Votre logo et vos images</div>
                  <p className="mt-1 text-[13px] leading-[19px] text-[#616161]">
                    PNG, JPEG, WebP, SVG ou PDF — 10&nbsp;Mo par fichier. Vos fichiers ne sont
                    visibles que de vous et de nous.
                  </p>
                  {erreurFichier ? (
                    <p className="rv-erreur mt-3" role="alert">
                      {erreurFichier}
                    </p>
                  ) : null}

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {/* le logo — un seul fichier */}
                    <div>
                      <label className="rv-libelle" htmlFor="cs-logo">
                        Logo <small>— un fichier</small>
                      </label>
                      {logo ? (
                        <div className="mt-2 flex items-center gap-3 rounded-lg border border-[#e3e3e3] p-2.5">
                          <Apercu piece={logo} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-medium text-[#050505]">{logo.fichier.name}</div>
                            <div className="text-[12px] text-[#616161]">{tailleLisible(logo.fichier.size)}</div>
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
                        <input
                          id="cs-logo"
                          type="file"
                          accept={TYPES_ACCEPTES.join(",")}
                          onChange={choisirLogo}
                          className="rv-champ file:mr-3 file:rounded-md file:border-0 file:bg-[#050505] file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-white"
                        />
                      )}
                    </div>

                    {/* les images — jusqu'à huit */}
                    <div>
                      <label className="rv-libelle" htmlFor="cs-images">
                        Images <small>— jusqu&apos;à {MAX_IMAGES} : vos réalisations, votre équipe, vos locaux</small>
                      </label>
                      <input
                        id="cs-images"
                        type="file"
                        multiple
                        accept={TYPES_ACCEPTES.join(",")}
                        onChange={ajouterImages}
                        disabled={images.length >= MAX_IMAGES}
                        className="rv-champ file:mr-3 file:rounded-md file:border-0 file:bg-[#050505] file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-white disabled:opacity-50"
                      />
                      <p className="mt-1.5 text-[12px] text-[#616161]">
                        {images.length} / {MAX_IMAGES}
                      </p>
                    </div>
                  </div>

                  {images.length ? (
                    <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {images.map((p) => (
                        <li key={p.id} className="rounded-lg border border-[#e3e3e3] p-2">
                          <Apercu piece={p} large />
                          <div className="mt-2 truncate text-[12px] text-[#3d3d3d]" title={p.fichier.name}>
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
                  <input id="cs-x7" name="cs-x7" tabIndex={-1} autoComplete="one-time-code" value={b.site_web} onChange={maj("site_web")} />
                </div>

                <div className="mt-7 flex flex-wrap items-center gap-4">
                  <button
                    type="submit"
                    disabled={!briefOk || envoi}
                    className={`r-btn w-full sm:w-auto ${!briefOk || envoi ? "rv-btn--attente" : "r-btn--noir"}`}
                  >
                    {envoi ? "Envoi…" : "Enregistrer ma commande"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setErreur(null);
                      setEtape("modele");
                    }}
                    className="r-lien"
                  >
                    ← Revenir au modèle
                  </button>
                </div>
              </fieldset>

              <p className="r-note mt-4 max-w-[60ch]">
                Votre brief et vos fichiers sont rattachés à votre compte et ne servent qu&apos;à
                écrire votre site&nbsp;; entreprise et téléphone y sont gardés pour vos prochaines
                demandes. Rien n&apos;est revendu — voir{" "}
                <Link href="/vos-donnees" className="underline underline-offset-2">
                  où vont vos données
                </Link>
                .
              </p>
            </form>
          </div>
        ) : null}

        {/* ——— d) le paiement : l'écran d'attente ——— */}
        {etape === "paiement" ? (
          <div className="rv-apparait">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#050505]">
              <svg aria-hidden width="18" height="14" viewBox="0 0 18 14" fill="none">
                <path d="M1.5 7.5 6.5 12.5 16.5 1.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="r-h4 mt-5">Commande enregistrée.</h3>
            <p className="mt-3 max-w-[54ch] text-[15px] leading-[24px] text-[#3d3d3d]">
              Le paiement en ligne arrive. Votre commande est enregistrée&nbsp;: on vous appelle
              pour la régler et lancer la production.
            </p>

            <dl className="mt-6 max-w-md rounded-[12px] border border-[#e3e3e3] px-5 py-2">
              <div className="flex items-baseline justify-between gap-4 py-2.5 text-[14px] leading-[20px] text-[#050505]">
                <dt className="text-[#616161]">Modèle</dt>
                <dd className="text-right font-medium">{modele?.nom ?? "—"}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-[#ececec] py-2.5 text-[14px] leading-[20px] text-[#050505]">
                <dt className="text-[#616161]">Entreprise</dt>
                <dd className="text-right font-medium">{b.entreprise.trim() || "—"}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-[#050505] py-3">
                <dt className="text-[14px] font-semibold leading-[20px] text-[#050505]">Site catalogue</dt>
                <dd className="num shrink-0 text-[22px] font-semibold leading-[28px] text-[#050505]">
                  {PRIX_SITE_EUR}&nbsp;€ <span className="text-[13px] font-normal text-[#616161]">TTC</span>
                </dd>
              </div>
            </dl>
            <p className="r-note mt-3 max-w-md">
              Chèque TIC&nbsp;: si vous êtes éligible, il reste de 198 à 594&nbsp;€ à votre charge
              selon le taux financé — on le vérifie avec vous avant tout règlement.
            </p>
            {commandeId ? (
              <p className="r-note mt-2">
                Référence&nbsp;: <span className="num">{commandeId.slice(0, 8)}</span>
              </p>
            ) : null}

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/compte" className="r-btn r-btn--noir">
                Suivre ma commande
              </Link>
              <Link href="/" className="r-lien self-center">
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
      <div className={`${taille} flex items-center justify-center rounded-md bg-[#f1f1f1] font-mono text-[11px] uppercase tracking-[0.1em] text-[#616161]`}>
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
