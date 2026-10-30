"use client";

/* Demander au groupe : une question en français, une réponse tirée du
   coffre, avec ses chiffres et ses sources. Démonstration : les réponses
   portent sur les données d'exemple du groupe fictif. */

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Database, RotateCcw, Sparkles } from "lucide-react";
import { usePoste } from "../Coquille3";
import type { Poste } from "../poste";
import { BUDGET, CAMPAGNES, COUT_HORAIRE, ECHEANCES, ENSEIGNES, USAGES, enseigne, eur, keur, nb, quand, societe } from "../donnees";
import { Pastille, Tableau } from "../ui3";

type Reponse = { id: string; poste: Poste; question: string; mots: string[]; sources: string[]; corps: () => React.ReactNode };

const somme = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((a, x) => a + f(x), 0);

const REPONSES: Reponse[] = [
  {
    id: "plancher",
    poste: "ceo",
    question: "Quelles sociétés passent sous leur plancher de trésorerie d'ici fin novembre ?",
    mots: ["tresorerie", "plancher", "cash", "liquidite", "banque", "sous"],
    sources: ["Banques · 41 comptes, ce matin 6 h", "Comptabilité · échéancier fournisseurs", "Paie · masse salariale de novembre"],
    corps: () => (
      <>
        <p>Trois sociétés passent sous leur plancher avant le 30 novembre si les encaissements suivent le rythme d&apos;octobre :</p>
        <Tableau colonnes={[{ libelle: "Société" }, { libelle: "Aujourd'hui", num: true }, { libelle: "Point bas", num: true }, { libelle: "Date" }, { libelle: "Plancher", num: true }]}>
          <tr><td>Maison Soléa</td><td className="v2-num">190 k€</td><td className="v2-num">−42 k€</td><td>12 nov.</td><td className="v2-num">250 k€</td></tr>
          <tr><td>Brico Soléa Martinique</td><td className="v2-num">420 k€</td><td className="v2-num">286 k€</td><td>15 nov.</td><td className="v2-num">450 k€</td></tr>
          <tr><td>Soléa Pièces</td><td className="v2-num">310 k€</td><td className="v2-num">198 k€</td><td>28 nov.</td><td className="v2-num">250 k€</td></tr>
        </Tableau>
        <p>Pour Maison Soléa, une avance de 180 k€ du siège couvre le point bas avec 6 semaines de marge ; elle vous attend dans « Décisions à prendre ». Pour Soléa Pièces, 58 k€ d&apos;échus à plus de 90 jours chez deux garages suffiraient à rester au-dessus du plancher.</p>
      </>
    ),
  },
  {
    id: "auto",
    poste: "ceo",
    question: "Pourquoi l'automobile recule en Guadeloupe ?",
    mots: ["auto", "automobile", "voiture", "concession", "recule", "baisse", "guadeloupe", "pourquoi"],
    sources: ["ERP concession · ventes VN, VO, atelier", "CRM · 8 900 clients", "Stock · 214 véhicules"],
    corps: () => (
      <>
        <p>Soléa Auto Guadeloupe fait −11,4 % sur l&apos;an dernier. La baisse vient presque entièrement du véhicule neuf :</p>
        <ul>
          <li><strong>Véhicules neufs : −18 %</strong> (61 immatriculations contre 74), surtout sur les citadines thermiques depuis la fin du bonus local en septembre.</li>
          <li><strong>Occasion : +2 %</strong>, stable.</li>
          <li><strong>Atelier : +4 %</strong>, mais {nb(1284)} clients n&apos;y sont pas revenus depuis 18 mois.</li>
          <li><strong>41 véhicules en stock depuis plus de 120 jours</strong>, soit 1,1 M€ immobilisés.</li>
        </ul>
        <p>La Martinique, même marque, fait +4,1 % grâce aux hybrides. La campagne « SUV hybrides » lancée il y a 9 jours en Guadeloupe a déjà généré 318 contacts.</p>
      </>
    ),
  },
  {
    id: "clients",
    poste: "ceo",
    question: "Quels clients doivent de l'argent à plusieurs sociétés du groupe ?",
    mots: ["client", "doivent", "encours", "impaye", "plusieurs", "argent", "creance", "dette"],
    sources: ["Comptabilité · 18 sociétés", "Référentiel clients · 186 400 fiches", "CASHD · historique des relances"],
    corps: () => (
      <>
        <p>Cinq clients doivent de l&apos;argent à au moins deux sociétés du groupe. Un seul dépasse le plafond fixé par le groupe :</p>
        <Tableau colonnes={[{ libelle: "Client" }, { libelle: "Sociétés", num: true }, { libelle: "Encours", num: true }, { libelle: "Échu > 60 j", num: true }]}>
          <tr><td>Collectivité — marchés publics</td><td className="v2-num">4</td><td className="v2-num">742 k€</td><td className="v2-num">211 k€</td></tr>
          <tr><td><strong>Batimat Caraïbes</strong> <Pastille teinte="rouge">au-dessus du plafond</Pastille></td><td className="v2-num">3</td><td className="v2-num">486 k€</td><td className="v2-num">118 k€</td></tr>
          <tr><td>Hôtel Les Alizés</td><td className="v2-num">2</td><td className="v2-num">164 k€</td><td className="v2-num">12 k€</td></tr>
          <tr><td>Transports Lubin</td><td className="v2-num">3</td><td className="v2-num">138 k€</td><td className="v2-num">41 k€</td></tr>
          <tr><td>Clinique du Lamentin</td><td className="v2-num">2</td><td className="v2-num">96 k€</td><td className="v2-num">—</td></tr>
        </Tableau>
        <p>Batimat Caraïbes continue de commander chez Soléa Import alors que Brico Guadeloupe le relance depuis 74 jours : aucune des trois sociétés ne voyait l&apos;encours des deux autres.</p>
      </>
    ),
  },
  {
    id: "contrats",
    poste: "ceo",
    question: "Quels contrats et baux arrivent à échéance dans les trois mois ?",
    mots: ["contrat", "bail", "baux", "echeance", "reconduction", "preavis", "renouvel"],
    sources: ["Contrats, baux, assurances · 6 830 documents", "Agenda juridique"],
    corps: () => (
      <>
        <p>Six échéances contractuelles dans les 90 jours, pour {keur(somme(ECHEANCES.filter((e) => ["Contrat", "Bail"].includes(e.type)), (e) => e.enjeu ?? 0))} engagés :</p>
        <ul>
          {ECHEANCES.filter((e) => ["Contrat", "Bail"].includes(e.type))
            .sort((a, b) => a.jours - b.jours)
            .map((e) => (
              <li key={e.id}>
                <strong>{e.titre}</strong> — {societe(e.societe)?.nom}, {quand(e.jours)}
                {e.enjeu ? `, ${keur(e.enjeu)}` : ""}
              </li>
            ))}
        </ul>
        <p>Le plus urgent : le gardiennage des centres commerciaux se reconduit pour 3 ans si personne ne le dénonce sous 2 jours. Deux devis concurrents sont 14 % moins chers.</p>
      </>
    ),
  },
  {
    id: "ia",
    poste: "ceo",
    question: "Combien nous coûte l'IA, et qu'est-ce qu'elle nous rapporte ?",
    mots: ["cout", "coute", "ia", "api", "rapporte", "budget", "consommation", "jeton", "prix"],
    sources: ["Facturation du fournisseur de modèles · 30 jours", "Journal des usages"],
    corps: () => {
      const cout = somme(USAGES, (u) => u.cout);
      const h = somme(USAGES, (u) => u.heures);
      return (
        <>
          <p>
            Sur les 30 derniers jours, l&apos;IA du groupe a coûté <strong>{eur(cout)}</strong>, pour un budget de {eur(BUDGET.groupe)}. Elle a rendu <strong>{nb(h)} heures</strong> aux équipes, soit {eur(h * COUT_HORAIRE)} de temps valorisé à {COUT_HORAIRE} € l&apos;heure : environ {Math.round((h * COUT_HORAIRE) / cout)} € pour 1 € dépensé.
          </p>
          <ul>
            <li>Le premier poste de coût : les questions posées au coffre ({eur(1980)}), suivies de la lecture des factures ({eur(1460)}).</li>
            <li>Le meilleur rendement : le tri du courrier, {eur(160)} pour 380 heures.</li>
            <li>Au rythme des 7 derniers jours, le mois finira autour de 8 060 €, juste au-dessus du budget de {eur(BUDGET.groupe)} : l&apos;alerte des 90 % a été envoyée à la DSI.</li>
          </ul>
        </>
      );
    },
  },
  {
    id: "progression",
    poste: "ceo",
    question: "Quelles sociétés progressent le plus cette année ?",
    mots: ["progresse", "croissance", "meilleur", "performance", "classement", "annee", "objectif"],
    sources: ["Comptabilité · 18 sociétés", "Objectifs 2026 du groupe"],
    corps: () => (
      <>
        <p>Sur la même semaine de l&apos;an dernier, hors ventes entre sociétés du groupe :</p>
        <Tableau colonnes={[{ libelle: "Société" }, { libelle: "Sur N-1", num: true }, { libelle: "Objectif cumulé", num: true }]}>
          <tr><td>Soléa Location</td><td className="v2-num">+12,3 %</td><td className="v2-num">111 %</td></tr>
          <tr><td>Soléa Market Cayenne</td><td className="v2-num">+9,8 %</td><td className="v2-num">108 %</td></tr>
          <tr><td>Brico Soléa Guadeloupe</td><td className="v2-num">+6,7 %</td><td className="v2-num">104 %</td></tr>
          <tr><td>Soléa Market Jarry</td><td className="v2-num">+5,4 %</td><td className="v2-num">101 %</td></tr>
        </Tableau>
        <p>À l&apos;autre bout : Soléa Auto Guadeloupe (−11,4 %), Brico Soléa Martinique (−4,9 %) et Soléa Market Lamentin (−2,6 %).</p>
      </>
    ),
  },

  {
    id: "fideles",
    poste: "marketing",
    question: "Quels magasins ont perdu le plus de clients fidèles depuis juin ?",
    mots: ["fidele", "perdu", "magasin", "client", "depuis", "churn", "partis", "perte"],
    sources: ["Caisses · 1,8 M tickets / mois", "Carte fidélité · 186 400 fiches unifiées"],
    corps: () => (
      <>
        <p>Un client fidèle = au moins un passage par semaine pendant 3 mois. Depuis juin :</p>
        <Tableau colonnes={[{ libelle: "Magasin" }, { libelle: "Fidèles perdus", num: true }, { libelle: "Constat" }]}>
          <tr><td>Soléa Market Lamentin</td><td className="v2-num">1 240</td><td>ont réduit leurs passages, panier −22 %</td></tr>
          <tr><td>Brico Soléa Martinique</td><td className="v2-num">610</td><td>attente en caisse le samedi (avis)</td></tr>
          <tr><td>Soléa Market Destreland</td><td className="v2-num">380</td><td>dont 140 passés à Jarry</td></tr>
        </Tableau>
        <p>Au Lamentin, la baisse suit les ruptures en fruits et légumes relevées depuis 4 semaines par les opérations. Une offre ciblée sur les 1 240 clients est prête à être proposée.</p>
      </>
    ),
  },
  {
    id: "roi",
    poste: "marketing",
    question: "Quelle campagne a rapporté le plus par euro dépensé ?",
    mots: ["campagne", "rapporte", "euro", "roi", "rentable", "depense", "meilleure", "performance"],
    sources: ["Régies publicitaires · 5 comptes", "Caisses et ERP · ventes attribuées"],
    corps: () => {
      const cs = CAMPAGNES.filter((c) => c.depense > 0).map((c) => ({ c, r: c.ventes / c.depense })).sort((a, b) => b.r - a.r);
      return (
        <>
          <p>Ventes attribuées pour 1 € dépensé, campagnes en cours ou terminées :</p>
          <Tableau colonnes={[{ libelle: "Campagne" }, { libelle: "Dépensé", num: true }, { libelle: "Ventes", num: true }, { libelle: "Pour 1 €", num: true }]}>
            {cs.map(({ c, r }) => (
              <tr key={c.id}>
                <td>
                  {c.nom} <span className="v2-gris">· {enseigne(c.enseigne)?.nom}</span>
                </td>
                <td className="v2-num">{eur(c.depense)}</td>
                <td className="v2-num">{eur(c.ventes)}</td>
                <td className="v2-num">{Math.round(r)} €</td>
              </tr>
            ))}
          </Tableau>
          <p>Les e-mails aux clients déjà connus rapportent le plus : la carte fidélité de Destreland fait 202 € de ventes pour 1 € dépensé. La publicité sur les réseaux reste la meilleure pour faire venir de nouveaux clients.</p>
        </>
      );
    },
  },
  {
    id: "croises",
    poste: "marketing",
    question: "Qui sont nos clients présents dans plusieurs enseignes du groupe ?",
    mots: ["plusieurs", "enseignes", "croise", "commun", "multi", "presents"],
    sources: ["Référentiel clients · 55 400 doublons fusionnés", "Caisses et ERP · 12 mois"],
    corps: () => (
      <>
        <p><strong>48 200 clients</strong> achètent dans au moins deux enseignes du groupe (21 % de la base). Ils dépensent en moyenne 1 840 € par an, 2,6 fois plus que les autres. Les associations les plus fréquentes :</p>
        <ul>
          <li>Soléa Market + Brico Soléa : 19 400 clients</li>
          <li>Soléa Market + Soléa Auto (atelier) : 8 100 clients</li>
          <li>Brico Soléa + Maison Soléa : 5 300 clients</li>
        </ul>
        <p>Avant le coffre, chaque enseigne les comptait comme des clients différents. Une carte fidélité commune au groupe toucherait directement ces 48 200 personnes.</p>
      </>
    ),
  },
  {
    id: "inactifs",
    poste: "marketing",
    question: "Prépare une relance pour les clients inactifs de Soléa Auto Guadeloupe",
    mots: ["prepare", "relance", "inactif", "auto", "sms", "redige", "message", "campagne"],
    sources: ["CRM concession · 8 900 clients", "Atelier · historique des passages", "Liste d'opposition au démarchage"],
    corps: () => (
      <>
        <p><strong>{nb(1284)} clients</strong> sans passage à l&apos;atelier depuis 18 mois, véhicule de moins de 8 ans, opposés au démarchage retirés. Message proposé :</p>
        <blockquote style={{ margin: 0, padding: "10px 14px", borderLeft: "3px solid var(--v2-blue-700)", background: "var(--v2-a-100)", borderRadius: 4 }}>
          « Bonjour M. Jean-Baptiste, votre Clio n&apos;est pas passée chez nous depuis mars 2025. Avant la fin de la saison des pluies, la révision complète est à 149 € jusqu&apos;au 30 novembre. Prendre rendez-vous : 0590 XX XX XX. Soléa Auto. STOP au 36XXX »
        </blockquote>
        <p>Coût estimé : 900 € d&apos;envoi. Sur les deux dernières relances de ce type, 11 % des clients sont revenus, soit environ 140 révisions. La campagne vous attend dans « Décisions à prendre » : rien ne part sans votre accord.</p>
      </>
    ),
  },
  {
    id: "avis",
    poste: "marketing",
    question: "Pourquoi la note Google de Brico Soléa Martinique baisse ?",
    mots: ["note", "google", "avis", "baisse", "brico", "martinique", "reputation", "etoile"],
    sources: ["Avis Google · 67 avis ce mois", "Caisses · temps d'attente le samedi"],
    corps: () => {
      const e = ENSEIGNES.find((x) => x.id === "brico-mq");
      return (
        <>
          <p>La note est passée de 3,9 à {e?.noteGoogle.toLocaleString("fr-FR")} en un mois. Sur les 67 avis d&apos;octobre :</p>
          <ul>
            <li><strong>41 %</strong> parlent de l&apos;attente en caisse le samedi — 2 caisses ouvertes sur 6 entre 10 h et 12 h.</li>
            <li><strong>22 %</strong> d&apos;une rupture sur la peinture extérieure, depuis 3 semaines.</li>
            <li>Le délai de réponse aux avis est de 14 min, le plus lent du groupe.</li>
          </ul>
          <p>Six réponses sont prêtes, signées par le directeur du magasin. Ouvrir deux caisses de plus le samedi matin réglerait l&apos;essentiel : la même mesure à Brico Guadeloupe a fait remonter la note de 0,2 point en six semaines.</p>
        </>
      );
    },
  },
];

const normaliser = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function trouver(texte: string, poste: Poste): Reponse | null {
  const t = normaliser(texte);
  const exacte = REPONSES.find((r) => normaliser(r.question) === t);
  if (exacte) return exacte;
  let meilleure: Reponse | null = null;
  let score = 0;
  for (const r of REPONSES) {
    const s = r.mots.filter((m) => t.includes(m)).length + (r.poste === poste ? 0.5 : 0);
    if (s > score) {
      score = s;
      meilleure = r;
    }
  }
  return score >= 1.5 ? meilleure : null;
}

type Message = { id: number; moi: string; reponse: Reponse | null; pret: boolean };

export default function Demander() {
  const poste = usePoste();
  const [messages, setMessages] = useState<Message[]>([]);
  const [saisie, setSaisie] = useState("");
  const suivant = useRef(1);
  const bas = useRef<HTMLDivElement>(null);
  const idees = REPONSES.filter((r) => r.poste === poste);

  /* changer de poste : une nouvelle conversation */
  const [posteVu, setPosteVu] = useState(poste);
  if (posteVu !== poste) {
    setPosteVu(poste);
    setMessages([]);
  }

  useEffect(() => {
    bas.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const demander = (texte: string) => {
    const q = texte.trim();
    if (!q) return;
    const id = suivant.current++;
    setMessages((m) => [...m, { id, moi: q, reponse: trouver(q, poste), pret: false }]);
    setSaisie("");
    window.setTimeout(() => setMessages((m) => m.map((x) => (x.id === id ? { ...x, pret: true } : x))), 1300 + (q.length % 7) * 140);
  };

  return (
    <div className="v2-page v2-arrivee e3-page" style={{ maxWidth: 960 }}>
      <div className="e3-chat">
        <div className="e3-fil">
          {messages.length === 0 ? (
            <div className="e3-accueil-chat">
              <Sparkles width={24} height={24} aria-hidden="true" />
              <h2>Demander au groupe</h2>
              <p>
                {poste === "marketing"
                  ? "Posez une question sur vos clients, vos enseignes ou vos campagnes. La réponse vient des caisses, de la fidélité et des régies de tout le groupe, avec ses sources."
                  : "Posez une question sur n'importe quelle société du groupe. La réponse vient du coffre — comptabilité, banques, caisses, contrats — avec ses chiffres et ses sources."}
              </p>
              <div className="e3-idees">
                {idees.map((r) => (
                  <button key={r.id} type="button" className="e3-idee" onClick={() => demander(r.question)}>
                    {r.question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} style={{ display: "grid", gap: 16 }}>
                <div className="e3-bulle-moi">{m.moi}</div>
                {!m.pret ? (
                  <div className="e3-reflexion" role="status">
                    <i />
                    <i />
                    <i /> Lecture du coffre{m.reponse ? ` · ${m.reponse.sources.length} sources` : ""}…
                  </div>
                ) : (
                  <div className="e3-reponse">
                    <span className="e3-reponse-tete">
                      <Sparkles width={14} height={14} aria-hidden="true" /> IA du groupe · réponse tirée du coffre
                    </span>
                    {m.reponse ? (
                      m.reponse.corps()
                    ) : (
                      <p>
                        Je n&apos;ai pas de donnée qui réponde exactement à cette question dans votre périmètre. Voici ce que je peux vous donner tout de suite : {poste === "marketing" ? "les performances des campagnes, les clients inactifs, les avis par enseigne ou les clients communs à plusieurs enseignes" : "la trésorerie par société, les encours clients, les échéances de contrats, les ventes par pôle ou le coût de l'IA"}. Reformulez, ou choisissez l&apos;une de ces pistes.
                      </p>
                    )}
                    <div className="e3-sources">
                      <Database width={12} height={12} aria-hidden="true" />
                      {(m.reponse?.sources ?? ["Coffre du groupe"]).map((s) => (
                        <span key={s} className="e3-piece">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={bas} />
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {messages.length > 0 ? (
            <div className="e3-idees">
              {idees
                .filter((r) => !messages.some((m) => m.reponse?.id === r.id))
                .slice(0, 3)
                .map((r) => (
                  <button key={r.id} type="button" className="e3-idee" onClick={() => demander(r.question)}>
                    {r.question}
                  </button>
                ))}
              <button type="button" className="e3-idee" onClick={() => setMessages([])}>
                <RotateCcw width={12} height={12} aria-hidden="true" /> Nouvelle conversation
              </button>
            </div>
          ) : null}
          <form
            className="e3-saisie"
            onSubmit={(e) => {
              e.preventDefault();
              demander(saisie);
            }}
          >
            <label className="v2-sr" htmlFor="e3-question">
              Votre question
            </label>
            <textarea
              id="e3-question"
              rows={1}
              value={saisie}
              placeholder={poste === "marketing" ? "Ex. : quels clients relancer avant Noël ?" : "Ex. : quelle société dérape sur ses impayés ?"}
              onChange={(e) => setSaisie(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  demander(saisie);
                }
              }}
            />
            <button type="submit" className="v2-btn v2-btn--primaire v2-btn--icone" aria-label="Envoyer" disabled={!saisie.trim()}>
              <ArrowUp width={16} height={16} aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
