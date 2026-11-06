"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO — Mails (06/11/2026, demande de Teo : « une page pour les mails,
   plein de faux mails en rapport avec le BTP, modifiables »)

   La copie de la Boîte de réception de FILED (../filed/FilsBoite.tsx),
   même gabarit : la liste des fils de Plain (../lin/ListeFils.tsx) et la
   carte au milieu (../lin/CarteCentrale.tsx). Seul le contenu change :
     · un fil par mail reçu sur la boîte de l'entreprise : expéditeur,
       objet, aperçu, priorité, pièces jointes, heure ;
     · les onglets Non lus · Lus · Tous les mails ; le menu Filtres
       (recherche, statut, type d'expéditeur, chantier) ; le menu Affichage
       (liste, par statut, par chantier ; tri) ;
     · le mail ouvert (?id=) au milieu : la feuille du mail à gauche, ses
       champs à droite, le chantier lié, les pièces, les réponses.

   Tout est modifiable : « Modifier » passe la carte en formulaire
   (expéditeur, adresse, destinataire, copie, objet, texte, date, statut,
   priorité, type, chantier, pièces jointes), la feuille suit la saisie ;
   « Ajouter un mail » en crée un, « Dupliquer » et « Supprimer » sont dans
   « … ». Les mails sont des exemples (./exemplesMails) : rien n'est écrit
   en base ni envoyé ; les modifications restent dans ce navigateur
   (localStorage), « Remettre les mails d'exemple » les efface.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Archive, Check, Copy, CopyPlus, ExternalLink, ListFilter, Mail as IconeMail, Paperclip, Pencil, Reply, RotateCcw, Send, Trash2, X } from "lucide-react";
import { dateHeure, relatif } from "@/components/espace/format";
import { MenuActions, type Option } from "../lin/Lin";
import { CarteCentrale, Feuille } from "../lin/CarteCentrale";
import {
  BoutonPlain,
  ChampPlain,
  IconeAffichage,
  IconeAnneau,
  IconeCoche,
  IconeFiltres,
  IconeHorloge,
  IconePlus,
  ListeFils,
  MenuPlain,
  OptionPlain,
  PRIORITES,
  couleurDe,
  initialesDe,
  useAdresse,
  type Fil,
  type FiltrePose,
  type SectionFils,
} from "../lin/ListeFils";
import { Note } from "../ui";
import { useToast } from "../Toasts";
import { RACINE } from "../modules";
import { BOITE, CATEGORIES, CHANTIERS_MAIL, mailVide, mailsExemple, nomChantier, type CategorieMail, type Mail, type PrioriteMail, type StatutMail } from "./exemplesMails";
import "./dal-mails.css";

const CHEMIN = `${RACINE}/daliro/mails`;
const BASE = `${RACINE}/daliro`;
const CLE_STOCKAGE = "daliro-mails-v1";
const sansAccents = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const taille = (o: number) => (o >= 1024 * 1024 ? `${(o / 1024 / 1024).toFixed(1).replace(".", ",")} Mo` : `${Math.max(1, Math.round(o / 1024))} Ko`);
const numero = (m: Mail) => m.id.replace(/^ml-/, "").toUpperCase();

const IconeArchive = () => <Archive width={16} height={16} aria-hidden="true" />;
const STATUTS: { cle: StatutMail; libelle: string; sous: string; icone: React.ReactNode; teinte?: "bleu" | "orange" }[] = [
  { cle: "nouveau", libelle: "Non lus", sous: "arrivés, pas encore ouverts", icone: <IconeAnneau />, teinte: "bleu" },
  { cle: "lu", libelle: "Lus", sous: "lus, une suite reste à donner", icone: <IconeHorloge /> },
  { cle: "traite", libelle: "Traités", sous: "répondus ou réglés", icone: <IconeCoche /> },
  { cle: "archive", libelle: "Archivés", sous: "rangés, rien à faire", icone: <IconeArchive /> },
];
const LIB_STATUT: Record<StatutMail, string> = { nouveau: "Non lu", lu: "Lu", traite: "Traité", archive: "Archivé" };
const infoStatut = (s: StatutMail) => STATUTS.find((x) => x.cle === s)!;

type Onglet = "nouveau" | "lu" | "tous";
const ONGLETS: { cle: Onglet; libelle: string; garde: (s: StatutMail) => boolean }[] = [
  { cle: "nouveau", libelle: "Non lus", garde: (s) => s === "nouveau" },
  { cle: "lu", libelle: "Lus", garde: (s) => s === "lu" },
  { cle: "tous", libelle: "Tous les mails", garde: () => true },
];
type Tri = "recent" | "ancien" | "expediteur" | "priorite";
const TRIS: { cle: Tri; libelle: string }[] = [
  { cle: "recent", libelle: "Reçu, le plus récent d'abord" },
  { cle: "ancien", libelle: "Reçu, le plus ancien d'abord" },
  { cle: "expediteur", libelle: "Expéditeur" },
  { cle: "priorite", libelle: "Priorité" },
];
type Groupe = "liste" | "statut" | "chantier";

/* ——— la date pour <input type="datetime-local"> (heure locale) ——— */
const versLocal = (iso: string) => {
  const x = new Date(iso);
  if (Number.isNaN(x.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`;
};

/* ——— la boîte, gardée dans ce navigateur ——— */
function lire(): Mail[] {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE);
    if (brut) {
      const v = JSON.parse(brut) as unknown;
      if (Array.isArray(v)) return v as Mail[];
    }
  } catch {
    /* stockage indisponible : les exemples */
  }
  return mailsExemple();
}
function ecrire(mails: Mail[] | null) {
  try {
    if (mails === null) localStorage.removeItem(CLE_STOCKAGE);
    else localStorage.setItem(CLE_STOCKAGE, JSON.stringify(mails));
  } catch {
    /* navigation privée : la boîte vit le temps de la page */
  }
}

export default function Mails() {
  const routeur = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const adresse = useAdresse(CHEMIN, params);
  const [mails, setMails] = useState<Mail[] | null>(null);
  const [recherche, setRecherche] = useState("");
  /* le mail en cours de modification (une copie, enregistrée d'un coup) */
  const [brouillon, setBrouillon] = useState<Mail | null>(null);
  const [nouveau, setNouveau] = useState(false);
  const [reponse, setReponse] = useState<{ id: string; texte: string }>({ id: "", texte: "" });

  /* les mails sont datés à l'heure du visiteur : lus après le montage */
  useEffect(() => {
    const t = window.setTimeout(() => setMails(lire()), 0);
    return () => window.clearTimeout(t);
  }, []);
  const changer = (f: (m: Mail[]) => Mail[]) =>
    setMails((v) => {
      const suivant = f(v ?? []);
      ecrire(suivant);
      return suivant;
    });

  /* ——— l'adresse : onglet, statut, type, chantier, tri, regroupement, mail ouvert ——— */
  const onglet = (ONGLETS.find((o) => o.cle === params.get("onglet"))?.cle ?? "nouveau") as Onglet;
  const statut = (STATUTS.find((s) => s.cle === params.get("statut"))?.cle ?? null) as StatutMail | null;
  const categorie = (Object.keys(CATEGORIES).find((c) => c === params.get("type")) ?? null) as CategorieMail | null;
  const chantier = CHANTIERS_MAIL.find((c) => c.id === params.get("chantier"))?.id ?? (params.get("chantier") === "aucun" ? "aucun" : null);
  const tri = (TRIS.find((t) => t.cle === params.get("tri"))?.cle ?? "recent") as Tri;
  const groupe: Groupe = params.get("grouper") === "statut" ? "statut" : params.get("grouper") === "chantier" ? "chantier" : "liste";
  const id = params.get("id");
  const aller = (href: string) => routeur.replace(href, { scroll: false });
  const lienId = (x: string | null) => adresse((p) => (x !== null ? p.set("id", x) : p.delete("id")));

  const q = sansAccents(recherche.trim());
  const correspond = (m: Mail) => !q || [m.de_nom, m.de_adresse, m.objet, m.corps, nomChantier(m.chantier_id) ?? "", ...m.pieces.map((p) => p.nom)].some((x) => x && sansAccents(x).includes(q));
  const garde = ONGLETS.find((o) => o.cle === onglet)!.garde;
  const base = mails ?? [];
  const visibles = base.filter(
    (m) =>
      garde(m.statut) &&
      (!statut || m.statut === statut) &&
      (!categorie || m.categorie === categorie) &&
      (!chantier || (chantier === "aucun" ? m.chantier_id === null : m.chantier_id === chantier)) &&
      correspond(m),
  );
  const tries = [...visibles].sort((x, y) =>
    tri === "expediteur"
      ? (x.de_nom || x.de_adresse).localeCompare(y.de_nom || y.de_adresse, "fr")
      : tri === "priorite"
        ? y.priorite - x.priorite || y.recu_le.localeCompare(x.recu_le)
        : tri === "ancien"
          ? x.recu_le.localeCompare(y.recu_le)
          : y.recu_le.localeCompare(x.recu_le),
  );
  const compteurs = useMemo(() => {
    const c: Record<StatutMail, number> = { nouveau: 0, lu: 0, traite: 0, archive: 0 };
    for (const m of mails ?? []) if (correspond(m)) c[m.statut]++;
    return c;
  }, [mails, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const maintenant = new Date();

  /* ——— les gestes ——— */
  const copier = (texte: string, quoi: string) =>
    navigator.clipboard?.writeText(texte).then(
      () => toast(quoi, "vert"),
      () => toast("Impossible de copier. Réessayez.", "rouge"),
    );
  const marquer = (mid: string, s: StatutMail) => {
    changer((v) => v.map((m) => (m.id === mid ? { ...m, statut: s } : m)));
    toast(s === "lu" ? "Marqué comme lu" : s === "nouveau" ? "Marqué comme non lu" : s === "traite" ? "Marqué comme traité" : "Mail archivé", "vert");
  };
  const prochainId = () => {
    const n = Math.max(0, ...base.map((m) => Number.parseInt(m.id.replace(/^ml-/, ""), 10)).filter((x) => Number.isFinite(x))) + 1;
    return `ml-${String(n).padStart(2, "0")}`;
  };
  const ajouter = () => {
    const m = mailVide(prochainId());
    setBrouillon(m);
    setNouveau(true);
    aller(lienId(m.id));
  };
  const dupliquer = (m: Mail) => {
    const copie: Mail = { ...m, id: prochainId(), objet: `${m.objet} (copie)`, statut: "nouveau", recu_le: new Date().toISOString(), reponses: [] };
    changer((v) => [copie, ...v]);
    toast("Mail dupliqué", "vert");
    aller(adresse((p) => {
      p.set("onglet", "tous");
      p.set("id", copie.id);
    }));
  };
  const supprimer = (m: Mail) => {
    if (!window.confirm(`Supprimer le mail « ${m.objet || "(sans objet)"} » ?`)) return;
    changer((v) => v.filter((x) => x.id !== m.id));
    setBrouillon(null);
    toast("Mail supprimé", "vert");
    aller(lienId(null));
  };
  const enregistrer = () => {
    if (!brouillon) return;
    const propre: Mail = { ...brouillon, objet: brouillon.objet.trim(), de_nom: brouillon.de_nom.trim(), de_adresse: brouillon.de_adresse.trim() };
    changer((v) => (v.some((m) => m.id === propre.id) ? v.map((m) => (m.id === propre.id ? propre : m)) : [propre, ...v]));
    toast(nouveau ? "Mail ajouté" : "Modifications enregistrées", "vert");
    setBrouillon(null);
    /* un mail ajouté reste ouvert, dans l'onglet qui le montre */
    if (nouveau) aller(adresse((p) => {
      p.set("onglet", "tous");
      p.set("id", propre.id);
    }));
    setNouveau(false);
  };
  const annuler = () => {
    const etaitNouveau = nouveau;
    setBrouillon(null);
    setNouveau(false);
    if (etaitNouveau) aller(lienId(null));
  };
  const repondre = (m: Mail) => {
    const texte = reponse.id === m.id ? reponse.texte.trim() : "";
    if (!texte) return;
    changer((v) => v.map((x) => (x.id === m.id ? { ...x, statut: "traite", reponses: [...x.reponses, { quand: new Date().toISOString(), texte }] } : x)));
    setReponse({ id: "", texte: "" });
    toast("Réponse ajoutée au mail", "vert");
  };
  const remettre = () => {
    if (!window.confirm("Remettre les mails d'exemple ? Vos modifications, ajouts et suppressions seront effacés.")) return;
    ecrire(null);
    setMails(mailsExemple());
    setBrouillon(null);
    setNouveau(false);
    toast("Mails d'exemple remis", "vert");
    aller(CHEMIN);
  };

  /* ——— les lignes ——— */
  const fil = (m: Mail): Fil => {
    const s = infoStatut(m.statut);
    const nom = m.de_nom || m.de_adresse || "Expéditeur inconnu";
    return {
      id: m.id,
      href: lienId(m.id),
      etat: s.icone,
      etatTeinte: s.teinte,
      avatar: { lettre: initialesDe(nom), couleur: couleurDe(m.de_adresse || nom), titre: nom },
      client: nom,
      contact: m.de_nom ? m.de_adresse : null,
      badge: m.priorite === 4 ? { texte: "Urgent", teinte: "orange" } : { texte: CATEGORIES[m.categorie] },
      ref: `#${numero(m)}`,
      titre: m.objet || "(sans objet)",
      apercu: m.corps ? m.corps.replace(/\s+/g, " ").trim().slice(0, 160) : null,
      priorite: m.priorite,
      etiquettes: m.pieces.length ? (
        <>
          <Paperclip width={14} height={14} aria-hidden="true" />
          {pluriel(m.pieces.length, "pièce")}
        </>
      ) : null,
      heure: { texte: relatif(m.recu_le, maintenant), iso: m.recu_le, icone: "bulle" },
      qui: m.reponses.length ? { lettre: "R", icone: <Reply width={12} height={12} aria-hidden="true" />, titre: pluriel(m.reponses.length, "réponse") } : null,
    };
  };
  const description = `Adresse de la boîte : ${BOITE} · Données d'exemple, modifiables`;
  const droite = (
    <button type="button" className="pf-lien" onClick={() => void copier(BOITE, "Adresse copiée")}>
      <Copy aria-hidden="true" /> Copier l&apos;adresse
    </button>
  );
  const sections: SectionFils[] =
    groupe === "statut"
      ? STATUTS.map((s) => ({ cle: s.cle, titre: s.libelle, icone: s.icone, description: s.sous, droite: s.cle === "nouveau" ? droite : undefined, fils: tries.filter((m) => m.statut === s.cle).map(fil) }))
      : groupe === "chantier"
        ? [
            ...CHANTIERS_MAIL.map((c) => ({ cle: c.id, titre: c.nom, description: "Mails liés à ce chantier", fils: tries.filter((m) => m.chantier_id === c.id).map(fil) })),
            { cle: "aucun", titre: "Sans chantier", description: "Demandes de devis, administration, fournisseurs", fils: tries.filter((m) => m.chantier_id === null).map(fil) },
          ]
        : [{ cle: "tous", titre: "Mails reçus", description, droite, fils: tries.map(fil) }];
  const filtresPoses: FiltrePose[] = [
    ...(statut ? [{ cle: "statut", libelle: infoStatut(statut).libelle, icone: infoStatut(statut).icone, href: adresse((p) => p.delete("statut")) }] : []),
    ...(categorie ? [{ cle: "type", libelle: CATEGORIES[categorie], href: adresse((p) => p.delete("type")) }] : []),
    ...(chantier ? [{ cle: "chantier", libelle: chantier === "aucun" ? "Sans chantier" : (nomChantier(chantier) ?? "Chantier"), href: adresse((p) => p.delete("chantier")) }] : []),
    ...(recherche ? [{ cle: "q", libelle: `« ${recherche} »`, href: adresse(() => {}) }] : []),
  ];

  /* ——— le mail ouvert ——— */
  const enCours = brouillon && brouillon.id === id ? brouillon : null;
  const choisi = enCours ?? (id !== null ? (base.find((m) => m.id === id) ?? null) : null);
  const rang = choisi && !enCours ? tries.findIndex((m) => m.id === choisi.id) : -1;
  const maj = (champ: Partial<Mail>) => setBrouillon((b) => (b ? { ...b, ...champ } : b));
  const texteReponse = choisi && reponse.id === choisi.id ? reponse.texte : "";

  return (
    <ListeFils
      titre="Mails"
      icone={<IconeMail width={18} height={18} aria-hidden="true" />}
      actions={
        <>
          <BoutonPlain icone={<IconePlus />} onClick={ajouter}>
            Ajouter un mail
          </BoutonPlain>
          <MenuPlain icone={<IconeFiltres />} libelle="Filtres" raccourci="F" n={filtresPoses.length || undefined}>
            {(fermer) => (
              <>
                <div className="pf-menu-groupe">
                  <input
                    className="pf-menu-champ"
                    autoFocus
                    placeholder="Chercher un expéditeur, un objet, un chantier…"
                    aria-label="Chercher un mail"
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fermer()}
                  />
                </div>
                <div className="pf-menu-groupe" role="group" aria-label="Statut">
                  <p className="pf-menu-titre">Statut</p>
                  {STATUTS.map((s) => (
                    <OptionPlain
                      key={s.cle}
                      icone={s.icone}
                      n={compteurs[s.cle]}
                      actif={statut === s.cle}
                      onClick={() => {
                        fermer();
                        aller(adresse((p) => {
                          if (statut === s.cle) p.delete("statut");
                          else {
                            p.set("statut", s.cle);
                            p.set("onglet", "tous");
                          }
                        }));
                      }}
                    >
                      {s.libelle}
                    </OptionPlain>
                  ))}
                </div>
                <div className="pf-menu-groupe" role="group" aria-label="Expéditeur">
                  <p className="pf-menu-titre">Expéditeur</p>
                  {(Object.keys(CATEGORIES) as CategorieMail[]).map((c) => (
                    <OptionPlain
                      key={c}
                      n={base.filter((m) => m.categorie === c).length}
                      actif={categorie === c}
                      onClick={() => {
                        fermer();
                        aller(adresse((p) => (categorie === c ? p.delete("type") : p.set("type", c))));
                      }}
                    >
                      {CATEGORIES[c]}
                    </OptionPlain>
                  ))}
                </div>
                <div className="pf-menu-groupe" role="group" aria-label="Chantier">
                  <p className="pf-menu-titre">Chantier</p>
                  {[...CHANTIERS_MAIL, { id: "aucun", nom: "Sans chantier" }].map((c) => (
                    <OptionPlain
                      key={c.id}
                      n={base.filter((m) => (c.id === "aucun" ? m.chantier_id === null : m.chantier_id === c.id)).length}
                      actif={chantier === c.id}
                      onClick={() => {
                        fermer();
                        aller(adresse((p) => (chantier === c.id ? p.delete("chantier") : p.set("chantier", c.id))));
                      }}
                    >
                      {c.nom}
                    </OptionPlain>
                  ))}
                </div>
              </>
            )}
          </MenuPlain>
          <MenuPlain icone={<IconeAffichage />} libelle="Affichage" raccourci="V" large>
            {(fermer) => (
              <div className="pf-menu-corps">
                <div className="pf-segment" role="group" aria-label="Regroupement">
                  <button type="button" aria-pressed={groupe === "liste"} onClick={() => aller(adresse((p) => p.delete("grouper")))}>
                    Liste
                  </button>
                  <button type="button" aria-pressed={groupe === "statut"} onClick={() => aller(adresse((p) => p.set("grouper", "statut")))}>
                    Par statut
                  </button>
                  <button type="button" aria-pressed={groupe === "chantier"} onClick={() => aller(adresse((p) => p.set("grouper", "chantier")))}>
                    Par chantier
                  </button>
                </div>
                <p className="pf-etiquette">Trier par</p>
                <ChampPlain<Tri> libelle="Trier par" valeur={tri} options={TRIS} onChange={(v) => aller(adresse((p) => (v === "recent" ? p.delete("tri") : p.set("tri", v))))} />
                <p className="pf-etiquette">Exemples</p>
                <button
                  type="button"
                  className="pf-lien"
                  onClick={() => {
                    fermer();
                    remettre();
                  }}
                >
                  <RotateCcw aria-hidden="true" /> Remettre les mails d&apos;exemple
                </button>
              </div>
            )}
          </MenuPlain>
        </>
      }
      onglets={ONGLETS.map((o) => ({
        cle: o.cle,
        libelle: o.libelle,
        icone: o.cle === "nouveau" ? <IconeAnneau /> : o.cle === "lu" ? <IconeHorloge /> : undefined,
        teinte: o.cle === "nouveau" ? "bleu" : undefined,
        n: o.cle === "tous" ? undefined : base.filter((m) => o.garde(m.statut)).length,
        href: adresse((p) => {
          if (o.cle === "nouveau") p.delete("onglet");
          else p.set("onglet", o.cle);
          p.delete("id");
        }),
      }))}
      ongletActif={onglet}
      filtresPoses={filtresPoses}
      sections={sections}
      idOuvert={id}
      chargement={mails === null}
      vide={
        recherche || statut || categorie || chantier
          ? { titre: "Aucun mail ne correspond", texte: "Essayez un autre mot ou retirez le filtre." }
          : onglet === "nouveau"
            ? {
                titre: "Aucun mail non lu",
                texte: "Les mails arrivés sur la boîte de l'entreprise apparaissent ici.",
                geste: base.length ? (
                  <Link href={adresse((p) => p.set("onglet", "tous"))} replace className="pf-lien">
                    Voir tous les mails
                  </Link>
                ) : undefined,
              }
            : { titre: "Aucun mail", texte: "Ajoutez un mail ou remettez les mails d'exemple (menu Affichage)." }
      }
    >
      <CarteCentrale
        ouverte={id !== null && mails !== null}
        fermer={() => {
          if (enCours && !window.confirm("Fermer sans enregistrer les modifications ?")) return;
          setBrouillon(null);
          setNouveau(false);
          aller(lienId(null));
        }}
        libelle={choisi ? `Mail ${choisi.objet || "(sans objet)"}` : "Mail introuvable"}
        sur={enCours ? (nouveau ? "DALIRO · Nouveau mail" : "DALIRO · Mail en modification") : "DALIRO · Mail reçu"}
        statut={choisi ? <>{LIB_STATUT[choisi.statut]}</> : undefined}
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
              titre="MAIL"
              sous={dateHeure(choisi.recu_le)}
              nom={choisi.de_nom || choisi.de_adresse || "Expéditeur inconnu"}
              sousNom={[...(choisi.de_nom && choisi.de_adresse ? [choisi.de_adresse] : []), `à ${choisi.a || BOITE}`, ...(choisi.cc ? [`cc ${choisi.cc}`] : []), ...(choisi.objet ? [`Objet : ${choisi.objet}`] : [])]}
              texte={choisi.corps.trim() || "Message sans texte."}
            />
          ) : (
            <Feuille titre="MAIL" sous={null} texte="Aucun mail." />
          )
        }
        piedGauche={
          choisi ? (
            <div className="v2-det-document-ligne">
              <span className="v2-det-mono">#{numero(choisi)}</span>
              <span className="v2-det-sous">
                {CATEGORIES[choisi.categorie]}
                {choisi.pieces.length ? ` · ${pluriel(choisi.pieces.length, "pièce")}` : ""}
              </span>
            </div>
          ) : undefined
        }
        titre={choisi ? (enCours ? (nouveau ? "Nouveau mail" : "Modifier le mail") : choisi.objet || "(sans objet)") : "Mail introuvable"}
        echeance={choisi && !enCours ? { texte: `Reçu le ${dateHeure(choisi.recu_le)}`, urgence: choisi.priorite === 4 && choisi.statut === "nouveau" ? "aujourdhui" : undefined } : null}
        notes={
          enCours ? (
            <Note teinte="gris">Mails d&apos;exemple : vos modifications restent dans ce navigateur, rien n&apos;est envoyé.</Note>
          ) : undefined
        }
        actions={
          enCours ? (
            <>
              <button type="button" className="v2-btn v2-btn--primaire" onClick={enregistrer}>
                <Check width={14} height={14} aria-hidden="true" /> {nouveau ? "Ajouter le mail" : "Enregistrer"}
              </button>
              <button type="button" className="v2-btn v2-btn--fantome" onClick={annuler}>
                <X width={14} height={14} aria-hidden="true" /> Annuler
              </button>
            </>
          ) : choisi ? (
            <>
              <button type="button" className="v2-btn v2-btn--primaire" onClick={() => setBrouillon({ ...choisi })}>
                <Pencil width={14} height={14} aria-hidden="true" /> Modifier
              </button>
              {choisi.statut === "nouveau" ? (
                <button type="button" className="v2-btn v2-btn--fantome" onClick={() => marquer(choisi.id, "lu")}>
                  <Check width={14} height={14} aria-hidden="true" /> Marquer comme lu
                </button>
              ) : (
                <button type="button" className="v2-btn v2-btn--fantome" onClick={() => marquer(choisi.id, "nouveau")}>
                  <RotateCcw width={14} height={14} aria-hidden="true" /> Marquer non lu
                </button>
              )}
              {choisi.statut !== "traite" ? (
                <button type="button" className="v2-btn v2-btn--fantome" onClick={() => marquer(choisi.id, "traite")}>
                  <Check width={14} height={14} aria-hidden="true" /> Traité
                </button>
              ) : null}
              {choisi.statut !== "archive" ? (
                <button type="button" className="v2-btn v2-btn--fantome" onClick={() => marquer(choisi.id, "archive")}>
                  <Archive width={14} height={14} aria-hidden="true" /> Archiver
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
                              { cle: "exp", libelle: "Copier l'adresse de l'expéditeur", meta: choisi.de_adresse, icone: <Copy width={16} height={16} />, action: () => void copier(choisi.de_adresse, "Adresse copiée") },
                              {
                                cle: "mailto",
                                libelle: "Répondre depuis votre messagerie",
                                icone: <Reply width={16} height={16} />,
                                href: `mailto:${choisi.de_adresse}?subject=${encodeURIComponent(`Re: ${choisi.objet}`)}`,
                              },
                            ]
                          : []),
                        { cle: "copier", libelle: "Copier le mail", icone: <Copy width={16} height={16} />, action: () => void copier(`De : ${choisi.de_nom} <${choisi.de_adresse}>\nObjet : ${choisi.objet}\n\n${choisi.corps}`, "Mail copié") },
                        { cle: "dupliquer", libelle: "Dupliquer le mail", icone: <CopyPlus width={16} height={16} />, action: () => dupliquer(choisi) },
                        {
                          cle: "seule",
                          libelle: `Seulement « ${infoStatut(choisi.statut).libelle} »`,
                          icone: <ListFilter width={16} height={16} />,
                          coche: statut === choisi.statut,
                          action: () => aller(adresse((p) => (statut === choisi.statut ? p.delete("statut") : (p.set("statut", choisi.statut), p.set("onglet", "tous"))))),
                        },
                        ...(choisi.chantier_id ? [{ cle: "chantier", libelle: `Ouvrir ${nomChantier(choisi.chantier_id)}`, icone: <ExternalLink width={16} height={16} />, href: `${BASE}/chantiers/${choisi.chantier_id}` }] : []),
                        { cle: "supprimer", libelle: "Supprimer le mail", icone: <Trash2 width={16} height={16} />, action: () => supprimer(choisi) },
                      ] satisfies Option[]
                    }
                  />
                </span>
              </span>
            </>
          ) : undefined
        }
      >
        {enCours ? (
          <FormulaireMail mail={enCours} maj={maj} />
        ) : choisi ? (
          <>
            <dl className="v2-det-fiche">
              <dt>De</dt>
              <dd>
                {choisi.de_nom ? <>{choisi.de_nom} · </> : null}
                <span className="v2-det-mono">{choisi.de_adresse || "—"}</span>
              </dd>
              <dt>À</dt>
              <dd>
                <span className="v2-det-mono">{choisi.a || BOITE}</span>
              </dd>
              {choisi.cc ? (
                <>
                  <dt>Copie</dt>
                  <dd>
                    <span className="v2-det-mono">{choisi.cc}</span>
                  </dd>
                </>
              ) : null}
              <dt>Expéditeur</dt>
              <dd>{CATEGORIES[choisi.categorie]}</dd>
              <dt>Chantier</dt>
              <dd>{choisi.chantier_id ? <Link href={`${BASE}/chantiers/${choisi.chantier_id}`}>{nomChantier(choisi.chantier_id)}</Link> : <span className="v2-det-sous">Aucun chantier</span>}</dd>
              <dt>Priorité</dt>
              <dd>{PRIORITES[choisi.priorite]}</dd>
              <dt>Statut</dt>
              <dd>
                {LIB_STATUT[choisi.statut]} <span className="v2-det-sous">· {infoStatut(choisi.statut).sous}</span>
              </dd>
            </dl>
            <div className="v2-det-bloc">
              <h3 className="v2-det-section-titre">
                Pièces jointes
                <small>{choisi.pieces.length}</small>
              </h3>
              {choisi.pieces.length ? (
                <ol className="v2-det-fil">
                  {choisi.pieces.map((p, i) => (
                    <li key={`${p.nom}-${i}`}>
                      <span className="v2-det-fil-avatar" aria-hidden="true">
                        <Paperclip width={14} height={14} />
                      </span>
                      <div className="v2-det-fil-texte">
                        <strong>
                          {p.nom}
                          <span className="v2-det-sous"> · {taille(p.taille)}</span>
                        </strong>
                        <span>Pièce d&apos;exemple : le fichier n&apos;existe pas.</span>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="v2-det-vide">Aucune pièce jointe.</p>
              )}
            </div>
            <div className="v2-det-bloc">
              <h3 className="v2-det-section-titre">
                Réponses
                <small>{choisi.reponses.length}</small>
              </h3>
              {choisi.reponses.length ? (
                <ol className="v2-det-fil">
                  {choisi.reponses.map((r, i) => (
                    <li key={i}>
                      <span className="v2-det-fil-avatar" aria-hidden="true">
                        <Reply width={14} height={14} />
                      </span>
                      <div className="v2-det-fil-texte">
                        <strong>Vous · {dateHeure(r.quand)}</strong>
                        <span className="dal-ml-texte">{r.texte}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : null}
              <div className="dal-ml-repondre">
                <span className="v2-champ dal-ml-zone">
                  <textarea rows={3} aria-label="Votre réponse" placeholder={`Répondre à ${choisi.de_nom || choisi.de_adresse || "l'expéditeur"}…`} value={texteReponse} onChange={(e) => setReponse({ id: choisi.id, texte: e.target.value })} />
                </span>
                <button type="button" className="v2-btn v2-btn--petit" disabled={!texteReponse.trim()} onClick={() => repondre(choisi)}>
                  <Send width={14} height={14} aria-hidden="true" /> Ajouter la réponse
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="v2-det-vide">Le mail que désigne ce lien n&apos;existe pas (ou plus) dans cette boîte.</p>
        )}
      </CarteCentrale>
    </ListeFils>
  );
}

/* ——— le formulaire : tous les champs du mail ——— */
function FormulaireMail({ mail: m, maj }: { mail: Mail; maj: (c: Partial<Mail>) => void }) {
  return (
    <div className="dal-ml-form">
      <div className="dal-ml-deux">
        <label className="v2-libelle">
          Expéditeur
          <span className="v2-champ">
            <input value={m.de_nom} onChange={(e) => maj({ de_nom: e.target.value })} placeholder="Négoce Matériaux, Mme Dupont…" autoFocus />
          </span>
        </label>
        <label className="v2-libelle">
          Adresse de l&apos;expéditeur
          <span className="v2-champ">
            <input type="email" value={m.de_adresse} onChange={(e) => maj({ de_adresse: e.target.value })} placeholder="nom@exemple.fr" />
          </span>
        </label>
      </div>
      <div className="dal-ml-deux">
        <label className="v2-libelle">
          À
          <span className="v2-champ">
            <input value={m.a} onChange={(e) => maj({ a: e.target.value })} />
          </span>
        </label>
        <label className="v2-libelle">
          Copie
          <span className="v2-champ">
            <input value={m.cc} onChange={(e) => maj({ cc: e.target.value })} placeholder="Aucune" />
          </span>
        </label>
      </div>
      <label className="v2-libelle">
        Objet
        <span className="v2-champ">
          <input value={m.objet} onChange={(e) => maj({ objet: e.target.value })} placeholder="Livraison, devis, facture…" />
        </span>
      </label>
      <label className="v2-libelle">
        Message
        <span className="v2-champ dal-ml-zone">
          <textarea rows={10} value={m.corps} onChange={(e) => maj({ corps: e.target.value })} placeholder="Le texte du mail" />
        </span>
      </label>
      <div className="dal-ml-deux">
        <label className="v2-libelle">
          Reçu le
          <span className="v2-champ">
            <input
              type="datetime-local"
              value={versLocal(m.recu_le)}
              onChange={(e) => {
                const x = new Date(e.target.value);
                if (!Number.isNaN(x.getTime())) maj({ recu_le: x.toISOString() });
              }}
            />
          </span>
        </label>
        <label className="v2-libelle">
          Statut
          <span className="v2-champ">
            <select value={m.statut} onChange={(e) => maj({ statut: e.target.value as StatutMail })}>
              {STATUTS.map((s) => (
                <option key={s.cle} value={s.cle}>
                  {LIB_STATUT[s.cle]}
                </option>
              ))}
            </select>
          </span>
        </label>
      </div>
      <div className="dal-ml-deux">
        <label className="v2-libelle">
          Type d&apos;expéditeur
          <span className="v2-champ">
            <select value={m.categorie} onChange={(e) => maj({ categorie: e.target.value as CategorieMail })}>
              {(Object.keys(CATEGORIES) as CategorieMail[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORIES[c]}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label className="v2-libelle">
          Priorité
          <span className="v2-champ">
            <select value={m.priorite} onChange={(e) => maj({ priorite: Number(e.target.value) as PrioriteMail })}>
              {([4, 3, 2, 1, 0] as PrioriteMail[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITES[p]}
                </option>
              ))}
            </select>
          </span>
        </label>
      </div>
      <label className="v2-libelle">
        Chantier
        <span className="v2-champ">
          <select value={m.chantier_id ?? ""} onChange={(e) => maj({ chantier_id: e.target.value || null })}>
            <option value="">Aucun chantier</option>
            {CHANTIERS_MAIL.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </span>
      </label>
      <div className="v2-libelle">
        <span>Pièces jointes</span>
        {m.pieces.length ? (
          <ul className="dal-ml-pieces">
            {m.pieces.map((p, i) => (
              <li key={`${p.nom}-${i}`}>
                <Paperclip width={14} height={14} aria-hidden="true" />
                <input aria-label="Nom de la pièce" value={p.nom} onChange={(e) => maj({ pieces: m.pieces.map((x, j) => (j === i ? { ...x, nom: e.target.value } : x)) })} />
                <span className="v2-aide">{taille(p.taille)}</span>
                <button type="button" className="v2-btn v2-btn--petit v2-btn--icone v2-btn--fantome" aria-label={`Retirer ${p.nom}`} onClick={() => maj({ pieces: m.pieces.filter((_, j) => j !== i) })}>
                  <X width={14} height={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <span className="v2-aide">Aucune pièce jointe.</span>
        )}
        <label className="v2-btn v2-btn--petit dal-ml-joindre">
          <Paperclip width={14} height={14} aria-hidden="true" /> Joindre des fichiers
          <input
            type="file"
            multiple
            className="v2-sr"
            onChange={(e) => {
              const f = Array.from(e.target.files ?? []);
              if (f.length) maj({ pieces: [...m.pieces, ...f.map((x) => ({ nom: x.name, taille: x.size }))] });
              e.target.value = "";
            }}
          />
        </label>
        <span className="v2-aide">Seuls le nom et la taille des fichiers sont gardés.</span>
      </div>
    </div>
  );
}
