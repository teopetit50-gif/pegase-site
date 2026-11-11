/* ══════════════════════════════════════════════════════════════════════
   Daliro — les formules (refaites le 11/11/2026)

   La première version était le comparatif de Vertex (copié le 24/09 de
   chantieros-site/src/components/pricing.tsx) : vingt-cinq lignes sur
   trois colonnes, infobulles, en-tête collant, groupes pliables sous md.
   Teo, 11/11 : « la partie formule de Daliro, j'aime pas, c'est trop long
   et moche à lire ; trouve un autre composant plus pro et sobre ».

   Dessin repris du `pricing-one` de meschacirung (21st.dev, bibliothèque
   idees-21st), en trois cartes à filet : le nom, « Prix fixé à l'audit »,
   une phrase, le bouton, un filet pointillé, cinq points au plus. La
   formule Chantiers reste conseillée (badge bleu de la page, fond #fafafa,
   ombre légère, bouton plein). Les points condensent le comparatif de
   FORMULES.groupes (textes.ts, conservé tel quel) : chaque formule dit
   d'abord qu'elle contient la précédente, puis ce qu'elle ajoute. Aucun
   prix public, comme avant : il se fixe à l'audit, selon vos chantiers.
   Jetons de la page : texte #171717, atténué #737373, filet #e6e6e6.
   ══════════════════════════════════════════════════════════════════════ */
import { Check } from "lucide-react";
import Lien from "@/components/Lien";
import { Button } from "./bouton";
import { CONTACT, FORMULES } from "./textes";

type Carte = { id: string; pour: string; lignes: string[] };

const CARTES: Carte[] = [
  {
    id: "demarrage",
    pour: "Pour l'entreprise qui veut juger Daliro sur ses premiers chantiers.",
    lignes: [
      "5 chantiers ouverts, 2 comptes bureau",
      "Lecture des photos et des vocaux des équipes",
      "Avenants chiffrés sur vos prix, signés sur place",
      "Sous-traitants confirmés à J-2, annuaire inclus",
      "Installation par nos soins, assistance en français",
    ],
  },
  {
    id: "chantiers",
    pour: "Pour l'entreprise qui mène plusieurs chantiers de front.",
    lignes: [
      "Tout Démarrage, sur 20 chantiers et 5 comptes",
      "Avenants non signés relancés chaque matin",
      "Remplaçants proposés, lots recalés, alerte météo",
      "Approvisionnement cadencé depuis le devis",
      "Rôles, journal des validations, point mensuel",
    ],
  },
  {
    id: "entreprise",
    pour: "Pour l'entreprise à plusieurs agences ou à plusieurs conducteurs.",
    lignes: [
      "Tout Chantiers, chantiers et comptes sur mesure",
      "Retours de matériel et bons de livraison rapprochés",
      "Avancement lu dans les photos pour la situation",
      "Interlocuteur dédié du début à la fin",
      "Données hébergées dans l'Union européenne",
    ],
  },
];

export function Pricing() {
  return (
    <section className="bg-[#ffffff] py-16 md:py-20">
      <div className="px-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance font-bold text-3xl text-[#171717] md:text-4xl lg:text-5xl lg:tracking-tight">{FORMULES.titre}</h2>
          <p className="mx-auto mt-4 max-w-xl text-balance text-lg text-[#737373]">{FORMULES.sous}</p>
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:mt-14 md:grid-cols-3">
          {FORMULES.plans.map((p) => {
            const carte = CARTES.find((c) => c.id === p.id) ?? CARTES[0];
            const avant = "popular" in p && p.popular === true;
            return (
              <article
                key={p.id}
                className={`flex flex-col rounded-lg border p-6 ${avant ? "border-[#171717]/15 bg-[#fafafa] shadow-lg shadow-gray-950/5" : "border-[#e6e6e6] bg-white"}`}
              >
                <div className="flex items-center gap-x-2">
                  <h3 className="font-medium text-lg text-[#171717] tracking-tight">{p.name}</h3>
                  {avant ? (
                    <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-blue-600 text-xs">{FORMULES.conseille}</span>
                  ) : null}
                </div>
                <p className="mt-3 text-xl font-semibold text-[#171717]">{FORMULES.prix.replace(/,$/, "")}</p>
                <p className="text-[#737373] text-sm">{FORMULES.prixSous}</p>
                <p className="mt-3 min-h-[2.8em] text-[#737373] text-sm leading-[1.45]">{carte.pour}</p>

                <Button asChild size="sm" variant={avant ? "default" : "outline"} className="mt-5 h-9 w-full rounded-[6px]">
                  <Lien href={CONTACT.audit}>{p.cta}</Lien>
                </Button>

                <hr className="my-5 border-dashed border-[#e6e6e6]" />

                <ul className="space-y-3 text-sm text-[#525252]">
                  {carte.lignes.map((l) => (
                    <li key={l} className="flex items-start gap-2">
                      <Check className="mt-1 size-3 shrink-0 text-[#171717]" strokeWidth={2.5} aria-hidden="true" />
                      {l}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
