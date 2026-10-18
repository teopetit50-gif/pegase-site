"use client";

/* ══════════════════════════════════════════════════════════════════════
   Réglages — la messagerie connectée (18/10/2026, A3 ; portes d'A2, socle
   19al)

   Connecter Gmail : public.messagerie_preparer(client, 'gmail', retour)
   rend un état à usage unique (15 min) ; le navigateur part vers la
   fonction messagerie-oauth (/google/debut?etat=…) puis revient sur
   l'adresse de retour, telle quelle si tout va bien, avec ?erreur=… sinon.
   L'adresse de retour n'est acceptée que sur omegaai.fr : ailleurs (poste
   de recette), on n'en donne pas.
   Liste : public.messageries (RLS gérants et admins). Déconnecter :
   public.messagerie_revoquer(id) → ce qui reste à faire par le client.
   Microsoft : affiché, pas encore branché.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState } from "react";
import { Mail, Unplug } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { createClient } from "@/lib/supabase/client";
import { Avis, Pastille } from "../ui";
import { dateHeure } from "../format";
import { ilYa } from "../exemples/socle";

type Connexion = { id: string; fournisseur: "gmail" | "microsoft"; adresse: string | null; etat: "active" | "a_reconnecter" | "deconnexion" | "revoquee"; erreur: string | null; portees: string[] | null; connecte_le: string | null };

const ERREURS: Record<string, string> = {
  lien_invalide: "Le lien de connexion n'est pas valable. Relancez la connexion depuis cette page.",
  lien_expire: "Le lien de connexion a expiré (il vaut 15 minutes). Relancez la connexion.",
  annulee: "La connexion a été annulée chez Google : rien n'a été connecté.",
  connexion_impossible: "Google n'a pas accepté la connexion. Réessayez ; si cela persiste, écrivez-nous.",
  indisponible: "La connexion des messageries est momentanément indisponible. Réessayez plus tard.",
};

/* ce que Google a accordé, en clair */
function droits(portees: string[] | null): string {
  const p = (portees ?? []).join(" ");
  const d = [/gmail\.readonly|gmail\.modify|mail\.google\.com/.test(p) ? "lire" : null, /gmail\.compose|gmail\.modify|mail\.google\.com/.test(p) ? "préparer des brouillons" : null, /gmail\.send/.test(p) ? "envoyer" : null].filter(Boolean);
  return d.length ? d.join(", ") : "—";
}

const EXEMPLE: Connexion = { id: "ex-gmail", fournisseur: "gmail", adresse: "factures@atelier-bertin.fr", etat: "active", erreur: null, portees: ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.compose"], connecte_le: ilYa(5, 9) };

export default function Messagerie({ source, client, gere, pret }: { source: "exemple" | "reelle"; client: string | null; gere: boolean; pret: boolean }) {
  const [exemple, setExemple] = useState<Connexion[]>([EXEMPLE]);
  const [reel, setReel] = useState<Connexion[] | null>(null);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [retour, setRetour] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  /* le retour de Google : ?erreur=… dit ce qui a manqué ; on le lit une fois, puis on nettoie l'adresse */
  useEffect(() => {
    const u = new URL(window.location.href);
    const e = u.searchParams.get("erreur");
    if (!e) return;
    /* pas d'annulation du minuteur : en développement, l'effet est rejoué et le paramètre est déjà retiré */
    window.setTimeout(() => setRetour(ERREURS[e] ?? `La connexion n'a pas abouti (${e}).`), 0);
    u.searchParams.delete("erreur");
    window.history.replaceState(null, "", u.toString());
  }, []);

  const charger = useCallback(async () => {
    const { data, error } = await createClient().from("messageries").select("id, fournisseur, adresse, etat, erreur, portees, connecte_le").order("connecte_le", { ascending: false });
    if (error) {
      setErreur(error.message);
      setReel([]);
    } else setReel((data ?? []) as Connexion[]);
  }, []);
  useEffect(() => {
    if (source !== "reelle" || !gere) return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, gere, charger]);

  const liste = source === "exemple" ? exemple : (reel ?? []);
  const gmail = liste.find((c) => c.fournisseur === "gmail" && c.etat !== "revoquee") ?? null;

  const connecter = async () => {
    setErreur(null);
    setRetour(null);
    setFait(null);
    if (source === "exemple") {
      setFait("Données d'exemple : en vrai, Google vous demande ici de choisir le compte et d'accepter les droits, puis vous ramène sur cette page.");
      return;
    }
    if (!client) return;
    setEnvoi("connecter");
    try {
      const ici = new URL(window.location.href);
      /* l'adresse de retour n'est acceptée que sur omegaai.fr (messagerie_hotes_retour) */
      const retourEcran = ici.protocol === "https:" && /(^|\.)omegaai\.fr$/.test(ici.hostname) ? `${ici.origin}${ici.pathname}` : null;
      const { data, error } = await createClient().rpc("messagerie_preparer", { p_client: client, p_fournisseur: "gmail", p_retour_ecran: retourEcran });
      if (error) throw new Error(error.message);
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      /* adresse externe (fonction Supabase), pas une page Next : la règle ne le voit pas, la base étant une variable */
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `${base}/functions/v1/messagerie-oauth/google/debut?etat=${encodeURIComponent(String(data))}`;
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setEnvoi(null);
    }
  };

  const deconnecter = async (c: Connexion) => {
    setErreur(null);
    setRetour(null);
    setFait(null);
    if (source === "exemple") {
      setExemple((l) => l.map((x) => (x.id === c.id ? { ...x, etat: "revoquee" } : x)));
      setFait(`${c.adresse ?? "La messagerie"} est déconnectée : Omega n'y lit et n'y écrit plus rien.`);
      return;
    }
    setEnvoi(c.id);
    try {
      const { data, error } = await createClient().rpc("messagerie_revoquer", { p_connexion: c.id });
      if (error) throw new Error(error.message);
      const r = (data ?? {}) as { revocation_distante?: boolean; a_faire_par_le_client?: string | null };
      setFait(`${c.adresse ?? "La messagerie"} est déconnectée : Omega n'y lit et n'y écrit plus rien.${r.revocation_distante === false ? " L'accès n'a pas pu être retiré chez Google : retirez « Omega » dans les applications tierces de votre compte Google." : ""}${r.a_faire_par_le_client ? ` ${r.a_faire_par_le_client}` : ""}`);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(null);
    }
  };

  return (
    <section className="esp-carte" aria-labelledby="titre-messagerie" id="messagerie">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre" id="titre-messagerie">Messagerie</h2>
      </div>
      <div className="esp-carte-corps" style={{ display: "grid", gap: 12 }}>
        <p className="esp-kpi-sous" style={{ margin: 0 }}>
          Connectez la messagerie où arrivent vos factures et vos demandes : Omega la lit et y prépare des brouillons. Rien ne part sans votre validation, et vous la déconnectez quand vous voulez.
        </p>
        {retour ? <Avis teinte="rouge" role="alert"><strong>La connexion n&apos;a pas abouti.</strong> {retour}</Avis> : null}
        {!pret ? (
          <p className="esp-kpi-sous" style={{ margin: 0 }} role="status">Lecture de votre rôle…</p>
        ) : !gere ? (
          <p className="esp-kpi-sous" style={{ margin: 0 }}>Réservé au gérant et aux administrateurs de l&apos;organisation.</p>
        ) : source === "reelle" && reel === null ? (
          <p className="esp-kpi-sous" style={{ margin: 0 }} role="status">Lecture des messageries…</p>
        ) : (
          <ul className="esp-fil" aria-label="Messageries">
            <li>
              <span className="esp-fil-point" data-teinte={gmail?.etat === "active" ? "vert" : gmail?.etat === "a_reconnecter" ? "rouge" : undefined} />
              <div style={{ display: "grid", gap: 6 }}>
                <div className="esp-fil-texte esp-item-haut">
                  <strong>Gmail</strong>
                  {gmail?.etat === "active" ? <Pastille teinte="vert">connectée</Pastille> : gmail?.etat === "a_reconnecter" ? <Pastille teinte="rouge">à reconnecter</Pastille> : gmail?.etat === "deconnexion" ? <Pastille teinte="gris">déconnexion en cours</Pastille> : <Pastille teinte="gris">non connectée</Pastille>}
                </div>
                {gmail && gmail.etat !== "revoquee" ? (
                  <div className="esp-fil-meta">
                    <span className="esp-mono">{gmail.adresse ?? "adresse inconnue"}</span>
                    {gmail.connecte_le ? ` · connectée le ${dateHeure(gmail.connecte_le)}` : ""} · droits : {droits(gmail.portees)}
                  </div>
                ) : null}
                {gmail?.etat === "a_reconnecter" ? <div className="esp-fil-meta">{gmail.erreur ?? "Google a retiré l'accès (mot de passe changé ou accès révoqué)."} Reconnectez-la.</div> : null}
                <div className="esp-actions">
                  {!gmail || gmail.etat === "a_reconnecter" ? (
                    <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!!envoi} onClick={() => void connecter()}>
                      {envoi === "connecter" ? <Loader variant="spin" /> : <Mail width={13} height={13} aria-hidden="true" />} {gmail ? "Reconnecter Gmail" : "Connecter Gmail"}
                    </button>
                  ) : null}
                  {gmail && gmail.etat !== "deconnexion" ? (
                    <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!!envoi} onClick={() => void deconnecter(gmail)}>
                      {envoi === gmail.id ? <Loader variant="spin" /> : <Unplug width={13} height={13} aria-hidden="true" />} Déconnecter
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
            <li>
              <span className="esp-fil-point" />
              <div style={{ display: "grid", gap: 6 }}>
                <div className="esp-fil-texte esp-item-haut">
                  <strong>Microsoft 365 / Outlook</strong>
                  <Pastille contour>bientôt</Pastille>
                </div>
                <div className="esp-fil-meta">Pas encore branché : en attendant, faites suivre vos factures vers l&apos;adresse de réception de FILED.</div>
              </div>
            </li>
          </ul>
        )}
        {fait ? <Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Avis> : null}
        {erreur ? <Avis teinte="rouge" role="alert"><strong>Refusé par la base.</strong> {erreur}</Avis> : null}
      </div>
    </section>
  );
}
