"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le fil du chantier (06/10/2026, session B6, b6_24)

   Ce que le terrain envoie au numéro WhatsApp de l'entreprise (ou par
   courriel) : le texte, les photos, les vocaux, rangés à ce chantier par
   la base (chantier nommé, passage en cours de l'expéditeur) ou à la main.
   Un travail supplémentaire vu sur place devient un avenant brouillon
   dont le message est l'origine. Les médias sont servis par une URL
   signée de dix minutes (app/espace/daliro/actions.ts). La lecture du
   contenu (transcription, description) viendra du lecteur.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState } from "react";
import { FileSignature, Mic } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { ilYa } from "../exemples/socle";
import type { Source } from "../source";
import { dateHeure } from "../format";
import { Avis, Pastille } from "../ui";
import { urlSigneeMedia } from "@/app/espace/daliro/actions";
import { avenantDepuisMessage, chargerFil, ecarterMessage } from "./portes";
import type { MessageChantier, PieceMessage, Tableau } from "./types";

const RANGEMENTS: Record<NonNullable<MessageChantier["rangement"]>, string> = {
  nom: "chantier nommé dans le message",
  passage: "passage en cours de l'expéditeur",
  passage_proche: "passage de l'expéditeur à quelques jours",
  manuel: "rangé à la main",
};

/* L'exemple : une photo dessinée (rien n'est lu dans un vrai bucket) et un vocal sans fichier. */
const PHOTO_EXEMPLE = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" fill="#e9e6df"/><rect x="40" y="50" width="110" height="120" fill="#c9c3b6"/><rect x="58" y="68" width="74" height="84" fill="#9fb4c7"/><rect x="180" y="40" width="100" height="130" fill="#d8d2c4"/><text x="160" y="190" font-family="sans-serif" font-size="12" text-anchor="middle" fill="#555">Photo d\'exemple</text></svg>')}`;

function exemple(tableau: Tableau): MessageChantier[] {
  const base = { chantier_id: tableau.chantier.id, de_adresse: null, intervenant_id: null, tiers_id: null, avenant_id: null, statut: "range" as const };
  return [
    { ...base, id: "00000000-0000-4000-8000-00000000f001", reception_id: 1, canal: "whatsapp", de_nom: "Karim Haddad", rangement: "passage", recu_le: ilYa(0, 10),
      texte: "Le client demande une prise de plus dans le garage, à côté de l'établi.",
      pieces: [{ nom: "image.jpg", mime: "image/jpeg", taille: 84000, chemin: "exemple/photo", vocal: false }] },
    { ...base, id: "00000000-0000-4000-8000-00000000f002", reception_id: 2, canal: "whatsapp", de_nom: "Lucas Morel", rangement: "nom", recu_le: ilYa(1, 16),
      texte: null, pieces: [{ nom: "vocal.ogg", mime: "audio/ogg", taille: 21000, chemin: "exemple/vocal", vocal: true }] },
  ];
}

function Media({ piece, source, auteur, recu }: { piece: PieceMessage; source: Source; auteur: string; recu: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const image = (piece.mime ?? "").startsWith("image/");
  const audio = (piece.mime ?? "").startsWith("audio/");

  useEffect(() => {
    if (source !== "reelle") return;
    let vivant = true;
    void urlSigneeMedia(piece.chemin).then((r) => { if (!vivant) return; if ("url" in r) setUrl(r.url); else setErreur(r.erreur); });
    return () => { vivant = false; };
  }, [piece.chemin, source]);

  if (source !== "reelle") {
    return image
      // eslint-disable-next-line @next/next/no-img-element -- image d'exemple en data: URL
      ? <img src={PHOTO_EXEMPLE} alt={`Photo envoyée par ${auteur} (exemple)`} style={{ width: 160, height: 100, objectFit: "cover", borderRadius: 8, border: "1px solid #ddd" }} />
      : <span className="esp-kpi-sous"><Mic width={13} height={13} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> {piece.vocal ? "Vocal" : piece.nom} (exemple : pas de fichier)</span>;
  }
  if (erreur) return <span className="esp-kpi-sous">{piece.nom} : {erreur}</span>;
  if (!url) return <Loader variant="spin" />;
  if (image) {
    return (
      <a href={url} target="_blank" rel="noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element -- URL signée de Storage, dix minutes */}
        <img src={url} alt={`Photo envoyée par ${auteur} le ${recu}`} style={{ width: 160, height: 100, objectFit: "cover", borderRadius: 8, border: "1px solid #ddd" }} />
      </a>
    );
  }
  if (audio) return <audio controls preload="none" src={url} aria-label={`${piece.vocal ? "Vocal" : "Audio"} de ${auteur} le ${recu}`} style={{ maxWidth: "100%" }} />;
  return <a href={url} target="_blank" rel="noreferrer">{piece.nom}</a>;
}

type Props = { tableau: Tableau; source: Source; relire: () => Promise<void> };

export default function FilCarte({ tableau, source, relire }: Props) {
  const c = tableau.chantier;
  const [reel, setReel] = useState<MessageChantier[] | null>(null);
  const [local, setLocal] = useState<MessageChantier[]>(() => exemple(tableau));
  const [chargement, setChargement] = useState(source === "reelle");
  const [avenant, setAvenant] = useState<MessageChantier | null>(null);
  const [objet, setObjet] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const lire = useCallback(async () => {
    try {
      setReel(await chargerFil(c.id));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setChargement(false);
    }
  }, [c.id]);

  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void lire(), 0);
    return () => window.clearTimeout(t);
  }, [source, lire]);

  const messages = (source === "reelle" ? reel ?? [] : local).filter((m) => m.statut === "range");

  const agir = async (reelle: () => Promise<unknown>, locale: () => void, message: string) => {
    setEnvoi(true);
    setErreur(null);
    try {
      if (source === "reelle") { await reelle(); await lire(); await relire(); } else { locale(); }
      setFait(message);
      setAvenant(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'action.");
    } finally {
      setEnvoi(false);
    }
  };

  const ouvrirAvenant = (m: MessageChantier) => agir(
    () => avenantDepuisMessage(m.id, objet),
    () => {
      if (!objet.trim()) throw new Error("Dites ce qui est demandé en plus.");
      setLocal((l) => l.map((x) => (x.id === m.id ? { ...x, avenant_id: "00000000-0000-4000-8000-00000000f0aa" } : x)));
    },
    `Avenant ouvert en brouillon depuis le message de ${m.de_nom ?? "l'expéditeur"} : chiffrez-le, puis soumettez-le à la signature.`,
  );

  const ecarter = (m: MessageChantier) => agir(
    () => ecarterMessage(m.id, null),
    () => setLocal((l) => l.map((x) => (x.id === m.id ? { ...x, statut: "ecarte" } : x))),
    "Message écarté du fil.",
  );

  return (
    <section className="esp-carte" aria-label="Fil du chantier">
      <div className="esp-section-titre">Fil du chantier — photos, vocaux et messages du terrain{messages.length ? ` (${messages.length})` : ""}</div>
      {fait ? <div style={{ marginBottom: 10 }}><Avis teinte="vert" role="status">{fait}</Avis></div> : null}
      {erreur && !avenant ? <div style={{ marginBottom: 10 }}><Avis teinte="rouge" role="alert">{erreur}</Avis></div> : null}
      {chargement ? <Loader variant="spin" /> : messages.length ? (
        <ul className="esp-fil">
          {messages.map((m) => {
            const recu = dateHeure(m.recu_le);
            return (
              <li key={m.id}>
                <span className="esp-fil-point" />
                <div style={{ minWidth: 0 }}>
                  <div className="esp-fil-texte">
                    <strong>{m.de_nom ?? m.de_adresse ?? "Expéditeur inconnu"}</strong>{m.texte ? ` — ${m.texte}` : m.pieces.some((p) => p.vocal) ? " — un vocal" : ""}
                  </div>
                  {m.pieces.length ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "6px 0" }}>
                      {m.pieces.map((p) => <Media key={p.chemin} piece={p} source={source} auteur={m.de_nom ?? "l'expéditeur"} recu={recu} />)}
                    </div>
                  ) : null}
                  <div className="esp-fil-meta">
                    {recu} · {m.canal === "whatsapp" ? "WhatsApp" : m.canal === "sms" ? "SMS" : "courriel"}{m.rangement ? ` · ${RANGEMENTS[m.rangement]}` : ""}
                    {m.avenant_id ? <> · <Pastille teinte="bleu" contour>Avenant ouvert</Pastille></> : null}
                  </div>
                  <div className="esp-actions" style={{ marginTop: 4 }}>
                    {!m.avenant_id ? <button type="button" className="esp-lien-bouton" disabled={envoi} onClick={() => { setErreur(null); setObjet(m.texte ?? ""); setAvenant(m); }}>Ouvrir un avenant</button> : null}
                    <button type="button" className="esp-lien-bouton" disabled={envoi} onClick={() => void ecarter(m)}>Écarter</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : <p className="esp-kpi-sous">Rien encore : les photos, vocaux et messages que le chef d&apos;équipe envoie au numéro WhatsApp de l&apos;entreprise s&apos;affichent ici, rangés à leur chantier.</p>}

      <Dialog open={!!avenant} onOpenChange={(o) => !o && setAvenant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><FileSignature width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Ouvrir un avenant depuis ce message</DialogTitle>
            <DialogDescription>Le message de {avenant?.de_nom ?? "l'expéditeur"} en est l&apos;origine (vocal, photo, texte). L&apos;avenant naît en brouillon : chiffrez-le sur vos prix, puis faites-le signer avant d&apos;exécuter.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Ce qui est demandé en plus <span className="esp-obligatoire">(obligatoire)</span>
                <textarea className="rv-champ" rows={3} maxLength={500} value={objet} onChange={(e) => setObjet(e.target.value)} placeholder="Une prise supplémentaire dans le garage" />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi || !objet.trim()} onClick={() => avenant && void ouvrirAvenant(avenant)}>{envoi ? <Loader variant="spin" /> : null} Ouvrir l&apos;avenant</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
