"use client";

/* ══════════════════════════════════════════════════════════════════════
   /signer/<jeton> — le client signe l'avenant sur le téléphone du chef
   d'équipe (06/10/2026, session B6, b6_20)

   Sans compte : le jeton du lien est le seul secret (usage unique, 72 h
   par défaut). La page lit le document figé (public.btp_lire_a_signer),
   le client donne son nom, coche « lu et approuvé » et trace sa signature
   (ou la remplace par son nom saisi, s'il ne peut pas tracer) ; la base
   horodate, calcule les empreintes et passe l'avenant « signé »
   (public.btp_signer_sur_place). Le jeton « exemple » montre la page sans
   rien écrire.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader } from "@/components/ui/loader";
import { montant } from "../format";
import { Avis } from "../ui";

type Ligne = { designation: string; unite: string; quantite: number; prix_unitaire_ht: number; montant_ht: number };
type Document = {
  type: "avenant";
  entreprise: string | null;
  chantier: { nom: string; adresse: string | null; code_postal: string | null; commune: string | null };
  maitre_ouvrage: string | null;
  numero: number;
  objet: string;
  regime_tva: string;
  lignes: Ligne[];
  total_ht: number;
};
type ALire = { document: Document; empreinte: string; expire_le: string };
type Signe = { signee: boolean; message: string; signee_le?: string; preuve?: string };

const EXEMPLE: ALire = {
  document: {
    type: "avenant", entreprise: "Atelier Bertin", maitre_ouvrage: "SCI Lefèvre Patrimoine", numero: 1, regime_tva: "normal",
    chantier: { nom: "Résidence Les Tilleuls", adresse: "12 rue des Tilleuls", code_postal: "69003", commune: "Lyon" },
    objet: "Garde-corps supplémentaires sur les balcons du R+3 (12 ml), demandés par le maître d'ouvrage en visite",
    lignes: [
      { designation: "Garde-corps acier thermolaqué", unite: "ml", quantite: 12, prix_unitaire_ht: 142, montant_ht: 1704 },
      { designation: "Dépose du garde-corps provisoire", unite: "ml", quantite: 12, prix_unitaire_ht: 15, montant_ht: 180 },
    ],
    total_ht: 1884,
  },
  empreinte: "exemple",
  expire_le: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
};

const UNITES: Record<string, string> = { u: "u", ens: "ens.", forfait: "forfait", ml: "m", m2: "m²", m3: "m³", kg: "kg", t: "t", l: "l", h: "h", j: "j", sem: "sem.", mois: "mois" };

export default function SignatureSurPlace({ jeton }: { jeton: string }) {
  const exemple = jeton === "exemple";
  const [a, setA] = useState<ALire | null>(exemple ? EXEMPLE : null);
  const [chargement, setChargement] = useState(!exemple);
  const [erreur, setErreur] = useState<string | null>(null);
  const [nom, setNom] = useState("");
  const [qualite, setQualite] = useState("");
  const [lu, setLu] = useState(false);
  const [trace, setTrace] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [signe, setSigne] = useState<Signe | null>(null);
  const toile = useRef<HTMLCanvasElement | null>(null);
  const dessin = useRef<{ actif: boolean; x: number; y: number }>({ actif: false, x: 0, y: 0 });

  const lire = useCallback(async () => {
    try {
      const { data, error } = await createClient().rpc("btp_lire_a_signer", { p_jeton: jeton });
      if (error) throw new Error(error.message);
      setA(data as ALire);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Ce lien de signature n'est plus valable.");
    } finally {
      setChargement(false);
    }
  }, [jeton]);

  useEffect(() => {
    if (exemple) return;
    const t = window.setTimeout(() => void lire(), 0);
    return () => window.clearTimeout(t);
  }, [exemple, lire]);

  /* ——— le tracé ——— */
  const contexte = () => {
    const c = toile.current;
    if (!c) return null;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#050505";
    return ctx;
  };
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * e.currentTarget.width) / r.width, y: ((e.clientY - r.top) * e.currentTarget.height) / r.height };
  };
  const debut = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = point(e);
    dessin.current = { actif: true, ...p };
  };
  const bouge = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dessin.current.actif) return;
    const ctx = contexte();
    if (!ctx) return;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(dessin.current.x, dessin.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    dessin.current = { actif: true, ...p };
    setTrace(true);
  };
  const fin = () => { dessin.current.actif = false; };
  const effacer = () => {
    const c = toile.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setTrace(false);
  };
  /* Pour qui ne peut pas tracer : le nom saisi, écrit dans le cadre, vaut tracé. */
  const ecrireNom = () => {
    const c = toile.current;
    const ctx = contexte();
    if (!c || !ctx || nom.trim().length < 2) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#050505";
    ctx.font = "italic 34px Georgia, 'Times New Roman', serif";
    ctx.textBaseline = "middle";
    ctx.fillText(nom.trim(), 18, c.height / 2, c.width - 36);
    setTrace(true);
  };

  const signer = async () => {
    setEnvoi(true);
    setErreur(null);
    try {
      if (nom.trim().length < 2) throw new Error("Votre nom et prénom sont nécessaires.");
      if (!lu) throw new Error("Cochez « Lu et approuvé » pour signer.");
      if (!trace || !toile.current) throw new Error("La signature tracée est vide : signez dans le cadre.");
      const image = toile.current.toDataURL("image/png");
      if (exemple) {
        setSigne({ signee: true, message: `Avenant n° ${EXEMPLE.document.numero} signé (exemple : rien n'est enregistré).`, signee_le: new Date().toISOString() });
        return;
      }
      const { data, error } = await createClient().rpc("btp_signer_sur_place", {
        p_jeton: jeton, p_nom: nom.trim(), p_qualite: qualite.trim() || null, p_trace: image, p_lu_approuve: lu,
        p_appareil: navigator.userAgent.slice(0, 300),
      });
      if (error) throw new Error(error.message);
      const r = data as Signe;
      if (!r.signee) throw new Error(r.message);
      setSigne(r);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La signature n'a pas été enregistrée.");
    } finally {
      setEnvoi(false);
    }
  };

  if (chargement) {
    return <section className="esp-carte" aria-label="Signature de l'avenant"><Loader variant="spin" /></section>;
  }
  if (!a) {
    return (
      <section className="esp-carte" aria-label="Signature de l'avenant">
        <h1 className="esp-section-titre">Signature d&apos;un avenant</h1>
        <Avis teinte="rouge" role="alert">{erreur ?? "Ce lien de signature n'est plus valable : demandez-en un nouveau au bureau."}</Avis>
      </section>
    );
  }

  const d = a.document;
  return (
    <section className="esp-carte" aria-label="Signature de l'avenant" style={{ maxWidth: 760, margin: "0 auto" }}>
      <h1 className="esp-section-titre">Avenant n° {d.numero} — {d.chantier.nom}</h1>
      <p className="esp-kpi-sous" style={{ marginTop: 0 }}>
        {d.entreprise ? <><strong>{d.entreprise}</strong> propose </> : null}
        à {d.maitre_ouvrage ?? "vous"} des travaux en plus du marché{d.chantier.adresse || d.chantier.commune ? `, ${[d.chantier.adresse, [d.chantier.code_postal, d.chantier.commune].filter(Boolean).join(" ")].filter(Boolean).join(", ")}` : ""}.
      </p>
      {exemple ? <Avis teinte="bleu">Exemple : cette page montre ce que voit votre client ; rien n&apos;est enregistré.</Avis> : null}
      <p style={{ margin: "12px 0" }}><strong>Objet :</strong> {d.objet}</p>
      <ul aria-label="Lignes de l'avenant" style={{ listStyle: "none", margin: 0, padding: 0, borderTop: "1px solid #e4e4e4" }}>
        {d.lignes.map((l, k) => (
          <li key={k} style={{ padding: "10px 0", borderBottom: "1px solid #e4e4e4" }}>
            <div>{l.designation}</div>
            <div className="esp-kpi-sous" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "2px 12px" }}>
              <span>{new Intl.NumberFormat("fr-FR").format(l.quantite)} {UNITES[l.unite] ?? l.unite} × {montant(l.prix_unitaire_ht)} HT</span>
              <span className="esp-num" style={{ color: "#050505" }}>{montant(l.montant_ht)} HT</span>
            </div>
          </li>
        ))}
        <li style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0", fontSize: 18 }}>
          <strong>Total HT</strong><strong className="esp-num">{montant(d.total_ht)}</strong>
        </li>
      </ul>
      <p className="esp-kpi-sous">
        {d.regime_tva === "autoliquidation" ? "TVA autoliquidée par le preneur (CGI, art. 283-2 nonies)." : d.regime_tva === "normal" ? "TVA en sus au taux applicable aux travaux." : "Sans TVA."}
        {" "}Lien valable jusqu&apos;au {new Date(a.expire_le).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}, une seule fois.
      </p>

      {signe ? (
        <Avis teinte="vert" role="status">
          {signe.message}{signe.preuve ? <> Empreinte de preuve : <span className="esp-mono">{signe.preuve.slice(0, 16)}…</span></> : null} Vous pouvez rendre le téléphone.
        </Avis>
      ) : (
        <div className="esp-form" style={{ marginTop: 14 }}>
          <div className="esp-form-ligne">
            <label className="rv-libelle">Nom et prénom <span className="esp-obligatoire">(obligatoire)</span>
              <input className="rv-champ" autoComplete="name" maxLength={120} value={nom} onChange={(e) => setNom(e.target.value)} />
            </label>
            <label className="rv-libelle">Qualité (gérant, propriétaire…)
              <input className="rv-champ" autoComplete="organization-title" maxLength={120} value={qualite} onChange={(e) => setQualite(e.target.value)} />
            </label>
          </div>
          <div>
            <div className="rv-libelle" id="sig-libelle">Signature <span className="esp-obligatoire">(tracez avec le doigt)</span></div>
            <canvas ref={toile} width={680} height={180} role="img" aria-labelledby="sig-libelle"
                    style={{ width: "100%", height: 180, touchAction: "none", border: "1px solid #c9c9c9", borderRadius: 10, background: "#fff", display: "block" }}
                    onPointerDown={debut} onPointerMove={bouge} onPointerUp={fin} onPointerLeave={fin} onPointerCancel={fin} />
            <div className="esp-actions">
              <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={effacer} disabled={envoi}>Effacer</button>
              <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={ecrireNom} disabled={envoi || nom.trim().length < 2}>Signer avec mon nom saisi</button>
            </div>
          </div>
          <label className="rv-libelle" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <input type="checkbox" checked={lu} onChange={(e) => setLu(e.target.checked)} style={{ marginTop: 3 }} />
            <span>Lu et approuvé : j&apos;accepte ces travaux supplémentaires pour {montant(d.total_ht)} HT.</span>
          </label>
          {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          <button type="button" className="r-btn r-btn--noir" onClick={() => void signer()} disabled={envoi}>{envoi ? <Loader variant="spin" /> : null} Signer l&apos;avenant</button>
          <p className="esp-kpi-sous" style={{ margin: 0 }}>
            Signature électronique simple (règlement eIDAS ; Code civil, art. 1366 et 1367). Sont conservés comme preuve de votre accord, par {d.entreprise ?? "l'entreprise"} : votre nom et votre qualité, le tracé, l&apos;heure du serveur, le navigateur utilisé et l&apos;empreinte du document signé.
          </p>
        </div>
      )}
    </section>
  );
}
