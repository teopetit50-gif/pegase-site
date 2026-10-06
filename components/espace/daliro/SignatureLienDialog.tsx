"use client";

/* ══════════════════════════════════════════════════════════════════════
   Faire signer un avenant sur place, ou en voir la preuve
   (06/10/2026, session B6, b6_20)

   « Faire signer sur place » : le bureau prépare un lien à usage unique
   (24 h, 72 h ou 7 jours), le copie et l'envoie au chef d'équipe ; le
   client signe sur son téléphone (/signer/<jeton>). « Preuve » : le
   signataire, l'heure, le tracé et les empreintes, tels que la base les
   garde (public.btp_preuve_signature).
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState } from "react";
import { FileSignature, ShieldCheck } from "lucide-react";
import { DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import { dateHeure, montant } from "../format";
import { Avis, Def } from "../ui";
import { preparerSignature, preuveSignature, type PreuveSignature } from "./portes";
import type { Avenant } from "./types";

type Props = { mode: "preparer" | "preuve"; avenant: Avenant; source: Source };

export default function SignatureLienDialog({ mode, avenant, source }: Props) {
  const [heures, setHeures] = useState("72");
  const [lien, setLien] = useState<{ url: string; expire_le: string; empreinte: string } | null>(null);
  const [preuve, setPreuve] = useState<PreuveSignature | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);

  const lirePreuve = useCallback(async () => {
    try {
      setPreuve(await preuveSignature(avenant.id));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    }
  }, [avenant.id]);

  useEffect(() => {
    if (mode !== "preuve" || source !== "reelle") return;
    const t = window.setTimeout(() => void lirePreuve(), 0);
    return () => window.clearTimeout(t);
  }, [mode, source, lirePreuve]);

  const preparer = async () => {
    setEnvoi(true);
    setErreur(null);
    try {
      if (source === "reelle") {
        const r = await preparerSignature(avenant.id, Number(heures));
        setLien({ url: `${window.location.origin}${r.lien}`, expire_le: r.expire_le, empreinte: r.empreinte });
      } else {
        setLien({ url: `${window.location.origin}/signer/exemple`, expire_le: new Date(Date.now() + Number(heures) * 3600 * 1000).toISOString(), empreinte: "exemple" });
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'action.");
    } finally {
      setEnvoi(false);
    }
  };

  const copier = async () => {
    if (!lien) return;
    try {
      await navigator.clipboard.writeText(lien.url);
      setCopie(true);
    } catch {
      setErreur("La copie a échoué : sélectionnez le lien à la main.");
    }
  };

  if (mode === "preuve") {
    return (
      <>
        <DialogHeader>
          <DialogIcone><ShieldCheck width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>Preuve de signature — avenant n° {avenant.numero}</DialogTitle>
          <DialogDescription>{avenant.signe_libelle ?? ""}. Signature électronique simple : la trace ci-dessous est gardée par la base, scellée par son empreinte de preuve.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {source !== "reelle" ? <Avis teinte="bleu">En exemple, la preuve n&apos;existe pas : elle est lue dans la base réelle.</Avis>
            : erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis>
            : !preuve ? <Loader variant="spin" />
            : (
              <div>
                <Def etiquette="Signataire">{preuve.signataire_nom ?? "—"}{preuve.signataire_qualite ? `, ${preuve.signataire_qualite}` : ""}</Def>
                <Def etiquette="Signé le">{dateHeure(preuve.signee_le)}</Def>
                <Def etiquette="Appareil">{preuve.appareil ?? "—"}</Def>
                <Def etiquette="Empreinte du document"><span className="esp-mono" style={{ wordBreak: "break-all" }}>{preuve.empreinte}</span></Def>
                <Def etiquette="Empreinte du tracé"><span className="esp-mono" style={{ wordBreak: "break-all" }}>{preuve.trace_empreinte ?? "—"}</span></Def>
                <Def etiquette="Empreinte de preuve"><span className="esp-mono" style={{ wordBreak: "break-all" }}>{preuve.preuve_empreinte ?? "—"}</span></Def>
                {preuve.trace ? (
                  // eslint-disable-next-line @next/next/no-img-element -- image en data: URL gardée en base
                  <img src={preuve.trace} alt={`Signature tracée de ${preuve.signataire_nom ?? "le signataire"}`} style={{ width: "100%", maxWidth: 420, border: "1px solid #ddd", borderRadius: 8, marginTop: 10, background: "#fff" }} />
                ) : null}
              </div>
            )}
        </DialogBody>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogIcone><FileSignature width={18} height={18} aria-hidden="true" /></DialogIcone>
        <DialogTitle>Faire signer l&apos;avenant n° {avenant.numero} sur place</DialogTitle>
        <DialogDescription>
          Un lien à usage unique, à ouvrir sur le téléphone du chef d&apos;équipe et à tendre au client sur le chantier ({montant(avenant.montant_ht)} HT). Il signe du doigt ; l&apos;avenant passe « signé » avec son nom, l&apos;heure et l&apos;empreinte du document.
        </DialogDescription>
      </DialogHeader>
      <DialogBody>
        <div className="esp-form" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
          {!lien ? (
            <label className="rv-libelle">Valable
              <select className="rv-champ" value={heures} onChange={(e) => setHeures(e.target.value)}>
                <option value="24">24 heures</option>
                <option value="72">72 heures</option>
                <option value="168">7 jours</option>
              </select>
            </label>
          ) : (
            <>
              <label className="rv-libelle">Lien de signature
                <input className="rv-champ esp-mono" readOnly value={lien.url} onFocus={(e) => e.currentTarget.select()} />
              </label>
              <Avis teinte="vert" role="status">
                Lien prêt, valable jusqu&apos;au {dateHeure(lien.expire_le)}. Envoyez-le au chef d&apos;équipe ; il ne sert qu&apos;une fois, et un nouveau lien annule celui-ci.
                {copie ? " Copié." : ""}
              </Avis>
              {source !== "reelle" ? <Avis teinte="bleu">Exemple : le lien ouvre la page de démonstration, rien n&apos;y est enregistré.</Avis> : null}
            </>
          )}
          {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
        </div>
      </DialogBody>
      <DialogFooter>
        {lien ? (
          <button type="button" className="r-btn r-btn--noir" onClick={() => void copier()}>Copier le lien</button>
        ) : (
          <button type="button" className="r-btn r-btn--noir" onClick={() => void preparer()} disabled={envoi}>{envoi ? <Loader variant="spin" /> : null} Préparer le lien</button>
        )}
      </DialogFooter>
    </>
  );
}
