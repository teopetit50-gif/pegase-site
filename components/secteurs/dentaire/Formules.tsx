"use client";
/* ══════════════════════════════════════════════════════════════════════
   « Des formules simples » (#pricing) — le calculateur des créneaux
   perdus, la bascule mensuel / annuel, les quatre formules (Cabinet,
   Groupe, Centre, Réseau) et le bandeau « Le point du matin arrive là où
   vous êtes ». AUCUN MONTANT : chaque formule dit « Sur audit », la
   bascule ne change que la mention de facturation, le prix se fixe à
   l'audit (règle maison).

   Écarts :
   • Tous les boutons mènent à /reserver-un-audit (lien) : « Réserver un
     audit » des trois premières formules (omegaai.fr/reserver), « Nous
     écrire » de la formule Réseau (un mailto) devenu « Réserver un
     audit » lui aussi, et le bandeau entier.
   • Le détail des formules est un bouton qui ouvre la liste, comme la
     source ; il porte `aria-expanded`.
   • Rhabillage du 24/09 : le bandeau n'est plus un grand dégradé bleu au
     texte blanc, mais un aplat vert d'eau très clair, filet et texte
     foncé ; son bouton passe au vert d'eau soutenu. Bleu ciel → vert
     d'eau partout ailleurs.
   ══════════════════════════════════════════════════════════════════════ */
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, MessageSquare, Sparkles, X } from "lucide-react";
import { useState } from "react";
import Apparition from "./Apparition";
import Calculateur from "./Calculateur";
import { RESERVER } from "./outils";
import { Surtitre } from "./Surtitre";
import { FORMULES } from "./textes";

export default function Formules() {
  const [annuel, setAnnuel] = useState(true);
  const [ouverte, setOuverte] = useState<string | null>(null);

  return (
    <section id="pricing" data-monde="clair" className="border-t border-slate-100 py-32 lg:py-40">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <Apparition className="mb-16 max-w-3xl lg:mb-24">
          <Surtitre mono>Formules</Surtitre>
          <h2 className="mb-6 font-sans text-4xl text-slate-900 md:text-5xl lg:text-6xl">Le prix dépend du nombre de fauteuils</h2>
          <p className="max-w-xl text-lg text-slate-600 lg:text-xl">
            Le prix dépend du nombre de fauteuils : il se fixe à l&apos;audit, pas sur une grille.
          </p>
        </Apparition>
        <Apparition delay={50} className="mb-16 lg:mb-20">
          <Calculateur />
        </Apparition>
        <Apparition delay={100} className="mb-12 flex items-center gap-4">
          <span className={`text-sm transition-colors ${!annuel ? "text-slate-900" : "text-slate-500"}`}>Mensuel</span>
          <button
            type="button"
            onClick={() => setAnnuel(!annuel)}
            role="switch"
            aria-checked={annuel}
            aria-label="Basculer entre facturation mensuelle et annuelle"
            className="relative h-7 w-14 rounded-full bg-slate-200 p-1 transition-colors hover:bg-slate-300"
          >
            <div
              className={`h-5 w-5 rounded-full bg-[#3b7a6e] transition-transform duration-300 ${annuel ? "translate-x-7" : "translate-x-0"}`}
            />
          </button>
          <span className={`text-sm transition-colors ${annuel ? "text-slate-900" : "text-slate-500"}`}>Annuel</span>
          {annuel && (
            <span className="ml-2 bg-[#3b7a6e] px-2 py-1 font-mono text-xs text-white">Prix fixé à l&apos;audit</span>
          )}
        </Apparition>
        <Apparition delay={150}>
          <div className="grid gap-px bg-slate-300 md:grid-cols-2 lg:grid-cols-4">
            {FORMULES.map((f, rang) => {
              const ouvert = ouverte === f.cle;
              return (
                <div
                  key={f.cle}
                  className={`relative bg-white p-8 lg:p-10 ${f.conseillee ? "border-2 border-[#3b7a6e] lg:-my-4 lg:py-14" : ""}`}
                >
                  {f.conseillee && (
                    <span className="absolute -top-3 left-8 bg-[#3b7a6e] px-3 py-1 font-mono text-xs uppercase tracking-widest text-white">
                      Le plus complet
                    </span>
                  )}
                  <div className="mb-8">
                    <span className="font-mono text-xs text-slate-500">{String(rang + 1).padStart(2, "0")}</span>
                    <h3 className="mt-2 font-sans text-3xl text-slate-900">{f.nom}</h3>
                    <p className="mt-2 text-sm text-slate-500">{f.texte}</p>
                  </div>
                  <div className="mb-8 border-b border-slate-200 pb-8">
                    <div className="flex items-baseline gap-2">
                      <span className="font-sans text-5xl text-slate-900">Sur audit</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {annuel ? "Facturé à l'année, prix fixé à l'audit" : "Facturé au mois, prix fixé à l'audit"}
                    </p>
                  </div>
                  <ul className="mb-4 space-y-3">
                    {f.points.map((p) => (
                      <li key={p} className="flex items-start gap-3">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#3b7a6e]" />
                        <span className="text-sm text-slate-600">{p}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mb-6">
                    <button
                      type="button"
                      onClick={() => setOuverte(ouvert ? null : f.cle)}
                      aria-expanded={ouvert}
                      className="flex w-full items-center gap-1.5 py-2 text-xs font-medium text-[#3b7a6e] transition-colors hover:text-[#30635a]"
                    >
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${ouvert ? "rotate-180" : ""}`} />
                      {ouvert ? "Réduire" : "Voir le détail"}
                    </button>
                    {ouvert && (
                      <ul className="mt-1 space-y-2.5 border-t border-slate-100 pt-2">
                        {f.detail.map((d) => (
                          <li key={d.libelle} className="flex items-start gap-2.5">
                            {d.inclus ? (
                              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            ) : (
                              <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
                            )}
                            <span className={`text-xs ${d.inclus ? "text-slate-600" : "text-slate-400"}`}>
                              {d.libelle}
                              {d.indice && (
                                <span className="ml-1.5 rounded bg-[#f3f8f7] px-1.5 py-0.5 text-[10px] font-semibold text-[#4f9587]">
                                  {d.indice}
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <Link
                    href={RESERVER}
                    className={`group flex w-full items-center justify-center gap-2 rounded-[6px] py-4 text-sm font-medium transition-all ${f.conseillee ? "bg-[#3b7a6e] text-white hover:bg-[#30635a]" : "border border-slate-200 text-slate-700 hover:border-[#3b7a6e] hover:bg-slate-50 hover:text-[#3b7a6e]"}`}
                  >
                    Réserver un audit
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              );
            })}
          </div>
        </Apparition>
        <Apparition delay={175} className="mt-12">
          <Link
            href={RESERVER}
            className="group relative block w-full overflow-hidden rounded-2xl border border-[#c7e1db] bg-[#f3f8f7] p-6 text-left text-slate-900 transition-all hover:bg-[#e3f0ed] sm:p-8"
          >
            <div className="relative flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#c7e1db] bg-white p-2.5 sm:h-16 sm:w-16">
                  <MessageSquare className="h-full w-full text-[#3b7a6e]" strokeWidth={1.6} />
                </div>
                <div>
                  <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#30635a]">
                    <Sparkles className="h-3 w-3" /> Inclus dans chaque formule
                  </span>
                  <h3 className="mb-1 font-sans text-lg sm:text-xl">Le point du matin arrive là où vous êtes</h3>
                  <p className="max-w-xl text-sm text-slate-600">
                    Chaque jour ouvré à 7 h, par WhatsApp ou par e-mail, sur le téléphone du titulaire et de
                    l&apos;assistante. Rien à ouvrir, rien à installer.
                  </p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#3b7a6e] px-4 py-2.5 text-sm font-bold text-white transition-colors group-hover:bg-[#30635a]">
                Réserver un audit <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        </Apparition>
        <p className="mt-12 text-center text-sm text-slate-500">
          Chaque formule inclut les mises à jour. Le prix se fixe à l&apos;audit, selon la taille du cabinet.
        </p>
      </div>
    </section>
  );
}
