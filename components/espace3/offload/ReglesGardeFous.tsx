"use client";

/* ══════════════════════════════════════════════════════════════════════
   OFFLOAD — « Garde-fous » sur la liste des workflows de Plain
   (28/10/2026, 2e vague)

   Vos règles jouent le rôle des workflows : une ligne par règle écrite
   en français, plus la ligne de l'arrêt automatique. Les données et les
   portes sont celles de l'écran d'avant (components/espace/offload/GardeFous.tsx :
   chargerGardeFous, ecrireRegle, retirerRegle, suspendre, reprendre), et
   chaque geste y est passé :
     · les statuts des règles (Appliquée · Pas encore applicable · Non comprise) → les onglets ;
     · « Ajouter la règle » (une phrase, la réponse du système) → le bouton
       primaire de la tête, qui ouvre la carte « Nouvelle règle » (?id=nouvelle) ;
     · « Retirer » (base réelle) → le menu « ··· » de la ligne et la carte ;
     · « Suspendre OFFLOAD » / « Relancer OFFLOAD (gérant) » avec leur motif
       obligatoire → la carte de l'arrêt automatique (?id=arret) ;
     · les comptes à vérifier → la fiche de l'arrêt automatique.
   ══════════════════════════════════════════════════════════════════════ */

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ListFilter, Pause, Play, Plus, Trash2 } from "lucide-react";
import { useSource } from "@/components/espace3/base/source";
import { dateCourte, dateHeure, relatif } from "@/components/espace3/base/format";
import { chargerGardeFous, chargerTableau, ecrireRegle, reprendre, retirerRegle, suspendre } from "@/components/espace3/base/offload/portes";
import type { GardeFous as Etat, Regle as RegleOffload } from "@/components/espace3/base/offload/types";
import { useMaintenant } from "../horloge";
import { RACINE } from "../modules";
import { Badge, Note } from "../ui";
import { useToast } from "../Toasts";
import { CarteCentrale, Feuille } from "../lin/CarteCentrale";
import { OptionPlain, useAdresse } from "../lin/ListeFils";
import { BoutonPrimaire, ListeRegles, poserTri, triDepuis, trierRegles, type Regle } from "../lin/ListeRegles";

const CHEMIN = `${RACINE}/offload/garde-fous`;
const sansAccents = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const ARRET = "arret";
const NOUVELLE = "nouvelle";

/* l'exemple de l'écran d'avant, tel quel */
const EXEMPLE: Etat = {
  suspendu_le: null,
  suspendu_motif: null,
  seuil_non_remis_pct: 20,
  a_verifier: 1,
  regles: [
    {
      id: "r1",
      texte: "Ne propose aucune remise aux anciens clients.",
      famille: "interdit",
      statut: "appliquee",
      cree_le: "",
      reponse: "Compris : « remise » n'apparaît dans aucun message. Un message qui le contiendrait serait retenu.",
    },
    { id: "r2", texte: "Commence toujours par « Madame, Monsieur, »", famille: "salutation", statut: "appliquee", cree_le: "", reponse: "Compris : chaque message commence par « Madame, Monsieur, »." },
    {
      id: "r3",
      texte: "Ne relance jamais un compte en litige.",
      famille: "litige",
      statut: "en_attente",
      cree_le: "",
      reponse: "Compris, mais je ne sais pas encore quels comptes sont en litige : la règle s'appliquera quand OFFLOAD lira vos impayés (CASHD). D'ici là, excluez ces comptes un par un.",
    },
  ],
};

type Statut = RegleOffload["statut"];
const STATUTS: { cle: Statut; libelle: string; teinte: "vert" | "ambre" | "rouge" }[] = [
  { cle: "appliquee", libelle: "Appliquées", teinte: "vert" },
  { cle: "en_attente", libelle: "Pas encore applicables", teinte: "ambre" },
  { cle: "non_comprise", libelle: "Non comprises", teinte: "rouge" },
];
const STATUT_SEUL: Record<Statut, string> = { appliquee: "Appliquée", en_attente: "Pas encore applicable", non_comprise: "Non comprise" };
const FAMILLES: Record<string, string> = { interdit: "Interdit", salutation: "Salutation", litige: "Litige", ton: "Ton", delai: "Délai", prix: "Prix" };
const famille = (f: string) => FAMILLES[f] ?? f.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

export default function ReglesGardeFous() {
  const { source } = useSource();
  const maintenant = useMaintenant();
  const routeur = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const adresse = useAdresse(CHEMIN, params);
  const [reel, setReel] = useState<Etat | null>(null);
  const [client, setClient] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [erreurGeste, setErreurGeste] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [texte, setTexte] = useState("");
  const [motif, setMotif] = useState("");
  const [motifOuvert, setMotifOuvert] = useState(false);
  const [reponse, setReponse] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  /* ——— la base réelle : les garde-fous, et le client (offload_tableau le donne) ——— */
  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    try {
      const [g, t] = await Promise.all([chargerGardeFous(), chargerTableau()]);
      setReel(g ?? { suspendu_le: null, suspendu_motif: null, seuil_non_remis_pct: 20, a_verifier: 0, regles: [] });
      setClient(t?.client ?? null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ suspendu_le: null, suspendu_motif: null, seuil_non_remis_pct: 20, a_verifier: 0, regles: [] });
    }
  }, []);
  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);
  const etat = source === "exemple" ? EXEMPLE : reel;

  /* ——— l'adresse : onglet, famille, tri, règle ouverte ——— */
  const onglet = (STATUTS.find((s) => s.cle === params.get("onglet"))?.cle ?? "tous") as Statut | "tous";
  const familleChoisie = params.get("famille");
  const tri = triDepuis(params);
  const id = params.get("id");
  const aller = (href: string) => routeur.replace(href, { scroll: false });
  const lienId = (x: string | null) => adresse((p) => (x !== null ? p.set("id", x) : p.delete("id")));

  /* ——— les gestes de l'écran d'avant ——— */
  const agir = async (f: () => Promise<unknown>, apres?: (r: unknown) => void) => {
    setErreurGeste(null);
    if (source !== "reelle" || !client) {
      setReponse("Exemple : rien n'est enregistré. En base réelle, le système répond ici ce qu'il fera de votre phrase.");
      return;
    }
    setEnvoi(true);
    try {
      const r = await f();
      apres?.(r);
      await charger();
    } catch (e) {
      setErreurGeste(e instanceof Error ? e.message : "La base a refusé.");
    } finally {
      setEnvoi(false);
    }
  };
  const ajouter = () =>
    void agir(
      () => ecrireRegle(client ?? "", texte.trim()),
      (r) => {
        setReponse((r as { reponse?: string } | null)?.reponse ?? null);
        setTexte("");
        toast("Règle ajoutée", "vert");
      },
    );
  const retirer = (r: RegleOffload) =>
    void agir(
      () => retirerRegle(r.id),
      () => toast("Règle retirée", "vert"),
    );
  const suspendreOuReprendre = () =>
    void agir(
      () => (etat?.suspendu_le ? reprendre(client ?? "", motif.trim()) : suspendre(client ?? "", motif.trim())),
      () => {
        setMotifOuvert(false);
        setMotif("");
        toast(etat?.suspendu_le ? "OFFLOAD relancé" : "OFFLOAD suspendu", "vert");
      },
    );

  const dateMaintenant = maintenant === null ? new Date() : new Date(maintenant);
  const quand = (iso: string | null | undefined) => (iso ? relatif(iso, dateMaintenant) : null);
  const q = sansAccents(recherche.trim());

  /* ——— les lignes : l'arrêt automatique, puis vos règles ——— */
  const regles = useMemo<Regle[]>(() => {
    if (!etat) return [];
    const liste: Regle[] = [];
    const arretVisible = (onglet === "tous" || onglet === "appliquee") && !familleChoisie && (!q || sansAccents("arrêt automatique au premier doute envois").includes(q));
    if (arretVisible)
      liste.push({
        id: ARRET,
        href: lienId(ARRET),
        ordre: 1,
        nom: "Arrêt au premier doute",
        etat: etat.suspendu_le ? { libelle: "OFFLOAD suspendu", teinte: "orange", cle: "desactivee" } : etat.a_verifier ? { libelle: `${etat.a_verifier} compte${etat.a_verifier > 1 ? "s" : ""} à vérifier` } : null,
        declencheur: "Envois sur 7 jours",
        creee: { nom: "OFFLOAD", lettre: "O", couleur: "#4cb782" },
        modifiee: etat.suspendu_le ? { nom: "Vous", lettre: "V", couleur: "#f2994a", quand: quand(etat.suspendu_le), iso: etat.suspendu_le } : { nom: "OFFLOAD", lettre: "O", couleur: "#4cb782" },
        dernier: etat.suspendu_le ? { texte: quand(etat.suspendu_le) ?? dateCourte(etat.suspendu_le), iso: etat.suspendu_le, urgence: true } : null,
        options: [
          { cle: "ouvrir", libelle: "Ouvrir", icone: <ListFilter width={18} height={18} />, href: lienId(ARRET) },
          {
            cle: etat.suspendu_le ? "relancer" : "suspendre",
            libelle: etat.suspendu_le ? "Relancer OFFLOAD (gérant)" : "Suspendre OFFLOAD",
            icone: etat.suspendu_le ? <Play width={18} height={18} /> : <Pause width={18} height={18} />,
            action: () => {
              setMotifOuvert(true);
              aller(lienId(ARRET));
            },
          },
        ],
      });
    etat.regles
      .filter((r) => (onglet === "tous" || r.statut === onglet) && (!familleChoisie || r.famille === familleChoisie) && (!q || sansAccents(`${r.texte} ${r.reponse} ${famille(r.famille)}`).includes(q)))
      .forEach((r, i) => {
        const st = STATUTS.find((s) => s.cle === r.statut)!;
        liste.push({
          id: r.id,
          href: lienId(r.id),
          ordre: etat.regles.indexOf(r) + 2 || i + 2,
          nom: r.texte,
          etat: r.statut === "appliquee" ? null : { libelle: STATUT_SEUL[r.statut], teinte: r.statut === "non_comprise" ? "orange" : undefined, cle: r.statut === "non_comprise" ? "desactivee" : "attente" },
          declencheur: "Chaque message préparé",
          creee: { nom: "Vous", lettre: "V", couleur: "#f2994a", quand: quand(r.cree_le || null), iso: r.cree_le || null },
          modifiee: { nom: "OFFLOAD", lettre: "O", couleur: "#4cb782" },
          dernier: null,
          options: [
            { cle: "ouvrir", libelle: "Ouvrir la règle", icone: <ListFilter width={18} height={18} />, href: lienId(r.id) },
            {
              cle: "seule",
              libelle: `Seulement « ${st.libelle} »`,
              icone: <ListFilter width={18} height={18} />,
              href: adresse((p) => {
                if (onglet === r.statut) p.delete("onglet");
                else p.set("onglet", r.statut);
                p.delete("id");
              }),
            },
            ...(source === "reelle" ? [{ cle: "retirer", libelle: "Retirer la règle", icone: <Trash2 width={18} height={18} />, action: () => retirer(r) }] : []),
          ],
        });
      });
    return liste;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etat, onglet, familleChoisie, q, params, source, maintenant]);
  const triees = trierRegles(regles, tri);
  const familles = Array.from(new Set((etat?.regles ?? []).map((r) => r.famille)));

  /* ——— la carte ouverte ——— */
  const regleChoisie = id && id !== ARRET && id !== NOUVELLE ? (etat?.regles.find((r) => r.id === id) ?? null) : null;
  const rang = id ? triees.findIndex((r) => r.id === id) : -1;
  const nav =
    rang >= 0
      ? {
          position: rang + 1,
          total: triees.length,
          precedente: rang > 0 ? () => aller(lienId(triees[rang - 1].id)) : undefined,
          suivante: rang < triees.length - 1 ? () => aller(lienId(triees[rang + 1].id)) : undefined,
        }
      : null;
  const fermer = () => {
    setMotifOuvert(false);
    setMotif("");
    setErreurGeste(null);
    aller(lienId(null));
  };

  return (
    <ListeRegles
      titre="Garde-fous"
      principal={
        <BoutonPrimaire onClick={() => aller(lienId(NOUVELLE))} icone={<Plus width={18} height={18} aria-hidden="true" />}>
          Ajouter une règle
        </BoutonPrimaire>
      }
      onglets={[
        ...STATUTS.map((s) => ({
          cle: s.cle,
          libelle: s.libelle,
          n: etat ? etat.regles.filter((r) => r.statut === s.cle).length + (s.cle === "appliquee" ? 1 : 0) : undefined,
          href: adresse((p) => {
            p.set("onglet", s.cle);
            p.delete("id");
          }),
        })),
        {
          cle: "tous",
          libelle: "Toutes",
          href: adresse((p) => {
            p.delete("onglet");
            p.delete("id");
          }),
        },
      ]}
      ongletActif={onglet}
      recherche={{ valeur: recherche, onChange: setRecherche, placeholder: "Chercher une règle", libelle: "Chercher une règle" }}
      nFiltres={familleChoisie ? 1 : 0}
      filtres={(fermerMenu) => (
        <div className="pf-menu-groupe" role="group" aria-label="Famille">
          <p className="pf-menu-titre">Famille</p>
          {familles.length ? (
            familles.map((f) => (
              <OptionPlain
                key={f}
                n={(etat?.regles ?? []).filter((r) => r.famille === f).length}
                actif={familleChoisie === f}
                onClick={() => {
                  fermerMenu();
                  aller(adresse((p) => (familleChoisie === f ? p.delete("famille") : p.set("famille", f))));
                }}
              >
                {famille(f)}
              </OptionPlain>
            ))
          ) : (
            <p className="pf-menu-titre">Aucune règle encore.</p>
          )}
        </div>
      )}
      note={erreur ? `La base réelle n'a pas répondu. ${erreur}` : null}
      regles={triees}
      tri={tri}
      lienTri={(cle) => adresse((p) => poserTri(p, tri, cle))}
      colonnes={{ nom: "Règle", declencheur: "Déclencheur", creee: "Écrite", modifiee: "Lue par", dernier: "Dernier arrêt" }}
      idOuvert={id}
      chargement={!etat}
      vide={
        recherche || familleChoisie
          ? { titre: "Aucune règle ne correspond", texte: "Essayez un autre mot ou retirez le filtre." }
          : {
              titre: "Aucune règle",
              texte: "Sans règle, les messages suivent le gabarit, sans prix ni délai, toujours au vouvoiement. Une phrase suffit.",
              geste: (
                <button type="button" className="pw-vide-bouton" onClick={() => aller(lienId(NOUVELLE))}>
                  <Plus width={18} height={18} aria-hidden="true" /> Ajouter une règle
                </button>
              ),
            }
      }
    >
      {/* ——— une règle ——— */}
      <CarteCentrale
        ouverte={!!regleChoisie}
        fermer={fermer}
        libelle={regleChoisie ? `Règle ${regleChoisie.texte}` : "Règle"}
        sur="OFFLOAD · Règle"
        statut={regleChoisie ? <>{STATUT_SEUL[regleChoisie.statut]}</> : undefined}
        nav={nav}
        gauche={regleChoisie ? <Feuille titre="RÈGLE" sous={famille(regleChoisie.famille)} nom={`« ${regleChoisie.texte} »`} texte={regleChoisie.reponse} /> : <Feuille titre="RÈGLE" sous={null} texte="Aucune règle." />}
        piedGauche={
          regleChoisie ? (
            <div className="v2-det-document-ligne">
              <span className="v2-det-mono">{regleChoisie.id}</span>
              <span className="v2-det-sous">{regleChoisie.cree_le ? `écrite le ${dateHeure(regleChoisie.cree_le)}` : "écrite par vous"}</span>
            </div>
          ) : undefined
        }
        titre={regleChoisie ? regleChoisie.texte : "Règle"}
        notes={
          erreurGeste ? (
            <Note teinte="rouge" role="alert">
              <strong>Refusé par la base.</strong> {erreurGeste}
            </Note>
          ) : undefined
        }
        actions={
          regleChoisie && source === "reelle" ? (
            <button type="button" className="v2-btn v2-btn--fantome" disabled={envoi} onClick={() => retirer(regleChoisie)}>
              <Trash2 width={14} height={14} aria-hidden="true" /> Retirer la règle
            </button>
          ) : undefined
        }
      >
        {regleChoisie ? (
          <>
            <dl className="v2-det-fiche">
              <dt>Statut</dt>
              <dd>
                <Badge teinte={STATUTS.find((s) => s.cle === regleChoisie.statut)!.teinte}>{STATUT_SEUL[regleChoisie.statut]}</Badge>
              </dd>
              <dt>Famille</dt>
              <dd>{famille(regleChoisie.famille)}</dd>
              <dt>Déclencheur</dt>
              <dd>Chaque message préparé : un message qui enfreint la règle est retenu.</dd>
            </dl>
            <div className="v2-det-bloc">
              <h3 className="v2-det-section-titre">Ce que le système en fait</h3>
              <p>{regleChoisie.reponse}</p>
            </div>
          </>
        ) : null}
      </CarteCentrale>

      {/* ——— l'arrêt automatique ——— */}
      <CarteCentrale
        ouverte={id === ARRET && !!etat}
        fermer={fermer}
        libelle="Arrêt au premier doute"
        sur="OFFLOAD · Arrêt automatique"
        statut={etat?.suspendu_le ? <>Suspendu</> : <>Actif</>}
        nav={nav}
        gauche={
          <Feuille
            titre="ARRÊT AUTOMATIQUE"
            sous={etat ? `Seuil : ${etat.seuil_non_remis_pct} % non remis sur 7 jours` : null}
            nom="Arrêt au premier doute"
            texte={
              etat?.suspendu_le
                ? `OFFLOAD est arrêté depuis le ${dateHeure(etat.suspendu_le)}. ${etat.suspendu_motif ?? ""} Aucun message n'est préparé ; ceux qui attendaient ont été annulés.`
                : `OFFLOAD surveille ses envois : au-delà de ${etat?.seuil_non_remis_pct ?? 20} % de messages non remis sur 7 jours, ou si deux messages visent la même adresse, il s'arrête de lui-même et vous le signale.`
            }
          />
        }
        titre="Arrêt au premier doute"
        chiffre={etat?.a_verifier ? `${etat.a_verifier} compte${etat.a_verifier > 1 ? "s" : ""} à vérifier` : undefined}
        echeance={etat?.suspendu_le ? { texte: `Suspendu ${quand(etat.suspendu_le) ?? ""}`, urgence: "retard" } : null}
        notes={
          <>
            {erreurGeste ? (
              <Note teinte="rouge" role="alert">
                <strong>Refusé par la base.</strong> {erreurGeste}
              </Note>
            ) : null}
            {motifOuvert ? (
              <Note teinte="ambre" role="status">
                <strong>{etat?.suspendu_le ? "Ce qui a été vérifié" : "Pourquoi suspendre"}</strong> (obligatoire)
                <span className="pw-det-champ">
                  <input
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                    placeholder={etat?.suspendu_le ? "Adresses corrigées avec le commercial." : "Salon cette semaine."}
                    aria-label={etat?.suspendu_le ? "Ce qui a été vérifié" : "Pourquoi suspendre"}
                    autoFocus
                  />
                </span>
              </Note>
            ) : null}
          </>
        }
        actions={
          motifOuvert ? (
            <>
              <button type="button" className="v2-btn v2-btn--primaire" disabled={envoi || !motif.trim()} onClick={suspendreOuReprendre}>
                {etat?.suspendu_le ? <Play width={14} height={14} aria-hidden="true" /> : <Pause width={14} height={14} aria-hidden="true" />} {etat?.suspendu_le ? "Relancer OFFLOAD" : "Suspendre OFFLOAD"}
              </button>
              <button
                type="button"
                className="v2-btn v2-btn--fantome"
                onClick={() => {
                  setMotifOuvert(false);
                  setMotif("");
                }}
              >
                Annuler
              </button>
            </>
          ) : (
            <button type="button" className={etat?.suspendu_le ? "v2-btn v2-btn--primaire" : "v2-btn v2-btn--fantome"} onClick={() => setMotifOuvert(true)}>
              {etat?.suspendu_le ? <Play width={14} height={14} aria-hidden="true" /> : <Pause width={14} height={14} aria-hidden="true" />} {etat?.suspendu_le ? "Relancer OFFLOAD (gérant)" : "Suspendre OFFLOAD"}
            </button>
          )
        }
      >
        <dl className="v2-det-fiche">
          <dt>Déclencheur</dt>
          <dd>Plus de {etat?.seuil_non_remis_pct ?? 20} % de messages non remis sur 7 jours, ou deux messages à la même adresse</dd>
          <dt>État</dt>
          <dd>{etat?.suspendu_le ? `Suspendu le ${dateHeure(etat.suspendu_le)}${etat.suspendu_motif ? ` · ${etat.suspendu_motif}` : ""}` : "Actif : OFFLOAD surveille ses envois"}</dd>
          <dt>Qui relance</dt>
          <dd>Seul un gérant ou un administrateur, en disant ce qu&apos;il a vérifié</dd>
          <dt>Comptes à vérifier</dt>
          <dd>
            {etat?.a_verifier
              ? `${etat.a_verifier} compte${etat.a_verifier > 1 ? "s" : ""} (message non remis, interlocuteur parti) : aucun ne repart dans une vague tant que la vérification n'est pas levée, depuis sa fiche`
              : "Aucun"}
          </dd>
        </dl>
      </CarteCentrale>

      {/* ——— une nouvelle règle ——— */}
      <CarteCentrale
        ouverte={id === NOUVELLE}
        fermer={() => {
          setReponse(null);
          fermer();
        }}
        libelle="Nouvelle règle"
        sur="OFFLOAD · Nouvelle règle"
        statut={<>Brouillon</>}
        gauche={
          <Feuille
            titre="RÈGLE"
            sous="Une phrase suffit"
            nom={texte.trim() ? `« ${texte.trim()} »` : null}
            texte={texte.trim() ? "Le système vous répond ce qu'il en fera, ou qu'il ne l'a pas comprise. Tout message qui enfreint une règle est retenu." : "Ne propose aucune remise aux anciens clients."}
          />
        }
        titre="Écrire une règle, en français"
        notes={
          <>
            {reponse ? (
              <Note teinte="vert" role="status">
                {reponse}
              </Note>
            ) : null}
            {erreurGeste ? (
              <Note teinte="rouge" role="alert">
                <strong>Refusé par la base.</strong> {erreurGeste}
              </Note>
            ) : null}
          </>
        }
        actions={
          <button type="button" className="v2-btn v2-btn--primaire" disabled={envoi || texte.trim().length < 3} onClick={ajouter}>
            <Check width={14} height={14} aria-hidden="true" /> Ajouter la règle
          </button>
        }
      >
        <dl className="v2-det-fiche">
          <dt>Déclencheur</dt>
          <dd>Chaque message préparé</dd>
          <dt>Sans règle</dt>
          <dd>Les messages suivent le gabarit, sans prix ni délai, toujours au vouvoiement.</dd>
        </dl>
        <div className="v2-det-bloc">
          <h3 className="v2-det-section-titre">Une phrase suffit</h3>
          <span className="pw-det-champ">
            <input
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              placeholder="Ne propose aucune remise aux anciens clients."
              aria-label="La règle, en français"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && texte.trim().length >= 3 && ajouter()}
            />
          </span>
        </div>
      </CarteCentrale>
    </ListeRegles>
  );
}
