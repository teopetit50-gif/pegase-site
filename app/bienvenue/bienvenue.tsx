"use client";

/* Le parcours /bienvenue — quatre étapes, un seul état (07/10/2026).

   1. Votre espace      — logo, nom, SIREN, territoire.
   2. Votre métier      — un métier ouvre SES activités (la cascade de la
                          référence), puis ce qui prend le plus de temps.
   3. Votre messagerie  — Google ou Microsoft, ou plus tard.
   4. Votre équipe      — des adresses et un rôle, ou plus tard.

   Rien n'est enregistré avant la fin, sauf le logo (envoyé dès qu'il est
   choisi, pour ne pas faire transiter un fichier dans l'état). La flèche
   du haut revient d'une étape sans rien perdre.

   ⚠ Étape 3 : les boutons Google / Microsoft ENREGISTRENT le choix, ils
   n'ouvrent pas d'autorisation — l'espace n'a pas encore de connexion
   OAuth à la messagerie ; Omega la branche avec le client à
   l'installation. Le texte de l'étape le dit. Le jour où l'OAuth existe,
   c'est ici qu'il se branche. */

import { useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, ChevronLeft, Globe, KeyRound, Loader2, Lock, ShieldCheck, UserPlus, X } from "lucide-react";
import { siGoogle } from "simple-icons";
import { enregistrerBienvenue, televerserLogo, type ReponsesBienvenue } from "./actions";
import { METIERS, PRIORITES, TERRITOIRES } from "./donnees";
import { Apercu } from "./apercu";

type Props = {
  suite: string;
  email: string;
  depart: { entreprise: string; siren: string; metier: string };
};

type Invitation = { email: string; role: "collaborateur" | "gerant" };

const ETAPES = 4;
const LIBELLE = "block pl-1 text-[13px] text-[var(--bv-texte-3)]";
const TITRE = "text-[22px] font-semibold leading-tight tracking-[-0.01em] text-[var(--bv-texte)]";
const TEXTE = "text-[15px] leading-[1.6] text-[var(--bv-texte-2)]";
const LIEN =
  "bv-lien rounded-md text-[15px] text-[var(--bv-texte-2)] transition-colors hover:text-[var(--bv-texte)]";

export function Bienvenue({ suite, email, depart }: Props) {
  const reduit = useReducedMotion();
  const [etape, setEtape] = useState(1);
  const [sens, setSens] = useState(1);

  const [entreprise, setEntreprise] = useState(depart.entreprise);
  const [siren, setSiren] = useState(depart.siren);
  const [territoire, setTerritoire] = useState("Guadeloupe");
  const [logo, setLogo] = useState<string | null>(null);
  const [logoErreur, setLogoErreur] = useState<string | null>(null);
  const [logoEnvoi, setLogoEnvoi] = useState(false);

  const [metier, setMetier] = useState(depart.metier);
  const [activite, setActivite] = useState("");
  const [priorites, setPriorites] = useState<string[]>([]);

  const [messagerie, setMessagerie] = useState<ReponsesBienvenue["messagerie"]>("plus-tard");

  const [invitations, setInvitations] = useState<Invitation[]>([
    { email: "", role: "collaborateur" },
    { email: "", role: "collaborateur" },
  ]);

  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const fichier = useRef<HTMLInputElement>(null);

  const metierChoisi = METIERS.find((m) => m.cle === metier);

  function aller(vers: number) {
    setErreur(null);
    setSens(vers > etape ? 1 : -1);
    setEtape(vers);
  }

  function choisirLogo(f: File | undefined) {
    if (!f) return;
    setLogoErreur(null);
    setLogo(URL.createObjectURL(f));
    setLogoEnvoi(true);
    const d = new FormData();
    d.set("logo", f);
    televerserLogo(d)
      .then((r) => {
        if (!r.ok) setLogoErreur(r.motif);
      })
      .finally(() => setLogoEnvoi(false));
  }

  function terminer(avecInvitations: boolean, choixMessagerie = messagerie) {
    setErreur(null);
    demarrer(async () => {
      const r = await enregistrerBienvenue({
        entreprise,
        siren,
        territoire,
        metier,
        activite,
        priorites,
        messagerie: choixMessagerie,
        invitations: avecInvitations ? invitations.filter((i) => i.email.trim()) : [],
      });
      if (!r.ok) return setErreur(r.motif);
      window.location.assign(suite);
    });
  }

  const alerte = erreur && (
    <p role="alert" className="mt-4 text-[13.5px] leading-5 text-[#f08a7e]">
      {erreur}
    </p>
  );

  const glisse = reduit
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: 24 * sens },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -24 * sens },
      };

  return (
    <main className="bv flex flex-col">
      <div className="flex flex-1 items-center justify-center px-4 py-6 sm:px-6 lg:py-10">
        <div className="bv-carte grid w-full max-w-[1200px] lg:min-h-[680px] lg:grid-cols-2">
          {/* ——— colonne du formulaire ——— */}
          <div className="relative flex flex-col px-6 pb-10 pt-6 sm:px-12 lg:px-[78px] lg:pb-14 lg:pt-8">
            <div className="h-6">
              {etape > 1 && (
                <button
                  type="button"
                  onClick={() => aller(etape - 1)}
                  aria-label="Étape précédente"
                  className="bv-lien -ml-2 grid size-7 place-items-center rounded-md text-[var(--bv-texte-3)] transition-colors hover:text-[var(--bv-texte)]"
                >
                  <ChevronLeft className="size-4" />
                </button>
              )}
            </div>

            <div className="mt-8 flex flex-1 flex-col lg:mt-12">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={etape}
                  {...glisse}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-1 flex-col"
                >
                  {/* ——— 1. l'espace ——— */}
                  {etape === 1 && (
                    <form
                      className="flex flex-1 flex-col"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!entreprise.trim()) return setErreur("Indiquez le nom de votre entreprise.");
                        aller(2);
                      }}
                    >
                      <h1 className={TITRE}>Créez votre espace</h1>

                      <div className="mt-8 flex items-center gap-5">
                        <button
                          type="button"
                          onClick={() => fichier.current?.click()}
                          className="bv-lien relative grid size-[58px] shrink-0 place-items-center overflow-hidden rounded-[12px] border border-[var(--bv-champ-filet)] bg-[#17191a] text-[26px] text-[var(--bv-texte-2)] transition-colors hover:border-[#3a3b41]"
                          aria-label="Choisir le logo de l'entreprise"
                        >
                          {logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logo} alt="" className="size-full object-cover" />
                          ) : (
                            (entreprise.trim()[0] ?? "O").toUpperCase()
                          )}
                          {logoEnvoi && (
                            <span className="absolute inset-0 grid place-items-center bg-black/50">
                              <Loader2 className="size-5 animate-spin text-white" />
                            </span>
                          )}
                        </button>
                        <div>
                          <p className="text-[17px] font-semibold text-[var(--bv-texte)]">Logo de l&apos;entreprise</p>
                          <p className="mt-1 text-[14px] leading-[1.45] text-[var(--bv-texte-2)]">
                            PNG, JPEG ou GIF de moins de 5&nbsp;Mo.
                            <br />
                            Taille conseillée&nbsp;: 400×400&nbsp;px.
                          </p>
                          {logoErreur && <p className="mt-1 text-[13px] text-[#f08a7e]">{logoErreur}</p>}
                        </div>
                        <input
                          ref={fichier}
                          type="file"
                          accept="image/png,image/jpeg,image/gif,image/webp"
                          className="sr-only"
                          tabIndex={-1}
                          onChange={(e) => choisirLogo(e.target.files?.[0])}
                        />
                      </div>

                      <div className="mt-9 space-y-[18px]">
                        <label className="block">
                          <span className={LIBELLE}>Nom de l&apos;entreprise</span>
                          <input
                            autoFocus
                            required
                            value={entreprise}
                            onChange={(e) => setEntreprise(e.target.value)}
                            className="bv-champ mt-1.5"
                            placeholder="Nom de votre entreprise"
                            autoComplete="organization"
                          />
                        </label>
                        <label className="block">
                          <span className={LIBELLE}>SIREN</span>
                          <span className="bv-champ mt-1.5 flex items-center gap-0">
                            <span className="text-[var(--bv-texte-3)]">siren&nbsp;/&nbsp;</span>
                            <input
                              value={siren}
                              onChange={(e) => setSiren(e.target.value.replace(/[^\d ]/g, "").slice(0, 11))}
                              inputMode="numeric"
                              className="h-full flex-1 bg-transparent text-[15px] text-[var(--bv-texte)] outline-none placeholder:text-[#6b6c72]"
                              placeholder="facultatif"
                            />
                          </span>
                        </label>
                        <label className="block">
                          <span className={LIBELLE}>Territoire</span>
                          <span className="relative mt-1.5 block">
                            <select
                              value={territoire}
                              onChange={(e) => setTerritoire(e.target.value)}
                              className="bv-champ appearance-none pr-10"
                            >
                              {TERRITOIRES.map((t) => (
                                <option key={t}>{t}</option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--bv-texte-2)]" />
                          </span>
                        </label>
                      </div>
                      {alerte}

                      <div className="mt-auto pt-10">
                        <button type="submit" className="bv-bouton">
                          Continuer
                        </button>
                      </div>
                    </form>
                  )}

                  {/* ——— 2. le métier, en cascade ——— */}
                  {etape === 2 && (
                    <form
                      className="flex flex-1 flex-col"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!metier) return setErreur("Choisissez votre métier.");
                        aller(3);
                      }}
                    >
                      <h1 className={TITRE}>Aidez-nous à préparer votre espace</h1>
                      <p className={`mt-3 ${TEXTE}`}>
                        Dites-nous ce que vous faites&nbsp;: votre espace s&apos;ouvre avec les listes de votre métier,
                        et vous pourrez tout changer ensuite.
                      </p>

                      <fieldset className="mt-8">
                        <legend className={LIBELLE}>Quel est votre métier&nbsp;?</legend>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {METIERS.map((m) => (
                            <button
                              key={m.cle}
                              type="button"
                              aria-pressed={metier === m.cle}
                              onClick={() => {
                                if (metier !== m.cle) setActivite("");
                                setMetier(m.cle);
                                setErreur(null);
                              }}
                              className="bv-pastille"
                            >
                              {m.libelle}
                            </button>
                          ))}
                        </div>
                      </fieldset>

                      <AnimatePresence mode="wait" initial={false}>
                        {metierChoisi && (
                          <motion.fieldset
                            key={metierChoisi.cle}
                            initial={reduit ? { opacity: 0 } : { opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="mt-7"
                          >
                            <legend className={LIBELLE}>Précisez votre activité.</legend>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {metierChoisi.activites.map((a) => (
                                <button
                                  key={a}
                                  type="button"
                                  aria-pressed={activite === a}
                                  onClick={() => setActivite(activite === a ? "" : a)}
                                  className="bv-pastille"
                                >
                                  {a}
                                </button>
                              ))}
                            </div>
                          </motion.fieldset>
                        )}
                      </AnimatePresence>

                      <AnimatePresence initial={false}>
                        {activite && (
                          <motion.fieldset
                            initial={reduit ? { opacity: 0 } : { opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="mt-7"
                          >
                            <legend className={LIBELLE}>Qu&apos;est-ce qui vous prend le plus de temps&nbsp;?</legend>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {PRIORITES.map((p) => {
                                const pris = priorites.includes(p.cle);
                                return (
                                  <button
                                    key={p.cle}
                                    type="button"
                                    aria-pressed={pris}
                                    onClick={() =>
                                      setPriorites(pris ? priorites.filter((x) => x !== p.cle) : [...priorites, p.cle])
                                    }
                                    className="bv-pastille"
                                  >
                                    {p.libelle}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.fieldset>
                        )}
                      </AnimatePresence>
                      {alerte}

                      <div className="mt-auto pt-10">
                        <button type="submit" className="bv-bouton">
                          Continuer
                        </button>
                      </div>
                    </form>
                  )}

                  {/* ——— 3. la messagerie ——— */}
                  {etape === 3 && (
                    <div className="flex flex-1 flex-col">
                      <h1 className={TITRE}>Faites entrer vos échanges dans Omega</h1>
                      <p className={`mt-3 ${TEXTE}`}>
                        En reliant votre messagerie et votre agenda, Omega retrouve vos clients, vos demandes et vos
                        rendez-vous sans ressaisie. Nous finalisons la connexion avec vous à l&apos;installation.
                      </p>

                      <div className="mx-auto mt-9 w-full max-w-[440px] space-y-3">
                        <button
                          type="button"
                          className="bv-bouton"
                          onClick={() => {
                            setMessagerie("google");
                            aller(4);
                          }}
                        >
                          <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor" aria-hidden>
                            <path d={siGoogle.path} />
                          </svg>
                          Continuer avec Google
                        </button>
                        <button
                          type="button"
                          className="bv-bouton"
                          onClick={() => {
                            setMessagerie("microsoft");
                            aller(4);
                          }}
                        >
                          <svg viewBox="0 0 24 24" className="size-[17px]" fill="currentColor" aria-hidden>
                            <path d="M2 2h9.5v9.5H2zM12.5 2H22v9.5h-9.5zM2 12.5h9.5V22H2zM12.5 12.5H22V22h-9.5z" />
                          </svg>
                          Continuer avec Microsoft
                        </button>
                        <p className="flex items-center justify-center gap-2 pt-3 text-center text-[14px] text-[var(--bv-texte-3)]">
                          <Lock className="size-3.5 shrink-0" aria-hidden />
                          Espace dédié à votre entreprise, chiffré, hébergé dans l&apos;UE
                        </p>
                        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-1 text-[15px] text-[var(--bv-texte-2)]">
                          {(
                            [
                              [ShieldCheck, "RGPD"],
                              [Globe, "Hébergé UE"],
                              [KeyRound, "Chiffré au repos"],
                            ] as const
                          ).map(([I, b]) => (
                            <li key={b} className="flex items-center gap-2">
                              <I className="size-[18px] text-[var(--bv-texte-3)]" aria-hidden />
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-12 text-center">
                        <p className="text-[14px] text-[var(--bv-texte-3)]">Pensé pour six métiers</p>
                        <ul className="mx-auto mt-4 grid max-w-[420px] grid-cols-3 gap-x-4 gap-y-3 text-[15px] font-semibold tracking-[-0.01em] text-[#6f7076]">
                          {["BTP", "Dentaire", "Avocats", "Architectes", "Location auto", "Groupes"].map((m) => (
                            <li key={m}>{m}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-auto pt-10">
                        <div className="border-t border-[var(--bv-filet)] pt-8 text-center">
                        <button
                          type="button"
                          className={LIEN}
                          onClick={() => {
                            setMessagerie("plus-tard");
                            aller(4);
                          }}
                        >
                          Je le ferai plus tard
                        </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ——— 4. l'équipe ——— */}
                  {etape === 4 && (
                    <form
                      className="flex flex-1 flex-col"
                      onSubmit={(e) => {
                        e.preventDefault();
                        terminer(true);
                      }}
                    >
                      <h1 className={TITRE}>Travaillez avec votre équipe</h1>
                      <p className={`mt-3 ${TEXTE}`}>
                        Plus votre équipe s&apos;en sert, plus Omega vous fait gagner de temps.
                      </p>

                      <p className="mt-9 text-[15px] text-[var(--bv-texte-2)]">Invitez les personnes qui travaillent avec vous</p>
                      <div className="mt-3 space-y-3">
                        {invitations.map((inv, i) => (
                          <div key={i} className="bv-champ flex items-center gap-2 pr-2">
                            <input
                              type="email"
                              value={inv.email}
                              onChange={(e) =>
                                setInvitations(invitations.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))
                              }
                              placeholder="exemple@entreprise.fr"
                              aria-label={`Adresse de la personne ${i + 1}`}
                              className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-[var(--bv-texte)] outline-none placeholder:text-[#6b6c72]"
                            />
                            <span className="relative">
                              <select
                                value={inv.role}
                                aria-label={`Rôle de la personne ${i + 1}`}
                                onChange={(e) =>
                                  setInvitations(
                                    invitations.map((x, j) =>
                                      j === i ? { ...x, role: e.target.value as Invitation["role"] } : x,
                                    ),
                                  )
                                }
                                className="h-7 appearance-none rounded-md bg-transparent pl-2 pr-6 text-[15px] text-[var(--bv-texte)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--bv-bleu)]"
                              >
                                <option value="collaborateur">Membre</option>
                                <option value="gerant">Gérant</option>
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-1 top-1/2 size-3.5 -translate-y-1/2 text-[var(--bv-texte-2)]" />
                            </span>
                            {invitations.length > 1 && i >= 2 && (
                              <button
                                type="button"
                                aria-label="Retirer cette ligne"
                                onClick={() => setInvitations(invitations.filter((_, j) => j !== i))}
                                className="bv-lien grid size-7 place-items-center rounded-md text-[var(--bv-texte-3)] hover:text-[var(--bv-texte)]"
                              >
                                <X className="size-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {invitations.length < 10 && (
                        <button
                          type="button"
                          onClick={() => setInvitations([...invitations, { email: "", role: "collaborateur" }])}
                          className="bv-lien mt-4 inline-flex h-8 items-center gap-2 self-start rounded-lg border border-[var(--bv-champ-filet)] bg-[var(--bv-pastille)] px-3 text-[15px] text-[var(--bv-texte-2)] transition-colors hover:text-[var(--bv-texte)]"
                        >
                          <UserPlus className="size-4" aria-hidden />
                          Ajouter
                        </button>
                      )}
                      <p className="mt-4 text-[13.5px] leading-5 text-[var(--bv-texte-3)]">
                        Omega ouvre chaque accès et prévient la personne par e-mail.
                      </p>

                      <button type="submit" disabled={enCours} className="bv-bouton mt-7">
                        {enCours && <Loader2 className="size-4 animate-spin" aria-hidden />}
                        Envoyer les invitations
                      </button>
                      <button
                        type="button"
                        disabled={enCours}
                        onClick={() => terminer(false)}
                        className={`mx-auto mt-5 ${LIEN}`}
                      >
                        Passer pour l&apos;instant
                      </button>
                      {alerte}

                      <p className="mt-auto pt-10 text-[13px] leading-[1.6] text-[var(--bv-texte-3)]">
                        En continuant, vous confirmez agir pour le compte de l&apos;entreprise indiquée. Vos données
                        restent les vôtres&nbsp;: voir{" "}
                        <a
                          href="/vos-donnees"
                          className="underline underline-offset-2 hover:text-[var(--bv-texte)]"
                        >
                          ce que nous en faisons
                        </a>
                        .
                      </p>
                    </form>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <p className="sr-only" aria-live="polite">
              Étape {etape} sur {ETAPES}
            </p>
          </div>

          {/* ——— l'aperçu ——— */}
          <div className="bv-panneau relative hidden overflow-hidden lg:block" aria-hidden>
            <Apercu
              etape={etape}
              entreprise={entreprise}
              logo={logo}
              metier={metierChoisi}
              priorites={priorites}
              invitations={invitations.map((i) => i.email.trim()).filter(Boolean)}
              email={email}
            />
          </div>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 pb-8 text-[14px] text-[var(--bv-texte-2)]">
        <span>© {new Date().getFullYear()} Omega.AI</span>
        <a href="/vos-donnees" className="underline-offset-4 hover:underline">
          Vos données
        </a>
        <a href="/contact" className="underline-offset-4 hover:underline">
          Aide
        </a>
        <form action="/auth/signout" method="post">
          <button type="submit" className="underline-offset-4 hover:underline">
            Se déconnecter
          </button>
        </form>
      </footer>
    </main>
  );
}
