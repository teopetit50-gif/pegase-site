import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  BriefcaseBusiness,
  Check,
  CheckCheck,
  Mail,
  MessagesSquare,
  Phone,
  Plug,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { geistAccueil, geistMonoAccueil } from "./_polices/geist-accueil";
import "@/components/accueil-v3/accueil.css";
import {
  AGENTS,
  AGENTS_INTRO,
  APPEL,
  AUDIT,
  CHIFFRES,
  CHIFFRES_INTRO,
  DEMO,
  DONNEES,
  ETAPES,
  ETAPES_INTRO,
  ETAPES_PIED,
  FAQ_INTRO,
  HERO,
  LOGICIELS,
  LOGICIELS_INTRO,
  METIERS,
  METIERS_INTRO,
  OUTILS,
  PIED,
  PRIX,
  PRIX_INTRO,
  SITUATIONS,
  type Agent,
} from "@/components/accueil-v3/textes";
import {
  Citations,
  Compteur,
  Faq,
  VideoDemo,
} from "@/components/accueil-v3/interactifs";
import { COURRIEL, LIEN_TELEPHONE } from "@/lib/reservation";
import Apparition, {
  GroupeApparition,
  MotsApparition,
} from "@/components/accueil/Apparition";
import { MotsReveles } from "@/components/ui/hero-section";

/* ══════════════════════════════════════════════════════════════════════
   / — LA PAGE D'ACCUEIL (05/11/2026)

   Décalque 1:1 d'agent-ai-v1.21st.app (Teo : « reproduis-la exactement,
   le design tu le copies ; le contenu, tu le refais »). Les classes de
   chaque bloc sont celles du HTML rendu de la référence, dans l'ordre du
   DOM, relevées par outils/relever.sh. Ses utilitaires maison sont dans
   components/accueil-v3/accueil.css (préfixe `aa-`), ses textes réécrits
   dans components/accueil-v3/textes.ts, avec la liste de ce qui remplace
   ce qu'elle invente (faux clients, logos, prix, certifications).

   L'accueil précédent (fond clair, onze sections, 30/07 → 21/10) est dans
   l'historique git de ce fichier ; ses composants components/accueil/*
   restent en place, d'autres pages en importent une partie.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: "Omega.AI | L'automatisation des processus par l'IA",
  description:
    "Agents IA, logiciels par métier et sur-mesure : on automatise les processus répétitifs des PME et des groupes, sur vos outils. Audit de 30 minutes offert.",
};

const COULEURS = {
  green: { texte: "text-green-400", pastille: "bg-green-500/10 border-green-500/20" },
  purple: { texte: "text-purple-400", pastille: "bg-purple-500/10 border-purple-500/20" },
  orange: { texte: "text-orange-400", pastille: "bg-orange-500/10 border-orange-500/20" },
  blue: { texte: "text-blue-400", pastille: "bg-blue-500/10 border-blue-500/20" },
};

const ICONES_AGENTS = {
  agents: Bot,
  metiers: BriefcaseBusiness,
  "sur-mesure": Wrench,
  pilotage: ShieldCheck,
};
const ICONES_ETAPES = [Search, Plug, CheckCheck];

function IconeAgent({ id, className }: { id: string; className?: string }) {
  const I = ICONES_AGENTS[id as keyof typeof ICONES_AGENTS];
  return <I className={className ?? "w-4 h-4"} />;
}

/* le cadre de verre des captures : rayon 20, liseré conique, écran à 10/12 */
function Cadre({
  src,
  alt,
  ratio,
  className = "object-cover object-top",
  priority = false,
  children,
}: {
  src: string;
  alt: string;
  ratio: string;
  className?: string;
  priority?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl">
      <div className="relative w-full" style={{ aspectRatio: ratio }}>
        <div className="absolute inset-0 rounded-[20px] p-1 md:p-1.5 bg-neutral-800/40 backdrop-blur-md overflow-hidden">
          <div className="aa-cadre-lisere pointer-events-none absolute inset-0 z-50 rounded-[20px]" />
          <div className="relative flex h-full w-full overflow-hidden rounded-[10px] md:rounded-[12px] bg-neutral-950">
            <Image
              src={src}
              alt={alt}
              fill
              priority={priority}
              sizes="(min-width: 1280px) 1240px, 100vw"
              className={className}
            />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function Defilement({ children }: { children: React.ReactNode }) {
  return (
    <section className="w-full bg-inherit overflow-hidden py-6 md:py-8">
      <div className="aa-marquee">
        <div className="aa-marquee-fade-left" />
        <div className="aa-marquee-fade-right" />
        <div className="aa-marquee-track">
          <Fragment key="a">{children}</Fragment>
          <Fragment key="b">{children}</Fragment>
        </div>
      </div>
    </section>
  );
}

function Logo() {
  return (
    <>
      <Image src="/logo-pegase-blanc.png" alt="" width={22} height={22} />
      <span className="text-lg font-medium">Omega</span>
    </>
  );
}

function Article({ a }: { a: Agent }) {
  const c = COULEURS[a.couleur];
  return (
    <article
      id={a.id}
      className="relative rounded-2xl border border-white/[0.06] bg-neutral-950/50 p-6 md:p-10 overflow-hidden scroll-mt-24"
    >
      <div className={`inline-flex items-center gap-1.5 mb-6 px-2.5 py-1 rounded-md border ${c.pastille}`}>
        <div className={c.texte}>
          <IconeAgent id={a.id} className="w-3.5 h-3.5" />
        </div>
        <span className={`text-xs font-medium ${c.texte}`}>{a.onglet}</span>
      </div>
      <h3 className="text-2xl md:text-4xl font-normal text-white mb-4 tracking-tight leading-tight max-w-2xl">
        {a.titre}
      </h3>
      <p className="text-base md:text-lg text-white/55 mb-6 leading-relaxed max-w-2xl">{a.texte}</p>
      <Link
        className="inline-flex items-center gap-1.5 mb-8 px-4 py-2 rounded-lg bg-white text-neutral-950 text-sm font-medium hover:bg-neutral-200 transition-colors"
        href={a.lien}
      >
        {a.bouton}
        <ArrowRight className="w-4 h-4" />
      </Link>
      <Cadre src={a.image} alt={a.alt} ratio="1240/724" />
    </article>
  );
}

/* deux sceaux de même poids que les badges de conformité de la référence */
function Sceau({ haut, bas }: { haut: string; bas: string }) {
  return (
    <div className="relative shrink-0 w-[148px] h-[148px]">
      <svg viewBox="0 0 148 148" className="absolute inset-0 w-full h-full" aria-hidden>
        <circle cx="74" cy="74" r="72" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.14)" />
        <circle cx="74" cy="74" r="60" fill="none" stroke="rgba(255,255,255,0.08)" strokeDasharray="2 4" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
        <span className="text-[26px] font-medium tracking-tight text-white/90 leading-none">{haut}</span>
        <span className="text-[11px] text-white/50 leading-tight max-w-[90px]">{bas}</span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className={`aa ${geistAccueil.variable} ${geistMonoAccueil.variable}`}>
      {/* 05/11 (Teo) — la barre copiée sur la référence est retirée :
          l'accueil garde l'en-tête du site (components/Header.tsx), le
          même que sur toutes les autres pages. */}
      <main className="min-h-screen bg-[#0B0C0E]">
        {/* ════════ hero ════════ */}
        <section className="relative isolate bg-neutral-950 px-1 pb-12 md:pb-16" data-section="hero">
          <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-b-[20px] pt-12 md:pt-20 bg-neutral-950 aa-bg-gradient">
            <div className="relative z-10 flex flex-col gap-8 px-6 md:px-10 lg:flex-row lg:items-end lg:gap-16 xl:gap-24">
              <h1 className="flex-1 text-balance text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal leading-[1.05] tracking-tight text-white">
                <MotsReveles lignes={HERO.titre} pas={45} />
              </h1>
              <div className="flex w-full shrink-0 flex-col gap-5 lg:max-w-[360px]">
                <p
                  className="o-bloc-apparait max-w-[360px] text-base md:text-lg text-white/55 leading-relaxed"
                  style={{ "--o-mot-d": "450ms" } as React.CSSProperties}
                >
                  {HERO.chapo}
                </p>
                <div
                  className="o-bloc-apparait flex items-center gap-2"
                  style={{ "--o-mot-d": "600ms" } as React.CSSProperties}
                >
                  <Link
                    className="whitespace-nowrap rounded-[10px] bg-white px-5 py-2 font-medium text-[13px] leading-[18px] text-neutral-950 hover:bg-neutral-200 transition-colors"
                    href={AUDIT}
                    data-cta-hero
                  >
                    {HERO.bouton}
                  </Link>
                </div>
              </div>
            </div>
            <div
              className="o-bloc-apparait relative z-10 w-full pt-10 md:pt-14 px-6 md:px-10"
              style={{ "--o-mot-d": "750ms" } as React.CSSProperties}
            >
              <Defilement>
                {OUTILS.map((o) => (
                  <div key={o} className="aa-marquee-item">
                    <span className="text-xl md:text-2xl font-semibold tracking-tight text-white/45 whitespace-nowrap">
                      {o}
                    </span>
                  </div>
                ))}
              </Defilement>
            </div>
            <div
              className="o-bloc-apparait relative w-full mt-4 md:mt-8 px-6 md:px-10 pb-6 md:pb-10"
              style={{ "--o-mot-d": "850ms" } as React.CSSProperties}
            >
              <Cadre
                src="/accueil/cashd.webp"
                alt="CASHD, le tableau de bord des relances : encours, paliers et relances prêtes à valider"
                ratio="1240/724"
                className="object-cover object-top grayscale-75"
                priority
              />
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 z-0 w-[140px] hidden lg:block bg-gradient-to-l from-neutral-950 to-transparent"
            />
          </div>
        </section>

        {/* ════════ démo ════════ */}
        <section className="relative w-full bg-neutral-950" data-section="video">
          <div className="w-full border-t border-b border-white/[0.08]">
            <div className="max-w-7xl mx-auto px-4 aa-bg-gradient border-l border-r border-white/[0.08]">
              <GroupeApparition
                retard={700}
                className="flex flex-col items-center text-center gap-6 px-6 md:px-12 pt-16 md:pt-24 pb-12 md:pb-16 max-w-3xl mx-auto"
              >
                <Apparition as="p" className="text-sm font-medium text-white/55">{DEMO.surtitre}</Apparition>
                <h2 className="text-2xl md:text-4xl lg:text-5xl font-normal tracking-tight text-white leading-[1.05] text-balance">
                  <MotsApparition texte={DEMO.titre} depart={80} />
                </h2>
                <Apparition as="p" delai={450} className="text-base md:text-lg text-white/55 leading-relaxed max-w-xl text-balance">
                  {DEMO.texte}
                </Apparition>
              </GroupeApparition>
              <Apparition delai={150} className="px-6 md:px-12 pb-16 md:pb-24">
                <Cadre src="/accueil/demo-affiche.webp" alt="" ratio="16/9" className="object-cover object-center">
                  <VideoDemo src={DEMO.video} affiche="/accueil/demo-affiche.webp" duree={DEMO.duree} />
                </Cadre>
              </Apparition>
            </div>
          </div>
        </section>

        {/* ════════ ce que fait Omega : trois façons d'automatiser + le pilotage ════════ */}
        <section className="relative w-full bg-neutral-950  py-16 md:py-24" data-section="infrastructure">
          <div className="w-full border-t border-b border-white/[0.08]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,200,150,0.055),transparent_60%)] border-l border-r border-white/[0.08]">
              <GroupeApparition retard={900} className="max-w-3xl pb-12 px-6 pt-12 md:px-10 md:pt-16 ">
                <Apparition as="p" className="text-sm font-medium text-white/55 mb-3">{AGENTS_INTRO.surtitre}</Apparition>
                <h2 className="text-2xl md:text-4xl lg:text-5xl font-normal tracking-tight text-white leading-[1.05]">
                  {/* le saut de la référence, réservé aux écrans larges : sur
                      téléphone il laissait « que » seul sur sa ligne */}
                  <MotsApparition texte={AGENTS_INTRO.titre[0]} depart={80} />{" "}
                  <br className="hidden md:inline" />
                  <MotsApparition texte={AGENTS_INTRO.titre[1]} depart={400} />
                </h2>
              </GroupeApparition>
              <div className="border-t border-white/[0.08]">
                <div className="grid grid-cols-1 lg:grid-cols-12 lg:divide-x lg:divide-white/[0.08] items-start">
                  <aside className="lg:col-span-3 lg:sticky lg:top-20 h-fit lg:px-8">
                    <Apparition delai={100}>
                    <nav className="flex flex-col divide-y divide-white/[0.08]">
                      {AGENTS.map((a) => (
                        <a key={a.id} href={`#${a.id}`} className="group block py-6 first:pt-8 last:pb-0 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={COULEURS[a.couleur].texte}>
                              <IconeAgent id={a.id} />
                            </div>
                            <span className="font-medium text-white text-sm">{a.onglet}</span>
                          </div>
                          <p className="text-sm text-white/50 leading-relaxed group-hover:text-white/70 transition-colors">
                            {a.resume}
                          </p>
                        </a>
                      ))}
                    </nav>
                    </Apparition>
                  </aside>
                  <div className="lg:col-span-9 lg:px-10 pt-8 pb-8 flex flex-col gap-6">
                    {AGENTS.map((a) => (
                      <Apparition key={a.id}>
                        <Article a={a} />
                      </Apparition>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════ comment ça marche ════════ */}
        <section className="relative w-full bg-neutral-950" data-section="how-it-works">
          <div className="w-full border-t border-b border-white/[0.08]">
            <div className="max-w-7xl mx-auto px-4 aa-bg-gradient sm:px-6 lg:px-12 border-l border-r border-white/[0.08]">
              <GroupeApparition
                retard={900}
                className="flex flex-col gap-4 px-6 md:px-12 pt-16 md:pt-24 pb-12 md:pb-16 max-w-3xl"
              >
                <Apparition as="p" className="text-sm font-medium text-white/55">{ETAPES_INTRO.surtitre}</Apparition>
                <h2 className="text-2xl md:text-4xl lg:text-5xl font-normal tracking-tight text-white leading-[1.05] text-balance">
                  <MotsApparition texte={ETAPES_INTRO.titre} depart={80} />
                </h2>
                <Apparition as="p" delai={600} className="text-base md:text-lg text-white/55 leading-relaxed max-w-xl mt-2">
                  {ETAPES_INTRO.texte}
                </Apparition>
              </GroupeApparition>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-[6px]">
                {ETAPES.map((e, k) => {
                  const c = COULEURS[e.couleur];
                  const I = ICONES_ETAPES[k];
                  return (
                    <Apparition
                      key={e.n}
                      delai={k * 120}
                      className="relative flex flex-col gap-6 rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden"
                    >
                      <div
                        aria-hidden="true"
                        className="absolute top-4 right-5 z-10 text-6xl md:text-7xl font-normal text-white/[0.04] tracking-tighter leading-none select-none"
                      >
                        {e.n}
                      </div>
                      <div className="relative w-full aspect-[4/3] overflow-hidden border-b border-white/[0.06]">
                        <Image
                          src={e.image}
                          alt={e.titre}
                          fill
                          sizes="(min-width: 768px) 33vw, 100vw"
                          className="object-cover object-top "
                        />
                      </div>
                      <div className="relative flex flex-col gap-3 px-6 pb-6">
                        <div className="flex items-center gap-3 mb-1">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${c.pastille}`}>
                            <I className={`w-4 h-4 ${c.texte}`} />
                          </div>
                          <span className={`text-xs font-medium ${c.texte}`}>Étape {e.n}</span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-normal text-white leading-tight">{e.titre}</h3>
                        <p className="text-sm md:text-base text-white/55 leading-relaxed">{e.texte}</p>
                      </div>
                    </Apparition>
                  );
                })}
              </div>
              <Apparition className="px-6 md:px-12 py-12 md:py-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-t border-white/[0.08]">
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-white">{ETAPES_PIED.libelle}</p>
                  <p className="text-3xl md:text-4xl font-normal text-white tracking-tight">{ETAPES_PIED.valeur}</p>
                </div>
                <Link
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[10px] border border-white/[0.12] bg-white/[0.02] text-sm font-medium text-white hover:bg-white/[0.06] transition-colors"
                  href={AUDIT}
                >
                  {ETAPES_PIED.bouton}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Apparition>
            </div>
          </div>
        </section>

        {/* ════════ la grande phrase ════════ */}
        <section className="relative w-full bg-neutral-950" data-section="testimonial">
          <div className="w-full border-b border-white/[0.08] ">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12  border-l border-r border-white/[0.08] bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,200,150,0.055),transparent_60%)]">
              <div className="py-20 md:py-32 px-6 md:px-10">
                <Apparition>
                  <Citations />
                </Apparition>
              </div>
            </div>
          </div>
        </section>

        {/* ════════ les logiciels métiers ════════ */}
        <section
          className="relative isolate w-full overflow-hidden bg-neutral-950 border-t border-white/[0.08]"
          data-section="capabilities"
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
              <span className="absolute inset-y-0 left-0 w-px bg-white/[0.08]" />
              <span className="absolute inset-y-0 right-0 w-px bg-white/[0.08]" />
            </div>
          </div>
          <div className="relative max-w-7xl mx-auto bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,200,150,0.055),transparent_60%)]">
            <GroupeApparition retard={600} className="flex flex-col gap-4 px-6 md:px-12 pt-16 md:pt-24">
              <Apparition as="span" className="text-sm font-medium text-white/55">{METIERS_INTRO.surtitre}</Apparition>
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-normal tracking-tight text-white leading-[1.05] max-w-2xl text-balance">
                <MotsApparition texte={METIERS_INTRO.titre} depart={80} />
              </h2>
            </GroupeApparition>
            <div className="mt-16 md:mt-20">
              <div aria-hidden="true" className="mx-px h-px bg-white/[0.08]" />
              <ul className="grid grid-cols-1 gap-[6px] p-[6px] md:grid-cols-2">
                {METIERS.map((m, k) => (
                  <Apparition
                    as="li"
                    key={m.nom}
                    delai={(k % 2) * 120}
                    className="relative isolate flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] transition-colors hover:border-white/[0.14]"
                  >
                    <Link href={m.href} className="flex flex-col">
                      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "567 / 278" }}>
                        <Image
                          src={m.image}
                          alt={`${m.nom}, le logiciel des ${m.metier.toLowerCase()}`}
                          fill
                          sizes="(min-width: 768px) 50vw, 100vw"
                          className="absolute inset-0 object-cover object-top"
                        />
                      </div>
                      <div className="flex flex-col gap-2 p-[18px] md:p-[28px]">
                        <span className="inline-flex flex-wrap items-center gap-2">
                          <span className="font-medium text-[15px] text-white leading-[22px]">
                            {m.nom} · {m.metier}
                          </span>
                          {m.pastille && (
                            <span className="inline-flex items-center rounded-md bg-white/10 px-2.5 py-0.5 font-medium text-xs text-white/60 leading-[1.4]">
                              {m.pastille}
                            </span>
                          )}
                        </span>
                        <p className="max-w-[426px] text-[15px] text-white/55 leading-[22px]">{m.texte}</p>
                      </div>
                    </Link>
                  </Apparition>
                ))}
              </ul>
            </div>
            <Apparition className="mt-px flex flex-col items-start gap-10 px-6 md:flex-row md:items-center md:gap-6 md:px-12 py-16 md:py-20">
              <div className="flex w-full max-w-2xl flex-col items-start justify-center gap-6">
                <span className="text-sm font-medium text-white/55">{DONNEES.surtitre}</span>
                <div className="flex flex-col gap-3">
                  <h3
                    className="text-white/90"
                    style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-0.8px", lineHeight: 1 }}
                  >
                    {DONNEES.titre}
                  </h3>
                  <p className="text-white/70 text-base leading-[22px]">{DONNEES.texte}</p>
                </div>
              </div>
              <div
                role="img"
                aria-label="Hébergé dans l'Union européenne, conforme au RGPD"
                className="flex shrink-0 items-center gap-7"
              >
                <Sceau haut="UE" bas="Hébergé dans l'Union" />
                <Sceau haut="RGPD" bas="Export et suppression sur demande" />
              </div>
            </Apparition>
          </div>
        </section>

        {/* ════════ en chiffres ════════ */}
        <section className="relative w-full bg-neutral-950" data-section="stats">
          <div className="w-full border-t border-b border-white/[0.08]">
            <div className="max-w-7xl mx-auto px-4 aa-bg-gradient border-l border-r border-white/[0.08]">
              <GroupeApparition
                retard={600}
                className="flex flex-col items-center text-center gap-4 px-6 md:px-12 pt-16 md:pt-24 pb-12 md:pb-16 max-w-3xl mx-auto"
              >
                <Apparition as="p" className="text-sm font-medium text-white/55">{CHIFFRES_INTRO.surtitre}</Apparition>
                <h2 className="text-2xl md:text-4xl lg:text-5xl font-normal tracking-tight text-white leading-[1.05] text-balance">
                  <MotsApparition texte={CHIFFRES_INTRO.titre} depart={80} />
                </h2>
              </GroupeApparition>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-white/[0.08]">
                {CHIFFRES.map((c, k) => (
                  <Apparition
                    key={c.titre}
                    delai={k * 100}
                    className={
                      [
                        "lg:border-r border-white/[0.08] border-b sm:border-b sm:border-r  lg:border-b-0 border-white/[0.08]",
                        "lg:border-r border-white/[0.08] border-b sm:border-b sm:border-r-0  lg:border-b-0 border-white/[0.08]",
                        "lg:border-r border-white/[0.08] border-b sm:border-b sm:border-r sm:border-b-0 lg:border-b-0 border-white/[0.08]",
                        "  sm:border-r-0 sm:border-b-0 lg:border-b-0 border-white/[0.08]",
                      ][k]
                    }
                  >
                    <div className="flex flex-col gap-3 p-6 md:p-8">
                      <Compteur valeur={c.valeur} suffixe={c.suffixe} />
                      <div className="flex flex-col gap-1.5">
                        <p className="text-sm md:text-base font-medium text-white">{c.titre}</p>
                        <p className="text-xs md:text-sm text-white/45 leading-relaxed">{c.sous}</p>
                      </div>
                    </div>
                  </Apparition>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ════════ nos logiciels ════════ */}
        <section className="relative w-full bg-neutral-950" data-section="customers">
          <div className="w-full border-t border-b border-white/[0.08]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 aa-bg-gradient border-l border-r border-white/[0.08]">
              <GroupeApparition
                retard={700}
                className="flex flex-col items-center text-center gap-6 px-6 md:px-12 pt-16 md:pt-24 pb-12 md:pb-16"
              >
                <Apparition as="p" className="text-sm font-medium text-white/55">{LOGICIELS_INTRO.surtitre}</Apparition>
                <h2 className="text-2xl md:text-4xl lg:text-5xl font-normal tracking-tight text-white leading-[1.05] max-w-4xl text-balance">
                  <MotsApparition texte={LOGICIELS_INTRO.titre} depart={80} />
                </h2>
              </GroupeApparition>
              <Apparition delai={150} className="pb-12 md:pb-16">
                <Defilement>
                  {LOGICIELS.map((l) => (
                    <div key={l.nom} className="aa-marquee-item">
                      <Image
                        src={l.src}
                        alt={l.nom}
                        width={120}
                        height={33}
                        className="h-6 md:h-7 w-auto object-contain grayscale invert opacity-45"
                      />
                    </div>
                  ))}
                </Defilement>
              </Apparition>
            </div>
          </div>
        </section>

        {/* ════════ six situations ════════ */}
        <section className="relative w-full bg-neutral-950" data-section="testimonial-grid">
          <div className="w-full border-t border-b border-white/[0.08]">
            <div className="max-w-7xl mx-auto p-2 border-l border-r border-white/[0.08]">
              <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[6px]">
                {SITUATIONS.map((s, k) => (
                  <Apparition
                    as="li"
                    key={s.nom}
                    delai={(k % 3) * 100}
                    className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 md:p-8 min-h-[280px]"
                  >
                    <blockquote className="text-[15px] md:text-base text-white/85 leading-[1.55] mb-8">
                      «&nbsp;{s.texte}&nbsp;»
                    </blockquote>
                    <div className="flex items-center gap-3">
                      <div className="relative w-9 h-9 rounded-full overflow-hidden bg-white/10 shrink-0 flex items-center justify-center">
                        <Image src={s.logo} alt="" width={20} height={20} className="w-5 h-5 invert" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white leading-tight">{s.nom}</span>
                        <span className="text-xs text-white/50 leading-tight mt-0.5">{s.role}</span>
                      </div>
                    </div>
                  </Apparition>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ════════ tarifs ════════ */}
        <section className="relative w-full bg-neutral-950" data-section="pricing-preview">
          <div className="w-full border-t border-b border-white/[0.08]">
            <div className="max-w-7xl mx-auto px-4 aa-bg-gradient border-l border-r border-white/[0.08]">
              <GroupeApparition
                retard={750}
                className="flex flex-col items-center text-center gap-6 px-6 md:px-12 pt-16 md:pt-24 pb-12 md:pb-16 max-w-3xl mx-auto"
              >
                <Apparition as="p" className="text-sm font-medium text-white/55">{PRIX_INTRO.surtitre}</Apparition>
                <h2 className="text-2xl md:text-4xl lg:text-5xl font-normal tracking-tight text-white leading-[1.05] text-balance">
                  <MotsApparition texte={PRIX_INTRO.titre} depart={80} />
                </h2>
                <Apparition as="p" delai={450} className="text-base md:text-lg text-white/55 leading-relaxed max-w-xl text-balance">
                  {PRIX_INTRO.texte}
                </Apparition>
              </GroupeApparition>
              <div className="px-6 md:px-12 pb-12 md:pb-16">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-[6px]">
                  {PRIX.map((p, k) => (
                    <Apparition
                      key={p.nom}
                      delai={k * 120}
                      className={`relative flex flex-col rounded-2xl border overflow-hidden ${
                        p.fort
                          ? "border-white/[0.18] bg-gradient-to-b from-white/[0.06] to-white/[0.02]"
                          : "border-white/[0.08] bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex flex-col gap-6 p-8 md:p-10 h-full">
                        <div className="flex flex-col gap-2">
                          <h3 className={`text-xl font-medium ${p.fort ? "text-white" : "text-white/85"}`}>{p.nom}</h3>
                          <p className="text-sm text-white/55 leading-relaxed min-h-[40px]">{p.texte}</p>
                        </div>
                        <div className="flex flex-col gap-1 pb-6 border-b border-white/[0.06]">
                          <div className="flex items-baseline gap-2">
                            <span
                              className={`text-4xl md:text-5xl font-normal tracking-tight ${
                                p.fort ? "text-white" : "text-white/85"
                              }`}
                            >
                              {p.prix}
                            </span>
                          </div>
                          <p className="text-xs text-white/45">{p.sous}</p>
                        </div>
                        <ul className="flex flex-col gap-3 flex-1">
                          {p.points.map((pt) => (
                            <li key={pt} className="flex items-start gap-2.5">
                              <div
                                className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center mt-0.5 ${
                                  p.fort ? "bg-white/15" : "bg-white/[0.06]"
                                }`}
                              >
                                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                              </div>
                              <span className="text-sm text-white/70 leading-relaxed">{pt}</span>
                            </li>
                          ))}
                        </ul>
                        <Link
                          className={`inline-flex items-center justify-center gap-1.5 rounded-[10px] px-5 py-2.5 font-medium text-sm transition-colors mt-2 ${
                            p.fort
                              ? "bg-white text-neutral-950 hover:bg-neutral-200"
                              : "border border-white/[0.12] bg-white/[0.02] text-white hover:bg-white/[0.06]"
                          }`}
                          href={p.href}
                        >
                          {p.bouton}
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </Apparition>
                  ))}
                </div>
              </div>
              <div className="px-6 md:px-12 pb-16 md:pb-20 flex items-center justify-center">
                <Link
                  className="group inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors"
                  href="/tarifs"
                >
                  Voir le détail de la tarification et le calculateur
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ════════ FAQ ════════ */}
        <section className="relative w-full bg-neutral-950" data-section="faq">
          <div className="w-full border-t border-b border-white/[0.08]">
            <div className="max-w-7xl mx-auto px-4 aa-bg-gradient border-l border-r border-white/[0.08]">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 px-6 md:px-12 py-16 md:py-24">
                <div className="lg:col-span-4">
                  <Apparition className="lg:sticky lg:top-24 flex flex-col gap-6">
                    <p className="text-sm font-medium text-white/55">{FAQ_INTRO.surtitre}</p>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-normal tracking-tight text-white leading-[1.05] text-balance">
                      {FAQ_INTRO.titre}
                    </h2>
                    <p className="text-base text-white/55 leading-relaxed max-w-md">{FAQ_INTRO.texte}</p>
                    <Link
                      className="group inline-flex items-center gap-3 mt-4 p-5 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.14] transition-all w-fit"
                      href="/contact"
                    >
                      <div className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
                        <MessagesSquare className="w-4 h-4 text-white/80" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-sm font-medium text-white">{FAQ_INTRO.carte}</p>
                        <p className="text-xs text-white/55">{FAQ_INTRO.carteSous}</p>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-white/55 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Link>
                  </Apparition>
                </div>
                <Apparition delai={120} className="lg:col-span-8">
                  <Faq />
                </Apparition>
              </div>
            </div>
          </div>
        </section>

        {/* ════════ appel final ════════ */}
        <section className="relative w-full bg-neutral-950 overflow-hidden" data-section="cta">
          <div className="w-full border-t border-b border-white/[0.08]">
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 border-l border-r border-white/[0.08]">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 aa-bg-gradient" />
              <GroupeApparition
                retard={900}
                className="relative flex flex-col items-center text-center gap-8 px-6 md:px-12 py-24 md:py-32"
              >
                <Apparition as="p" className="text-sm font-medium text-white/55">{APPEL.surtitre}</Apparition>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-normal tracking-tight text-white leading-[1.02] max-w-4xl text-balance">
                  <MotsApparition texte={APPEL.titre} depart={80} />
                </h2>
                <Apparition as="p" delai={600} className="text-base md:text-lg text-white/55 leading-relaxed max-w-xl text-balance">
                  {APPEL.texte}
                </Apparition>
                <Apparition delai={750} className="flex flex-col sm:flex-row items-center gap-3 mt-2">
                  <Link
                    className="inline-flex items-center justify-center gap-1.5 rounded-[10px] bg-white px-5 py-2.5 font-medium text-sm text-neutral-950 hover:bg-neutral-200 transition-colors"
                    href={AUDIT}
                  >
                    {APPEL.principal}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    className="inline-flex items-center justify-center rounded-[10px] border border-white/[0.12] bg-white/[0.02] px-5 py-2.5 font-medium text-sm text-white hover:bg-white/[0.06] transition-colors"
                    href="/espace2"
                  >
                    {APPEL.second}
                  </Link>
                </Apparition>
              </GroupeApparition>
            </div>
          </div>
        </section>
      </main>

      {/* ════════ pied ════════ */}
      <footer className="relative w-full bg-neutral-950" data-section="footer">
        <div className="w-full border-t border-white/[0.08]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 border-l border-r border-white/[0.08]">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-8 md:gap-12 px-6 md:px-12 pt-16 md:pt-20 pb-12 md:pb-16">
              <div className="col-span-2 flex flex-col gap-6">
                <Link className="flex items-center gap-2 text-white w-fit" href="/">
                  <Logo />
                </Link>
                <p className="text-sm text-white/55 leading-relaxed max-w-xs">{PIED.phrase}</p>
                <div className="flex items-center gap-1">
                  <a
                    href={`mailto:${COURRIEL}`}
                    aria-label="Nous écrire"
                    className="flex items-center justify-center w-9 h-9 rounded-md text-white/55 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                  <a
                    href={LIEN_TELEPHONE}
                    aria-label="Nous appeler"
                    className="flex items-center justify-center w-9 h-9 rounded-md text-white/55 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              </div>
              {PIED.colonnes.map((col) => (
                <div key={col.titre} className="flex flex-col gap-4">
                  <h3 className="text-sm font-medium text-white">{col.titre}</h3>
                  <ul className="flex flex-col gap-3">
                    {col.liens.map((l) => (
                      <li key={l.href}>
                        <Link className="text-sm text-white/55 hover:text-white transition-colors" href={l.href}>
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="border-t border-white/[0.06] px-6 md:px-12 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <p className="text-xs text-white/45">© 2026 Omega.AI. Tous droits réservés.</p>
              <div className="flex items-center gap-6">
                <Link
                  className="flex items-center gap-2 text-xs text-white/45 hover:text-white/70 transition-colors"
                  href="/vos-donnees"
                >
                  <span className="relative flex w-2 h-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  Hébergé dans l&apos;Union européenne
                </Link>
                <Link className="text-xs text-white/45 hover:text-white/70 transition-colors" href="/contact">
                  Service client
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
