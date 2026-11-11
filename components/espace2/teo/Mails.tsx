"use client";

/* ══════════════════════════════════════════════════════════════════════
   MON ESPACE — Mails (11/11/2026)

   La copie 1:1 des Mails de DALIRO (../daliro/Mails : la liste des fils
   de Plain, ../lin/ListeFils, et la carte au milieu, ../lin/CarteCentrale ;
   styles ../daliro/dal-mails.css). Seul le contenu change, c'est la boîte
   Gmail de Teo, branchée :
     · un fil par conversation de la boîte de réception (expéditeur,
       objet, aperçu, non lu, pièces jointes, répondu) ; les onglets Non
       lus · Lus · Tous les mails ; le menu Filtres (recherche, statut,
       avec pièces) ; le menu Affichage (liste, par statut ; tri) ;
     · le fil ouvert (?id=) au milieu : chaque message comme dans Gmail
       (avatar, nom, adresse, date, texte, pièces en vignettes), puis le
       composeur : « Envoyer » répond dans le fil par Gmail
       (app/espace2/teo/actions.ts → lib/teo/gmail.ts) ; « Marquer lu /
       non lu » agit sur la boîte.
   Les données : ./donnees (exemple, ou la boîte lue par
   app/espace2/teo/mails/page.tsx). Sans jeton, ou avec un jeton sans la
   portée Gmail, la page le dit en tête et explique quoi faire.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Copy, ExternalLink, File, FileText, Image as IconeImage, Info, Loader2, Mail as IconeMail, Paperclip, Reply, RotateCcw, Send } from "lucide-react";
import { relatif } from "@/components/espace/format";
import type { EtatGoogle, FilMail, MessageMailTeo, PieceMailTeo } from "@/lib/teo/types";
import { MenuActions, type Option } from "../lin/Lin";
import { CarteCentrale } from "../lin/CarteCentrale";
import { BoutonPlain, ChampPlain, IconeAffichage, IconeAnneau, IconeCoche, IconeFiltres, IconeHorloge, ListeFils, MenuPlain, OptionPlain, couleurDe, initialesDe, useAdresse, type Fil, type FiltrePose, type SectionFils } from "../lin/ListeFils";
import { Badge } from "../ui";
import { useToast } from "../Toasts";
import { RACINE } from "../modules";
import { marquerFilLu, ouvrirFilMail, repondreMail } from "@/app/espace2/teo/actions";
import { useTeo } from "./donnees";
import { MAILS_EXEMPLE } from "./exemples";
import "../daliro/dal-mails.css";

const CHEMIN = `${RACINE}/teo/mails`;
const sansAccents = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const taille = (o: number) => (o >= 1024 * 1024 ? `${(o / 1024 / 1024).toFixed(1).replace(".", ",")} Mo` : `${Math.max(1, Math.round(o / 1024))} Ko`);

export type ReelMails = { etat: EtatGoogle; detail: string | null; adresse: string | null; fils: FilMail[] };

type Statut = "nouveau" | "lu" | "repondu";
const statutDe = (f: FilMail): Statut => (f.non_lu ? "nouveau" : f.repondu ? "repondu" : "lu");
const STATUTS: { cle: Statut; libelle: string; sous: string; icone: React.ReactNode; teinte?: "bleu" | "orange" }[] = [
  { cle: "nouveau", libelle: "Non lus", sous: "arrivés, pas encore ouverts", icone: <IconeAnneau />, teinte: "bleu" },
  { cle: "lu", libelle: "Lus", sous: "lus, une suite reste à donner", icone: <IconeHorloge /> },
  { cle: "repondu", libelle: "Répondus", sous: "le dernier message est de vous", icone: <IconeCoche /> },
];
const LIB_STATUT: Record<Statut, string> = { nouveau: "Non lu", lu: "Lu", repondu: "Répondu" };
const infoStatut = (s: Statut) => STATUTS.find((x) => x.cle === s)!;
type Onglet = "nouveau" | "lu" | "tous";
const ONGLETS: { cle: Onglet; libelle: string; garde: (s: Statut) => boolean }[] = [
  { cle: "nouveau", libelle: "Non lus", garde: (s) => s === "nouveau" },
  { cle: "lu", libelle: "Lus", garde: (s) => s !== "nouveau" },
  { cle: "tous", libelle: "Tous les mails", garde: () => true },
];
type Tri = "recent" | "ancien" | "expediteur";
const TRIS: { cle: Tri; libelle: string }[] = [
  { cle: "recent", libelle: "Reçu, le plus récent d'abord" },
  { cle: "ancien", libelle: "Reçu, le plus ancien d'abord" },
  { cle: "expediteur", libelle: "Expéditeur" },
];
type Groupe = "liste" | "statut";

/* ——— un message du fil, dessiné comme dans Gmail (le dessin de ../daliro/ComposeurMail) ——— */
const genre = (nom: string): "image" | "pdf" | "autre" => (/\.(jpe?g|png|gif|webp|heic)$/i.test(nom) ? "image" : /\.pdf$/i.test(nom) ? "pdf" : "autre");
function quandGmail(iso: string): string {
  const x = new Date(iso);
  if (Number.isNaN(x.getTime())) return "";
  return `${x.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}, ${x.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}
function Vignette({ piece, i }: { piece: PieceMailTeo; i: number }) {
  const g = genre(piece.nom);
  return (
    <li className="dal-ml-piece" data-genre={g} title="La pièce se télécharge depuis Gmail.">
      <span className="dal-ml-piece-apercu" aria-hidden="true" data-teinte={i % 3}>
        {g === "image" ? <IconeImage width={22} height={22} /> : g === "pdf" ? <FileText width={26} height={26} /> : <File width={24} height={24} />}
      </span>
      <span className="dal-ml-piece-pied">
        <span className="dal-ml-piece-icone" aria-hidden="true">
          {g === "image" ? <IconeImage width={14} height={14} /> : g === "pdf" ? <FileText width={14} height={14} /> : <Paperclip width={14} height={14} />}
        </span>
        <span className="dal-ml-piece-nom">{piece.nom}</span>
        <span className="dal-ml-piece-taille">{taille(piece.taille)}</span>
      </span>
    </li>
  );
}
function Message({ m, moi }: { m: MessageMailTeo; moi: string | null }) {
  const nom = m.moi ? "Vous" : m.de_nom || m.de_adresse || "Expéditeur inconnu";
  const a = m.moi ? m.a : moi && m.a.toLowerCase().includes(moi) ? "moi" : m.a || "moi";
  return (
    <article className="dal-ml-msg" data-vous={m.moi || undefined}>
      <span className="dal-ml-msg-avatar" style={m.moi ? undefined : { background: couleurDe(m.de_adresse || nom) }} aria-hidden="true">
        {m.moi ? "V" : initialesDe(nom)}
      </span>
      <div className="dal-ml-msg-qui">
        <div className="dal-ml-msg-tete">
          <strong>{nom}</strong>
          {!m.moi && m.de_nom && m.de_adresse ? <span className="dal-ml-msg-adresse">&lt;{m.de_adresse}&gt;</span> : null}
          <time dateTime={m.quand}>{quandGmail(m.quand)}</time>
        </div>
        <button type="button" className="dal-ml-msg-a" title={`à ${m.a}${m.cc ? `, cc ${m.cc}` : ""}`}>
          à {a}
          <ChevronDown width={12} height={12} aria-hidden="true" />
        </button>
      </div>
      <div className="dal-ml-msg-corps">{m.texte.trim() || "Message sans texte."}</div>
      {m.pieces.length ? (
        <div className="dal-ml-msg-pieces">
          <div className="dal-ml-msg-pieces-titre">
            <Paperclip width={14} height={14} aria-hidden="true" />
            {pluriel(m.pieces.length, "pièce")} jointe{m.pieces.length > 1 ? "s" : ""}
          </div>
          <ul className="dal-ml-vignettes" aria-label="Pièces jointes">
            {m.pieces.map((p, i) => (
              <Vignette key={`${p.nom}-${i}`} piece={p} i={i} />
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

/* ——— le composeur : une réponse dans le fil ——— */
function Composeur({ fil, envoyer, enReel, possible }: { fil: FilMail; envoyer: (texte: string) => Promise<string | null>; enReel: boolean; possible: boolean }) {
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const partir = async () => {
    if (!texte.trim() || envoi) return;
    setEnvoi(true);
    setErreur(null);
    const e = await envoyer(texte.trim());
    setEnvoi(false);
    if (e) return setErreur(e);
    setTexte("");
  };
  return (
    <form
      className="teo-cmp"
      onSubmit={(e) => {
        e.preventDefault();
        void partir();
      }}
    >
      <div className="teo-cmp-tete">
        <Reply width={14} height={14} aria-hidden="true" />
        Répondre à {fil.de_nom || fil.de_adresse} · Re: {fil.objet}
      </div>
      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        placeholder="Votre réponse"
        aria-label="Votre réponse"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void partir();
        }}
      />
      <div className="teo-cmp-pied">
        <span className="teo-cmp-aide" data-teinte={erreur ? "rouge" : undefined}>
          {erreur ?? (!enReel ? "Exemple : la réponse reste ici, rien ne part." : possible ? "Part par Gmail, dans ce fil (⌘ + Entrée)." : "Gmail n'est pas branché : voir la note en tête de page.")}
        </span>
        <span className="teo-pousse" />
        <a className="teo-bouton" href={`mailto:${fil.de_adresse}?subject=${encodeURIComponent(`Re: ${fil.objet}`)}&body=${encodeURIComponent(texte)}`}>
          <ExternalLink width={14} height={14} aria-hidden="true" /> Ouvrir dans votre messagerie
        </a>
        <button type="submit" className="teo-bouton teo-bouton--plein" disabled={!texte.trim() || envoi || (enReel && !possible)}>
          {envoi ? <Loader2 width={14} height={14} className="animate-spin" aria-hidden="true" /> : <Send width={14} height={14} aria-hidden="true" />}
          Envoyer
        </button>
      </div>
    </form>
  );
}

export default function Mails({ reel }: { reel: ReelMails | null }) {
  const { reel: enReel } = useTeo();
  const routeur = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const adresse = useAdresse(CHEMIN, params);
  const etat: EtatGoogle = enReel && reel ? reel.etat : "ok";
  const moi = enReel && reel ? reel.adresse : "teo@example.com";
  const source = useMemo(() => (enReel && reel ? reel.fils : MAILS_EXEMPLE), [enReel, reel]);
  /* ce que cette visite change : fils lus, réponses parties, messages lus à l'ouverture */
  const [retouches, setRetouches] = useState<Record<string, Partial<FilMail>>>({});
  const retoucher = (id: string, r: Partial<FilMail>) => setRetouches((x) => ({ ...x, [id]: { ...(x[id] ?? {}), ...r } }));
  const base = useMemo(() => source.map((f) => ({ ...f, ...(retouches[f.id] ?? {}) })), [source, retouches]);
  const [recherche, setRecherche] = useState("");
  const [lecture, setLecture] = useState<string | null>(null);

  /* ——— l'adresse : onglet, statut, pièces, tri, regroupement, fil ouvert ——— */
  const onglet = (ONGLETS.find((o) => o.cle === params.get("onglet"))?.cle ?? "nouveau") as Onglet;
  const statut = (STATUTS.find((s) => s.cle === params.get("statut"))?.cle ?? null) as Statut | null;
  const avecPieces = params.get("pieces") === "1";
  const tri = (TRIS.find((t) => t.cle === params.get("tri"))?.cle ?? "recent") as Tri;
  const groupe: Groupe = params.get("grouper") === "statut" ? "statut" : "liste";
  const id = params.get("id");
  const aller = (href: string) => routeur.replace(href, { scroll: false });
  const lienId = (x: string | null) => adresse((p) => (x !== null ? p.set("id", x) : p.delete("id")));

  const q = sansAccents(recherche.trim());
  const correspond = (f: FilMail) => !q || [f.de_nom, f.de_adresse, f.objet, f.apercu, ...f.pieces.map((p) => p.nom)].some((x) => x && sansAccents(x).includes(q));
  const garde = ONGLETS.find((o) => o.cle === onglet)!.garde;
  const visibles = base.filter((f) => garde(statutDe(f)) && (!statut || statutDe(f) === statut) && (!avecPieces || f.pieces.length > 0) && correspond(f));
  const tries = [...visibles].sort((x, y) => (tri === "expediteur" ? (x.de_nom || x.de_adresse).localeCompare(y.de_nom || y.de_adresse, "fr") : tri === "ancien" ? x.recu_le.localeCompare(y.recu_le) : y.recu_le.localeCompare(x.recu_le)));
  const compteurs = useMemo(() => {
    const c: Record<Statut, number> = { nouveau: 0, lu: 0, repondu: 0 };
    for (const f of base) if (correspond(f)) c[statutDe(f)]++;
    return c;
  }, [base, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const maintenant = new Date();

  /* ——— le fil ouvert : ses messages se lisent à l'ouverture (Gmail), et il se marque lu ——— */
  const choisi = id !== null ? (base.find((f) => f.id === id) ?? null) : null;
  const rang = choisi ? tries.findIndex((f) => f.id === choisi.id) : -1;
  useEffect(() => {
    if (!choisi || !enReel) return;
    const f = choisi;
    let vivant = true;
    const t = window.setTimeout(() => {
      if (!f.messages) {
        setLecture(f.id);
        void ouvrirFilMail(f.id).then((r) => {
          if (!vivant) return;
          setLecture(null);
          if (r.fil?.messages) retoucher(f.id, { messages: r.fil.messages });
          else if (r.detail) toast(r.detail, "rouge");
        });
      }
      if (f.non_lu) {
        retoucher(f.id, { non_lu: false });
        void marquerFilLu(f.id, true);
      }
    }, 0);
    return () => {
      vivant = false;
      window.clearTimeout(t);
    };
  }, [choisi, enReel]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!choisi || enReel || !choisi.non_lu) return;
    const t = window.setTimeout(() => retoucher(choisi.id, { non_lu: false }), 400);
    return () => window.clearTimeout(t);
  }, [choisi, enReel]);

  /* ——— les gestes ——— */
  const copier = (texte: string, quoi: string) =>
    navigator.clipboard?.writeText(texte).then(
      () => toast(quoi, "vert"),
      () => toast("Impossible de copier. Réessayez.", "rouge"),
    );
  const marquer = async (f: FilMail, lu: boolean) => {
    retoucher(f.id, { non_lu: !lu });
    if (enReel) {
      const r = await marquerFilLu(f.id, lu);
      if (!r.ok) return toast(r.detail ?? "Gmail n'a pas répondu.", "rouge");
    }
    toast(lu ? "Marqué comme lu" : "Marqué comme non lu", "vert");
  };
  const repondre = async (f: FilMail, texte: string): Promise<string | null> => {
    const message: MessageMailTeo = { id: `local-${Date.now()}`, de_nom: "Vous", de_adresse: moi ?? "", a: f.de_adresse, cc: "", quand: new Date().toISOString(), texte, pieces: [], moi: true };
    if (enReel) {
      const r = await repondreMail(f.id, texte);
      if (!r.ok) return r.detail ?? "Gmail a refusé l'envoi.";
      toast(`Réponse envoyée à ${r.a ?? f.de_adresse}`, "vert");
    } else toast("Réponse ajoutée à l'exemple (rien n'est parti).");
    retoucher(f.id, { messages: [...(f.messages ?? []), message], repondu: true, non_lu: false, recu_le: message.quand, nb_messages: (f.nb_messages ?? 0) + 1 });
    return null;
  };

  /* ——— les lignes ——— */
  const fil = (f: FilMail): Fil => {
    const s = infoStatut(statutDe(f));
    const nom = f.de_nom || f.de_adresse || "Expéditeur inconnu";
    return {
      id: f.id,
      href: lienId(f.id),
      etat: s.icone,
      etatTeinte: s.teinte,
      avatar: { lettre: initialesDe(nom), couleur: couleurDe(f.de_adresse || nom), titre: nom },
      client: nom,
      contact: f.de_nom ? f.de_adresse : null,
      badge: f.important ? { texte: "Important", teinte: "orange" } : f.nb_messages > 1 ? { texte: pluriel(f.nb_messages, "message") } : null,
      ref: "",
      titre: f.objet,
      apercu: f.apercu || null,
      priorite: f.important ? 3 : 0,
      etiquettes: f.pieces.length ? (
        <>
          <Paperclip width={14} height={14} aria-hidden="true" />
          {pluriel(f.pieces.length, "pièce")}
        </>
      ) : null,
      heure: { texte: relatif(f.recu_le, maintenant), iso: f.recu_le, icone: "bulle" },
      qui: f.repondu ? { lettre: "V", icone: <Reply width={12} height={12} aria-hidden="true" />, titre: "Vous avez répondu" } : null,
    };
  };
  const description = moi ? `Boîte : ${moi}${enReel ? " · Gmail" : " · Données d'exemple"}` : "Gmail";
  const droite = moi ? (
    <button type="button" className="pf-lien" onClick={() => void copier(moi, "Adresse copiée")}>
      <Copy aria-hidden="true" /> Copier l&apos;adresse
    </button>
  ) : undefined;
  const sections: SectionFils[] =
    groupe === "statut"
      ? STATUTS.map((s) => ({ cle: s.cle, titre: s.libelle, icone: s.icone, description: s.sous, droite: s.cle === "nouveau" ? droite : undefined, fils: tries.filter((f) => statutDe(f) === s.cle).map(fil) }))
      : [{ cle: "tous", titre: "Boîte de réception", description, droite, fils: tries.map(fil) }];
  const filtresPoses: FiltrePose[] = [
    ...(statut ? [{ cle: "statut", libelle: infoStatut(statut).libelle, icone: infoStatut(statut).icone, href: adresse((p) => p.delete("statut")) }] : []),
    ...(avecPieces ? [{ cle: "pieces", libelle: "Avec pièces jointes", href: adresse((p) => p.delete("pieces")) }] : []),
    ...(recherche ? [{ cle: "q", libelle: `« ${recherche} »`, href: adresse(() => {}) }] : []),
  ];
  const note =
    enReel && reel && etat !== "ok" ? (
      <span className="teo-note" data-teinte={etat === "erreur" ? "rouge" : undefined} style={{ margin: 0 }}>
        <Info width={16} height={16} aria-hidden="true" />
        <span>
          {etat === "absent" ? (
            <>
              <b>Gmail n&apos;est pas branché.</b> Lancez <code>node outils/jeton-google.mjs</code> (il demande l&apos;agenda et la boîte), puis posez GOOGLE_OAUTH_* sur Vercel avec <code>outils/poser-variables-google.sh</code>.
            </>
          ) : etat === "portee" ? (
            <>
              <b>Le jeton Google ne porte que l&apos;agenda.</b> Relancez <code>node outils/jeton-google.mjs</code> : il demande maintenant la boîte Gmail ; puis reposez GOOGLE_OAUTH_REFRESH_TOKEN.
            </>
          ) : (
            <>
              <b>Gmail n&apos;a pas répondu.</b> {reel.detail}
            </>
          )}
        </span>
      </span>
    ) : undefined;

  return (
    <ListeFils
      titre="Mails"
      icone={<IconeMail width={18} height={18} aria-hidden="true" />}
      note={note}
      actions={
        <>
          <BoutonPlain icone={<RotateCcw />} onClick={() => routeur.refresh()}>
            Relire la boîte
          </BoutonPlain>
          <MenuPlain icone={<IconeFiltres />} libelle="Filtres" raccourci="F" n={filtresPoses.length || undefined}>
            {(fermer) => (
              <>
                <div className="pf-menu-groupe">
                  <input className="pf-menu-champ" autoFocus placeholder="Chercher un expéditeur, un objet, une pièce…" aria-label="Chercher un mail" value={recherche} onChange={(e) => setRecherche(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fermer()} />
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
                <div className="pf-menu-groupe" role="group" aria-label="Pièces jointes">
                  <p className="pf-menu-titre">Pièces jointes</p>
                  <OptionPlain
                    icone={<Paperclip width={16} height={16} aria-hidden="true" />}
                    n={base.filter((f) => f.pieces.length > 0).length}
                    actif={avecPieces}
                    onClick={() => {
                      fermer();
                      aller(adresse((p) => (avecPieces ? p.delete("pieces") : p.set("pieces", "1"))));
                    }}
                  >
                    Avec pièces jointes
                  </OptionPlain>
                </div>
              </>
            )}
          </MenuPlain>
          <MenuPlain icone={<IconeAffichage />} libelle="Affichage" raccourci="V" large>
            {() => (
              <div className="pf-menu-corps">
                <div className="pf-segment" role="group" aria-label="Regroupement">
                  <button type="button" aria-pressed={groupe === "liste"} onClick={() => aller(adresse((p) => p.delete("grouper")))}>
                    Liste
                  </button>
                  <button type="button" aria-pressed={groupe === "statut"} onClick={() => aller(adresse((p) => p.set("grouper", "statut")))}>
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
        icone: o.cle === "nouveau" ? <IconeAnneau /> : o.cle === "lu" ? <IconeHorloge /> : undefined,
        teinte: o.cle === "nouveau" ? "bleu" : undefined,
        n: o.cle === "tous" ? undefined : base.filter((f) => o.garde(statutDe(f))).length,
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
      vide={
        recherche || statut || avecPieces
          ? { titre: "Aucun mail ne correspond", texte: "Essayez un autre mot ou retirez le filtre." }
          : onglet === "nouveau"
            ? {
                titre: "Aucun mail non lu",
                texte: etat === "ok" ? "Les mails arrivés dans votre boîte apparaissent ici." : "Branchez Gmail pour voir votre boîte ici (note en tête de page).",
                geste: base.length ? (
                  <Link href={adresse((p) => p.set("onglet", "tous"))} replace className="pf-lien">
                    Voir tous les mails
                  </Link>
                ) : undefined,
              }
            : { titre: "Aucun mail", texte: etat === "ok" ? "La boîte de réception est vide." : "Branchez Gmail pour voir votre boîte ici (note en tête de page)." }
      }
    >
      <CarteCentrale
        ouverte={id !== null}
        fermer={() => aller(lienId(null))}
        classe="dal-ml-carte"
        libelle={choisi ? `Mail ${choisi.objet}` : "Mail introuvable"}
        sur={choisi?.repondu ? "MON ESPACE · Mail répondu" : "MON ESPACE · Mail reçu"}
        statut={choisi ? <>{LIB_STATUT[statutDe(choisi)]}</> : undefined}
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
        titre={choisi ? choisi.objet : "Mail introuvable"}
        actions={
          choisi ? (
            <>
              {choisi.non_lu ? (
                <button type="button" className="v2-btn v2-btn--fantome" onClick={() => void marquer(choisi, true)}>
                  <Check width={14} height={14} aria-hidden="true" /> Marquer comme lu
                </button>
              ) : (
                <button type="button" className="v2-btn v2-btn--fantome" onClick={() => void marquer(choisi, false)}>
                  <RotateCcw width={14} height={14} aria-hidden="true" /> Marquer non lu
                </button>
              )}
              <a className="v2-btn v2-btn--fantome" href={enReel ? `https://mail.google.com/mail/u/0/#inbox/${choisi.id}` : "https://mail.google.com/"} target="_blank" rel="noreferrer">
                <ExternalLink width={14} height={14} aria-hidden="true" /> Ouvrir dans Gmail
              </a>
              <span className="v2 pf-plus">
                <span className="lin">
                  <MenuActions
                    rond
                    titre="Plus d'actions"
                    options={
                      [
                        { cle: "exp", libelle: "Copier l'adresse de l'expéditeur", meta: choisi.de_adresse, icone: <Copy width={16} height={16} />, action: () => void copier(choisi.de_adresse, "Adresse copiée") },
                        { cle: "mailto", libelle: "Répondre depuis votre messagerie", icone: <Reply width={16} height={16} />, href: `mailto:${choisi.de_adresse}?subject=${encodeURIComponent(`Re: ${choisi.objet}`)}` },
                        { cle: "copier", libelle: "Copier le mail", icone: <Copy width={16} height={16} />, action: () => void copier(`De : ${choisi.de_nom} <${choisi.de_adresse}>\nObjet : ${choisi.objet}\n\n${(choisi.messages ?? []).map((m) => m.texte).join("\n\n———\n\n") || choisi.apercu}`, "Mail copié") },
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
            <div className="dal-ml-meta" aria-label="Le mail en bref">
              {choisi.important ? <Badge teinte="ambre">Important</Badge> : null}
              <Badge teinte={choisi.non_lu ? "bleu" : "gris"} title={infoStatut(statutDe(choisi)).sous}>
                {LIB_STATUT[statutDe(choisi)]}
              </Badge>
              <Badge>{pluriel(choisi.nb_messages, "message")}</Badge>
              {choisi.pieces.length ? <Badge>{pluriel(choisi.pieces.length, "pièce jointe")}</Badge> : null}
            </div>
            <div className="dal-ml-fil">
              {choisi.messages ? (
                choisi.messages.map((m) => <Message key={m.id} m={m} moi={moi} />)
              ) : lecture === choisi.id ? (
                <p className="v2-det-vide">
                  <Loader2 width={14} height={14} className="animate-spin" aria-hidden="true" /> Lecture du fil dans Gmail…
                </p>
              ) : (
                <Message m={{ id: "apercu", de_nom: choisi.de_nom, de_adresse: choisi.de_adresse, a: moi ?? "", cc: "", quand: choisi.recu_le, texte: choisi.apercu, pieces: choisi.pieces, moi: false }} moi={moi} />
              )}
            </div>
            <Composeur key={choisi.id} fil={choisi} envoyer={(t) => repondre(choisi, t)} enReel={enReel} possible={etat === "ok"} />
          </>
        ) : (
          <p className="v2-det-vide">Le mail que désigne ce lien n&apos;est pas (ou plus) dans la boîte affichée.</p>
        )}
      </CarteCentrale>
    </ListeFils>
  );
}
