"use client";

/* L'accueil de /espace3 : « Le groupe ce matin » pour le CEO, « Le
   marketing ce matin » pour la direction marketing. */

import { useMonte } from "@/components/espace2/horloge";
import { usePoste } from "../Coquille3";
import { RACINE } from "../poste";
import { BUDGET, CAMPAGNES, COUT_JOURS_GROUPE, COUT_JOURS_MARKETING, COUT_HORAIRE, CONTENUS, DECISIONS_CEO, DECISIONS_MARKETING, DIRECTIONS, ECHEANCES, ENSEIGNES, POLES, SOCIETES, SOURCES, USAGES, VENTES_SEMAINES, VENTES_SEMAINES_N1, enseigne, eur, keur, meur, nb, pct, quand, societe } from "../donnees";
import { Barres, Carte, Courbe, Grille, Kpi, Kpis, Ligne, Liste, Page, Pastille, Tendance, Tete } from "../ui3";

export default function Accueil() {
  const poste = usePoste();
  return poste === "marketing" ? <AccueilMarketing /> : <AccueilCeo />;
}

function DateDuJour() {
  const monte = useMonte();
  if (!monte) return <>Point préparé ce matin à 6 h 15</>;
  const j = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return <>{j.charAt(0).toUpperCase() + j.slice(1)} · point préparé à 6 h 15</>;
}

const somme = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((a, x) => a + f(x), 0);

function AccueilCeo() {
  const ventes = VENTES_SEMAINES[VENTES_SEMAINES.length - 1];
  const vsS1 = ((ventes - VENTES_SEMAINES[VENTES_SEMAINES.length - 2]) / VENTES_SEMAINES[VENTES_SEMAINES.length - 2]) * 100;
  const vsN1 = ((ventes - VENTES_SEMAINES_N1[VENTES_SEMAINES_N1.length - 1]) / VENTES_SEMAINES_N1[VENTES_SEMAINES_N1.length - 1]) * 100;
  const treso = somme(SOCIETES, (s) => s.tresorerie);
  const ech30 = somme(SOCIETES, (s) => s.echeances30);
  const encours = somme(SOCIETES, (s) => s.encours);
  const echu = somme(SOCIETES, (s) => s.echu90);
  const sousPlancher = SOCIETES.filter((s) => s.tresorerie < s.plancher);
  const recus = SOCIETES.filter((s) => s.reporting === "recu").length;
  const heures = somme(USAGES, (u) => u.heures);
  const coutMois = somme(COUT_JOURS_GROUPE, (c) => c);
  const enAttente = somme(DIRECTIONS, (d) => d.enAttente);

  const parPole = POLES.filter((p) => p.cle !== "services").map((p) => {
    const ss = SOCIETES.filter((s) => s.pole === p.cle);
    const v = somme(ss, (s) => s.ventes);
    const n1 = somme(ss, (s) => s.ventes / (1 + s.vsN1 / 100));
    return { p, v, evol: ((v - n1) / n1) * 100 };
  });

  const surveiller = [
    ...sousPlancher.map((s) => ({ id: `t-${s.id}`, teinte: "rouge" as const, titre: `${s.nom} sous son plancher de trésorerie`, sous: `${keur(s.tresorerie)} pour un plancher de ${keur(s.plancher)}`, href: `${RACINE}/argent` })),
    ...SOCIETES.filter((s) => s.reporting !== "recu").map((s) => ({ id: `r-${s.id}`, teinte: s.reporting === "manquant" ? ("rouge" as const) : ("ambre" as const), titre: `Reporting ${s.reporting === "manquant" ? "manquant" : "en retard"} : ${s.nom}`, sous: "Reporting hebdomadaire au groupe", href: `${RACINE}/groupe` })),
    ...ECHEANCES.filter((e) => e.jours <= 2 && e.etat !== "fait").map((e) => ({ id: e.id, teinte: e.jours < 0 ? ("rouge" as const) : ("ambre" as const), titre: e.titre, sous: `${societe(e.societe)?.nom} · ${quand(e.jours)}`, href: `${RACINE}/echeances` })),
    ...SOURCES.filter((x) => x.etat === "erreur").map((x) => ({ id: x.nom, teinte: "ambre" as const, titre: `Source à rebrancher : ${x.nom}`, sous: `Dernière lecture ${x.fraicheur}`, href: `${RACINE}/coffre` })),
  ];

  return (
    <Page>
      <Tete titre="Le groupe ce matin" sous={<DateDuJour />} />

      <div className="e3-matin">
        <strong>Les ventes du groupe tiennent : {pct(vsN1)} sur l&apos;an dernier, portées par la Distribution et l&apos;Import.</strong>
        <span>
          L&apos;Automobile recule en Guadeloupe ({pct(-11.4)}), la Distribution et la Maison tiennent. {sousPlancher.length} sociétés passent sous leur plancher de trésorerie. Trois décisions attendent la présidence, dont deux avant demain soir.
        </span>
      </div>

      <Kpis>
        <Kpi libelle="Ventes de la semaine" valeur={meur(ventes)} sous={<><Tendance v={vsS1} /> sur S-1 · <Tendance v={vsN1} /> sur N-1</>} href={`${RACINE}/groupe`} />
        <Kpi libelle="Trésorerie disponible" valeur={meur(treso)} sous={<>{meur(ech30)} d&apos;échéances à 30 jours</>} href={`${RACINE}/argent`} />
        <Kpi libelle="Encours clients" valeur={meur(encours)} sous={<>dont {keur(echu)} échus à plus de 90 jours</>} href={`${RACINE}/argent`} />
        <Kpi libelle="Sous le plancher" teinte={sousPlancher.length ? "rouge" : "vert"} valeur={`${sousPlancher.length} sociétés`} sous={sousPlancher.map((s) => s.nom).join(", ")} href={`${RACINE}/argent`} />
        <Kpi libelle="Reportings reçus" valeur={`${recus} / ${SOCIETES.length}`} sous={`${SOCIETES.length - recus} en retard ou manquants`} href={`${RACINE}/groupe`} />
        <Kpi libelle="Décisions en attente" valeur={nb(enAttente)} sous="dans les six directions" href={`${RACINE}/directions`} />
        <Kpi libelle="Temps rendu aux équipes" valeur={`${nb(heures)} h`} sous={`ce mois-ci · ${eur(heures * COUT_HORAIRE)} de temps valorisé`} href={`${RACINE}/consommation`} />
        <Kpi libelle="Coût de l'IA du mois" valeur={eur(coutMois)} sous={`${Math.round((coutMois / BUDGET.groupe) * 100)} % du budget de ${eur(BUDGET.groupe)}`} href={`${RACINE}/consommation`} />
      </Kpis>

      <Grille modele="large">
        <Carte titre="Ventes du groupe, hors intragroupe" sous="12 dernières semaines, en k€ — indicateur de gestion, pas une consolidation comptable" lien={{ href: `${RACINE}/groupe`, texte: "Par société" }}>
          <Courbe valeurs={VENTES_SEMAINES} comparaison={VENTES_SEMAINES_N1} format={(n) => keur(Math.round(n))} debut="S-11" fin="Cette semaine" />
          <div className="e3-legende">
            <span><i /> Cette année</span>
            <span><i data-pointille="" /> L&apos;an dernier</span>
          </div>
        </Carte>
        <Carte titre="Ce qui attend la présidence" lien={{ href: `${RACINE}/decisions`, texte: "Décider" }}>
          <Liste>
            {DECISIONS_CEO.map((d) => (
              <Ligne key={d.id} teinte={d.echeance <= 2 ? "rouge" : "ambre"} titre={d.titre} sous={`${d.direction} · ${quand(d.echeance)}`} fin={d.montant ? keur(d.montant) : undefined} href={`${RACINE}/decisions`} />
            ))}
          </Liste>
        </Carte>
      </Grille>

      <Grille>
        <Carte titre="Ventes de la semaine par pôle" sous="Évolution sur la même semaine de l'an dernier">
          <Barres lignes={parPole.map(({ p, v, evol }) => ({ libelle: p.nom, valeur: v, texte: keur(v), couleur: p.couleur, sous: <Tendance v={Math.round(evol * 10) / 10} /> }))} />
        </Carte>
        <Carte titre="À surveiller" sous={`${surveiller.length} points relevés ce matin`}>
          <Liste>
            {surveiller.slice(0, 7).map((x) => (
              <Ligne key={x.id} teinte={x.teinte} titre={x.titre} sous={x.sous} href={x.href} />
            ))}
          </Liste>
        </Carte>
      </Grille>
    </Page>
  );
}

function AccueilMarketing() {
  const actifs = somme(ENSEIGNES, (e) => e.clientsActifs);
  const inactifs = somme(ENSEIGNES, (e) => e.inactifs);
  const demandes = somme(ENSEIGNES, (e) => e.demandes);
  const sansReponse = somme(ENSEIGNES, (e) => e.sansReponse);
  const avis = somme(ENSEIGNES, (e) => e.avisMois);
  const note = somme(ENSEIGNES, (e) => e.noteGoogle * e.avisMois) / avis;
  const enCours = CAMPAGNES.filter((c) => c.etat === "en_cours");
  const depense = somme(CAMPAGNES, (c) => c.depense);
  const ventesAttribuees = somme(CAMPAGNES.filter((c) => c.etat !== "programmee" && c.etat !== "a_valider"), (c) => c.ventes);
  const leads = somme(CAMPAGNES, (c) => c.leads);
  const coutMois = somme(COUT_JOURS_MARKETING, (c) => c);
  const heures = somme(USAGES.filter((u) => u.direction === "Marketing"), (u) => u.heures);
  const aValider = CONTENUS.filter((c) => c.etat === "a_valider").length;

  return (
    <Page>
      <Tete titre="Le marketing ce matin" sous={<DateDuJour />} />

      <div className="e3-matin">
        <strong>La campagne SUV hybrides a généré 318 contacts qualifiés en 9 jours.</strong>
        <span>
          Brico Soléa Martinique perd 0,3 point de note Google en un mois, six avis portent sur l&apos;attente en caisse le samedi. {nb(1284)} clients de Soléa Auto Guadeloupe n&apos;ont pas remis les pieds à l&apos;atelier depuis 18 mois : la relance est prête.
        </span>
      </div>

      <Kpis>
        <Kpi libelle="Clients actifs du groupe" valeur={nb(actifs)} sous={<><Tendance v={2.8} /> sur 12 mois · fiches unifiées</>} href={`${RACINE}/clients`} />
        <Kpi libelle="Clients inactifs à relancer" teinte="ambre" valeur={nb(inactifs)} sous="repérés cette semaine" href={`${RACINE}/clients`} />
        <Kpi libelle="Ventes attribuées aux campagnes" valeur={eur(ventesAttribuees)} sous={`pour ${eur(depense)} dépensés · ${nb(leads)} contacts`} href={`${RACINE}/campagnes`} />
        <Kpi libelle="Campagnes en cours" valeur={nb(enCours.length)} sous={`${CAMPAGNES.filter((c) => c.etat === "a_valider").length} à valider · ${CAMPAGNES.filter((c) => c.etat === "programmee").length} programmées`} href={`${RACINE}/campagnes`} />
        <Kpi libelle="Note Google moyenne" valeur={`${note.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ★`} sous={`${nb(avis)} avis ce mois · tous ont une réponse`} href={`${RACINE}/avis`} />
        <Kpi libelle="Demandes clients reçues" valeur={nb(demandes)} sous={`${sansReponse} sans réponse · médiane 5 min`} teinte={sansReponse ? "ambre" : "vert"} href={`${RACINE}/avis`} />
        <Kpi libelle="Contenus à valider" valeur={nb(aValider)} sous="préparés cette nuit" href={`${RACINE}/contenus`} />
        <Kpi libelle="Coût de l'IA marketing" valeur={eur(coutMois)} sous={`${nb(heures)} h rendues à l'équipe ce mois`} href={`${RACINE}/consommation`} />
      </Kpis>

      <Grille modele="large">
        <Carte titre="Fréquentation par enseigne" sous="Ce mois-ci, évolution sur l'an dernier" lien={{ href: `${RACINE}/clients`, texte: "Clients" }}>
          <Barres lignes={ENSEIGNES.filter((e) => e.pole !== "auto").map((e) => ({ libelle: e.nom, valeur: e.frequentation, texte: `${nb(e.frequentation)} passages`, teinte: e.vsN1 < 0 ? "rouge" : undefined, sous: <Tendance v={e.vsN1} /> }))} />
        </Carte>
        <Carte titre="À décider aujourd'hui" lien={{ href: `${RACINE}/decisions`, texte: "Décider" }}>
          <Liste>
            {DECISIONS_MARKETING.map((d) => (
              <Ligne key={d.id} teinte={d.echeance <= 1 ? "rouge" : "ambre"} titre={d.titre} sous={`${enseigne(d.societe ?? "")?.nom ?? ""} · ${quand(d.echeance)}`} href={`${RACINE}/decisions`} />
            ))}
          </Liste>
        </Carte>
      </Grille>

      <Grille>
        <Carte titre="Campagnes en cours" lien={{ href: `${RACINE}/campagnes`, texte: "Toutes" }}>
          <Liste>
            {enCours.map((c) => (
              <Ligne key={c.id} teinte="bleu" titre={c.nom} sous={`${enseigne(c.enseigne)?.nom} · ${c.canal} · ${eur(c.depense)} sur ${eur(c.budget)}`} fin={<Pastille teinte="vert">{eur(c.ventes)}</Pastille>} href={`${RACINE}/campagnes`} />
            ))}
          </Liste>
        </Carte>
        <Carte titre="Avis Google par enseigne" lien={{ href: `${RACINE}/avis`, texte: "Détail" }}>
          <Barres max={5} lignes={[...ENSEIGNES].sort((a, b) => a.noteGoogle - b.noteGoogle).slice(0, 6).map((e) => ({ libelle: e.nom, valeur: e.noteGoogle, texte: `${e.noteGoogle.toLocaleString("fr-FR")} ★`, teinte: e.noteGoogle < 4 ? "rouge" : e.noteGoogle < 4.3 ? "ambre" : "vert" }))} />
        </Carte>
      </Grille>
    </Page>
  );
}
