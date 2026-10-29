"use client";

/* ══════════════════════════════════════════════════════════════════════
   FILED — « Contrôles et fraude » sur la liste des workflows de Plain
   (28/10/2026, 2e vague)

   Les contrôles de FILED jouent le rôle des workflows : une ligne par
   contrôle (son nom, ce qui le déclenche, qui l'a posé, le dernier
   déclenchement et le nombre de points qu'il tient en ce moment). Les
   données et les portes sont celles de la page d'avant (Fonctions.tsx :
   useControles → DOSSIERS_EXEMPLE / chargerListe + chargerVueFournisseurs),
   et chaque geste y est passé :
     · les trois gravités (Bloquants · À vérifier · Pour information) → les onglets ;
     · ouvrir un point → la carte au milieu du contrôle (?id=), qui liste ses
       points avec « Ouvrir la pièce » / « Ouvrir Fournisseurs » ;
     · « Fournisseurs » et « Documents reçus » → la tête ;
     · le pied (ce qui est contrôlé, lever un point, un changement de RIB) →
       la fiche du contrôle, dans la carte.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText, ListFilter, Users } from "lucide-react";
import { MarqueModule } from "../lin/icones";
import { useSource } from "@/components/espace/source";
import { dateCourte, dateHeure, montant, relatif } from "@/components/espace/format";
import { DOSSIERS_EXEMPLE } from "@/components/espace/exemples/filed";
import { vueExemple } from "@/components/espace/filed/EcranFournisseurs";
import { FAMILLES_CONTROLE } from "@/components/espace/filed/etats";
import { chargerListe, chargerVueFournisseurs, type VueFournisseurs } from "@/components/espace/filed/portes";
import type { DocumentFiled, Facture, Fournisseur } from "@/components/espace/types";
import { useMaintenant } from "../horloge";
import { RACINE } from "../modules";
import { Badge } from "../ui";
import { CarteCentrale, Feuille } from "../lin/CarteCentrale";
import { BoutonPlain, OptionPlain, useAdresse } from "../lin/ListeFils";
import { BoutonPrimaire, ListeRegles, poserTri, triDepuis, trierRegles, type Regle } from "../lin/ListeRegles";

const CHEMIN = `${RACINE}/filed/controles`;
const sansAccents = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

type Piece = { document: DocumentFiled; facture: Facture | null; fournisseur: Fournisseur | null };
type Donnees = { pieces: Piece[]; vue: VueFournisseurs };

function useControles() {
  const { source } = useSource();
  const [reel, setReel] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setErreur(null);
      setReel(null);
      try {
        const [liste, vue] = await Promise.all([chargerListe(), chargerVueFournisseurs()]);
        if (actif) setReel({ pieces: liste.apercus, vue });
      } catch (e) {
        if (actif) {
          setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
          setReel({ pieces: [], vue: { fournisseurs: [], ibans: [], factures: [], deposants: {} } });
        }
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source]);
  const exemple = useMemo<Donnees>(() => ({ pieces: DOSSIERS_EXEMPLE.map((d) => ({ document: d.document, facture: d.facture, fournisseur: d.fournisseur })), vue: vueExemple() }), []);
  return { donnees: source === "exemple" ? exemple : reel, erreur: source === "exemple" ? null : erreur };
}

/* ——— les catégories (les gravités de la page d'avant) ——— */
type Gravite = "bloquant" | "verifier" | "info";
const GRAVITES: { cle: Gravite; libelle: string; teinte: "rouge" | "ambre" | "vert"; unite: [string, string] }[] = [
  { cle: "bloquant", libelle: "Bloquants", teinte: "rouge", unite: ["point bloquant", "points bloquants"] },
  { cle: "verifier", libelle: "À vérifier", teinte: "ambre", unite: ["point à vérifier", "points à vérifier"] },
  { cle: "info", libelle: "Pour information", teinte: "vert", unite: ["information", "informations"] },
];
type Declencheur = "iban" | "piece" | "fournisseur";
const DECLENCHEURS: Record<Declencheur, string> = { iban: "IBAN proposé", piece: "Pièce reçue", fournisseur: "Fournisseur" };

/* un point tenu par un contrôle en ce moment */
type Point = { cle: string; titre: string; sous: string; quand: string | null; href: string; lien: string };
/* un contrôle : ce qu'il surveille, pourquoi, et ses points */
type Controle = { id: string; nom: string; gravite: Gravite; declencheur: Declencheur; quoi: string; pourquoi: string; lever: string; points: Point[] };

const familleDe = (code: string) => code.split(".")[0];
const lienPiece = (p: Piece) => (p.facture ? `${RACINE}/filed?objet=facture:${encodeURIComponent(p.facture.id)}` : `${RACINE}/filed`);
const FOURNISSEURS = `${RACINE}/filed/fournisseurs`;

function controlesDe({ pieces, vue }: Donnees): Controle[] {
  const nom = (id: string) => vue.fournisseurs.find((f) => f.id === id)?.nom ?? "Fournisseur inconnu";
  const pointIban = (i: VueFournisseurs["ibans"][number]): Point => ({
    cle: `iban-${i.id}`,
    titre: nom(i.fournisseur_id),
    sous: `IBAN ${i.iban_masque} · reçu le ${dateCourte(i.propose_le)}`,
    quand: i.propose_le,
    href: FOURNISSEURS,
    lien: "Ouvrir Fournisseurs",
  });
  const pointPiece = (p: Piece, sous: string): Point => ({
    cle: `piece-${p.document.id}`,
    titre: p.document.reference,
    sous,
    quand: p.document.recu_le,
    href: lienPiece(p),
    lien: "Ouvrir la pièce",
  });
  const pointFournisseur = (f: Fournisseur, sous: string): Point => ({
    cle: `four-${f.id}`,
    titre: f.nom,
    sous,
    quand: f.identite_verifiee_le ?? f.confirme_le ?? null,
    href: FOURNISSEURS,
    lien: "Ouvrir Fournisseurs",
  });
  const changeDeRib = (i: VueFournisseurs["ibans"][number]) => vue.ibans.some((x) => x.fournisseur_id === i.fournisseur_id && x.id !== i.id && (x.statut === "valide" || x.statut === "revoque"));
  const proposes = vue.ibans.filter((x) => x.statut === "propose");
  const enCours = pieces.filter((p) => p.facture && !["validee", "comptabilisee", "refusee"].includes(p.facture.statut) && (p.facture.anomalies.length > 0 || p.facture.nb_bloquants > 0 || p.facture.nb_attention > 0));
  const bloquante = (p: Piece) => !!p.facture && (p.facture.nb_bloquants > 0 || p.facture.anomalies.some((c) => c.startsWith("fournisseur.iban") || c.startsWith("doublon")));
  const sousPiece = (p: Piece) => `${p.fournisseur?.nom ?? "Fournisseur inconnu"} · ${montant(p.facture!.montant_ttc, p.facture!.devise)}`;

  const liste: Controle[] = [
    {
      id: "changement-rib",
      nom: "Changement de RIB",
      gravite: "bloquant",
      declencheur: "iban",
      quoi: "Un nouvel IBAN remplace un IBAN déjà validé chez un fournisseur connu.",
      pourquoi:
        "Un changement de coordonnées bancaires chez un fournisseur connu est la première porte d'entrée de la fraude au virement. Aucun paiement ne part vers ce nouvel IBAN tant qu'une personne ne l'a pas confirmé, idéalement par un appel au numéro habituel du fournisseur.",
      lever: "Il n'est jamais pris en compte sans confirmation : appelez le fournisseur au numéro que vous connaissez déjà, puis confirmez l'IBAN dans « Fournisseurs ».",
      points: proposes.filter(changeDeRib).map(pointIban),
    },
    {
      id: "fournisseur-bloque",
      nom: "Fournisseur bloqué",
      gravite: "bloquant",
      declencheur: "fournisseur",
      quoi: "Une pièce arrive d'un fournisseur que vous avez bloqué.",
      pourquoi: "Ne pas payer : le fournisseur est bloqué. Ses pièces restent visibles mais aucune ne part en paiement.",
      lever: "Le blocage se lève depuis « Fournisseurs », avec son motif.",
      points: vue.fournisseurs.filter((f) => f.statut === "bloque").map((f) => pointFournisseur(f, "Ne pas payer : le fournisseur est bloqué.")),
    },
    {
      id: "identite-introuvable",
      nom: "Identité introuvable au registre",
      gravite: "bloquant",
      declencheur: "fournisseur",
      quoi: "Le SIREN lu sur la pièce n'est pas trouvé au registre public.",
      pourquoi: "L'identité du fournisseur est vérifiée au registre public : un SIREN introuvable peut être une faute de lecture, ou une société qui n'existe pas.",
      lever: "Une personne vérifie l'identité depuis « Fournisseurs », avec la preuve qu'elle a.",
      points: vue.fournisseurs.filter((f) => f.identite_verdict?.resultat === "invalide").map((f) => pointFournisseur(f, `Le SIREN ${f.siren ?? "lu"} n'est pas trouvé au registre public.`)),
    },
    {
      id: "piece-bloquante",
      nom: "Point bloquant sur une pièce",
      gravite: "bloquant",
      declencheur: "piece",
      quoi: "Un contrôle en défaut qui bloque la pièce : IBAN inconnu, doublon, total faux.",
      pourquoi: "La pièce n'est ni classée ni payée tant qu'une personne n'a pas levé le point, avec son motif.",
      lever: "Un point se lève depuis la pièce, avec son motif ; au-delà de la règle, il passe par « À valider ».",
      points: enCours
        .filter(bloquante)
        .map((p) => pointPiece(p, `${sousPiece(p)} · ${Array.from(new Set(p.facture!.anomalies.map((c) => FAMILLES_CONTROLE[familleDe(c)] ?? familleDe(c)))).join(", ") || "voir la pièce"}`)),
    },
    {
      id: "premier-iban",
      nom: "Premier IBAN",
      gravite: "verifier",
      declencheur: "iban",
      quoi: "Un fournisseur payé pour la première fois propose son IBAN.",
      pourquoi: "Son IBAN est confirmé une fois, puis il sert pour les paiements suivants.",
      lever: "Confirmez l'IBAN depuis « Fournisseurs ».",
      points: proposes.filter((i) => !changeDeRib(i)).map(pointIban),
    },
    {
      id: "fournisseur-a-confirmer",
      nom: "Fournisseur à confirmer",
      gravite: "verifier",
      declencheur: "fournisseur",
      quoi: "Un fournisseur jamais vu envoie sa première pièce.",
      pourquoi: "Jamais vu : une personne le confirme une fois, et FILED le reconnaît ensuite.",
      lever: "Confirmez-le depuis « Fournisseurs ».",
      points: vue.fournisseurs
        .filter((f) => f.statut === "a_confirmer" && f.identite_verdict?.resultat !== "invalide")
        .map((f) => pointFournisseur(f, f.identite_verifiee_le ? `Identité vérifiée le ${dateCourte(f.identite_verifiee_le)}` : "Identité pas encore vérifiée")),
    },
    ...Object.entries(FAMILLES_CONTROLE).map<Controle>(([code, libelle]) => ({
      id: `controle-${code}`,
      nom: `Contrôle « ${libelle} »`,
      gravite: "verifier",
      declencheur: "piece",
      quoi: `La famille « ${libelle} » du contrôle de chaque pièce reçue.`,
      pourquoi: "Les totaux et la TVA, les mentions, les dates, le rapprochement avec la commande : la pièce peut avancer, le point est à vérifier avant le paiement.",
      lever: "Un point se lève depuis la pièce, avec son motif ; au-delà de la règle, il passe par « À valider ».",
      points: enCours.filter((p) => !bloquante(p) && p.facture!.anomalies.some((c) => familleDe(c) === code)).map((p) => pointPiece(p, sousPiece(p))),
    })),
    {
      id: "doublon-ecarte",
      nom: "Doublon écarté",
      gravite: "info",
      declencheur: "piece",
      quoi: "Une pièce déjà reçue arrive une seconde fois, même renommée ou rescannée.",
      pourquoi: "FILED a reconnu une pièce déjà reçue : elle reste visible, marquée doublon, et ne compte pas dans les montants. Elle n'est ni classée ni payée deux fois.",
      lever: "Rien à faire : le doublon est écarté de lui-même.",
      points: pieces.filter((p) => p.document.etat === "doublon").map((p) => pointPiece(p, `${p.fournisseur?.nom ?? "Fournisseur inconnu"} · reconnu même renommé ou rescanné`)),
    },
  ];
  return liste;
}

const dernierDe = (c: Controle) =>
  c.points
    .map((p) => p.quand)
    .filter((x): x is string => !!x)
    .sort((a, b) => b.localeCompare(a))[0] ?? null;

export default function ReglesControles() {
  const { donnees, erreur } = useControles();
  const maintenant = useMaintenant();
  const routeur = useRouter();
  const params = useSearchParams();
  const adresse = useAdresse(CHEMIN, params);
  const [recherche, setRecherche] = useState("");

  const controles = useMemo(() => (donnees ? controlesDe(donnees) : null), [donnees]);

  /* ——— l'adresse : onglet, déclencheur, « en cours », tri, contrôle ouvert ——— */
  const onglet = (GRAVITES.find((g) => g.cle === params.get("onglet"))?.cle ?? "tous") as Gravite | "tous";
  const declencheur = (Object.keys(DECLENCHEURS).includes(params.get("declencheur") ?? "") ? params.get("declencheur") : null) as Declencheur | null;
  const enCoursSeul = params.get("encours") === "1";
  const tri = triDepuis(params);
  const id = params.get("id");
  const aller = (href: string) => routeur.replace(href, { scroll: false });
  const lienId = (x: string | null) => adresse((p) => (x !== null ? p.set("id", x) : p.delete("id")));

  const q = sansAccents(recherche.trim());
  const visibles = (controles ?? []).filter(
    (c) =>
      (onglet === "tous" || c.gravite === onglet) &&
      (!declencheur || c.declencheur === declencheur) &&
      (!enCoursSeul || c.points.length > 0) &&
      (!q || sansAccents(`${c.nom} ${DECLENCHEURS[c.declencheur]} ${c.quoi}`).includes(q)),
  );
  const dateMaintenant = maintenant === null ? new Date() : new Date(maintenant);
  const quand = (iso: string | null) => (iso ? relatif(iso, dateMaintenant) : null);

  const regles: Regle[] = visibles.map((c, i) => {
    const dernier = dernierDe(c);
    const grav = GRAVITES.find((g) => g.cle === c.gravite)!;
    return {
      id: c.id,
      href: lienId(c.id),
      ordre: (controles ?? []).indexOf(c) + 1 || i + 1,
      nom: c.nom,
      etat: c.points.length ? { libelle: pluriel(c.points.length, "point"), teinte: c.gravite === "bloquant" ? "orange" : undefined } : null,
      declencheur: DECLENCHEURS[c.declencheur],
      creee: { nom: "FILED", icone: <MarqueModule cle="filed" /> },
      modifiee: { nom: "FILED", icone: <MarqueModule cle="filed" /> },
      dernier: dernier ? { texte: quand(dernier) ?? dateCourte(dernier), iso: dernier, urgence: c.gravite === "bloquant" } : null,
      options: [
        { cle: "ouvrir", libelle: "Ouvrir le contrôle", icone: <ListFilter width={18} height={18} />, href: lienId(c.id) },
        {
          cle: "seule",
          libelle: `Seulement « ${grav.libelle} »`,
          icone: <ListFilter width={18} height={18} />,
          href: adresse((p) => {
            if (onglet === c.gravite) p.delete("onglet");
            else p.set("onglet", c.gravite);
            p.delete("id");
          }),
        },
        { cle: "fournisseurs", libelle: "Fournisseurs", icone: <Users width={18} height={18} />, href: FOURNISSEURS },
        { cle: "documents", libelle: "Documents reçus", icone: <FileText width={18} height={18} />, href: `${RACINE}/filed` },
      ],
    };
  });
  const triees = trierRegles(regles, tri);
  const nFiltres = (declencheur ? 1 : 0) + (enCoursSeul ? 1 : 0);
  const compte = (g: Gravite) => (controles ?? []).filter((c) => c.gravite === g).reduce((n, c) => n + c.points.length, 0);

  /* ——— le contrôle ouvert ——— */
  const choisi = id ? (controles?.find((c) => c.id === id) ?? null) : null;
  const rang = choisi ? triees.findIndex((r) => r.id === choisi.id) : -1;
  const gravChoisi = choisi ? GRAVITES.find((g) => g.cle === choisi.gravite)! : null;

  return (
    <ListeRegles
      titre="Contrôles et fraude"
      actions={
        <BoutonPlain href={FOURNISSEURS} icone={<Users width={18} height={18} aria-hidden="true" />}>
          Fournisseurs
        </BoutonPlain>
      }
      principal={
        <BoutonPrimaire href={`${RACINE}/filed`} icone={<FileText width={18} height={18} aria-hidden="true" />}>
          Documents reçus
        </BoutonPrimaire>
      }
      onglets={[
        ...GRAVITES.map((g) => ({
          cle: g.cle,
          libelle: g.libelle,
          n: controles ? compte(g.cle) : undefined,
          href: adresse((p) => {
            p.set("onglet", g.cle);
            p.delete("id");
          }),
        })),
        {
          cle: "tous",
          libelle: "Tous",
          href: adresse((p) => {
            p.delete("onglet");
            p.delete("id");
          }),
        },
      ]}
      ongletActif={onglet}
      recherche={{ valeur: recherche, onChange: setRecherche, placeholder: "Chercher un contrôle", libelle: "Chercher un contrôle" }}
      nFiltres={nFiltres}
      filtres={(fermer) => (
        <>
          <div className="pf-menu-groupe" role="group" aria-label="Déclencheur">
            <p className="pf-menu-titre">Déclencheur</p>
            {(Object.keys(DECLENCHEURS) as Declencheur[]).map((d) => (
              <OptionPlain
                key={d}
                n={(controles ?? []).filter((c) => c.declencheur === d).length}
                actif={declencheur === d}
                onClick={() => {
                  fermer();
                  aller(adresse((p) => (declencheur === d ? p.delete("declencheur") : p.set("declencheur", d))));
                }}
              >
                {DECLENCHEURS[d]}
              </OptionPlain>
            ))}
          </div>
          <div className="pf-menu-groupe" role="group" aria-label="Points">
            <p className="pf-menu-titre">Points</p>
            <OptionPlain
              n={(controles ?? []).filter((c) => c.points.length > 0).length}
              actif={enCoursSeul}
              onClick={() => {
                fermer();
                aller(adresse((p) => (enCoursSeul ? p.delete("encours") : p.set("encours", "1"))));
              }}
            >
              Avec des points en cours
            </OptionPlain>
          </div>
        </>
      )}
      note={erreur ? `La base réelle n'a pas répondu. ${erreur}` : null}
      regles={triees}
      tri={tri}
      lienTri={(cle) => adresse((p) => poserTri(p, tri, cle))}
      idOuvert={id}
      chargement={!controles}
      vide={
        recherche || nFiltres
          ? { titre: "Aucun contrôle ne correspond", texte: "Essayez un autre mot ou retirez le filtre." }
          : onglet === "bloquant"
            ? { titre: "Aucun contrôle bloquant", texte: "Aucune pièce, aucun IBAN ni aucun fournisseur n'empêche un paiement." }
            : onglet === "verifier"
              ? { titre: "Rien à vérifier", texte: "Toutes les pièces en cours ont passé leurs contrôles." }
              : { titre: "Rien à signaler", texte: "Aucun doublon écarté pour l'instant." }
      }
    >
      <CarteCentrale
        ouverte={id !== null && !!controles}
        fermer={() => aller(lienId(null))}
        libelle={choisi ? `Contrôle ${choisi.nom}` : "Contrôle introuvable"}
        sur="FILED · Contrôle"
        statut={gravChoisi ? <>{gravChoisi.libelle}</> : undefined}
        nav={
          choisi && rang >= 0
            ? {
                position: rang + 1,
                total: triees.length,
                precedente: rang > 0 ? () => aller(lienId(triees[rang - 1].id)) : undefined,
                suivante: rang < triees.length - 1 ? () => aller(lienId(triees[rang + 1].id)) : undefined,
              }
            : null
        }
        gauche={
          choisi ? (
            <Feuille titre="CONTRÔLE" sous={DECLENCHEURS[choisi.declencheur]} nom={choisi.nom} sousNom={[gravChoisi!.libelle]} texte={choisi.quoi} />
          ) : (
            <Feuille titre="CONTRÔLE" sous={null} texte="Aucun contrôle." />
          )
        }
        piedGauche={
          choisi ? (
            <div className="v2-det-document-ligne">
              <span className="v2-det-mono">{choisi.id}</span>
              <span className="v2-det-sous">{pluriel(choisi.points.length, "point")} en cours</span>
            </div>
          ) : undefined
        }
        titre={choisi ? choisi.nom : "Contrôle introuvable"}
        chiffre={choisi ? `${choisi.points.length} ${choisi.points.length > 1 ? gravChoisi!.unite[1] : gravChoisi!.unite[0]}` : undefined}
        echeance={choisi && dernierDe(choisi) ? { texte: `Dernier déclenchement ${quand(dernierDe(choisi)) ?? ""}`, urgence: choisi.gravite === "bloquant" ? "retard" : undefined } : null}
        actions={
          choisi ? (
            <>
              <Link href={choisi.declencheur === "piece" ? `${RACINE}/filed` : FOURNISSEURS} className="v2-btn v2-btn--primaire">
                <ExternalLink width={14} height={14} aria-hidden="true" /> {choisi.declencheur === "piece" ? "Documents reçus" : "Ouvrir Fournisseurs"}
              </Link>
              {choisi.declencheur === "piece" ? (
                <Link href={FOURNISSEURS} className="v2-btn v2-btn--fantome">
                  <Users width={14} height={14} aria-hidden="true" /> Fournisseurs
                </Link>
              ) : (
                <Link href={`${RACINE}/filed`} className="v2-btn v2-btn--fantome">
                  <FileText width={14} height={14} aria-hidden="true" /> Documents reçus
                </Link>
              )}
            </>
          ) : undefined
        }
      >
        {choisi ? (
          <>
            <dl className="v2-det-fiche">
              <dt>Déclencheur</dt>
              <dd>{DECLENCHEURS[choisi.declencheur]}</dd>
              <dt>Gravité</dt>
              <dd>
                <Badge teinte={gravChoisi!.teinte}>{gravChoisi!.libelle}</Badge>
              </dd>
              <dt>Posé par</dt>
              <dd>FILED · contrôle avant classement</dd>
              <dt>État</dt>
              <dd>Actif</dd>
            </dl>
            <div className="v2-det-bloc">
              <h3 className="v2-det-section-titre">Pourquoi</h3>
              <p>{choisi.pourquoi}</p>
            </div>
            <div className="v2-det-bloc">
              <h3 className="v2-det-section-titre">Lever un point</h3>
              <p>{choisi.lever}</p>
            </div>
            <div className="v2-det-bloc">
              <h3 className="v2-det-section-titre">
                En ce moment
                <small>{choisi.points.length}</small>
              </h3>
              {choisi.points.length ? (
                <ul className="pw-det-liste">
                  {choisi.points.map((p) => (
                    <li key={p.cle}>
                      <span>
                        <strong>{p.titre}</strong>
                        <small>
                          {p.sous}
                          {p.quand ? ` · ${dateHeure(p.quand)}` : ""}
                        </small>
                      </span>
                      <Link href={p.href}>{p.lien}</Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="v2-det-vide">Aucun point en ce moment : le contrôle n&apos;a rien retenu.</p>
              )}
            </div>
          </>
        ) : (
          <p className="v2-det-vide">Ce contrôle n&apos;existe pas.</p>
        )}
      </CarteCentrale>
    </ListeRegles>
  );
}
