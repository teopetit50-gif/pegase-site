"use client";

/* ══════════════════════════════════════════════════════════════════════
   MON ESPACE — la vue d'ensemble (11/11/2026)

   La copie 1:1 de la vue d'ensemble de DALIRO (../daliro/VueEnsemble :
   l'accueil d'une équipe de Linear, relevé linear-home.md, styles
   ../daliro/dal.css et dal-home.css, icônes du sprite de Linear). Seul le
   contenu change, c'est celui de Teo :
     · la tuile et le nom : « Mon espace » ; la phrase dit ce qu'on y trouve ;
     · « Aller à » : Clients (combien suivis), Agenda (combien aujourd'hui),
       WhatsApp (non lus), Mails (non lus), puis le Pilotage (/omega) ;
     · les sections de ressources : Épinglés, « À relancer » (les clients
       dont la prochaine date est passée ou aujourd'hui), « Aujourd'hui »
       (l'agenda du jour), « Vos clients » (les plus récents) ;
     · à droite : Membres (vous), Aller à, et Branchements (le tableau des
       associés, Gmail et Google Agenda, WhatsApp : branché ou pas,
       honnêtement). Le tableau des associés se branche ICI : une fenêtre
       demande le compte du tableau (courriel, mot de passe), une fois ;
       ?brancher=tableau l'ouvre d'office (les pages Clients et Agenda y
       renvoient tant que le tableau n'est pas branché).
   Les données : ./donnees (exemple, ou la base réelle lue par
   app/espace2/teo/page.tsx).
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, UserRound } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis } from "@/components/espace/ui";
import type { ClientTeo, Connexions, ConversationWa, FilMail, RendezVous } from "@/lib/teo/types";
import { RACINE } from "../modules";
import { useToast } from "../Toasts";
import { DalCarte, DalMenu } from "../daliro/DalCadre";
import { DalIcone, type NomDalIcone } from "../daliro/DalIcone";
import { EtoilePleine } from "../daliro/IconesProjet";
import { brancherTableau, creerClientTeo, debrancherTableau } from "@/app/espace2/teo/actions";
import { ETAPES_CLIENT, ETAPES_FINIES, TYPES_CLIENT } from "@/lib/teo/types";
import { useTeo } from "./donnees";
import { AGENDA_EXEMPLE, CLIENTS_EXEMPLE, MAILS_EXEMPLE, WHATSAPP_EXEMPLE } from "./exemples";
import { aujourdhuiIso, heureLocale, jourLocal, useFavorisTeo } from "./navigateur";
import "../daliro/dal-home.css";

const BASE = `${RACINE}/teo`;

export type ReelEnsemble = { clients: ClientTeo[]; agenda: RendezVous[]; whatsapp: ConversationWa[]; mails: FilMail[]; connexions: Connexions };
const CONNEXIONS_EXEMPLE: Connexions = { google: "ok", whatsapp: "ok", tableau: "ok", adresse: "teo@example.com", compteTableau: "teo@example.com", detail: null };

type Nouveau = { nom: string; entreprise: string; type: string; etape: string; telephone: string; courriel: string; commune: string; secteur: string };
const VIDE: Nouveau = { nom: "", entreprise: "", type: "Prospect", etape: "Nouveau lead", telephone: "", courriel: "", commune: "", secteur: "" };

const ICONE_EPINGLE: Record<string, NomDalIcone> = { client: "Users", rdv: "Calendar", wa: "Chat", mail: "Email", vue: "CustomView" };

export default function VueEnsemble({ reel }: { reel: ReelEnsemble | null }) {
  const { reel: enReel } = useTeo();
  const d = enReel && reel ? reel : { clients: CLIENTS_EXEMPLE, agenda: AGENDA_EXEMPLE, whatsapp: WHATSAPP_EXEMPLE, mails: MAILS_EXEMPLE, connexions: CONNEXIONS_EXEMPLE };
  const auj = useMemo(() => aujourdhuiIso(), []);
  const routeur = useRouter();
  const toast = useToast();

  const suivis = d.clients.filter((c) => c.etape !== "Perdu");
  const aRelancer = suivis.filter((c) => c.prochaine_date && c.prochaine_date <= auj && !ETAPES_FINIES.includes(c.etape)).sort((x, y) => (x.prochaine_date ?? "").localeCompare(y.prochaine_date ?? ""));
  const ceJour = d.agenda.filter((r) => r.statut !== "annule" && jourLocal(r.debut) <= auj && jourLocal(r.fin) >= auj).sort((x, y) => x.debut.localeCompare(y.debut));
  const waNonLus = d.whatsapp.reduce((n, c) => n + c.messages.filter((m) => m.sens === "recu" && !m.lu).length, 0);
  const mailsNonLus = d.mails.filter((f) => f.non_lu).length;
  const enCours = suivis.filter((c) => !ETAPES_FINIES.includes(c.etape)).length;
  const recents = [...suivis].sort((x, y) => y.maj.localeCompare(x.maj)).slice(0, 8);

  /* ——— « + » : un nouveau client (omega_contacts en base réelle ; en exemple, un mot) ——— */
  const [nouveau, setNouveau] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [f, setF] = useState<Nouveau>(VIDE);
  const ouvrirNouveau = () => {
    setErreur(null);
    setF(VIDE);
    setNouveau(true);
  };
  const creer = async () => {
    if (!enReel) {
      toast("Données d'exemple : le client n'est pas gardé. Passez en base réelle (menu de l'organisation) pour l'ajouter.");
      setNouveau(false);
      return;
    }
    setEnvoi(true);
    setErreur(null);
    const r = await creerClientTeo(f);
    setEnvoi(false);
    if (!r.client) return setErreur(r.detail ?? "La base n'a pas répondu.");
    toast(`C'est fait. ${r.client.nom} est dans vos clients.`, "vert");
    setNouveau(false);
    routeur.push(`${BASE}/clients?client=${encodeURIComponent(r.client.id)}`);
    routeur.refresh();
  };

  /* ——— le tableau des associés : s'y connecter d'ici (11/11, soir) ——— */
  const params = useSearchParams();
  const [brancher, setBrancher] = useState(params.get("brancher") === "tableau");
  const [compte, setCompte] = useState({ courriel: "", mdp: "" });
  const [brancheEnCours, setBrancheEnCours] = useState(false);
  const [erreurTableau, setErreurTableau] = useState<string | null>(null);
  const ouvrirBrancher = () => {
    setErreurTableau(null);
    setBrancher(true);
  };
  const fermerBrancher = () => {
    setBrancher(false);
    if (params.get("brancher")) routeur.replace(BASE, { scroll: false });
  };
  const connecterTableau = async () => {
    if (!enReel) {
      toast("Données d'exemple : rien à brancher. Passez en base réelle (menu de l'organisation).");
      fermerBrancher();
      return;
    }
    setBrancheEnCours(true);
    setErreurTableau(null);
    const r = await brancherTableau(compte.courriel, compte.mdp);
    setBrancheEnCours(false);
    if (!r.ok) return setErreurTableau(r.detail ?? "Le tableau n'a pas répondu.");
    setCompte({ courriel: "", mdp: "" });
    toast("C'est branché : vos clients et vos rendez-vous sont ceux du tableau des associés.", "vert");
    fermerBrancher();
    routeur.refresh();
  };
  const deconnecterTableau = async () => {
    const detail = await debrancherTableau();
    if (detail) return toast(detail, "rouge");
    toast("Le tableau des associés est débranché de Mon espace.");
    routeur.refresh();
  };

  const copierLien = () => {
    void navigator.clipboard?.writeText(window.location.href).then(
      () => toast("Lien copié"),
      () => toast("Le lien n'a pas pu être copié.", "rouge"),
    );
  };

  const aller: { cle: string; libelle: string; icone: NomDalIcone; href: string; compte?: number }[] = [
    { cle: "clients", libelle: "Clients", icone: "Users", href: `${BASE}/clients`, compte: enCours },
    { cle: "agenda", libelle: "Agenda", icone: "Calendar", href: `${BASE}/agenda`, compte: ceJour.length },
    { cle: "whatsapp", libelle: "WhatsApp", icone: "Chat", href: `${BASE}/whatsapp`, compte: waNonLus },
    { cle: "mails", libelle: "Mails", icone: "Email", href: `${BASE}/mails`, compte: mailsNonLus },
    { cle: "pilotage", libelle: "Pilotage", icone: "PieChart", href: "/omega" },
  ];
  const favoris = useFavorisTeo();
  const titreVue = "Vue d'ensemble";
  const vueEpinglee = favoris.estEpingle("vue", "teo-ensemble");
  const epingles = favoris.favoris.filter((x) => !(x.type === "vue" && x.id === "teo-ensemble"));
  const pilules = (avecChevron: boolean) =>
    aller.map((x) => (
      <Link key={x.cle} href={x.href} className="dal-h-pilule">
        <span className="dal-h-pilule-icone">
          <DalIcone nom={x.icone} />
        </span>
        <span>{x.libelle}</span>
        {x.compte !== undefined ? <span className="dal-h-pilule-compte">{x.compte}</span> : null}
        {avecChevron ? <DalIcone nom="Chevron" className="dal-h-chevron" /> : null}
      </Link>
    ));
  const quandRdv = (r: RendezVous) => (r.journee ? "Toute la journée" : `${heureLocale(r.debut)} - ${heureLocale(r.fin)}`);
  const relance = (c: ClientTeo) => (c.prochaine_date === auj ? "aujourd'hui" : c.prochaine_date ? `en retard depuis le ${c.prochaine_date.slice(8, 10)}/${c.prochaine_date.slice(5, 7)}` : "");
  const branchement = (etat: string, ok: string, absent: string): { texte: string; icone: NomDalIcone } =>
    etat === "ok" ? { texte: ok, icone: "IssueStatusDone" } : etat === "absent" || etat === "sans_table" ? { texte: absent, icone: "IssueStatusTodo" } : etat === "portee" ? { texte: "Jeton Google sans la boîte : relancer outils/jeton-google.mjs", icone: "Alert" } : { texte: "En erreur : voir la page", icone: "Alert" };
  const bTableau = branchement(d.connexions.tableau, `Tableau des associés : ${d.connexions.compteTableau ?? "branché"}`, "Tableau des associés : à brancher (vos clients et rendez-vous y sont)");
  const bGoogle = branchement(d.connexions.google, `Gmail et Agenda : ${d.connexions.adresse ?? "branchés"}`, "Gmail et Agenda : pas branchés (GOOGLE_OAUTH_*)");
  const agendaBranche = d.connexions.tableau === "ok" || d.connexions.google === "ok";
  const bWa = branchement(d.connexions.whatsapp, "WhatsApp : branché", d.connexions.whatsapp === "sans_table" ? "WhatsApp : la table n'existe pas encore (schema-whatsapp.sql)" : "WhatsApp : lecture seule (WHATSAPP_TOKEN absent)");

  return (
    <DalCarte>
      <h1 className="v2-sr">Mon espace</h1>
      <header className="dal-tete">
        <div className="dal-ligne1">
          <Link href={BASE} className="dal-fil" aria-current="page">
            <DalIcone nom="CurrentUser" style={{ color: "var(--dal-equipe)" }} />
            <span>Mon espace</span>
          </Link>
          <button
            type="button"
            className="dal-rond"
            role="switch"
            aria-checked={vueEpinglee}
            aria-label={vueEpinglee ? `Désépingler « ${titreVue} »` : `Épingler « ${titreVue} »`}
            title={vueEpinglee ? `Désépingler « ${titreVue} »` : `Épingler « ${titreVue} » dans les épinglés`}
            onClick={() => favoris.basculer({ type: "vue", id: "teo-ensemble", titre: titreVue, href: BASE })}
          >
            {vueEpinglee ? <EtoilePleine /> : <DalIcone nom="Etoile" taille={14} />}
          </button>
          <DalMenu
            libelle="Actions sur mon espace"
            options={[
              { libelle: "Nouveau client", icone: "Plus", action: ouvrirNouveau },
              { libelle: "Ouvrir le pilotage", icone: "PieChart", href: "/omega" },
              { libelle: "Réglages de l'espace", icone: "Roue", href: `${RACINE}/reglages` },
            ]}
          />
          <span className="dal-pousse" />
          <button type="button" className="dal-rond" aria-label="Copier le lien de la page" title="Copier le lien de la page" onClick={copierLien}>
            <DalIcone nom="LienUrl" />
          </button>
        </div>
        <nav className="dal-ligne2" aria-label="Vues">
          <Link href={BASE} scroll={false} className="dal-onglet" aria-current="page">
            Vue d&apos;ensemble
          </Link>
          <Link href={`${BASE}/clients`} className="dal-onglet">
            Clients
          </Link>
          <Link href={`${BASE}/agenda`} className="dal-onglet">
            Agenda
          </Link>
        </nav>
      </header>

      <div className="dal-defile">
        <div className="dal-h-corps">
          <div className="dal-h-principal">
            <div className="dal-h-titre">
              <span className="dal-h-tuile" aria-hidden="true">
                <DalIcone nom="CurrentUser" taille={24} />
              </span>
              <p className="dal-h-nom">Mon espace</p>
            </div>
            <div className="dal-h-description">
              <p>Vos clients et prospects, votre agenda, vos conversations WhatsApp et votre boîte mail : tout ce qui est à vous, au même endroit.</p>
            </div>
            <nav className="dal-h-replis" aria-label="Aller à">
              {pilules(false)}
            </nav>

            {epingles.length ? (
              <section className="dal-h-section" aria-labelledby="dal-h-epingles">
                <div className="dal-h-section-tete">
                  <h2 id="dal-h-epingles" className="dal-h-section-titre">
                    Épinglés
                  </h2>
                </div>
                <ul className="dal-h-liste">
                  {epingles.map((x) => (
                    <li key={`${x.type}:${x.id}`}>
                      <Link href={x.href} className="dal-h-rangee" title="Retirez-le avec l'étoile de sa page">
                        <DalIcone nom={ICONE_EPINGLE[x.type] ?? "Page"} />
                        <span className="dal-h-rangee-texte">{x.titre}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="dal-h-section" aria-labelledby="dal-h-relancer">
              <div className="dal-h-section-tete">
                <h2 id="dal-h-relancer" className="dal-h-section-titre">
                  À relancer
                </h2>
                <Link href={`${BASE}/clients?relancer=1`} className="dal-rond" aria-label="Voir tous les clients à relancer" title="Voir tous les clients à relancer">
                  <DalIcone nom="Section" />
                </Link>
              </div>
              {aRelancer.length === 0 ? (
                <p className="dal-h-aide">Personne à relancer : chaque prochaine action a une date à venir.</p>
              ) : (
                <ul className="dal-h-liste">
                  {aRelancer.map((c) => (
                    <li key={c.id}>
                      <Link href={`${BASE}/clients?client=${encodeURIComponent(c.id)}`} className="dal-h-rangee" title={c.prochaine_action ?? undefined}>
                        <DalIcone nom={c.prochaine_date && c.prochaine_date < auj ? "Alert" : "Alarm"} />
                        <span className="dal-h-rangee-texte">
                          {c.nom}
                          {c.entreprise && c.entreprise !== c.nom ? ` (${c.entreprise})` : ""} : {c.prochaine_action ?? "à relancer"} · {relance(c)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="dal-h-section" aria-labelledby="dal-h-jour">
              <div className="dal-h-section-tete">
                <h2 id="dal-h-jour" className="dal-h-section-titre">
                  Aujourd&apos;hui
                </h2>
                <Link href={`${BASE}/agenda`} className="dal-rond" aria-label="Voir l'agenda" title="Voir l'agenda">
                  <DalIcone nom="Section" />
                </Link>
              </div>
              {!agendaBranche && enReel ? (
                <p className="dal-h-aide">
                  {bTableau.texte}.{" "}
                  <button type="button" className="dal-h-lien" onClick={ouvrirBrancher}>
                    Brancher
                  </button>
                </p>
              ) : ceJour.length === 0 ? (
                <p className="dal-h-aide">Rien dans l&apos;agenda aujourd&apos;hui.</p>
              ) : (
                <ul className="dal-h-liste">
                  {ceJour.map((r) => (
                    <li key={r.id}>
                      <Link href={`${BASE}/agenda?rdv=${encodeURIComponent(r.id)}`} className="dal-h-rangee" title={r.lieu ?? undefined}>
                        <DalIcone nom={r.visio ? "Camera" : "Calendar"} />
                        <span className="dal-h-rangee-texte">
                          {quandRdv(r)} · {r.titre}
                          {r.lieu ? ` · ${r.lieu}` : ""}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="dal-h-section" aria-labelledby="dal-h-clients">
              <div className="dal-h-section-tete">
                <h2 id="dal-h-clients" className="dal-h-section-titre">
                  Vos clients
                </h2>
                <button type="button" className="dal-rond" aria-label="Nouveau client" title="Nouveau client" onClick={ouvrirNouveau}>
                  <DalIcone nom="Plus" />
                </button>
                <Link href={`${BASE}/clients`} className="dal-rond" aria-label="Voir tous les clients" title="Voir tous les clients">
                  <DalIcone nom="Section" />
                </Link>
              </div>
              {d.connexions.tableau !== "ok" && enReel ? (
                <p className="dal-h-aide">
                  {bTableau.texte}.{" "}
                  <button type="button" className="dal-h-lien" onClick={ouvrirBrancher}>
                    Brancher
                  </button>
                </p>
              ) : recents.length === 0 ? (
                <p className="dal-h-aide">Aucun client suivi. Ajoutez le premier : un nom suffit.</p>
              ) : (
                <ul className="dal-h-liste">
                  {recents.map((c) => (
                    <li key={c.id}>
                      <Link href={`${BASE}/clients?client=${encodeURIComponent(c.id)}`} className="dal-h-rangee">
                        <DalIcone nom={c.type === "Client" ? "Briefcase" : c.type === "Partenaire" ? "Users" : "Page"} />
                        <span className="dal-h-rangee-texte">
                          {c.entreprise && c.entreprise !== c.nom ? `${c.entreprise} · ${c.nom}` : c.nom} · {c.etape}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="dal-h-droite" aria-label="Vous, raccourcis et branchements">
            <div className="dal-h-droite-bloc">
              <section className="dal-h-droite-section">
                <h2 className="dal-h-libelle">Membres</h2>
                <div className="dal-h-membres">
                  <Link href="/omega" className="dal-h-membre" title="Vous, le gérant : le pilotage">
                    <span className="dal-h-avatar">TP</span>
                    <DalIcone nom="Chevron" taille={12} />
                  </Link>
                  <button type="button" className="dal-rond" aria-label="Nouveau client" title="Nouveau client" onClick={ouvrirNouveau}>
                    <DalIcone nom="Plus" />
                  </button>
                </div>
              </section>
              <section className="dal-h-droite-section">
                <h2 className="dal-h-libelle">Aller à</h2>
                <nav className="dal-h-aller" aria-label="Aller à">
                  {pilules(true)}
                </nav>
              </section>
              <section className="dal-h-droite-section">
                <h2 className="dal-h-libelle">Branchements</h2>
                <nav className="dal-h-aller" aria-label="Branchements">
                  {d.connexions.tableau === "ok" ? (
                    <Link href={`${BASE}/clients`} className="dal-h-pilule" title="Vos clients et vos rendez-vous viennent du tableau des associés">
                      <span className="dal-h-pilule-icone">
                        <DalIcone nom={bTableau.icone} />
                      </span>
                      <span>{bTableau.texte}</span>
                      <DalIcone nom="Chevron" className="dal-h-chevron" />
                    </Link>
                  ) : (
                    <button type="button" className="dal-h-pilule" onClick={ouvrirBrancher} title={d.connexions.detail ?? undefined}>
                      <span className="dal-h-pilule-icone">
                        <DalIcone nom={bTableau.icone} />
                      </span>
                      <span>{bTableau.texte}</span>
                      <DalIcone nom="Chevron" className="dal-h-chevron" />
                    </button>
                  )}
                  <Link href={`${BASE}/mails`} className="dal-h-pilule" title={d.connexions.detail ?? undefined}>
                    <span className="dal-h-pilule-icone">
                      <DalIcone nom={bGoogle.icone} />
                    </span>
                    <span>{bGoogle.texte}</span>
                    <DalIcone nom="Chevron" className="dal-h-chevron" />
                  </Link>
                  <Link href={`${BASE}/whatsapp`} className="dal-h-pilule">
                    <span className="dal-h-pilule-icone">
                      <DalIcone nom={bWa.icone} />
                    </span>
                    <span>{bWa.texte}</span>
                    <DalIcone nom="Chevron" className="dal-h-chevron" />
                  </Link>
                </nav>
              </section>
            </div>
          </aside>
        </div>
      </div>

      <Dialog open={nouveau} onOpenChange={(o) => !o && setNouveau(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <UserRound width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Nouveau client</DialogTitle>
            <DialogDescription>Une personne et son entreprise, l&apos;étape où elle en est. La fiche s&apos;écrit dans vos contacts (le pilotage la voit aussi).</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">
                  Nom <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} placeholder="Marc Rolland" autoFocus />
                </label>
                <label className="rv-libelle">
                  Entreprise
                  <input className="rv-champ" value={f.entreprise} onChange={(e) => setF({ ...f, entreprise: e.target.value })} placeholder="Rolland Bâtiment" />
                </label>
              </div>
              <div className="esp-form-ligne">
                <label className="rv-libelle">
                  Type
                  <select className="rv-champ" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
                    {TYPES_CLIENT.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="rv-libelle">
                  Étape
                  <select className="rv-champ" value={f.etape} onChange={(e) => setF({ ...f, etape: e.target.value })}>
                    {ETAPES_CLIENT.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="esp-form-ligne">
                <label className="rv-libelle">
                  Téléphone
                  <input className="rv-champ" type="tel" value={f.telephone} onChange={(e) => setF({ ...f, telephone: e.target.value })} placeholder="+590 690 00 00 00" />
                </label>
                <label className="rv-libelle">
                  Courriel
                  <input className="rv-champ" type="email" value={f.courriel} onChange={(e) => setF({ ...f, courriel: e.target.value })} placeholder="nom@entreprise.gp" />
                </label>
              </div>
              <div className="esp-form-ligne">
                <label className="rv-libelle">
                  Commune
                  <input className="rv-champ" value={f.commune} onChange={(e) => setF({ ...f, commune: e.target.value })} placeholder="Baie-Mahault" />
                </label>
                <label className="rv-libelle">
                  Secteur
                  <input className="rv-champ" value={f.secteur} onChange={(e) => setF({ ...f, secteur: e.target.value })} placeholder="BTP, dentaire, avocats…" />
                </label>
              </div>
              {erreur ? (
                <Avis teinte="rouge" role="alert">
                  {erreur}
                </Avis>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!f.nom.trim() || envoi} onClick={() => void creer()}>
              {envoi ? <Loader variant="spin" /> : null} Ajouter le client
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={brancher} onOpenChange={(o) => !o && fermerBrancher()}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <KeyRound width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Brancher le tableau des associés</DialogTitle>
            <DialogDescription>
              Vos clients (le pipeline) et vos rendez-vous vivent dans le tableau des associés. Connectez-vous ici avec le compte que vous y utilisez, une fois : Mon espace lit et écrit ensuite en votre nom, dans le même tableau. Le mot de passe n&apos;est gardé nulle part, seule la session reste, dans ce navigateur.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <form
              className="esp-form"
              onSubmit={(e) => {
                e.preventDefault();
                void connecterTableau();
              }}
            >
              <div className="esp-form-ligne">
                <label className="rv-libelle">
                  Courriel du tableau
                  <input className="rv-champ" type="email" autoComplete="username" value={compte.courriel} onChange={(e) => setCompte({ ...compte, courriel: e.target.value })} placeholder="prenom@omegaai.fr" autoFocus />
                </label>
                <label className="rv-libelle">
                  Mot de passe
                  <input className="rv-champ" type="password" autoComplete="current-password" value={compte.mdp} onChange={(e) => setCompte({ ...compte, mdp: e.target.value })} />
                </label>
              </div>
              {erreurTableau ? (
                <Avis teinte="rouge" role="alert">
                  {erreurTableau}
                </Avis>
              ) : null}
              {d.connexions.tableau === "ok" && enReel ? (
                <p className="dal-h-aide">
                  Déjà branché avec {d.connexions.compteTableau}.{" "}
                  <button type="button" className="dal-h-lien" onClick={() => void deconnecterTableau()}>
                    Débrancher
                  </button>
                </p>
              ) : null}
              <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
            </form>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!compte.courriel.trim() || !compte.mdp || brancheEnCours} onClick={() => void connecterTableau()}>
              {brancheEnCours ? <Loader variant="spin" /> : null} Brancher
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DalCarte>
  );
}
