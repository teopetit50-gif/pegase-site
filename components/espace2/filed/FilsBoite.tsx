"use client";

/* ══════════════════════════════════════════════════════════════════════
   FILED — « Boîte de réception » sur la liste des fils de Plain (28/10/2026)

   Les courriels reçus sur la boîte du client, un fil par courriel, dans le
   dessin de la liste « All threads » de Plain (../lin/ListeFils.tsx). Les
   données et les portes sont celles de l'écran d'avant
   (components/espace/filed/EcranBoite.tsx : vueExemple, chargerBoite,
   marquerReception, temps réel), et chaque geste y est passé :
     · les familles de statut → les onglets (Nouveaux · Lus · Tous) et le
       menu Filtres (Traités, Écartés, la boîte quand il y en a plusieurs) ;
     · la recherche → le champ du menu Filtres (F) ;
     · l'adresse de la boîte et « Copier l'adresse » → la description de la
       section et son geste à droite ; « En direct » y est aussi ;
     · ouvrir un courriel → la carte au milieu (?id=) : expéditeur, pièces
       jointes (ouvrir la pièce, le document FILED né de la facture), le
       texte du message ; marquer lu, écarter, remettre en nouveau ;
     · « Documents reçus » → la tête.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, FileText, ListFilter, Paperclip, RotateCcw, X } from "lucide-react";
import { MarqueModule } from "../lin/icones";
import { useMaintenant } from "../horloge";
import { useSource } from "@/components/espace/source";
import { useTempsReel } from "@/components/espace/tempsReel";
import { dateHeure, relatif } from "@/components/espace/format";
import { vueExemple } from "@/components/espace/filed/EcranBoite";
import {
  CANAUX,
  STATUTS_RECEPTION,
  champsDe,
  chargerBoite,
  documentDe,
  lienPiece,
  marquerReception,
  piecesIgnorees,
  taille,
  type Marque,
  type Reception,
  type StatutReception,
  type VueBoite,
} from "@/components/espace/filed/receptions";
import { MenuActions, type Option } from "../lin/Lin";
import { CarteCentrale, Feuille } from "../lin/CarteCentrale";
import {
  BoutonPlain,
  ChampPlain,
  IconeAffichage,
  IconeAnneau,
  IconeCoche,
  IconeCroix,
  IconeFiltres,
  IconeHorloge,
  ListeFils,
  MenuPlain,
  OptionPlain,
  couleurDe,
  initialesDe,
  useAdresse,
  type Fil,
  type FiltrePose,
  type Priorite,
  type SectionFils,
} from "../lin/ListeFils";
import { Note } from "../ui";
import { useToast } from "../Toasts";
import { RACINE } from "../modules";

const CHEMIN = `${RACINE}/filed/boite`;
const sansAccents = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

type Famille = "nouvelle" | "lue" | "traitee" | "ecartee";
const FAMILLES: { cle: Famille; libelle: string; sous: string; prio: Priorite; icone: React.ReactNode; teinte?: "bleu" | "orange" }[] = [
  { cle: "nouvelle", libelle: "Nouveaux", sous: "arrivés, pas encore lus par FILED", prio: 3, icone: <IconeAnneau />, teinte: "bleu" },
  { cle: "lue", libelle: "Lus", sous: "pièces lues, en cours dans FILED", prio: 2, icone: <IconeHorloge /> },
  { cle: "traitee", libelle: "Traités", sous: "documents intégrés ou classés", prio: 1, icone: <IconeCoche /> },
  { cle: "ecartee", libelle: "Écartés", sous: "ignorés ou indésirables", prio: 0, icone: <IconeCroix /> },
];
const familleDe = (s: StatutReception): Famille => (s === "ignoree" || s === "indesirable" ? "ecartee" : s);
const infoFamille = (f: Famille) => FAMILLES.find((x) => x.cle === f)!;
type Onglet = "nouvelle" | "lue" | "tous";
const ONGLETS: { cle: Onglet; libelle: string; garde: (f: Famille) => boolean }[] = [
  { cle: "nouvelle", libelle: "Nouveaux", garde: (f) => f === "nouvelle" },
  { cle: "lue", libelle: "Lus", garde: (f) => f === "lue" },
  { cle: "tous", libelle: "Tous les courriels", garde: () => true },
];
type Tri = "recent" | "ancien" | "expediteur";
const TRIS: { cle: Tri; libelle: string }[] = [
  { cle: "recent", libelle: "Reçu, le plus récent d'abord" },
  { cle: "ancien", libelle: "Reçu, le plus ancien d'abord" },
  { cle: "expediteur", libelle: "Expéditeur" },
];

export default function FilsBoite() {
  const maintenant = useMaintenant();
  const { source } = useSource();
  const routeur = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const adresse = useAdresse(CHEMIN, params);
  const [exemple, setExemple] = useState<VueBoite>(() => vueExemple("filed"));
  const [reel, setReel] = useState<VueBoite | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [marquage, setMarquage] = useState<number | null>(null);
  const [erreurMarque, setErreurMarque] = useState<string | null>(null);
  const [erreurPiece, setErreurPiece] = useState<string | null>(null);

  /* ——— la base réelle, par les portes de l'écran d'avant, relue en temps réel ——— */
  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    try {
      setReel(await chargerBoite("filed"));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ receptions: [], documents: [], boites: [] });
    }
  }, []);
  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);
  const direct = useTempsReel(["receptions", "filed_documents"], source === "reelle", charger);
  /* l'exemple est daté à l'heure du visiteur : rien avant le montage (horloge.ts) */
  const vue = source === "exemple" ? (maintenant === null ? null : exemple) : reel;

  /* ——— l'adresse : onglet, statut, boîte, tri, courriel ouvert ——— */
  const onglet = (ONGLETS.find((o) => o.cle === params.get("onglet"))?.cle ?? "nouvelle") as Onglet;
  const statut = (FAMILLES.find((f) => f.cle === params.get("statut"))?.cle ?? null) as Famille | null;
  const boiteChoisie = params.get("boite")?.toLowerCase() ?? "";
  const tri = (TRIS.find((t) => t.cle === params.get("tri"))?.cle ?? "recent") as Tri;
  const grouper = params.get("grouper") === "1";
  const id = params.get("id");
  const aller = (href: string) => routeur.replace(href, { scroll: false });
  const lienId = (x: number | null) => adresse((p) => (x !== null ? p.set("id", String(x)) : p.delete("id")));

  const q = sansAccents(recherche.trim());
  const correspond = (r: Reception) => !q || [r.de_adresse, r.de_nom, r.sujet, ...r.pieces.map((p) => p.nom)].some((x) => x && sansAccents(x).includes(q));
  const dansLaBoite = (r: Reception) => !boiteChoisie || r.boite.toLowerCase() === boiteChoisie;
  const base = useMemo(() => (vue?.receptions ?? []).filter(dansLaBoite), [vue, boiteChoisie]); // eslint-disable-line react-hooks/exhaustive-deps
  const garde = ONGLETS.find((o) => o.cle === onglet)!.garde;
  const visibles = base.filter((r) => garde(familleDe(r.statut)) && (!statut || familleDe(r.statut) === statut) && correspond(r));
  const tries = [...visibles].sort((a, b) =>
    tri === "expediteur" ? (a.de_nom ?? a.de_adresse ?? "").localeCompare(b.de_nom ?? b.de_adresse ?? "", "fr") : tri === "ancien" ? a.recu_le.localeCompare(b.recu_le) : b.recu_le.localeCompare(a.recu_le),
  );
  const compteurs = useMemo(() => {
    const c: Record<Famille, number> = { nouvelle: 0, lue: 0, traitee: 0, ecartee: 0 };
    for (const r of base) if (correspond(r)) c[familleDe(r.statut)]++;
    return c;
  }, [base, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const boite = vue?.boites[0] ?? null;
  const dateMaintenant = maintenant === null ? new Date() : new Date(maintenant);

  /* ——— les gestes de l'écran d'avant ——— */
  const copier = (texte: string, quoi: string) =>
    navigator.clipboard?.writeText(texte).then(
      () => toast(quoi, "vert"),
      () => toast("Impossible de copier. Réessayez.", "rouge"),
    );
  const marquer = async (rid: number, m: Marque) => {
    setErreurMarque(null);
    const cible: StatutReception = m === "ecartee" ? "ignoree" : m;
    if (source === "exemple") {
      setExemple((v) => ({ ...v, receptions: v.receptions.map((x) => (x.id === rid ? { ...x, statut: cible } : x)) }));
      toast(m === "lue" ? "Marqué comme lu" : m === "ecartee" ? "Courriel écarté" : "Remis en nouveau", "vert");
      return;
    }
    setMarquage(rid);
    try {
      const s = await marquerReception(rid, m);
      setReel((v) => (v ? { ...v, receptions: v.receptions.map((x) => (x.id === rid ? { ...x, statut: s } : x)) } : v));
      toast(m === "lue" ? "Marqué comme lu" : m === "ecartee" ? "Courriel écarté" : "Remis en nouveau", "vert");
    } catch (e) {
      setErreurMarque(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setMarquage(null);
    }
  };
  const ouvrirPiece = async (chemin: string | null) => {
    setErreurPiece(null);
    if (source === "exemple" || !chemin) {
      setErreurPiece(source === "exemple" ? "Données d'exemple : la pièce n'existe pas." : "La réception ne dit pas où la pièce est rangée.");
      return;
    }
    try {
      window.open(await lienPiece(chemin), "_blank", "noopener");
    } catch (e) {
      setErreurPiece(e instanceof Error ? e.message : "Lien indisponible.");
    }
  };

  /* ——— les lignes ——— */
  const fil = (r: Reception): Fil => {
    const f = infoFamille(familleDe(r.statut));
    const st = STATUTS_RECEPTION[r.statut] ?? STATUTS_RECEPTION.lue;
    const nom = r.de_nom || r.de_adresse || "Expéditeur inconnu";
    const ecartees = piecesIgnorees(r).length;
    return {
      id: String(r.id),
      href: lienId(r.id),
      etat: f.icone,
      etatTeinte: f.teinte,
      avatar: { lettre: initialesDe(nom), couleur: couleurDe(r.de_adresse ?? nom), titre: nom },
      client: nom,
      contact: r.de_nom ? r.de_adresse : null,
      badge: r.statut === "indesirable" ? { texte: "Indésirable" } : ecartees ? { texte: "Pièce écartée", teinte: "orange" } : r.statut === "ignoree" ? { texte: "Ignoré" } : null,
      ref: `#${r.id}`,
      titre: r.sujet || "(sans objet)",
      apercu: r.corps ? r.corps.replace(/\s+/g, " ").trim().slice(0, 160) : null,
      priorite: r.statut === "nouvelle" && r.pieces.length ? 3 : f.prio,
      etiquettes: r.pieces.length ? (
        <>
          <Paperclip width={14} height={14} aria-hidden="true" />
          {pluriel(r.pieces.length, "pièce")}
        </>
      ) : null,
      heure: { texte: relatif(r.recu_le, dateMaintenant), iso: r.recu_le, icone: "bulle" },
      qui: st.libelle === "Traité" ? { lettre: "F", icone: <MarqueModule cle="filed" />, titre: "Traité par FILED" } : null,
    };
  };
  const description = [
    boite ? `Adresse de la boîte : ${boite}` : "Aucune boîte FILED visible pour votre compte",
    source === "exemple" ? "Données d'exemple" : direct === "en_direct" ? "En direct" : direct === "coupe" ? "Relue toutes les 30 s" : "Base réelle",
  ].join(" · ");
  const droite = boite ? (
    <button type="button" className="pf-lien" onClick={() => void copier(boite, "Adresse copiée")}>
      <Copy aria-hidden="true" /> Copier l&apos;adresse
    </button>
  ) : null;
  const sections: SectionFils[] = grouper
    ? FAMILLES.map((f) => ({ cle: f.cle, titre: f.libelle, icone: f.icone, description: f.sous, droite: f.cle === "nouvelle" ? droite : undefined, fils: tries.filter((r) => familleDe(r.statut) === f.cle).map(fil) }))
    : [{ cle: "tous", titre: "Courriels reçus", description, droite, fils: tries.map(fil) }];
  const filtresPoses: FiltrePose[] = [
    ...(statut ? [{ cle: "statut", libelle: infoFamille(statut).libelle, icone: infoFamille(statut).icone, href: adresse((p) => p.delete("statut")) }] : []),
    ...(boiteChoisie ? [{ cle: "boite", libelle: boiteChoisie.startsWith("site:") ? `Site ${boiteChoisie.slice(5)}` : boiteChoisie, href: adresse((p) => p.delete("boite")) }] : []),
    ...(recherche ? [{ cle: "q", libelle: `« ${recherche} »`, href: adresse(() => {}) }] : []),
  ];

  /* ——— le courriel ouvert ——— */
  const choisi = id !== null ? (base.find((r) => String(r.id) === id) ?? null) : null;
  const rang = choisi ? tries.findIndex((r) => r.id === choisi.id) : -1;
  const docs = vue?.documents ?? [];

  return (
    <ListeFils
      titre="Boîte de réception"
      actions={
        <>
          <BoutonPlain href={`${RACINE}/filed`} icone={<FileText width={18} height={18} aria-hidden="true" />}>
            Documents reçus
          </BoutonPlain>
          <MenuPlain icone={<IconeFiltres />} libelle="Filtres" raccourci="F" n={filtresPoses.length || undefined}>
            {(fermer) => (
              <>
                <div className="pf-menu-groupe">
                  <input
                    className="pf-menu-champ"
                    autoFocus
                    placeholder="Chercher un expéditeur, un objet, une pièce…"
                    aria-label="Chercher un courriel"
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fermer()}
                  />
                </div>
                <div className="pf-menu-groupe" role="group" aria-label="Statut">
                  <p className="pf-menu-titre">Statut</p>
                  {FAMILLES.map((f) => (
                    <OptionPlain
                      key={f.cle}
                      icone={f.icone}
                      n={compteurs[f.cle]}
                      actif={statut === f.cle}
                      onClick={() => {
                        fermer();
                        aller(adresse((p) => (statut === f.cle ? p.delete("statut") : p.set("statut", f.cle))));
                      }}
                    >
                      {f.libelle}
                    </OptionPlain>
                  ))}
                </div>
                {vue && vue.boites.length > 1 ? (
                  <div className="pf-menu-groupe" role="group" aria-label="Boîte">
                    <p className="pf-menu-titre">Boîte</p>
                    {vue.boites.map((b) => (
                      <OptionPlain
                        key={b}
                        n={(vue.receptions ?? []).filter((r) => r.boite.toLowerCase() === b.toLowerCase()).length}
                        actif={boiteChoisie === b.toLowerCase()}
                        onClick={() => {
                          fermer();
                          aller(adresse((p) => (boiteChoisie === b.toLowerCase() ? p.delete("boite") : p.set("boite", b.toLowerCase()))));
                        }}
                      >
                        {b.startsWith("site:") ? `Site ${b.slice(5)}` : b}
                      </OptionPlain>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </MenuPlain>
          <MenuPlain icone={<IconeAffichage />} libelle="Affichage" raccourci="V" large>
            {() => (
              <div className="pf-menu-corps">
                <div className="pf-segment" role="group" aria-label="Regroupement">
                  <button type="button" aria-pressed={!grouper} onClick={() => aller(adresse((p) => p.delete("grouper")))}>
                    Liste
                  </button>
                  <button type="button" aria-pressed={grouper} onClick={() => aller(adresse((p) => p.set("grouper", "1")))}>
                    Par statut
                  </button>
                </div>
                <p className="pf-etiquette">Trier par</p>
                <ChampPlain<Tri> libelle="Trier par" valeur={tri} options={TRIS} onChange={(v) => aller(adresse((p) => (v === "recent" ? p.delete("tri") : p.set("tri", v))))} />
              </div>
            )}
          </MenuPlain>
        </>
      }
      onglets={ONGLETS.map((o) => ({
        cle: o.cle,
        libelle: o.libelle,
        icone: o.cle === "nouvelle" ? <IconeAnneau /> : o.cle === "lue" ? <IconeHorloge /> : undefined,
        teinte: o.cle === "nouvelle" ? "bleu" : undefined,
        n: o.cle === "tous" ? undefined : base.filter((r) => o.garde(familleDe(r.statut))).length,
        href: adresse((p) => {
          if (o.cle === "nouvelle") p.delete("onglet");
          else p.set("onglet", o.cle);
          p.delete("id");
        }),
      }))}
      ongletActif={onglet}
      filtresPoses={filtresPoses}
      note={erreur ? `La base réelle n'a pas répondu. ${erreur}` : null}
      sections={sections}
      idOuvert={id}
      chargement={!vue}
      vide={
        recherche || statut || boiteChoisie
          ? { titre: "Aucun courriel ne correspond", texte: "Essayez un autre mot ou retirez le filtre." }
          : onglet === "nouvelle"
            ? {
                titre: "Rien de nouveau",
                texte: "Les courriels envoyés à la boîte de FILED apparaissent ici dès leur arrivée.",
                geste: base.length ? (
                  <Link
                    href={adresse((p) => {
                      p.set("onglet", "tous");
                    })}
                    replace
                    className="pf-lien"
                  >
                    Voir tous les courriels
                  </Link>
                ) : undefined,
              }
            : { titre: "Aucun courriel", texte: "Les courriels envoyés à la boîte de FILED apparaissent ici dès leur arrivée." }
      }
    >
      <CarteCentrale
        ouverte={id !== null && !!vue}
        fermer={() => {
          setErreurPiece(null);
          setErreurMarque(null);
          aller(lienId(null));
        }}
        libelle={choisi ? `Courriel ${choisi.sujet || "(sans objet)"}` : "Courriel introuvable"}
        sur="FILED · Courriel reçu"
        statut={choisi ? <>{(STATUTS_RECEPTION[choisi.statut] ?? STATUTS_RECEPTION.lue).libelle}</> : undefined}
        nav={
          choisi && rang >= 0
            ? {
                position: rang + 1,
                total: tries.length,
                precedente: rang > 0 ? () => aller(lienId(tries[rang - 1].id)) : undefined,
                suivante: rang < tries.length - 1 ? () => aller(lienId(tries[rang + 1].id)) : undefined,
              }
            : null
        }
        gauche={
          choisi ? (
            <Feuille
              titre="COURRIEL"
              sous={dateHeure(choisi.recu_le)}
              nom={choisi.de_nom ?? choisi.de_adresse ?? "Expéditeur inconnu"}
              sousNom={[...(choisi.de_nom && choisi.de_adresse ? [choisi.de_adresse] : []), `à ${choisi.boite}`]}
              texte={choisi.corps?.trim() || "Message sans texte."}
            />
          ) : (
            <Feuille titre="COURRIEL" sous={null} texte="Aucun courriel." />
          )
        }
        piedGauche={
          choisi ? (
            <div className="v2-det-document-ligne">
              <span className="v2-det-mono">#{choisi.id}</span>
              <span className="v2-det-sous">{CANAUX[choisi.canal] ?? choisi.canal}</span>
            </div>
          ) : undefined
        }
        titre={choisi ? choisi.sujet || "(sans objet)" : "Courriel introuvable"}
        echeance={choisi ? { texte: `Reçu le ${dateHeure(choisi.recu_le)}` } : null}
        notes={
          choisi ? (
            <>
              {piecesIgnorees(choisi).map((p) => (
                <Note key={p.nom} teinte="ambre">
                  <strong>{p.nom}</strong> n&apos;a pas été gardée{p.raison ? ` : ${p.raison}` : ""}. Demandez à l&apos;expéditeur de la renvoyer en PDF.
                </Note>
              ))}
              {erreurPiece ? (
                <Note teinte="rouge" role="alert">
                  {erreurPiece}
                </Note>
              ) : null}
              {erreurMarque ? (
                <Note teinte="rouge" role="alert">
                  <strong>Refusé par la base.</strong> {erreurMarque}
                </Note>
              ) : null}
            </>
          ) : undefined
        }
        actions={
          choisi ? (
            <>
              {choisi.statut === "nouvelle" ? (
                <button type="button" className="v2-btn v2-btn--primaire" disabled={marquage === choisi.id} onClick={() => void marquer(choisi.id, "lue")}>
                  <Check width={14} height={14} aria-hidden="true" /> Marquer comme lu
                </button>
              ) : null}
              {choisi.statut !== "ignoree" && choisi.statut !== "traitee" && choisi.statut !== "indesirable" ? (
                <button type="button" className="v2-btn v2-btn--fantome" disabled={marquage === choisi.id} onClick={() => void marquer(choisi.id, "ecartee")}>
                  <X width={14} height={14} aria-hidden="true" /> Écarter
                </button>
              ) : null}
              {choisi.statut !== "nouvelle" && choisi.statut !== "traitee" && choisi.statut !== "indesirable" ? (
                <button type="button" className="v2-btn v2-btn--fantome" disabled={marquage === choisi.id} onClick={() => void marquer(choisi.id, "nouvelle")}>
                  <RotateCcw width={14} height={14} aria-hidden="true" /> Remettre en nouveau
                </button>
              ) : null}
              <span className="v2 pf-plus">
                <span className="lin">
                  <MenuActions
                    rond
                    titre="Plus d'actions"
                    options={
                      [
                        ...(choisi.de_adresse
                          ? [
                              {
                                cle: "exp",
                                libelle: "Copier l'adresse de l'expéditeur",
                                meta: choisi.de_adresse,
                                icone: <Copy width={16} height={16} />,
                                action: () => void copier(choisi.de_adresse ?? "", "Adresse copiée"),
                              },
                            ]
                          : []),
                        { cle: "boite", libelle: "Copier l'adresse de la boîte", icone: <Copy width={16} height={16} />, action: () => void copier(choisi.boite, "Adresse copiée") },
                        {
                          cle: "seule",
                          libelle: `Seulement « ${infoFamille(familleDe(choisi.statut)).libelle} »`,
                          icone: <ListFilter width={16} height={16} />,
                          coche: statut === familleDe(choisi.statut),
                          action: () => aller(adresse((p) => (statut === familleDe(choisi.statut) ? p.delete("statut") : p.set("statut", familleDe(choisi.statut))))),
                        },
                        { cle: "documents", libelle: "Documents reçus", icone: <ExternalLink width={16} height={16} />, href: `${RACINE}/filed` },
                      ] satisfies Option[]
                    }
                  />
                </span>
              </span>
            </>
          ) : undefined
        }
      >
        {choisi ? (
          <>
            <dl className="v2-det-fiche">
              <dt>De</dt>
              <dd>
                {choisi.de_nom ? <>{choisi.de_nom} · </> : null}
                <span className="v2-det-mono">{choisi.de_adresse ?? "—"}</span>
              </dd>
              <dt>À</dt>
              <dd>
                <span className="v2-det-mono">{choisi.boite}</span>
              </dd>
              <dt>Reçu le</dt>
              <dd>{dateHeure(choisi.recu_le)}</dd>
              <dt>Statut</dt>
              <dd>
                {(STATUTS_RECEPTION[choisi.statut] ?? STATUTS_RECEPTION.lue).libelle} <span className="v2-det-sous">· {infoFamille(familleDe(choisi.statut)).sous}</span>
              </dd>
            </dl>
            {champsDe(choisi).length ? (
              <div className="v2-det-bloc">
                <h3 className="v2-det-section-titre">{choisi.canal === "formulaire" ? "Champs du formulaire" : "Informations jointes"}</h3>
                <dl className="v2-det-fiche">
                  {champsDe(choisi).map(([k, v]) => (
                    <div key={k} style={{ display: "contents" }}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
            <div className="v2-det-bloc">
              <h3 className="v2-det-section-titre">
                Pièces jointes
                <small>{choisi.pieces.length}</small>
              </h3>
              {choisi.pieces.length ? (
                <ol className="v2-det-fil">
                  {choisi.pieces.map((p, i) => {
                    const d = documentDe(choisi, p, docs);
                    return (
                      <li key={`${p.nom}-${i}`}>
                        <span className="v2-det-fil-avatar" aria-hidden="true">
                          <Paperclip width={14} height={14} />
                        </span>
                        <div className="v2-det-fil-texte">
                          <strong>
                            <button type="button" className="pf-lien-bouton" onClick={() => void ouvrirPiece(p.chemin)} aria-label={`Ouvrir la pièce ${p.nom}`}>
                              {p.nom}
                            </button>
                            {p.taille ? <span className="v2-det-sous"> · {taille(p.taille)}</span> : null}
                          </strong>
                          <span>
                            {d ? (
                              <>
                                Devenue le document{" "}
                                <Link href={`${RACINE}/filed?objet=document:${encodeURIComponent(d.id)}`} className="v2-det-mono">
                                  {d.reference ?? "FILED"}
                                </Link>
                              </>
                            ) : choisi.statut === "nouvelle" ? (
                              "En attente de lecture par FILED"
                            ) : (
                              "Pas de document FILED retrouvé pour cette pièce"
                            )}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="v2-det-vide">Aucune pièce jointe : rien à lire pour FILED.</p>
              )}
            </div>
          </>
        ) : (
          <p className="v2-det-vide">Le courriel que désigne ce lien n&apos;est pas connu{source === "exemple" ? " (vous regardez les données d'exemple)" : ""}.</p>
        )}
      </CarteCentrale>
    </ListeFils>
  );
}
