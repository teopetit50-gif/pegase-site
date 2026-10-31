"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAMILA, espace 2 — ce que les sous-pages partagent (30/10/2026) : les
   adresses, l'avatar des personnes, et les deux fenêtres qui valent pour
   tout le cabinet : la phrase (B15, L1, L2) et l'ouverture d'un dossier
   (B16, G2). Mêmes champs et mêmes règles que l'écran d'avant
   (components/espace/tamila/EcranTamila.tsx:840-934) ; l'écriture passe
   par useTamila().creer (même code).
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, KeyRound, UserRound } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis } from "@/components/espace/ui";
import { MATIERES, TERRITOIRES, estAssocie, libelleMatiere } from "@/components/espace/tamila/regles";
import { RACINE } from "../modules";
import { useToast } from "../Toasts";
import { useTamila, type NouveauDossierForm } from "./donnees";

export const BASE = `${RACINE}/tamila`;
export type OngletDossier = "procedure" | "pieces" | "honoraires" | "conformite";
export const lienDossier = (id: string, onglet?: OngletDossier) => `${BASE}/dossiers/${encodeURIComponent(id)}${onglet && onglet !== "procedure" ? `?onglet=${onglet}` : ""}`;

export const initiales = (nom: string) =>
  nom
    .replace(/[^\p{L}\s-]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? "")
    .join("");

const TEINTES = ["#5e6ad2", "#26b5ce", "#4cb782", "#f2c94c", "#f2994a", "#eb5757", "#bb87fc", "#95a2b3"];
export const couleurDe = (nom: string) => TEINTES[[...nom].reduce((s, c) => s + c.charCodeAt(0), 0) % TEINTES.length];

/* l'avatar de 18 de My issues (lmi-avatar) */
export function Avatar({ nom, role = "Responsable" }: { nom: string | null; role?: string }) {
  const ini = nom && nom !== "—" ? initiales(nom) : "";
  if (!ini) {
    return (
      <span className="lmi-avatar lmi-avatar--vide" title={`${role} : personne`}>
        <UserRound aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className="lmi-avatar" title={`${role} : ${nom}`} style={{ "--lmi-teinte": couleurDe(nom!) } as React.CSSProperties} aria-hidden="true">
      {ini}
    </span>
  );
}

/* « 28 oct. », comme le « Oct 28 » de Linear */
export const jourCourt = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

export type Fenetre = "phrase" | "nouveau" | null;

export function FenetresCabinet({ fenetre, fermer }: { fenetre: Fenetre; fermer: () => void }) {
  const { source, moi, personnes, phrase, poserPhrase, oublierPhrase, auCoffre, creer } = useTamila();
  const routeur = useRouter();
  const toast = useToast();
  const [saisie, setSaisie] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const vide = (): NouveauDossierForm => ({ reference: "", intitule: "", numero_rg: "", matiere: "civil", juridiction: "", territoire: "metropole", mode: "contentieux", responsable: moi?.user_id ?? "", audit_fin: "", phrase: "" });
  const [nv, setNv] = useState<NouveauDossierForm>(vide);
  const [ouverteAvant, setOuverteAvant] = useState<Fenetre>(null);
  if (fenetre !== ouverteAvant) {
    setOuverteAvant(fenetre);
    if (fenetre === "nouveau") {
      setNv(vide());
      setErreur(null);
    }
    if (fenetre === "phrase") setSaisie("");
  }

  const avocats = personnes.filter((p) => ["gerant", "admin", "valideur"].includes(p.role));
  const nouveauOk = nv.reference.trim().length >= 2 && nv.intitule.trim().length >= 3 && (source === "exemple" || auCoffre || !!phrase || nv.phrase.trim().length >= 8);

  const memoriser = () => {
    const p = saisie.trim();
    if (p.length < 8) return;
    poserPhrase(p);
    setSaisie("");
    fermer();
  };

  const soumettre = async () => {
    if (!nouveauOk) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const id = await creer(nv);
      toast(`Le dossier ${nv.reference.trim()} est ouvert, chiffré avec sa propre clé.`, "vert");
      fermer();
      routeur.push(`${BASE}/dossiers/${encodeURIComponent(id)}`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'ouverture.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <>
      <Dialog open={fenetre === "phrase"} onOpenChange={(o) => !o && fermer()}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <KeyRound width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>La phrase du cabinet</DialogTitle>
            <DialogDescription>Elle déballe la clé de chaque dossier dans votre navigateur. Elle reste dans cet onglet, n&apos;est jamais envoyée, et le serveur ne peut rien lire sans elle.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              {phrase ? <Avis teinte="vert">Une phrase est mémorisée pour cet onglet. Vous pouvez la remplacer ou l&apos;oublier.</Avis> : null}
              <label className="rv-libelle">
                Phrase <span className="esp-obligatoire">(huit caractères au moins)</span>
                <input className="rv-champ" type="password" autoComplete="off" value={saisie} onChange={(e) => setSaisie(e.target.value)} onKeyDown={(e) => e.key === "Enter" && memoriser()} />
              </label>
            </div>
          </DialogBody>
          <DialogFooter>
            {phrase ? (
              <button type="button" className="r-btn r-btn--fil" onClick={() => { oublierPhrase(); fermer(); }}>
                Oublier la phrase
              </button>
            ) : null}
            <button type="button" className="r-btn r-btn--noir" disabled={saisie.trim().length < 8} onClick={memoriser}>
              Mémoriser pour cet onglet
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={fenetre === "nouveau"} onOpenChange={(o) => !o && !envoi && fermer()}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <FolderPlus width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Ouvrir un dossier</DialogTitle>
            <DialogDescription>{auCoffre ? "Une clé est tirée par le coffre Scaleway du cabinet ; référence, intitulé et n° RG sont chiffrés dans votre navigateur avant de partir. Le serveur ne voit que des octets." : "Une clé est tirée dans votre navigateur ; référence, intitulé et n° RG sont chiffrés avant de partir. Le serveur ne voit que des octets."}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">
                  Référence du cabinet <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" value={nv.reference} onChange={(e) => setNv({ ...nv, reference: e.target.value })} placeholder="2026-0431" />
                </label>
                <label className="rv-libelle">
                  N° RG
                  <input className="rv-champ" value={nv.numero_rg} onChange={(e) => setNv({ ...nv, numero_rg: e.target.value })} placeholder="26/01234" />
                </label>
              </div>
              <label className="rv-libelle">
                Intitulé <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={nv.intitule} onChange={(e) => setNv({ ...nv, intitule: e.target.value })} placeholder="Demandeur c/ Défendeur" />
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">
                  Matière
                  <select className="rv-champ" value={nv.matiere} onChange={(e) => setNv({ ...nv, matiere: e.target.value })}>
                    {MATIERES.map((m) => (
                      <option key={m} value={m}>
                        {libelleMatiere(m)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="rv-libelle">
                  Mode
                  <select className="rv-champ" value={nv.mode} onChange={(e) => setNv({ ...nv, mode: e.target.value as NouveauDossierForm["mode"] })}>
                    <option value="contentieux">Contentieux</option>
                    <option value="dommage_corporel">Dommage corporel</option>
                  </select>
                </label>
              </div>
              <div className="esp-form-ligne">
                <label className="rv-libelle">
                  Juridiction
                  <input className="rv-champ" value={nv.juridiction} onChange={(e) => setNv({ ...nv, juridiction: e.target.value })} placeholder="Cour d'appel de Paris" />
                </label>
                <label className="rv-libelle">
                  Siège de la cour (son calendrier proroge les délais)
                  <select className="rv-champ" value={nv.territoire} onChange={(e) => setNv({ ...nv, territoire: e.target.value })}>
                    {TERRITOIRES.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.libelle}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="esp-form-ligne">
                <label className="rv-libelle">
                  Avocat responsable
                  <select className="rv-champ" value={nv.responsable} onChange={(e) => setNv({ ...nv, responsable: e.target.value })}>
                    {moi?.role === "collaborateur" ? <option value="">Choisir…</option> : null}
                    {avocats.map((p) => (
                      <option key={p.user_id} value={p.user_id}>
                        {p.nom}
                      </option>
                    ))}
                  </select>
                </label>
                {estAssocie(moi) ? (
                  <label className="rv-libelle">
                    Audit : fin le (vide pour un dossier ordinaire)
                    <input className="rv-champ" type="date" value={nv.audit_fin} onChange={(e) => setNv({ ...nv, audit_fin: e.target.value })} />
                  </label>
                ) : null}
              </div>
              {source === "reelle" && !phrase && !auCoffre ? (
                <label className="rv-libelle">
                  Phrase du cabinet <span className="esp-obligatoire">(obligatoire, huit caractères au moins)</span>
                  <input className="rv-champ" type="password" autoComplete="off" value={nv.phrase} onChange={(e) => setNv({ ...nv, phrase: e.target.value })} />
                  <span className="esp-kpi-sous">La clé du dossier est enveloppée sous cette phrase ; elle sera mémorisée pour cet onglet.</span>
                </label>
              ) : null}
              {moi?.role === "collaborateur" ? <Avis teinte="ambre">Un dossier ouvert par un assistant attend l&apos;accord de son avocat responsable avant toute lecture.</Avis> : null}
              {erreur ? (
                <Avis teinte="rouge" role="alert">
                  {erreur}
                </Avis>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!nouveauOk || envoi} onClick={soumettre}>
              {envoi ? <Loader variant="spin" /> : null} Ouvrir le dossier
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
