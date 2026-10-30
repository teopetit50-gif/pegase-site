"use client";

/* Le coffre du groupe : toutes les données de toutes les sociétés, réunies
   en un seul endroit, en lecture seule. Les sources, leur fraîcheur, et le
   référentiel unique (un client = une fiche, dans toutes les sociétés). */

import { RefreshCw } from "lucide-react";
import { useToast } from "@/components/espace2/Toasts";
import { REFERENTIEL, SOCIETES, SOURCES, nb } from "../donnees";
import { Barres, Carte, Grille, Kpi, Kpis, Note, Page, Pastille, Tableau, Tete } from "../ui3";

const ETAT = { ok: { t: "vert", x: "À jour" }, lent: { t: "ambre", x: "Ralenti" }, erreur: { t: "rouge", x: "À rebrancher" } } as const;

export default function Coffre() {
  const toast = useToast();
  const sources = SOCIETES.reduce((a, s) => a + s.sources, 0);
  const r = REFERENTIEL;
  return (
    <Page>
      <Tete
        titre="Le coffre du groupe"
        sous="Les données des dix-huit sociétés, réunies en un seul endroit, chiffrées, en lecture seule : rien n'est jamais écrit dans vos logiciels. C'est sur ce coffre que l'IA du groupe répond, calcule et prépare les décisions."
        actions={
          <button type="button" className="v2-btn v2-btn--petit" onClick={() => toast("Relecture de toutes les sources lancée", "vert")}>
            <RefreshCw width={14} height={14} aria-hidden="true" /> Relire maintenant
          </button>
        }
      />
      <Kpis>
        <Kpi libelle="Sources branchées" valeur={nb(sources)} sous={`${SOURCES.length} logiciels · 18 sociétés`} teinte="vert" />
        <Kpi libelle="Dernière lecture" valeur="il y a 4 min" sous="caisses en continu, comptabilité chaque nuit" />
        <Kpi libelle="Données réunies" valeur="9,6 M" sous="lignes, tickets, écritures et documents" />
        <Kpi libelle="Rattachement" valeur={`${r.tauxRattachement.toLocaleString("fr-FR")} %`} sous="des codes locaux reliés à une fiche unique" />
      </Kpis>

      <Carte titre="Les sources" sous="Chaque source se branche et se débranche avec l'accord de la DSI" plein>
        <Tableau colonnes={[{ libelle: "Source" }, { libelle: "Type" }, { libelle: "Sociétés", num: true }, { libelle: "Volume", num: true }, { libelle: "Dernière lecture" }, { libelle: "État" }]}>
          {SOURCES.map((x) => (
            <tr key={x.nom}>
              <td>{x.nom}</td>
              <td>{x.type}</td>
              <td className="v2-num">{x.societes}</td>
              <td className="v2-num">{x.volume}</td>
              <td>{x.fraicheur}</td>
              <td>
                <Pastille teinte={ETAT[x.etat].t}>{ETAT[x.etat].x}</Pastille>
              </td>
            </tr>
          ))}
        </Tableau>
      </Carte>

      <Grille>
        <Carte titre="Un seul référentiel" sous="Le même client, fournisseur ou article portait un code différent dans chaque société. Il n'a plus qu'une fiche.">
          <Barres
            lignes={[
              { libelle: "Clients", valeur: r.clients.codes, texte: `${nb(r.clients.codes)} codes → ${nb(r.clients.fiches)} fiches`, sous: `${nb(r.clients.doublons)} doublons fusionnés` },
              { libelle: "Fournisseurs", valeur: r.fournisseurs.codes, texte: `${nb(r.fournisseurs.codes)} codes → ${nb(r.fournisseurs.fiches)} fiches`, sous: `${nb(r.fournisseurs.doublons)} doublons fusionnés` },
              { libelle: "Articles", valeur: r.articles.codes, texte: `${nb(r.articles.codes)} codes → ${nb(r.articles.fiches)} fiches`, sous: `${nb(r.articles.doublons)} doublons fusionnés` },
            ]}
          />
        </Carte>
        <Carte titre="Fraîcheur par société" sous="Heure de la dernière lecture complète">
          <Barres
            lignes={SOCIETES.slice(0, 9).map((s) => ({
              libelle: s.nom,
              valeur: s.sources,
              texte: `${s.sources} sources · ${s.fraicheur}`,
              teinte: s.fraicheur.startsWith("hier") ? "ambre" : "vert",
            }))}
          />
        </Carte>
      </Grille>
      <Note>Lecture seule : le coffre lit les logiciels de chaque société et n&apos;y écrit jamais. Données chiffrées, hébergées dans l&apos;Union européenne ou sur les serveurs du groupe, jamais utilisées pour entraîner un modèle. Chaque lecture est au journal.</Note>
    </Page>
  );
}
