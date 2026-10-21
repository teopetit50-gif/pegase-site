"use client";

/* ══════════════════════════════════════════════════════════════════════
   CASHD — les pages de fonction (21/10/2026)

   Demande de Teo : une page par groupe de fonctions vendues, dans le volet
   du module, au lieu de tout tenir dans le tableau de bord et l'écran de
   travail. Cinq pages, une par famille du catalogue de la page produit
   (lib/produits/capacites/relances.ts) qui a déjà ses données :
     · Balance âgée          — « Suivi de l'encours »
     · Litiges et pauses     — « Litiges et exceptions »
     · Risque client         — « Risque client »
     · Devis sans réponse    — « Relance et escalade », côté devis
     · Encaissements         — « Encaissement et rapprochement »
   Chacune lit le même tableau (./donnees.ts) et renvoie, pour agir, vers la
   fiche du compte dans l'écran de travail : rien ne se décide ici.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { Download, ListChecks } from "lucide-react";
import { dateCourte, montant } from "@/components/espace/format";
import { jourParis } from "@/components/espace/cashd/calcul";
import { STATUTS_COMPTE } from "@/components/espace/cashd/etats";
import { exporterBalance } from "@/components/espace/cashd/tableur";
import type { Balance, Tableau } from "@/components/espace/cashd/types";
import { Badge, Note, Squelette, Vide, teinte } from "../ui";
import { lienCompte, useTableauCashd } from "./donnees";

type Stat = { libelle: string; valeur: string; sous: string; teinte?: "vert" | "ambre" | "rouge" | "bleu" | "gris" };

function Cadre({ titre, intro, stats, actions, children }: { titre: string; intro: string; stats: (t: Tableau) => Stat[]; actions?: (t: Tableau) => React.ReactNode; children: (t: Tableau) => React.ReactNode }) {
  const { tableau, erreur } = useTableauCashd();
  const s = tableau ? stats(tableau) : null;
  return (
    <div className="v2-page v2-arrivee">
      <h1 className="v2-sr">{titre}</h1>
      <div className="v2-tete" style={{ marginBottom: 24 }}>
        <div>
          <p>{intro}</p>
        </div>
        <div className="v2-actions">
          {tableau && actions ? actions(tableau) : null}
          <Link href="/espace2/cashd/suivi?vue=debiteurs" className="v2-btn">
            <ListChecks width={16} height={16} aria-hidden="true" /> Débiteurs et relances
          </Link>
        </div>
      </div>
      {erreur ? (
        <div style={{ marginBottom: 24 }}>
          <Note teinte="rouge" role="alert">
            <strong>La base réelle n&apos;a pas répondu.</strong> {erreur}
          </Note>
        </div>
      ) : null}
      <div className="v2-stats" style={{ "--nb": s?.length ?? 4 } as React.CSSProperties}>
        {(s ?? [0, 1, 2, 3].map(() => null)).map((x, i) => (
          <div key={x?.libelle ?? i} className="v2-stat" style={{ cursor: "default" }}>
            <span className="v2-stat-etiquette">
              <span className="v2-point" data-teinte={x?.teinte ?? "gris"} aria-hidden="true" />
              {x ? x.libelle : <Squelette largeur="60%" hauteur={14} />}
            </span>
            <span className="v2-stat-valeur">{x ? x.valeur : <Squelette largeur={64} hauteur={28} />}</span>
            <span className="v2-stat-sous">{x ? x.sous : <Squelette largeur="70%" hauteur={14} />}</span>
          </div>
        ))}
      </div>
      {tableau ? (
        children(tableau)
      ) : erreur ? null : (
        <div className="v2-carte" aria-busy="true" style={{ padding: 16, display: "grid", gap: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <Squelette key={i} hauteur={20} />
          ))}
        </div>
      )}
    </div>
  );
}

function Tableau({ colonnes, children, largeurs }: { colonnes: { libelle: string; num?: boolean }[]; children: React.ReactNode; largeurs?: string[] }) {
  return (
    <div className="v2-carte">
      <div className="v2-tableau-cadre">
        <table className="v2-tableau v2-tableau--empile">
          {largeurs ? (
            <colgroup>
              {largeurs.map((l, i) => (
                <col key={i} style={{ width: l }} />
              ))}
            </colgroup>
          ) : null}
          <thead>
            <tr>
              {colonnes.map((c) => (
                <th key={c.libelle} scope="col" className={c.num ? "v2-num" : undefined}>
                  {c.libelle}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

const Compte = ({ b }: { b: Pick<Balance, "compte_id" | "nom" | "reference"> }) => (
  <>
    <Link href={lienCompte(b.compte_id)} style={{ fontWeight: 500 }}>
      {b.nom}
    </Link>
    <small className="v2-mono">{b.reference}</small>
  </>
);

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/* ——— Balance âgée ——— */
const TRANCHES = [
  { cle: "non_echu", libelle: "Non échu" },
  { cle: "echu_1_30", libelle: "1 à 30 j" },
  { cle: "echu_31_60", libelle: "31 à 60 j" },
  { cle: "echu_61_90", libelle: "61 à 90 j" },
  { cle: "echu_plus_90", libelle: "+ 90 j" },
] as const;

export function BalanceAgee() {
  return (
    <Cadre
      titre="Balance âgée"
      intro="L'encours de chaque compte, rangé par ancienneté de retard. Elle est recalculée à chaque relecture du facturier, chaque matin."
      stats={(t) => [
        { libelle: "Encours", valeur: montant(t.totaux.encours), sous: pluriel(t.comptes.filter((b) => b.encours > 0).length, "compte") },
        { libelle: "Échu", valeur: montant(t.totaux.echu), sous: pluriel(t.totaux.factures_echues, "facture échue"), teinte: t.totaux.echu ? "ambre" : "vert" },
        { libelle: "Plus de 90 jours", valeur: montant(t.totaux.echu_plus_90), sous: "le retard le plus lourd", teinte: t.totaux.echu_plus_90 ? "rouge" : "vert" },
        { libelle: "En litige", valeur: montant(t.totaux.en_litige), sous: "sorti des relances", teinte: t.totaux.en_litige ? "rouge" : "gris" },
      ]}
      actions={(t) => (
        <button type="button" className="v2-btn" onClick={() => exporterBalance(t.comptes, jourParis())}>
          <Download width={16} height={16} aria-hidden="true" /> Exporter vers un tableur
        </button>
      )}
    >
      {(t) => {
        const comptes = t.comptes.filter((b) => b.encours !== 0 || b.credits !== 0).sort((a, b) => b.echu - a.echu || b.encours - a.encours);
        if (!comptes.length) return <Vide icone={<ListChecks width={20} height={20} />} titre="Aucun encours">Le facturier ne contient aucune facture ouverte.</Vide>;
        return (
          <Tableau colonnes={[{ libelle: "Compte" }, ...TRANCHES.map((x) => ({ libelle: x.libelle, num: true })), { libelle: "Encours", num: true }, { libelle: "Retard max", num: true }]}>
            {comptes.map((b) => (
              <tr key={b.compte_id}>
                <td data-etiquette="Compte" data-plein="">
                  <Compte b={b} />
                </td>
                {TRANCHES.map((x) => (
                  <td key={x.cle} data-etiquette={x.libelle} className="v2-num">
                    {b[x.cle] ? montant(b[x.cle], b.devise) : <span className="v2-gris">—</span>}
                  </td>
                ))}
                <td data-etiquette="Encours" className="v2-num" style={{ fontWeight: 500 }}>
                  {montant(b.encours, b.devise)}
                </td>
                <td data-etiquette="Retard max" className="v2-num">
                  {b.retard_max_jours > 0 ? `${b.retard_max_jours} j` : <span className="v2-gris">—</span>}
                </td>
              </tr>
            ))}
          </Tableau>
        );
      }}
    </Cadre>
  );
}

/* ——— Litiges et pauses ——— */
const HORS_CYCLE = ["litige", "pause", "recouvrement", "attente_contact", "hors_perimetre"] as const;

export function Litiges() {
  return (
    <Cadre
      titre="Litiges et pauses"
      intro="Les comptes sortis du cycle de relance : une contestation ouverte, une pause, un recouvrement, un contact à désigner. Une facture contestée ne reçoit plus de relance ; le reste du compte continue. La reprise se décide dans la fiche du compte, jamais par un simple délai écoulé."
      stats={(t) => {
        const n = (s: string) => t.comptes.filter((b) => b.statut === s).length;
        return [
          { libelle: "Montant en litige", valeur: montant(t.totaux.en_litige), sous: pluriel(t.comptes.filter((b) => b.en_litige > 0).length, "compte"), teinte: t.totaux.en_litige ? "rouge" : "vert" },
          { libelle: "En pause", valeur: String(n("pause")), sous: "relances suspendues", teinte: n("pause") ? "ambre" : "gris" },
          { libelle: "En recouvrement", valeur: String(n("recouvrement")), sous: "dossier remis", teinte: n("recouvrement") ? "rouge" : "gris" },
          { libelle: "Contact à désigner", valeur: String(n("attente_contact")), sous: "personne à qui écrire", teinte: n("attente_contact") ? "ambre" : "gris" },
        ];
      }}
    >
      {(t) => {
        const comptes = t.comptes
          .filter((b) => (HORS_CYCLE as readonly string[]).includes(b.statut) || b.en_litige > 0)
          .sort((a, b) => b.en_litige - a.en_litige || b.encours - a.encours);
        if (!comptes.length) return <Vide icone={<ListChecks width={20} height={20} />} titre="Aucun compte hors cycle">Toutes les factures ouvertes suivent leur séquence de relance.</Vide>;
        return (
          <Tableau colonnes={[{ libelle: "Compte" }, { libelle: "Situation" }, { libelle: "En litige", num: true }, { libelle: "Encours", num: true }, { libelle: "Plus ancienne échéance" }]}>
            {comptes.map((b) => {
              const st = STATUTS_COMPTE[b.statut];
              return (
                <tr key={b.compte_id}>
                  <td data-etiquette="Compte" data-plein="">
                    <Compte b={b} />
                  </td>
                  <td data-etiquette="Situation">
                    <Badge teinte={teinte(st.teinte === "noir" ? "rouge" : st.teinte)}>{b.statut === "actif" ? "Litige partiel" : st.libelle}</Badge>
                  </td>
                  <td data-etiquette="En litige" className="v2-num">
                    {b.en_litige ? montant(b.en_litige, b.devise) : <span className="v2-gris">—</span>}
                  </td>
                  <td data-etiquette="Encours" className="v2-num">
                    {montant(b.encours, b.devise)}
                  </td>
                  <td data-etiquette="Plus ancienne échéance">{b.plus_ancienne_echeance ? dateCourte(b.plus_ancienne_echeance) : "—"}</td>
                </tr>
              );
            })}
          </Tableau>
        );
      }}
    </Cadre>
  );
}

/* ——— Risque client ——— */
const utilisation = (b: Balance) => (b.plafond_encours && b.plafond_encours > 0 ? (b.encours / b.plafond_encours) * 100 : null);

export function Risque() {
  return (
    <Cadre
      titre="Risque client"
      intro="Le plafond d'encours de chaque compte, ce qu'il en consomme, et les comptes dont le retard s'allonge. Le plafond se fixe dans la fiche du compte, à partir de son historique ; un dépassement vous est signalé avant toute nouvelle commande."
      stats={(t) => {
        const avec = t.comptes.filter((b) => b.plafond_encours !== null);
        const proches = avec.filter((b) => (utilisation(b) ?? 0) >= 80 && !b.depasse_plafond).length;
        const degrade = t.comptes.filter((b) => b.retard_max_jours > 60).length;
        return [
          { libelle: "Au-dessus du plafond", valeur: String(t.totaux.au_dessus_du_plafond), sous: "commande à décider", teinte: t.totaux.au_dessus_du_plafond ? "rouge" : "vert" },
          { libelle: "Proches du plafond", valeur: String(proches), sous: "80 % et plus", teinte: proches ? "ambre" : "gris" },
          { libelle: "Retard de plus de 60 j", valeur: String(degrade), sous: "comptes qui se dégradent", teinte: degrade ? "ambre" : "gris" },
          { libelle: "Sans plafond", valeur: String(t.comptes.length - avec.length), sous: `sur ${pluriel(t.comptes.length, "compte")}` },
        ];
      }}
    >
      {(t) => {
        const comptes = t.comptes
          .filter((b) => b.encours > 0 || b.plafond_encours !== null)
          .sort((a, b) => Number(!!b.depasse_plafond) - Number(!!a.depasse_plafond) || (utilisation(b) ?? -1) - (utilisation(a) ?? -1) || b.retard_max_jours - a.retard_max_jours);
        if (!comptes.length) return <Vide icone={<ListChecks width={20} height={20} />} titre="Aucun compte à suivre">Aucun encours ni plafond pour l&apos;instant.</Vide>;
        return (
          <Tableau colonnes={[{ libelle: "Compte" }, { libelle: "Encours", num: true }, { libelle: "Plafond", num: true }, { libelle: "Utilisé", num: true }, { libelle: "Retard max", num: true }, { libelle: "État" }]}>
            {comptes.map((b) => {
              const u = utilisation(b);
              return (
                <tr key={b.compte_id}>
                  <td data-etiquette="Compte" data-plein="">
                    <Compte b={b} />
                  </td>
                  <td data-etiquette="Encours" className="v2-num">
                    {montant(b.encours, b.devise)}
                  </td>
                  <td data-etiquette="Plafond" className="v2-num">
                    {b.plafond_encours !== null ? montant(b.plafond_encours, b.devise) : <span className="v2-gris">aucun</span>}
                  </td>
                  <td data-etiquette="Utilisé" className="v2-num">
                    {u !== null ? `${Math.round(u)} %` : <span className="v2-gris">—</span>}
                  </td>
                  <td data-etiquette="Retard max" className="v2-num">
                    {b.retard_max_jours > 0 ? `${b.retard_max_jours} j` : <span className="v2-gris">—</span>}
                  </td>
                  <td data-etiquette="État">
                    {b.depasse_plafond ? (
                      <Badge teinte="rouge">Au-dessus du plafond</Badge>
                    ) : u !== null && u >= 80 ? (
                      <Badge teinte="ambre">Proche du plafond</Badge>
                    ) : b.retard_max_jours > 60 ? (
                      <Badge teinte="ambre">Retard qui s&apos;allonge</Badge>
                    ) : u === null ? (
                      <Badge>Plafond à fixer</Badge>
                    ) : (
                      <Badge teinte="vert">Dans le plafond</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </Tableau>
        );
      }}
    </Cadre>
  );
}

/* ——— Devis sans réponse ——— */
export function Devis() {
  return (
    <Cadre
      titre="Devis sans réponse"
      intro="Les devis envoyés qui attendent une réponse, suivis comme les factures échues. Le premier rappel part au troisième jour, le second sept jours plus tard ; chaque rappel attend votre validation dans « À valider »."
      stats={(t) => {
        const d = t.devis_en_attente;
        const total = d.reduce((s, x) => s + x.montant_ttc, 0);
        const vieux = d.filter((x) => x.jours_ecoules > 10).length;
        return [
          { libelle: "Devis en attente", valeur: String(d.length), sous: "sans réponse du client", teinte: d.length ? "ambre" : "vert" },
          { libelle: "Montant en jeu", valeur: montant(total), sous: "TTC" },
          { libelle: "Plus de 10 jours", valeur: String(vieux), sous: "après les deux rappels", teinte: vieux ? "rouge" : "gris" },
          { libelle: "Le plus ancien", valeur: d.length ? `${Math.max(...d.map((x) => x.jours_ecoules))} j` : "—", sous: "depuis l'envoi" },
        ];
      }}
    >
      {(t) => {
        const devis = [...t.devis_en_attente].sort((a, b) => b.jours_ecoules - a.jours_ecoules);
        if (!devis.length) return <Vide icone={<ListChecks width={20} height={20} />} titre="Aucun devis en attente">Tous les devis envoyés ont reçu une réponse.</Vide>;
        return (
          <Tableau colonnes={[{ libelle: "Devis" }, { libelle: "Compte" }, { libelle: "Montant", num: true }, { libelle: "Envoyé le" }, { libelle: "Attente", num: true }, { libelle: "Étape" }]}>
            {devis.map((d) => (
              <tr key={d.id}>
                <td data-etiquette="Devis">
                  <span className="v2-mono">{d.numero}</span>
                </td>
                <td data-etiquette="Compte">
                  <Link href={lienCompte(d.compte_id)} style={{ fontWeight: 500 }}>
                    {d.compte}
                  </Link>
                </td>
                <td data-etiquette="Montant" className="v2-num">
                  {montant(d.montant_ttc)}
                </td>
                <td data-etiquette="Envoyé le">{dateCourte(d.date_emission)}</td>
                <td data-etiquette="Attente" className="v2-num">
                  {d.jours_ecoules} j
                </td>
                <td data-etiquette="Étape">
                  {d.jours_ecoules < 3 ? <Badge>Avant le premier rappel</Badge> : d.jours_ecoules < 10 ? <Badge teinte="bleu">Premier rappel</Badge> : <Badge teinte="ambre">Second rappel passé</Badge>}
                </td>
              </tr>
            ))}
          </Tableau>
        );
      }}
    </Cadre>
  );
}

/* ——— Encaissements ——— */
export function Encaissements() {
  return (
    <Cadre
      titre="Encaissements"
      intro="Les règlements reçus qui ne soldent pas encore une facture : un virement sans référence, un paiement partiel, un acompte. Un règlement enregistré interrompt la séquence de relance avant le prochain envoi ; le lettrage se fait dans la vue Trésorerie."
      actions={() => (
        <Link href="/espace2/cashd/suivi?vue=tresorerie" className="v2-btn">
          Trésorerie
        </Link>
      )}
      stats={(t) => {
        const r = t.a_imputer;
        const sans = r.filter((x) => !x.compte_id).length;
        return [
          { libelle: "À imputer", valeur: montant(r.reduce((s, x) => s + x.a_imputer, 0)), sous: pluriel(r.length, "règlement"), teinte: r.length ? "ambre" : "vert" },
          { libelle: "Sans compte", valeur: String(sans), sous: "payeur à reconnaître", teinte: sans ? "rouge" : "gris" },
          { libelle: "Crédits clients", valeur: montant(t.totaux.credits), sous: "avoirs et trop-perçus" },
          { libelle: "Dernier import", valeur: t.dernier_import ? dateCourte(t.dernier_import) : "—", sous: "du relevé ou du facturier" },
        ];
      }}
    >
      {(t) => {
        const r = [...t.a_imputer].sort((a, b) => b.recu_le.localeCompare(a.recu_le));
        if (!r.length) return <Vide icone={<ListChecks width={20} height={20} />} titre="Tout est imputé">Chaque règlement reçu solde la facture qu&apos;il vise.</Vide>;
        return (
          <Tableau colonnes={[{ libelle: "Reçu le" }, { libelle: "Payeur" }, { libelle: "Référence" }, { libelle: "Montant", num: true }, { libelle: "Imputé", num: true }, { libelle: "À imputer", num: true }]}>
            {r.map((x) => (
              <tr key={x.id}>
                <td data-etiquette="Reçu le">{dateCourte(x.recu_le)}</td>
                <td data-etiquette="Payeur">
                  {x.compte_id ? (
                    <Link href={lienCompte(x.compte_id)} style={{ fontWeight: 500 }}>
                      {x.compte ?? "Compte"}
                    </Link>
                  ) : (
                    <Badge teinte="rouge">Sans compte</Badge>
                  )}
                </td>
                <td data-etiquette="Référence">
                  <span className="v2-mono">{x.reference ?? "—"}</span>
                  {x.libelle ? <small>{x.libelle}</small> : null}
                </td>
                <td data-etiquette="Montant" className="v2-num">
                  {montant(x.montant)}
                </td>
                <td data-etiquette="Imputé" className="v2-num">
                  {x.impute ? montant(x.impute) : <span className="v2-gris">—</span>}
                </td>
                <td data-etiquette="À imputer" className="v2-num" style={{ fontWeight: 500 }}>
                  {montant(x.a_imputer)}
                </td>
              </tr>
            ))}
          </Tableau>
        );
      }}
    </Cadre>
  );
}
