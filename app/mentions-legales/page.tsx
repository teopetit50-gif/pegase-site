import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { CANAL_VALEUR } from "@/lib/reservation";

/* 30/07 — le téléphone est ajouté : l'article 6-III-1 de la LCEN l'exige, et
   il ne figurait nulle part. Il vient de la même constante que le reste du
   site (lib/reservation), donc changer le numéro le change partout.

   L'adresse contact@pegase.gp a été retirée d'ici : la loi demande un moyen
   de contact « direct et effectif », or le domaine pegase.gp n'est ni
   enregistré ni délégué — une adresse qui rebondit ne remplit pas cette
   condition. Elle sera remise le jour où le domaine existera.

   RESTENT À FOURNIR PAR TEO : forme juridique, SIRET, adresse du siège, nom
   du représentant légal, et capital social s'il y a société. */

export const metadata: Metadata = {
  title: "Mentions légales — Pegase",
  description: "Mentions légales du site Pegase.",
};

const SECTIONS: { h: string; p: string }[] = [
  {
    h: "Éditeur du site",
    p: `Le site est édité par Pegase, entreprise établie en Guadeloupe. Immatriculation et coordonnées complètes : [à compléter — forme juridique, SIRET, adresse du siège]. Téléphone : ${CANAL_VALEUR}.`,
  },
  {
    h: "Directeur de la publication",
    p: "Le directeur de la publication est le représentant légal de Pegase : [à compléter].",
  },
  {
    h: "Hébergement",
    p: "Le site est hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — vercel.com.",
  },
  {
    h: "Données personnelles",
    p: `Ce site ne dépose pas de cookies de suivi publicitaire et ne collecte pas de données de navigation à des fins commerciales. Les informations transmises dans le cadre d'une demande d'audit ou de contact sont utilisées uniquement pour répondre à cette demande, conformément au Règlement général sur la protection des données (RGPD). Vous pouvez exercer vos droits d'accès, de rectification et de suppression en nous contactant au ${CANAL_VALEUR}.`,
  },
  {
    h: "Propriété intellectuelle",
    p: "L'ensemble des contenus du site — textes, marques des moteurs (PAYD, ANSWR, OFFLOAD, BRIEF, REVIVE, POSTD, REACH, HIRED, BILLD, PUBLIQ, STAYD, COLLECT), éléments graphiques — est la propriété de Pegase. Toute reproduction sans autorisation écrite préalable est interdite. Les données de démonstration présentées sur ce site (tableaux de bord, conversations, montants) sont fictives.",
  },
];

export default function MentionsLegalesPage() {
  return (
    <PageShell>
      <div className="border-b border-line-soft px-6 pb-16 pt-14 sm:px-10 sm:pb-20 sm:pt-28">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-[27px] font-medium tracking-[-0.02em] text-white sm:text-[44px]">
            Mentions légales
          </h1>
          <div className="mt-10 space-y-10">
            {SECTIONS.map((s) => (
              <div key={s.h}>
                <h2 className="text-[20px] font-medium text-white">{s.h}</h2>
                <p className="mt-3 text-[15px] leading-[1.85] text-muted">{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
