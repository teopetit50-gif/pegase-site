"use client";

/* ══════════════════════════════════════════════════════════════════════
   L'accord permanent des confirmations J-2 (06/10/2026, session B6, b6_08)

   Décision de Teo : avec cet accord, les demandes de confirmation J-2
   partent sans approbation envoi par envoi. C'est un accord permanent du
   socle (public.politiques, une par canal), donné par le gérant ou un
   administrateur, activé dans « À valider » par un autre décideur (règle
   des deux personnes) — ou, si le gérant est le SEUL décideur de
   l'organisation, par lui-même (b6_09, tracé) —, révocable à tout moment.
   Révoquer ne touche pas aux envois déjà partis : les suivants retournent
   dans « À valider ».
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { ilYa, dans } from "../exemples/socle";
import { dateCourte } from "../format";
import { Avis, Pastille } from "../ui";
import { activerAccordJ2Seul, chargerAccordJ2, donnerAccordJ2, revoquerAccordJ2 } from "./portes";
import type { AccordJ2 as Accord, CanalAccordJ2 } from "./types";

const LIBELLE_CANAL: Record<CanalAccordJ2["canal"], string> = { email: "courriel", whatsapp: "WhatsApp", sms: "SMS" };

function canal(c: CanalAccordJ2["canal"], statut: CanalAccordJ2["statut"], extra: Partial<CanalAccordJ2> = {}): CanalAccordJ2 {
  return {
    canal: c, statut, politique: null, debut: null, fin: null, active_le: null, cree_le: null, donne_par_libelle: null,
    demande_statut: null, revoquee_le: null, revoquee_par_libelle: null, motif_revocation: null, nombre_mensuel: 1000, utilises_mois: 0, ...extra,
  };
}

/* L'exemple : un accord actif, donné il y a deux mois par le gérant. */
function exemple(): Accord {
  const base = { debut: ilYa(60), fin: dans(305), active_le: ilYa(59), cree_le: ilYa(60), donne_par_libelle: "Vous", demande_statut: "executee" };
  return {
    etat: "actif",
    fin: base.fin,
    canaux: [canal("email", "active", { ...base, utilises_mois: 7 }), canal("sms", "active", base), canal("whatsapp", "active", { ...base, utilises_mois: 12 })],
  };
}

export default function AccordJ2({ source, client }: { source: "exemple" | "reelle"; client: { client_id: string; role: string } | null }) {
  const [accord, setAccord] = useState<Accord | null>(source === "exemple" ? exemple() : null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [revoquer, setRevoquer] = useState(false);
  const [motif, setMotif] = useState("");
  const [maintenant] = useState(() => Date.now());
  const dirige = source === "exemple" || client?.role === "gerant" || client?.role === "admin";

  const lire = useCallback(async () => {
    if (source !== "reelle" || !client || !dirige) return;
    try {
      setAccord(await chargerAccordJ2(client.client_id));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    }
  }, [source, client, dirige]);

  useEffect(() => {
    if (source === "exemple") return;
    const t = window.setTimeout(() => void lire(), 0);
    return () => window.clearTimeout(t);
  }, [source, lire]);

  if (!dirige) return null;

  const donner = async () => {
    setEnvoi(true);
    setErreur(null);
    try {
      if (source === "reelle" && client) setAccord(await donnerAccordJ2(client.client_id));
      else setAccord({ etat: "a_valider", fin: null, seul_decideur: false, canaux: (["email", "sms", "whatsapp"] as const).map((c) => canal(c, "a_valider", { debut: dans(0), fin: dans(365), cree_le: dans(0), donne_par_libelle: "Vous", demande_statut: "en_attente" })) });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(false);
    }
  };

  const activerSeul = async () => {
    setEnvoi(true);
    setErreur(null);
    try {
      if (source === "reelle" && client) setAccord(await activerAccordJ2Seul(client.client_id));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      void lire();
    } finally {
      setEnvoi(false);
    }
  };

  const confirmerRevocation = async () => {
    setEnvoi(true);
    setErreur(null);
    try {
      if (source === "reelle" && client) setAccord(await revoquerAccordJ2(client.client_id, motif.trim() || null));
      else setAccord((a) => ({ etat: "revoque", fin: null, canaux: (a?.canaux ?? []).map((c) => ({ ...c, statut: c.statut === "active" || c.statut === "a_valider" ? "revoquee" : c.statut, revoquee_le: dans(0), revoquee_par_libelle: "Vous", motif_revocation: motif.trim() || null })) }));
      setRevoquer(false);
      setMotif("");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(false);
    }
  };

  const etat = accord?.etat ?? "aucun";
  const premier = accord?.canaux.find((c) => c.statut === "active") ?? accord?.canaux.find((c) => c.statut === "a_valider") ?? accord?.canaux.find((c) => c.statut === "revoquee") ?? null;
  const utilises = (accord?.canaux ?? []).reduce((s, c) => s + (c.statut === "active" ? c.utilises_mois ?? 0 : 0), 0);
  const finProche = accord?.fin ? new Date(accord.fin).getTime() - maintenant < 30 * 86400000 : false;

  return (
    <section className="esp-carte" aria-label="Accord permanent des confirmations J-2" style={{ marginBottom: 14 }}>
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Accord permanent des confirmations J-2</h2>
        <span className="esp-item-haut">
          {etat === "actif" ? <Pastille teinte="vert">Actif jusqu&apos;au {dateCourte(accord?.fin)}</Pastille>
            : etat === "partiel" ? <Pastille teinte="ambre">Actif : {(accord?.canaux ?? []).filter((c) => c.statut === "active").map((c) => LIBELLE_CANAL[c.canal]).join(", ")}</Pastille>
            : etat === "a_valider" ? <Pastille teinte="bleu">À valider</Pastille>
            : etat === "revoque" ? <Pastille teinte="gris">Révoqué</Pastille>
            : <Pastille teinte="gris">Aucun accord</Pastille>}
        </span>
      </div>
      <p className="esp-kpi-sous" style={{ margin: "0 0 10px" }}>
        {etat === "actif" || etat === "partiel"
          ? `Les demandes de confirmation à J-2 partent sans passer par « À valider ». Donné le ${dateCourte(premier?.cree_le)}${premier?.donne_par_libelle ? ` par ${premier.donne_par_libelle}` : ""}, activé le ${dateCourte(premier?.active_le)} ; ${utilises} demande${utilises > 1 ? "s" : ""} ce mois-ci (au plus 1 000 par canal).`
          : etat === "a_valider"
            ? `Proposé le ${dateCourte(premier?.cree_le)}${premier?.donne_par_libelle ? ` par ${premier.donne_par_libelle}` : ""}. ${accord?.seul_decideur ? "Vous êtes le seul décideur de l'organisation : vous pouvez l'activer vous-même, la décision est tracée." : "En attente de validation par un autre décideur, dans « À valider » : on ne valide pas sa propre demande."} D'ici là, chaque demande J-2 attend sa validation.`
            : etat === "revoque"
              ? `Révoqué le ${dateCourte(premier?.revoquee_le)}${premier?.revoquee_par_libelle ? ` par ${premier.revoquee_par_libelle}` : ""}${premier?.motif_revocation ? ` (« ${premier.motif_revocation} »)` : ""}. Chaque demande J-2 attend de nouveau sa validation ; les envois déjà partis ne sont pas touchés.`
              : "Sans accord, chaque demande de confirmation à J-2 attend sa validation dans « À valider ». Avec l'accord, elles partent seules, tracées « approuvé par accord permanent »."}
      </p>
      {finProche && (etat === "actif" || etat === "partiel") ? <div style={{ marginBottom: 10 }}><Avis teinte="ambre">L&apos;accord prend fin le {dateCourte(accord?.fin)} : renouvelez-le pour que les demandes J-2 continuent de partir seules.</Avis></div> : null}
      {etat === "a_valider" && accord?.seul_decideur ? <div style={{ marginBottom: 10 }}><Avis teinte="ambre">Vous activerez seul un accord que vous avez proposé : c&apos;est permis parce que personne d&apos;autre ne décide dans l&apos;organisation. Le journal gardera « activé par le seul décideur de l&apos;organisation ». Dès qu&apos;un autre décideur vous rejoint, l&apos;activation passe par lui.</Avis></div> : null}
      {erreur ? <div style={{ marginBottom: 10 }}><Avis teinte="rouge" role="alert">{erreur}</Avis></div> : null}
      <div className="esp-actions" style={{ marginTop: 0 }}>
        {etat === "aucun" || etat === "revoque" || ((etat === "actif" || etat === "partiel") && finProche) ? (
          <button type="button" className="r-btn r-btn--noir r-btn--petit" onClick={donner} disabled={envoi}>
            {envoi ? <Loader variant="spin" /> : <ShieldCheck width={14} height={14} aria-hidden="true" />} {etat === "actif" || etat === "partiel" ? "Renouveler l'accord" : "Donner l'accord permanent"}
          </button>
        ) : null}
        {etat === "a_valider" && accord?.seul_decideur ? (
          <button type="button" className="r-btn r-btn--noir r-btn--petit" onClick={activerSeul} disabled={envoi}>
            {envoi ? <Loader variant="spin" /> : <ShieldCheck width={14} height={14} aria-hidden="true" />} Activer moi-même (vous êtes le seul décideur)
          </button>
        ) : null}
        {etat === "actif" || etat === "partiel" || etat === "a_valider" ? (
          <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => setRevoquer(true)} disabled={envoi}>Révoquer</button>
        ) : null}
      </div>

      <Dialog open={revoquer} onOpenChange={(o) => !o && setRevoquer(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><ShieldCheck width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Révoquer l&apos;accord permanent</DialogTitle>
            <DialogDescription>Les prochaines demandes de confirmation à J-2 attendront de nouveau leur validation dans « À valider ». Les envois déjà partis ne sont pas touchés.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Motif (gardé au journal)
                <input className="rv-champ" value={motif} maxLength={500} onChange={(e) => setMotif(e.target.value)} placeholder="Nous reprenons la main sur les confirmations" />
              </label>
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" onClick={confirmerRevocation} disabled={envoi}>{envoi ? <Loader variant="spin" /> : null} Révoquer l&apos;accord</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
