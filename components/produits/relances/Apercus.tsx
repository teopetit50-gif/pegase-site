/* ══════════════════════════════════════════════════════════════════════
   LES APERÇUS DE LA PAGE RELANCES (22/11/2026)

   Teo, 22/11, après l'accueil : « fais pareil pour les autres pages ».
   Les cinq captures de l'espace client (un héros et quatre écrans) sont
   remplacées par cinq visuels dessinés en code. Le héros montrait la même
   capture que le premier écran : il a maintenant sa propre vue d'ensemble.

   Les chiffres se tiennent entre eux d'un visuel à l'autre : 39 293,12 €
   d'encours, dont 21 960,00 € échus chez 5 débiteurs, répartis par
   ancienneté dans la balance âgée. Ce sont des exemples, comme l'était le
   jeu de démonstration des captures.
   ══════════════════════════════════════════════════════════════════════ */
import { CARTE, Chiffre, ENCRE, FILET, Jauge, Ligne, Pastille, SOURD } from "@/components/vignettes/briques";

const FOND = "flex w-full flex-col gap-2 bg-[#fafafa] p-3 md:gap-3 md:p-4";

/* ── héros : la vue d'ensemble ── */
const PRETES: [string, string, string][] = [
  ["Transports Morel", "8 589,60 €", "Mise en demeure"],
  ["Lemaire SAS", "2 150,00 €", "Relance 2"],
  ["Garnier Services", "940,00 €", "Rappel"],
  ["Sté Alpha", "6 420,00 €", "Relance 1"],
];
const AGES: [string, string, number][] = [
  ["Non échu", "17 333,12 €", 100],
  ["1 à 30 jours", "9 450,00 €", 55],
  ["31 à 60 jours", "6 090,00 €", 35],
  ["61 à 90 jours", "4 270,00 €", 25],
  ["Plus de 90 jours", "2 150,00 €", 12],
];

function Vue() {
  return (
    <div className={FOND}>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        <Chiffre libelle="On vous doit" valeur="39 293,12 €" sous="14 factures" />
        <Chiffre libelle="Dont échu" valeur="21 960,00 €" sous="chez 5 débiteurs" />
        <Chiffre libelle="Relances prêtes" valeur="6" sous="à valider ce matin" />
        <Chiffre libelle="Délai de règlement" valeur="47 jours" sous="en moyenne" />
      </div>
      <div className="grid gap-2 md:grid-cols-[1.15fr_0.85fr] md:gap-3">
        <div className={`${CARTE} flex flex-col gap-2 p-3`}>
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs font-medium ${ENCRE}`}>Relances écrites cette nuit</span>
            <Pastille pleine>Tout valider</Pastille>
          </div>
          {PRETES.map(([qui, montant, palier]) => (
            <div key={qui} className={`pt-2 ${FILET}`}>
              <Ligne g={qui} d={montant} etat={palier} />
            </div>
          ))}
          <p className={`rounded-md bg-black/[0.04] px-2 py-1.5 text-[11px] italic leading-snug ${SOURD}`}>
            « Bonjour, sauf erreur de notre part, la facture F-2031 de 2 150,00 € reste à régler… »
          </p>
        </div>
        <div className={`${CARTE} flex flex-col gap-2 p-3`}>
          <span className={`text-xs font-medium ${ENCRE}`}>Encours par ancienneté</span>
          {AGES.map(([tranche, montant, niveau]) => (
            <div key={tranche} className="flex flex-col gap-1">
              <Ligne g={tranche} d={montant} />
              <Jauge niveau={niveau} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── écran 1 : Débiteurs, une ligne par client ── */
const DEBITEURS: [string, string, string, string, boolean][] = [
  ["Transports Morel", "En retard", "Mise en demeure prête", "8 589,60 €", true],
  ["Sté Alpha", "En retard", "Relance 1 prête", "6 420,00 €", true],
  ["Roux Conseil", "En pause", "Litige en cours", "3 860,40 €", false],
  ["Lemaire SAS", "En retard", "Relance 2 prête", "2 150,00 €", true],
  ["Garnier Services", "En retard", "Rappel prêt", "940,00 €", true],
  ["Durand SARL", "Ne plus contacter", "Dossier transmis", "1 280,00 €", false],
  ["Bertin & Cie", "À jour", "Aucune relance", "0,00 €", false],
];

function Debiteurs() {
  return (
    <div className={FOND}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-medium ${ENCRE}`}>Débiteurs</span>
        <span className={`text-[11px] ${SOURD}`}>7 clients · 5 en retard</span>
      </div>
      <div className={`${CARTE} flex flex-col p-1`}>
        <div className={`hidden grid-cols-[1.3fr_0.9fr_1.2fr_0.8fr] gap-2 px-2 py-1.5 text-[10px] font-medium md:grid ${SOURD}`}>
          <span>Client</span>
          <span>État</span>
          <span>Où en est la relance</span>
          <span className="text-right">Encours dû</span>
        </div>
        {DEBITEURS.map(([client, etat, relance, du, retard], k) => (
          <div
            key={client}
            className={`grid grid-cols-[1fr_auto] items-center gap-2 px-2 py-1.5 text-[11px] md:grid-cols-[1.3fr_0.9fr_1.2fr_0.8fr] ${k ? FILET : ""}`}
          >
            <span className={`truncate font-medium ${ENCRE}`}>{client}</span>
            <span className="hidden md:block">
              <Pastille pleine={retard}>{etat}</Pastille>
            </span>
            <span className={`hidden truncate md:block ${SOURD}`}>{relance}</span>
            <span className={`whitespace-nowrap text-right tabular-nums ${ENCRE}`}>{du}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── écran 2 : Relances, les créances rangées par état ── */
const COLONNES: [string, [string, string][]][] = [
  ["Vient d'échoir", [["F-2052 · Bertin & Cie", "1 240,00 €"], ["F-2050 · Durand SARL", "680,00 €"]]],
  ["Rappel envoyé", [["F-2041 · Garnier Services", "940,00 €"], ["F-2039 · Sté Alpha", "2 140,00 €"]]],
  ["Relance à valider", [["F-2031 · Lemaire SAS", "2 150,00 €"], ["F-2027 · Sté Alpha", "4 280,00 €"]]],
  ["Mise en demeure", [["F-1988 · Transports Morel", "8 589,60 €"]]],
];

function Relances() {
  return (
    <div className={FOND}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-medium ${ENCRE}`}>Relances</span>
        <span className={`text-[11px] ${SOURD}`}>7 créances suivies</span>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {COLONNES.map(([etat, cartes], c) => (
          <div key={etat} className="flex min-w-0 flex-col gap-2 rounded-xl bg-black/[0.04] p-2">
            <div className="flex items-center justify-between gap-1">
              <span className={`truncate text-[11px] font-medium ${ENCRE}`}>{etat}</span>
              <span className={`text-[10px] tabular-nums ${SOURD}`}>{cartes.length}</span>
            </div>
            {cartes.map(([facture, montant], k) => (
              <div key={facture} className={`${CARTE} flex flex-col gap-1 p-2`}>
                <span className={`truncate text-[11px] ${ENCRE}`}>{facture}</span>
                <span className={`text-[11px] tabular-nums ${SOURD}`}>{montant}</span>
                {c === 2 && k === 0 ? (
                  <span className="mt-0.5 rounded-md bg-[#0a0a0a] py-1 text-center text-[10px] font-medium text-[#fff]">
                    Valider
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── écran 3 : Envois, le journal de ce qui est parti ── */
const ENVOIS: [string, string, string, string, string][] = [
  ["08 h 02", "Lemaire SAS", "Relance · facture F-2031", "E-mail", "Envoyé"],
  ["08 h 02", "Garnier Services", "Rappel · facture F-2041", "E-mail", "Lu"],
  ["Hier, 17 h 40", "Sté Alpha", "Relance · facture F-2027", "E-mail", "Répondu"],
  ["Hier, 17 h 40", "Transports Morel", "Mise en demeure · F-1988", "Courrier", "Envoyé"],
  ["Lundi, 09 h 15", "Durand SARL", "Rappel · facture F-2019", "E-mail", "Lu"],
  ["Lundi, 09 h 15", "Roux Conseil", "Rappel · facture F-2011", "E-mail", "Répondu"],
];

function Envois() {
  return (
    <div className={FOND}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-medium ${ENCRE}`}>Envois</span>
        <span className={`text-[11px] ${SOURD}`}>6 relances parties cette semaine</span>
      </div>
      <div className={`${CARTE} flex flex-col p-1`}>
        {ENVOIS.map(([quand, qui, objet, canal, statut], k) => (
          <div key={qui + objet} className={`flex items-center gap-2 px-2 py-1.5 text-[11px] ${k ? FILET : ""}`}>
            <span className={`hidden w-24 shrink-0 tabular-nums md:block ${SOURD}`}>{quand}</span>
            <span className="flex min-w-0 flex-1 flex-col md:flex-row md:gap-2">
              <span className={`truncate font-medium ${ENCRE}`}>{qui}</span>
              <span className={`truncate ${SOURD}`}>{objet}</span>
            </span>
            <span className="hidden md:block">
              <Pastille>{canal}</Pastille>
            </span>
            <Pastille pleine={statut === "Répondu"}>{statut}</Pastille>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── écran 4 : Trésorerie, la balance âgée ── */
const COLONNES_AGE: [string, string, number][] = [
  ["Non échu", "17 333", 100],
  ["1-30 j", "9 450", 55],
  ["31-60 j", "6 090", 35],
  ["61-90 j", "4 270", 25],
  ["+ 90 j", "2 150", 12],
];

function Tresorerie() {
  return (
    <div className={FOND}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-medium ${ENCRE}`}>Trésorerie</span>
        <span className={`text-[11px] ${SOURD}`}>balance âgée au 22 novembre</span>
      </div>
      <div className="grid gap-2 md:grid-cols-[1.3fr_0.7fr] md:gap-3">
        <div className={`${CARTE} flex items-end gap-2 p-3 md:gap-4`}>
          {COLONNES_AGE.map(([tranche, montant, niveau], k) => (
            <div key={tranche} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className={`text-[10px] tabular-nums ${ENCRE}`}>{montant} €</span>
              <span className="flex h-24 w-full items-end md:h-32" aria-hidden="true">
                <span
                  className={`block w-full rounded-t-md ${k === 0 ? "bg-black/15" : "bg-[#0a0a0a]"}`}
                  style={{ height: `${niveau}%` }}
                />
              </span>
              <span className={`truncate text-[10px] ${SOURD}`}>{tranche}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-1 md:gap-3">
          <Chiffre libelle="Délai moyen de règlement" valeur="47 jours" sous="3 jours de moins qu'en octobre" />
          <Chiffre libelle="Encaissé ce mois" valeur="18 240,00 €" sous="9 factures réglées" />
        </div>
      </div>
    </div>
  );
}

/* la clé de l'écran → son aperçu ; « vue » est celui du héros */
export function ApercuRelances({ cle }: { cle: string }) {
  if (cle === "encours") return <Debiteurs />;
  if (cle === "brouillon") return <Relances />;
  if (cle === "journal") return <Envois />;
  if (cle === "suivi") return <Tresorerie />;
  return <Vue />;
}
