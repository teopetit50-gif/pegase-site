"use client";

/* ══════════════════════════════════════════════════════════════════════
   MON ESPACE — WhatsApp (11/11/2026)

   La copie 1:1 des Appels de DALIRO (../daliro/Appels : l'Inbox de Linear,
   la liste à gauche, la page du ticket à droite ; styles ../daliro/
   dal-inbox.css, préfixe dal-ap-, et dal-ticket.css, préfixe dal-tk-).
   Seul le contenu change, ce sont les conversations WhatsApp de Teo :
     · une ligne par conversation, comme une notification de Linear :
       pastille « non lu » = un message attend, l'avatar aux initiales,
       le nom, le dernier message, l'âge ; filtres Toutes · Non lues ·
       Sans réponse ;
     · à droite, la page du ticket : le nom en titre, les propriétés
       (numéro, messages, dernier), le fil en bulles (./teo.css, préfixe
       teo-wa-), et le composeur : « Envoyer » part par l'API WhatsApp
       Business (app/espace2/teo/actions.ts) ; en exemple, le message
       s'ajoute en mémoire ;
     · « Rappeler » (tel:), « Ouvrir dans WhatsApp » (wa.me), la fiche du
       client quand son numéro est dans vos clients.
   Les données : ./donnees (exemple, ou omega_whatsapp_messages lue par
   app/espace2/teo/whatsapp/page.tsx). Sans table ni variables, la page le
   dit en tête (lib/teo/whatsapp.ts, docs/espace-teo/README.md).
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, CheckCheck, Info, Loader2, Send } from "lucide-react";
import { dateHeure, relatif } from "@/components/espace/format";
import type { ClientTeo, ConversationWa, EtatWhatsApp, MessageWa } from "@/lib/teo/types";
import { RACINE } from "../modules";
import { copierEtDire, useToast } from "../Toasts";
import { DalCarte, DalMenu, type OptionMenu } from "../daliro/DalCadre";
import { DalIcone, type NomDalIcone } from "../daliro/DalIcone";
import { envoyerWhatsApp, marquerWhatsAppLu } from "@/app/espace2/teo/actions";
import { useTeo } from "./donnees";
import { CLIENTS_EXEMPLE, WHATSAPP_EXEMPLE } from "./exemples";
import { initiales, jourLocal, lienWa, telephoneLisible } from "./navigateur";
import "../daliro/dal-inbox.css";
import "../daliro/dal-ticket.css";

const BASE = `${RACINE}/teo`;
const CHEMIN = `${BASE}/whatsapp`;

export type ReelWhatsApp = { etat: EtatWhatsApp; detail: string | null; conversations: ConversationWa[]; clients: ClientTeo[] };

const FILTRES = ["toutes", "non-lues", "sans-reponse"] as const;
type Filtre = (typeof FILTRES)[number];
const LIB_FILTRE: Record<Filtre, string> = { toutes: "Toutes les conversations", "non-lues": "Non lues", "sans-reponse": "Sans réponse" };
const COULEURS = ["#25d366", "#128c7e", "#34b7f1", "#075e54", "#7b61ff", "#ff7a59", "#d6336c", "#0ea5e9"];
const couleurDe = (numero: string) => COULEURS[[...numero].reduce((t, c) => t + c.charCodeAt(0), 0) % COULEURS.length];
const TYPE_TEXTE: Record<MessageWa["type"], string> = { texte: "", image: "📷 Photo", audio: "🎤 Vocal", video: "🎥 Vidéo", document: "📄 Document", autre: "Message" };
const texteDe = (m: MessageWa) => m.texte.trim() || TYPE_TEXTE[m.type] || "Message";
const nonLus = (c: ConversationWa) => c.messages.filter((m) => m.sens === "recu" && !m.lu).length;
const dernier = (c: ConversationWa) => c.messages[c.messages.length - 1];
const sansReponse = (c: ConversationWa) => dernier(c)?.sens === "recu";

/* l'âge court de Linear */
function age(iso: string, maintenant: number): string {
  const s = Math.max(0, (maintenant - Date.parse(iso)) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} j`;
}
const jourLisible = (iso: string, auj: string) => {
  const j = jourLocal(iso);
  if (j === auj) return "aujourd'hui";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
};
const heure = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

function Accuse({ statut }: { statut: MessageWa["statut"] }) {
  if (!statut) return null;
  return statut === "envoye" ? <Check width={12} height={12} aria-label="envoyé" /> : statut === "echec" ? <Info width={12} height={12} aria-label="échec" /> : <CheckCheck width={12} height={12} aria-label={statut === "lu" ? "lu" : "remis"} />;
}

function Pilule({ icone, children, href, vide }: { icone?: NomDalIcone; children: React.ReactNode; href?: string; vide?: boolean }) {
  const contenu = (
    <>
      {icone ? <DalIcone nom={icone} taille={16} /> : null}
      <span>{children}</span>
    </>
  );
  return href ? (
    <Link href={href} className="dal-tk-pilule">
      {contenu}
    </Link>
  ) : (
    <span className="dal-tk-pilule" data-vide={vide || undefined}>
      {contenu}
    </span>
  );
}

const texteConversation = (c: ConversationWa) => [`${c.nom} (+${c.numero})`, "", ...c.messages.map((m) => `[${dateHeure(m.quand)}] ${m.sens === "envoye" ? "Moi" : c.nom} : ${texteDe(m)}`)].join("\n");

/* ——— la page d'une conversation : Linear, page d'un ticket ——— */
function FicheConversation({ c, client, retour, envoyer, enReel, envoiPossible }: { c: ConversationWa; client: ClientTeo | null; retour: { libelle: string; href: string }; envoyer: (texte: string) => Promise<string | null>; enReel: boolean; envoiPossible: boolean }) {
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const fil = useRef<HTMLDivElement>(null);
  const auj = useMemo(() => jourLocal(new Date().toISOString()), []);
  useEffect(() => {
    fil.current?.scrollIntoView({ block: "end" });
  }, [c.numero, c.messages.length]);
  const partir = async () => {
    if (!texte.trim() || envoi) return;
    setEnvoi(true);
    setErreur(null);
    const e = await envoyer(texte.trim());
    setEnvoi(false);
    if (e) return setErreur(e);
    setTexte("");
  };
  const d = dernier(c);
  const recus = c.messages.filter((m) => m.sens === "recu").length;
  const envoyes = c.messages.length - recus;
  const lien = `${CHEMIN}?numero=${encodeURIComponent(c.numero)}`;
  const jours: { jour: string; messages: MessageWa[] }[] = [];
  for (const m of c.messages) {
    const j = jourLocal(m.quand);
    const g = jours[jours.length - 1];
    if (g && g.jour === j) g.messages.push(m);
    else jours.push({ jour: j, messages: [m] });
  }
  return (
    <div className="dal-tk" data-volet="">
      <header className="dal-tk-tete">
        <nav className="dal-tk-fil" aria-label="Fil d'Ariane">
          <Link href={retour.href} className="dal-tk-fil-lien">
            {retour.libelle}
          </Link>
          <span className="dal-tk-fil-sep" aria-hidden="true">
            ›
          </span>
          <Link href={lien} className="dal-tk-fil-ticket">
            <h2>
              <span className="dal-tk-fil-id">+{c.numero.slice(0, 3)}</span>
              {c.nom}
            </h2>
          </Link>
        </nav>
        <DalMenu
          libelle="Actions sur la conversation"
          options={[
            { libelle: "Copier la conversation", icone: "Page", action: () => copierEtDire(texteConversation(c), "Conversation copiée.") },
            { libelle: "Copier le numéro", icone: "Phone", action: () => copierEtDire(`+${c.numero}`, "Numéro copié.") },
            ...(client ? (["sep", { libelle: `Ouvrir la fiche de ${client.nom}`, icone: "Users", href: `${BASE}/clients?client=${encodeURIComponent(client.id)}` }] as OptionMenu[]) : []),
          ]}
        />
        <span className="dal-pousse" />
        <div className="dal-tk-actions">
          <a className="dal-tk-action" href={`tel:+${c.numero}`}>
            <DalIcone nom="Phone" taille={14} />
            <span>Rappeler</span>
          </a>
          <a className="dal-tk-action" href={lienWa(c.numero)} target="_blank" rel="noreferrer">
            <DalIcone nom="Chat" taille={14} />
            <span>Ouvrir dans WhatsApp</span>
          </a>
          {client ? (
            <Link className="dal-tk-action" href={`${BASE}/clients?client=${encodeURIComponent(client.id)}`}>
              <DalIcone nom="Users" taille={14} />
              <span>Le client</span>
            </Link>
          ) : null}
        </div>
      </header>

      <div className="dal-tk-defile">
        <div className="dal-tk-outils">
          <button type="button" className="dal-rond dal-rond--plein" aria-label="Copier le lien de la conversation" title="Copier le lien de la conversation" onClick={() => copierEtDire(`${window.location.origin}${lien}`, "Lien copié.")}>
            <DalIcone nom="LienUrl" />
          </button>
          <button type="button" className="dal-rond dal-rond--plein" aria-label="Copier la conversation" title="Copier la conversation" onClick={() => copierEtDire(texteConversation(c), "Conversation copiée.")}>
            <DalIcone nom="Page" />
          </button>
        </div>
        <div className="dal-tk-corps">
          <div className="dal-tk-principal">
            <h1 className="dal-tk-titre">{c.nom}</h1>
            <div className="dal-tk-replis">
              <Pilule icone="Phone">+{telephoneLisible(c.numero).replace(/^\+/, "")}</Pilule>
              <Pilule icone="Chat">{`${c.messages.length} message${c.messages.length > 1 ? "s" : ""}`}</Pilule>
              {client ? (
                <Pilule icone="Users" href={`${BASE}/clients?client=${encodeURIComponent(client.id)}`}>
                  {client.entreprise ?? client.nom}
                </Pilule>
              ) : null}
            </div>

            <div className="dal-tk-description">
              <div className="teo-wa-fil" ref={fil} aria-label="Messages">
                {jours.map((g) => (
                  <div key={g.jour} style={{ display: "contents" }}>
                    <span className="teo-wa-jour">{jourLisible(g.messages[0].quand, auj)}</span>
                    {g.messages.map((m) => (
                      <div key={m.id} className="teo-wa-bulle" data-sens={m.sens} data-type={m.type}>
                        {texteDe(m)}
                        <span className="teo-wa-heure" data-statut={m.statut ?? undefined}>
                          {heure(m.quand)}
                          {m.sens === "envoye" ? <Accuse statut={m.statut} /> : null}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <form
              className="teo-cmp"
              onSubmit={(e) => {
                e.preventDefault();
                void partir();
              }}
            >
              <div className="teo-cmp-tete">
                <DalIcone nom="Chat" taille={14} />
                Répondre à {c.nom}
              </div>
              <textarea
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                placeholder="Votre message"
                aria-label="Votre message"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void partir();
                }}
              />
              <div className="teo-cmp-pied">
                <span className={`teo-cmp-aide${erreur ? "" : ""}`} data-teinte={erreur ? "rouge" : undefined}>
                  {erreur ?? (!enReel ? "Exemple : le message reste ici, rien ne part." : envoiPossible ? "Part par l'API WhatsApp Business (⌘ + Entrée)." : "L'envoi n'est pas branché : WHATSAPP_TOKEN et WHATSAPP_PHONE_ID (docs/espace-teo/README.md).")}
                </span>
                <span className="teo-pousse" />
                <a className="teo-bouton" href={lienWa(c.numero, texte)} target="_blank" rel="noreferrer">
                  Ouvrir dans WhatsApp
                </a>
                <button type="submit" className="teo-bouton teo-bouton--plein" disabled={!texte.trim() || envoi || (enReel && !envoiPossible)}>
                  {envoi ? <Loader2 width={14} height={14} className="animate-spin" aria-hidden="true" /> : <Send width={14} height={14} aria-hidden="true" />}
                  Envoyer
                </button>
              </div>
            </form>

            <hr className="dal-tk-filet" />
            <div className="dal-tk-activite-tete">
              <h3>Activité</h3>
            </div>
            <ul className="dal-tk-evenements">
              {d ? (
                <li className="dal-tk-evenement">
                  <DalIcone nom={d.sens === "recu" ? "Chat" : "Send"} taille={14} />
                  <span className="dal-tk-qui">{d.sens === "recu" ? c.nom : "Vous"}</span>
                  <span>{d.sens === "recu" ? "a écrit" : "avez répondu"}</span>
                  <span aria-hidden="true">·</span>
                  <span title={dateHeure(d.quand)}>{relatif(d.quand)}</span>
                </li>
              ) : null}
              <li className="dal-tk-evenement">
                <DalIcone nom="Created" taille={14} />
                <span className="dal-tk-qui">{c.nom}</span>
                <span>première conversation</span>
                <span aria-hidden="true">·</span>
                <span title={dateHeure(c.messages[0].quand)}>{relatif(c.messages[0].quand)}</span>
              </li>
            </ul>
          </div>
          <aside className="dal-tk-proprietes" aria-label="Propriétés de la conversation">
            <h3 className="dal-tk-prop-titre">Propriétés</h3>
            <div className="dal-tk-prop-liste">
              <Pilule icone={nonLus(c) ? "IssueStatusTriage" : sansReponse(c) ? "IssueStatusStarted" : "IssueStatusDone"}>{nonLus(c) ? `${nonLus(c)} non lu${nonLus(c) > 1 ? "s" : ""}` : sansReponse(c) ? "À répondre" : "Répondu"}</Pilule>
              <Pilule icone="Chat">{`${recus} reçu${recus > 1 ? "s" : ""} · ${envoyes} envoyé${envoyes > 1 ? "s" : ""}`}</Pilule>
              {d ? <Pilule icone="Clock">{dateHeure(d.quand)}</Pilule> : null}
            </div>
            <h3 className="dal-tk-prop-titre">Contact</h3>
            <div className="dal-tk-prop-liste">
              <Pilule icone="Users">{c.nom}</Pilule>
              <Pilule icone="Phone">{`+${c.numero}`}</Pilule>
              {client ? <Pilule icone="Briefcase">{[client.entreprise, client.etape].filter(Boolean).join(" · ")}</Pilule> : <Pilule icone="Briefcase" vide>Pas dans vos clients</Pilule>}
            </div>
            <h3 className="dal-tk-prop-titre">Étiquettes</h3>
            <div className="dal-tk-prop-etiquettes">
              <span className="dal-tk-etiquette">
                <span className="dal-tk-pastille" style={{ background: "#25d366" }} />
                WhatsApp
              </span>
              {client ? (
                <span className="dal-tk-etiquette">
                  <span className="dal-tk-pastille" style={{ background: client.type === "Client" ? "lch(60.135 63.97 86.502)" : "#6d78d5" }} />
                  {client.type}
                </span>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ——— la page : Linear, Inbox ——— */
export default function WhatsApp({ reel }: { reel: ReelWhatsApp | null }) {
  const { reel: enReel } = useTeo();
  const params = useSearchParams();
  const routeur = useRouter();
  const toast = useToast();
  const brut = params.get("filtre");
  const filtre: Filtre = (FILTRES as readonly string[]).includes(brut ?? "") ? (brut as Filtre) : "toutes";
  const choix = params.get("numero");
  const [maintenant] = useState(() => Date.now());
  const liste = useRef<HTMLUListElement>(null);

  /* les conversations affichées : l'exemple ou la base, et ce que cette visite y a ajouté */
  const source = useMemo(() => (enReel && reel ? reel.conversations : WHATSAPP_EXEMPLE), [enReel, reel]);
  const clients = enReel && reel ? reel.clients : CLIENTS_EXEMPLE;
  const [locales, setLocales] = useState<Record<string, MessageWa[]>>({});
  const [lus, setLus] = useState<Set<string>>(() => new Set());
  const conversations = useMemo(
    () =>
      source
        .map((c) => ({ ...c, messages: [...c.messages.map((m) => (lus.has(c.numero) && m.sens === "recu" ? { ...m, lu: true } : m)), ...(locales[c.numero] ?? [])] }))
        .sort((x, y) => (dernier(y)?.quand ?? "").localeCompare(dernier(x)?.quand ?? "")),
    [source, locales, lus],
  );
  const visibles = useMemo(() => conversations.filter((c) => (filtre === "non-lues" ? nonLus(c) > 0 : filtre === "sans-reponse" ? sansReponse(c) : true)), [conversations, filtre]);
  const ouverte = conversations.find((c) => c.numero === choix) ?? null;
  const clientDe = (c: ConversationWa) => clients.find((x) => x.telephone && x.telephone.replace(/[^\d]/g, "").endsWith(c.numero.slice(-9))) ?? null;

  const adresse = useCallback((f: Filtre, numero: string | null) => {
    const q = new URLSearchParams();
    if (f !== "toutes") q.set("filtre", f);
    if (numero) q.set("numero", numero);
    const s = q.toString();
    return `${CHEMIN}${s ? `?${s}` : ""}`;
  }, []);
  const ouvrir = useCallback((c: ConversationWa | null) => routeur.replace(adresse(filtre, c?.numero ?? null), { scroll: false }), [routeur, adresse, filtre]);

  /* une conversation ouverte se marque lue (en base réelle : omega_whatsapp_messages) */
  useEffect(() => {
    if (!ouverte || !nonLus(ouverte) || lus.has(ouverte.numero)) return;
    const numero = ouverte.numero;
    const t = window.setTimeout(() => {
      setLus((s) => new Set(s).add(numero));
      if (enReel) void marquerWhatsAppLu(numero);
    }, 400);
    return () => window.clearTimeout(t);
  }, [ouverte, lus, enReel]);

  /* ↑ ↓ et Échap, comme les Appels */
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (cible && (cible.closest("input, textarea, select, [role=dialog], [role=menu]") || cible.isContentEditable)) return;
      if (e.key === "Escape" && ouverte) {
        ouvrir(null);
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const i = ouverte ? visibles.findIndex((c) => c.numero === ouverte.numero) : -1;
      const j = e.key === "ArrowDown" ? Math.min(visibles.length - 1, i + 1) : Math.max(0, i - 1);
      const c = visibles[j];
      if (c) {
        ouvrir(c);
        liste.current?.querySelector<HTMLElement>(`[data-appel="${c.numero}"]`)?.scrollIntoView({ block: "nearest" });
      }
    };
    document.addEventListener("keydown", touche);
    return () => document.removeEventListener("keydown", touche);
  }, [ouverte, visibles, ouvrir]);

  const envoyer = async (c: ConversationWa, texte: string): Promise<string | null> => {
    if (!enReel) {
      setLocales((l) => ({ ...l, [c.numero]: [...(l[c.numero] ?? []), { id: `local-${Date.now()}`, sens: "envoye", type: "texte", texte, quand: new Date().toISOString(), lu: true, statut: "envoye" }] }));
      toast("Message ajouté à l'exemple (rien n'est parti).");
      return null;
    }
    const r = await envoyerWhatsApp(c.numero, texte);
    if (!r.message) return r.detail ?? "WhatsApp n'a pas répondu.";
    setLocales((l) => ({ ...l, [c.numero]: [...(l[c.numero] ?? []), r.message!] }));
    toast(r.detail ?? `Envoyé à ${c.nom}`, r.detail ? "neutre" : "vert");
    return null;
  };

  const totalNonLus = conversations.reduce((n, c) => n + nonLus(c), 0);
  const aRepondre = conversations.filter(sansReponse).length;
  const optionsFiltre: OptionMenu[] = FILTRES.map((f) => ({
    libelle: `${LIB_FILTRE[f]} · ${f === "toutes" ? conversations.length : f === "non-lues" ? conversations.filter((c) => nonLus(c) > 0).length : aRepondre}`,
    icone: (filtre === f ? "IssueStatusDone" : f === "non-lues" ? "Notified" : f === "sans-reponse" ? "IssueStatusTriage" : "Inbox") as NomDalIcone,
    href: adresse(f, null),
  }));
  const etat = enReel && reel ? reel.etat : "ok";
  const note =
    enReel && reel && etat !== "ok" ? (
      <p className="teo-note" data-teinte={etat === "erreur" ? "rouge" : undefined} role="status">
        <Info width={16} height={16} aria-hidden="true" />
        <span>
          {etat === "sans_table" ? (
            <>
              <b>WhatsApp n&apos;est pas encore branché.</b> Appliquez <code>docs/espace-teo/schema-whatsapp.sql</code> dans Supabase, posez les variables WHATSAPP_* sur Vercel et déclarez le webhook <code>/api/teo/whatsapp</code> chez Meta (docs/espace-teo/README.md). Vos conversations arriveront ici.
            </>
          ) : etat === "absent" ? (
            <>
              <b>Lecture seule.</b> Les messages reçus arrivent par le webhook ; pour répondre d&apos;ici, posez WHATSAPP_TOKEN et WHATSAPP_PHONE_ID sur Vercel. En attendant, « Ouvrir dans WhatsApp » envoie depuis votre téléphone.
            </>
          ) : (
            <>
              <b>La base n&apos;a pas répondu.</b> {reel.detail}
            </>
          )}
        </span>
      </p>
    ) : null;

  return (
    <DalCarte className="teo-wa">
      <h1 className="v2-sr">WhatsApp</h1>
      <div className="dal-ap" data-ouvert={ouverte ? "" : undefined}>
        <section className="dal-ap-liste" aria-label="Conversations" data-ouvert={ouverte ? "" : undefined}>
          <header className="dal-ap-tete">
            <h2 className="dal-ap-titre">{filtre === "toutes" ? "WhatsApp" : LIB_FILTRE[filtre]}</h2>
            <DalMenu
              libelle="Actions sur les conversations"
              options={[
                { libelle: "Copier les conversations sans réponse", icone: "Page", action: () => copierEtDire(conversations.filter(sansReponse).map(texteConversation).join("\n\n———\n\n"), "Conversations copiées.") },
                "sep",
                { libelle: "Vue d'ensemble", icone: "Home", href: BASE },
                { libelle: "Clients", icone: "Users", href: `${BASE}/clients` },
              ]}
            />
            <span className="dal-pousse" />
            <DalMenu libelle="Filtrer les conversations" icone="Filtre" alignement="droite" options={optionsFiltre} actif={filtre !== "toutes"} />
          </header>
          <div className="dal-ap-defile">
            {note}
            <p className="dal-ap-avis">
              {conversations.length} conversation{conversations.length > 1 ? "s" : ""} · {totalNonLus} message{totalNonLus > 1 ? "s" : ""} non lu{totalNonLus > 1 ? "s" : ""} · {aRepondre} sans réponse.
            </p>
            {visibles.length === 0 ? (
              <p className="dal-ap-avis">{conversations.length ? "Aucune conversation dans cette vue." : "Aucune conversation : elles arriveront avec le premier message reçu."}</p>
            ) : (
              <ul ref={liste} className="dal-ap-lignes">
                {visibles.map((c) => {
                  const d = dernier(c);
                  const n = nonLus(c);
                  const client = clientDe(c);
                  return (
                    <li key={c.numero}>
                      <Link href={adresse(filtre, c.numero)} replace scroll={false} data-appel={c.numero} className="dal-ap-ligne" data-lu={n === 0 && !sansReponse(c) ? "" : undefined} aria-current={ouverte?.numero === c.numero ? "true" : undefined}>
                        <span className="dal-ap-avatar teo-wa-avatar" aria-hidden="true" style={{ ["--teo-avatar" as string]: couleurDe(c.numero) }}>
                          {initiales(c.nom)}
                        </span>
                        <span className="dal-ap-texte">
                          <span className="dal-ap-l1">
                            {n ? <span className="dal-ap-point" aria-label="non lu" /> : null}
                            <span className="dal-ap-id">{n ? `${n} nouveau${n > 1 ? "x" : ""}` : ""}</span>
                            <span className="dal-ap-sujet">{c.nom}</span>
                            <span className="dal-ap-statut" data-etat={n ? "tri" : sansReponse(c) ? "cours" : "fait"}>
                              <DalIcone nom={n ? "IssueStatusTriage" : sansReponse(c) ? "IssueStatusStarted" : "IssueStatusDone"} taille={14} />
                            </span>
                          </span>
                          <span className="dal-ap-l2">
                            <span className="dal-ap-sous">{[d ? `${d.sens === "envoye" ? "Vous : " : ""}${texteDe(d)}` : "", client?.entreprise ?? null].filter(Boolean).join(" · ")}</span>
                            {sansReponse(c) && n ? (
                              <span className="dal-ap-priorite" aria-label="à répondre">
                                <DalIcone nom="Priority2" taille={14} />
                              </span>
                            ) : null}
                            <span className="dal-ap-age">{d ? age(d.quand, maintenant) : ""}</span>
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
        <section className="dal-ap-droite" aria-label="Conversation ouverte">
          {ouverte ? (
            <FicheConversation key={ouverte.numero} c={ouverte} client={clientDe(ouverte)} retour={{ libelle: filtre === "toutes" ? "WhatsApp" : LIB_FILTRE[filtre], href: adresse(filtre, null) }} envoyer={(t) => envoyer(ouverte, t)} enReel={enReel} envoiPossible={!enReel || etat === "ok"} />
          ) : (
            <div className="dal-ap-vide">
              <DalIcone nom="Chat" taille={96} className="dal-ap-illustration" />
              <p>
                {aRepondre} conversation{aRepondre > 1 ? "s" : ""} sans réponse
              </p>
            </div>
          )}
        </section>
      </div>
    </DalCarte>
  );
}
