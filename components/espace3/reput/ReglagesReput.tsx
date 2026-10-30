"use client";

/* ══════════════════════════════════════════════════════════════════════
   REPUT « Réglages et avis », sur la page Settings de Plain (28/10/2026,
   demande de Teo : « reproduis-les à l'identique »). Briques :
   ../lin/Reglages.tsx (relevé : scratchpad/releve-plain-reglages.md).

     · la vue d'ensemble : trois sections de cartes — Réponses (signature
       et formules, mention automatisée, accusé de réception, par site),
       Avis (demande d'avis, demandes programmées), Données (export à date
       fixe) ; une carte ouvre sa sous-page sur la même route (?section=) ;
     · chaque sous-page garde les contrôles et les gestes de l'écran
       d'avant (components/espace/reput/ReglagesAvis.tsx, ReglagesSites.tsx,
       ExportProgramme.tsx) : les mêmes champs, le même « Enregistrer »
       (porte reput_regler, tous les réglages d'un coup), « Programmer la
       demande d'avis » (reput_programmer_avis), « Avis reçu »
       (reput_avis_recu), « Régler ce site » / « Revenir à l'organisation »
       (reput_regler, reput_suivre_organisation), « Programmer l'export » /
       « Suspendre » / « Télécharger » (reput_programmer_export).

   Mêmes données que la page d'avant : l'exemple (exemples.ts, modifié en
   mémoire) ou la base réelle (portes.ts, sous RLS), au choix de la source.
   ══════════════════════════════════════════════════════════════════════ */

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Bot, Building2, CalendarClock, Download, MailCheck, PenLine, Plus, Star } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { dateCourte } from "@/components/espace3/base/format";
import { useSource } from "@/components/espace3/base/source";
import { useTempsReel } from "@/components/espace3/base/tempsReel";
import { useMonte } from "@/components/espace3/horloge";
import { mondeExemple } from "@/components/espace3/base/reput/exemples";
import { telecharger } from "@/components/espace3/base/reput/export";
import {
  avisRecu,
  chargerExports,
  chargerMonde,
  chargerSites,
  contenuExport,
  monClient,
  programmerAvis,
  programmerExport,
  regler,
  reglerSite,
  suivreOrganisation,
  type ExportFait,
  type ProgrammeExport,
  type ReglageSite,
} from "@/components/espace3/base/reput/portes";
import type { Avis, Client, Monde, Reglages } from "@/components/espace3/base/reput/types";
import { useToast } from "../Toasts";
import {
  BadgeReglage,
  BlocReglages,
  BoiteReglage,
  BoutonReglage,
  CaseReglage,
  ChampReglage,
  CompteursReglage,
  LigneReglage,
  SelectReglage,
  SousPageReglages,
  VideReglage,
  VueEnsembleReglages,
  type SectionReglage,
} from "../lin/Reglages";
import { RACINE } from "../modules";

const CHEMIN = `${RACINE}/reput/reglages`;
const TITRE = "Réglages et avis";
const SOUS_TITRE = "La signature, le ton et l'accusé de réception de chaque réponse préparée, et les demandes d'avis après règlement.";

type Section = "signature" | "mention" | "accuse" | "sites" | "avis" | "programmes" | "export";
const SECTIONS: Section[] = ["signature", "mention", "accuse", "sites", "avis", "programmes", "export"];
const href = (s?: Section) => (s ? `${CHEMIN}?section=${s}` : CHEMIN);

const STATUTS_AVIS: Record<Avis["statut"], { libelle: string; teinte: "vert" | "bleu" | "ambre" | "gris" }> = {
  programme: { libelle: "Programmée", teinte: "bleu" },
  sollicite: { libelle: "Demandée", teinte: "ambre" },
  termine: { libelle: "Sans suite", teinte: "gris" },
  avis_recu: { libelle: "Avis reçu", teinte: "vert" },
  ecarte: { libelle: "Écartée (moins de six mois)", teinte: "gris" },
};
const CANAUX: Record<Avis["canal"], string> = { email: "Courriel", whatsapp: "WhatsApp", sms: "SMS" };
const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

/* ——— les mêmes exemples que les composants d'avant (ReglagesSites, ExportProgramme) ——— */
const SITES_EXEMPLE: ReglageSite[] = [
  {
    entite_id: "00000000-0000-4000-8000-00000000c3a1",
    nom: "Soléa Market Jarry",
    type: "site",
    principale: false,
    source: "propres",
    signature: "L'équipe de Soléa Market Jarry",
    ton: "vouvoiement",
    formule_appel: "Bonjour,",
    formule_politesse: "À bientôt dans votre magasin,",
  },
  {
    entite_id: "00000000-0000-4000-8000-0000000000e6",
    nom: "Brico Soléa Martinique",
    type: "site",
    principale: false,
    source: "propres",
    signature: "L'équipe de Brico Soléa Martinique",
    ton: "vouvoiement",
    formule_appel: "Bonjour,",
    formule_politesse: "Bien cordialement,",
  },
  {
    entite_id: "00000000-0000-4000-8000-0000000000e4",
    nom: "Soléa Auto Guadeloupe",
    type: "site",
    principale: false,
    source: "propres",
    signature: "L'équipe de l'atelier Soléa Auto Guadeloupe",
    ton: "vouvoiement",
    formule_appel: "Bonjour,",
    formule_politesse: "Bien cordialement,",
  },
  {
    entite_id: "00000000-0000-4000-8000-00000000c3a2",
    nom: "Soléa Location",
    type: "site",
    principale: false,
    source: "organisation",
    signature: "Bien cordialement,\nL'équipe du Groupe Soléa",
    ton: "vouvoiement",
    formule_appel: "Bonjour,",
    formule_politesse: "Bien cordialement,",
  },
];
const EXPORTS_EXEMPLE: { programmes: ProgrammeExport[]; exports: ExportFait[] } = {
  programmes: [{ id: "00000000-0000-4000-8000-00000000c3f1", entite_id: null, frequence: "hebdomadaire", jour: 1, actif: true }],
  exports: [
    {
      id: "00000000-0000-4000-8000-00000000c3f2",
      entite_id: null,
      periode_du: "2026-10-12",
      periode_au: "2026-10-18",
      lignes: 412,
      nom_fichier: "reput-demandes-2026-10-12-au-2026-10-18.csv",
      cree_le: "2026-10-19T05:00:00Z",
    },
  ],
};

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

export function ReglagesReput() {
  const params = useSearchParams();
  const brut = params.get("section");
  const section = SECTIONS.includes(brut as Section) ? (brut as Section) : null;
  const toast = useToast();
  const { source } = useSource();

  /* ——— le monde, comme dans l'écran d'avant (EcranReput) ——— */
  const [local, setLocal] = useState<Monde>(() => mondeExemple());
  const [reel, setReel] = useState<{ monde: Monde; client: Client } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    try {
      const client = await monClient();
      if (!client) throw new Error("Aucun compte rattaché à cette session.");
      setReel({ monde: await chargerMonde(client), client });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    }
  }, []);
  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);
  useTempsReel(["reput_demandes", "reput_reponses", "reput_connaissances"], source === "reelle", () => void charger());
  const monte = useMonte();
  const monde: Monde | null = source === "exemple" ? (monte ? local : null) : (reel?.monde ?? null);
  const client = source === "reelle" ? (reel?.client ?? null) : null;
  const role = source === "exemple" ? "valideur" : (client?.role ?? "lecteur");
  const dirige = source === "exemple" || role === "gerant" || role === "admin";
  const membre = role !== "lecteur";
  const modifierLocal = useCallback((f: (m: Monde) => Monde) => setLocal((m) => f(m)), []);

  /* ——— les réglages en cours de saisie (ReglagesAvis d'avant) : ils survivent au passage d'une sous-page à l'autre ——— */
  const [r, setR] = useState<Reglages | null>(null);
  const cleReglages = `${source}:${monde?.reglages?.id ?? ""}`;
  const [cleVue, setCleVue] = useState<string | null>(null);
  if (monde && cleVue !== cleReglages) {
    setCleVue(cleReglages);
    setR(monde.reglages);
  }
  const [nouvel, setNouvel] = useState({ canal: "email", adresse: "", nom: "", reference: "", regle_le: "" });
  const [envoi, setEnvoi] = useState<string | null>(null);

  const agir = async (cle: string, reelF: () => Promise<unknown>, localF: (m: Monde) => Monde, message: string) => {
    setEnvoi(cle);
    try {
      if (source === "reelle") {
        await reelF();
        await charger();
      } else modifierLocal(localF);
      toast(message, "vert");
    } catch (e) {
      toast(e instanceof Error ? e.message : "La base n'a pas répondu.", "rouge");
    } finally {
      setEnvoi(null);
    }
  };

  const enregistrer = () => {
    if (!r) return;
    const champs: Partial<Reglages> = {
      signature: r.signature,
      formule_appel: r.formule_appel,
      formule_politesse: r.formule_politesse,
      ton: r.ton,
      mention_automatisee: r.mention_automatisee,
      langues: r.langues,
      accuse: r.accuse,
      texte_accuse: r.texte_accuse,
      lien_avis: r.lien_avis,
      texte_avis: r.texte_avis,
      ...(r.avis_auto_reglement !== undefined ? { avis_auto_reglement: r.avis_auto_reglement } : {}),
      ...(r.phrase_transfert !== undefined ? { phrase_transfert: r.phrase_transfert } : {}),
    };
    void agir(
      "reglages",
      () => regler(client!.client_id, champs),
      (m) => ({ ...m, reglages: r }),
      "Réglages enregistrés : ils valent dès la prochaine réponse.",
    );
  };

  const programmer = () =>
    void agir(
      "avis",
      async () => {
        const x = await programmerAvis(client!.client_id, nouvel.canal, nouvel.adresse.trim(), nouvel.nom.trim() || null, nouvel.reference.trim() || null, nouvel.regle_le || null);
        if (x.statut === "ecarte") throw new Error(x.motif ?? "Cette personne a déjà été sollicitée depuis moins de six mois.");
      },
      (m) => ({
        ...m,
        avis: [
          {
            id: crypto.randomUUID(),
            canal: nouvel.canal as Avis["canal"],
            adresse: nouvel.adresse.trim(),
            nom: nouvel.nom.trim() || null,
            reference: nouvel.reference.trim() || null,
            regle_le: nouvel.regle_le || new Date().toISOString().slice(0, 10),
            statut: "programme",
            motif: null,
            prochain_le: null,
            envois: [],
            cree_le: new Date().toISOString(),
          },
          ...m.avis,
        ],
      }),
      "Demande d'avis programmée : elle part trois jours après le règlement, relancée deux fois au plus.",
    );

  /* ——— le bouton « Enregistrer » des sous-pages de réglages (le même geste qu'avant, pour tous les champs) ——— */
  const enregistrement = r ? (
    dirige ? (
      <div className="pr-actions">
        <BoutonReglage plein disabled={envoi !== null || !r.signature.trim()} onClick={enregistrer}>
          {envoi === "reglages" ? <Loader variant="spin" /> : null} Enregistrer
        </BoutonReglage>
      </div>
    ) : (
      <p className="pr-note">Le gérant ou un administrateur change ces réglages.</p>
    )
  ) : null;

  /* ——— les états communs : chargement, erreur, REPUT absent ——— */
  const etat = (
    <>
      {erreur ? (
        <p className="pr-erreur" role="alert">
          La base réelle n&apos;a pas répondu. {erreur}
        </p>
      ) : null}
      {source === "reelle" && !reel && !erreur ? (
        <p className="pr-chargement" aria-busy="true">
          Lecture des réglages…
        </p>
      ) : null}
    </>
  );
  const absent = monde && !r ? <VideReglage icone={<Bot />} titre="REPUT n'est pas encore installé" texte="Il s'installe à la première demande reçue." /> : null;

  const nAvis = monde?.avis.length ?? 0;
  const nEnCours = monde?.avis.filter((a) => a.statut === "programme" || a.statut === "sollicite").length ?? 0;

  /* ——— la vue d'ensemble ——— */
  if (!section) {
    const sections: SectionReglage[] = [
      {
        cle: "reponses",
        titre: "Réponses",
        description: "La signature, les formules, le ton et les langues de chaque réponse préparée.",
        cartes: [
          { cle: "signature", icone: <PenLine />, titre: "Signature et formules", description: "Signature, formules d'appel et de politesse, ton et langues de réponse", href: href("signature") },
          { cle: "mention", icone: <Bot />, titre: "Mention de la réponse automatisée", description: "La phrase, dans vos termes, qui dit qu'un assistant a préparé la réponse", href: href("mention") },
          { cle: "accuse", icone: <MailCheck />, titre: "Accusé de réception", description: "Dans la minute quand la réponse attend votre validation, et la phrase de transfert à un service", href: href("accuse") },
          { cle: "sites", icone: <Building2 />, titre: "Par site", description: "Un site reprend la signature, le ton et les formules de l'organisation tant que vous ne le réglez pas lui-même", href: href("sites") },
        ],
      },
      {
        cle: "avis",
        titre: "Avis",
        description: "La demande part trois jours après le règlement, puis elle est relancée deux fois au plus. La même personne n'est plus sollicitée avant six mois.",
        cartes: [
          { cle: "avis", icone: <Star />, titre: "Demande d'avis", description: "Le lien de votre page d'avis, le texte envoyé et l'envoi automatique après chaque facture réglée", href: href("avis") },
          {
            cle: "programmes",
            icone: <CalendarClock />,
            titre: "Demandes programmées",
            description: "Programmer une demande après un règlement, suivre les envois et noter les avis reçus",
            href: href("programmes"),
            apres: monde ? <BadgeReglage teinte={nEnCours ? "bleu" : "gris"}>{nEnCours ? `${nEnCours} en cours` : pluriel(nAvis, "demande")}</BadgeReglage> : undefined,
          },
        ],
      },
      ...(dirige
        ? [
            {
              cle: "donnees",
              titre: "Données",
              description: "Le tableau des demandes de la période échue, préparé à date fixe et téléchargeable ici.",
              cartes: [{ cle: "export", icone: <Download />, titre: "Export à date fixe", description: "Chaque semaine ou chaque mois, le fichier de la période échue est prêt ici, connecté", href: href("export") }],
            } satisfies SectionReglage,
          ]
        : []),
    ];
    return (
      <VueEnsembleReglages
        titre={TITRE}
        sousTitre={SOUS_TITRE}
        sections={sections}
        avant={
          <>
            {etat}
            {absent}
          </>
        }
      />
    );
  }

  const retour = { href: href(), libelle: TITRE };

  /* ——— Signature et formules ——— */
  if (section === "signature") {
    return (
      <SousPageReglages retour={retour} titre="Signature et formules" sousTitre="La signature, les formules d'appel et de politesse, le ton et les langues de chaque réponse préparée.">
        {etat}
        {absent}
        {r ? (
          <>
            <ChampReglage libelle="Signature" aide="Sous chaque réponse, telle quelle.">
              <textarea className="pr-textarea" rows={2} disabled={!dirige} value={r.signature} onChange={(e) => setR({ ...r, signature: e.target.value })} />
            </ChampReglage>
            <ChampReglage libelle="Formule d'appel" aide="Le premier mot de la réponse.">
              <input className="pr-input" disabled={!dirige} value={r.formule_appel} onChange={(e) => setR({ ...r, formule_appel: e.target.value })} />
            </ChampReglage>
            <ChampReglage libelle="Formule de politesse" aide="Juste avant la signature.">
              <input className="pr-input" disabled={!dirige} value={r.formule_politesse} onChange={(e) => setR({ ...r, formule_politesse: e.target.value })} />
            </ChampReglage>
            <ChampReglage libelle="Ton" aide="Vouvoiement ou tutoiement, pour toutes les réponses.">
              <SelectReglage disabled={!dirige} value={r.ton} onChange={(e) => setR({ ...r, ton: e.target.value as Reglages["ton"] })}>
                <option value="vouvoiement">Vouvoiement</option>
                <option value="tutoiement">Tutoiement</option>
              </SelectReglage>
            </ChampReglage>
            <ChampReglage libelle="Langues de réponse" aide="Les codes, séparés par des virgules (fr, en…).">
              <input
                className="pr-input"
                disabled={!dirige}
                value={r.langues.join(", ")}
                onChange={(e) =>
                  setR({
                    ...r,
                    langues: e.target.value
                      .split(",")
                      .map((x) => x.trim().toLowerCase())
                      .filter(Boolean),
                  })
                }
              />
            </ChampReglage>
            {enregistrement}
          </>
        ) : null}
      </SousPageReglages>
    );
  }

  /* ——— Mention de la réponse automatisée ——— */
  if (section === "mention") {
    return (
      <SousPageReglages retour={retour} titre="Mention de la réponse automatisée" sousTitre="La phrase, dans vos termes, qui dit au client qu'un assistant a préparé la réponse.">
        {etat}
        {absent}
        {r ? (
          <>
            <ChampReglage libelle="Mention de la réponse automatisée, dans vos termes" aide="Ajoutée à chaque réponse préparée ; vide : la mention par défaut.">
              <input
                className="pr-input"
                disabled={!dirige}
                value={r.mention_automatisee ?? ""}
                onChange={(e) => setR({ ...r, mention_automatisee: e.target.value })}
                placeholder="Réponse préparée par notre assistant, relue par notre équipe."
              />
            </ChampReglage>
            {enregistrement}
          </>
        ) : null}
      </SousPageReglages>
    );
  }

  /* ——— Accusé de réception ——— */
  if (section === "accuse") {
    return (
      <SousPageReglages retour={retour} titre="Accusé de réception" sousTitre="Dans la minute quand la réponse attend votre validation, et la phrase ajoutée quand la demande va à un service.">
        {etat}
        {absent}
        {r ? (
          <>
            <CaseReglage
              libelle="Accusé de réception dans la minute quand la réponse attend votre validation"
              aide="Le client sait que son message est bien arrivé, avant même votre validation."
              disabled={!dirige}
              checked={r.accuse}
              onChange={(e) => setR({ ...r, accuse: e.target.checked })}
            />
            <ChampReglage libelle="Texte de l'accusé" aide="Envoyé tel quel, sous votre signature.">
              <textarea className="pr-textarea" rows={2} disabled={!dirige || !r.accuse} value={r.texte_accuse} onChange={(e) => setR({ ...r, texte_accuse: e.target.value })} />
            </ChampReglage>
            <ChampReglage libelle="Phrase ajoutée quand la demande va à un service" aide="Écrire {service} à la place de son nom ; vide : aucune.">
              <input
                className="pr-input"
                disabled={!dirige || !r.accuse}
                value={r.phrase_transfert ?? ""}
                onChange={(e) => setR({ ...r, phrase_transfert: e.target.value })}
                placeholder="Votre demande est transmise au service {service}, qui revient vers vous."
                data-phrase-transfert
              />
            </ChampReglage>
            {enregistrement}
          </>
        ) : null}
      </SousPageReglages>
    );
  }

  /* ——— Demande d'avis ——— */
  if (section === "avis") {
    return (
      <SousPageReglages retour={retour} titre="Demande d'avis" sousTitre="Le lien de votre page d'avis, le texte envoyé et l'envoi automatique après chaque facture réglée.">
        {etat}
        {absent}
        {r ? (
          <>
            <ChampReglage libelle="Lien de votre page d'avis" aide="En https : la page Google, Trustpilot… où le client laisse son avis.">
              <input className="pr-input" disabled={!dirige} value={r.lien_avis ?? ""} onChange={(e) => setR({ ...r, lien_avis: e.target.value })} placeholder="https://g.page/r/…/review" />
            </ChampReglage>
            <CaseReglage
              libelle="Demander un avis automatiquement après chaque facture réglée"
              aide="À partir des relances d'impayés CASHD : trois jours après le règlement, deux relances au plus."
              disabled={!dirige}
              checked={!!r.avis_auto_reglement}
              onChange={(e) => setR({ ...r, avis_auto_reglement: e.target.checked })}
            />
            <ChampReglage libelle="Texte de la demande d'avis" aide="Suivi du lien de votre page d'avis.">
              <textarea className="pr-textarea" rows={2} disabled={!dirige} value={r.texte_avis} onChange={(e) => setR({ ...r, texte_avis: e.target.value })} />
            </ChampReglage>
            {enregistrement}
          </>
        ) : null}
      </SousPageReglages>
    );
  }

  /* ——— Demandes programmées ——— */
  if (section === "programmes") {
    const avis = monde?.avis ?? [];
    const compte = (s: Avis["statut"][]) => avis.filter((a) => s.includes(a.statut)).length;
    return (
      <SousPageReglages
        retour={retour}
        titre="Demandes programmées"
        sousTitre="La demande part trois jours après le règlement, puis elle est relancée deux fois au plus. La même personne n'est plus sollicitée avant six mois."
      >
        {etat}
        {monde ? (
          <>
            {membre ? (
              <BlocReglages icone={<Plus aria-hidden="true" />} titre="Programmer une demande" description="Après un règlement déclaré à la main : la demande suit le même calendrier.">
                <ChampReglage libelle="Canal">
                  <SelectReglage value={nouvel.canal} onChange={(e) => setNouvel({ ...nouvel, canal: e.target.value })}>
                    <option value="email">Courriel</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                  </SelectReglage>
                </ChampReglage>
                <ChampReglage libelle={nouvel.canal === "email" ? "Adresse" : "Numéro"} obligatoire>
                  <input className="pr-input" value={nouvel.adresse} onChange={(e) => setNouvel({ ...nouvel, adresse: e.target.value })} />
                </ChampReglage>
                <ChampReglage libelle="Nom du client">
                  <input className="pr-input" value={nouvel.nom} onChange={(e) => setNouvel({ ...nouvel, nom: e.target.value })} />
                </ChampReglage>
                <ChampReglage libelle="Facture ou intervention">
                  <input className="pr-input" value={nouvel.reference} onChange={(e) => setNouvel({ ...nouvel, reference: e.target.value })} placeholder="F-2026-118" />
                </ChampReglage>
                <ChampReglage libelle="Réglée le" aide="Vide : aujourd'hui.">
                  <input className="pr-input" type="date" value={nouvel.regle_le} onChange={(e) => setNouvel({ ...nouvel, regle_le: e.target.value })} />
                </ChampReglage>
                <div className="pr-actions">
                  <BoutonReglage plein disabled={envoi !== null || nouvel.adresse.trim().length < 3} onClick={programmer}>
                    {envoi === "avis" ? <Loader variant="spin" /> : null} Programmer la demande d&apos;avis
                  </BoutonReglage>
                </div>
              </BlocReglages>
            ) : null}
            <BlocReglages icone={<Star aria-hidden="true" />} titre="Demandes d'avis">
              <CompteursReglage
                items={[
                  { cle: "programme", nombre: compte(["programme"]), libelle: "Programmées" },
                  { cle: "sollicite", nombre: compte(["sollicite"]), libelle: "Demandées" },
                  { cle: "recu", nombre: compte(["avis_recu"]), libelle: "Avis reçus" },
                ]}
              />
              {avis.length === 0 ? (
                <VideReglage icone={<Star />} titre="Aucune demande d'avis" texte="Elles s'affichent ici dès qu'un règlement est déclaré." />
              ) : (
                <BoiteReglage libelle="Demandes d'avis">
                  {avis.map((a) => (
                    <LigneReglage
                      key={a.id}
                      avatar={(a.nom || a.adresse).trim()[0]?.toUpperCase() ?? "?"}
                      nom={a.nom || a.adresse}
                      second={`${CANAUX[a.canal]} · réglé le ${dateCourte(a.regle_le)}${a.reference ? ` · ${a.reference}` : ""} · ${pluriel(a.envois.length, "envoi")}${
                        a.prochain_le && (a.statut === "programme" || a.statut === "sollicite") ? ` · prochain le ${dateCourte(a.prochain_le)}` : ""
                      }`}
                      droite={
                        <>
                          <BadgeReglage teinte={STATUTS_AVIS[a.statut].teinte}>{STATUTS_AVIS[a.statut].libelle}</BadgeReglage>
                          {membre && (a.statut === "programme" || a.statut === "sollicite") ? (
                            <BoutonReglage
                              petit
                              disabled={envoi !== null}
                              onClick={() =>
                                void agir(
                                  a.id,
                                  () => avisRecu(a.id),
                                  (m) => ({ ...m, avis: m.avis.map((x) => (x.id === a.id ? { ...x, statut: "avis_recu", prochain_le: null } : x)) }),
                                  "Avis noté reçu : plus aucune relance.",
                                )
                              }
                            >
                              {envoi === a.id ? <Loader variant="spin" /> : null} Avis reçu
                            </BoutonReglage>
                          ) : null}
                        </>
                      }
                    />
                  ))}
                </BoiteReglage>
              )}
            </BlocReglages>
          </>
        ) : null}
      </SousPageReglages>
    );
  }

  /* ——— Par site ——— */
  if (section === "sites") {
    return (
      <SousPageReglages
        retour={retour}
        titre="Par site"
        sousTitre="Un site reprend la signature, le ton et les formules de l'organisation tant que vous ne le réglez pas lui-même. Vous ne voyez que les sites de votre périmètre."
      >
        {etat}
        {monde ? <Sites key={source} source={source} client={client} dirige={dirige} envoiGlobal={envoi} /> : null}
      </SousPageReglages>
    );
  }

  /* ——— Export à date fixe ——— */
  return (
    <SousPageReglages
      retour={retour}
      titre="Export à date fixe"
      sousTitre="Le tableau des demandes de la période échue est préparé le jour choisi ; un courriel vous dit qu'il est prêt. Le fichier ne part jamais par courriel : il se télécharge ici."
    >
      {etat}
      {monde ? dirige ? <Export key={`export:${source}`} source={source} client={client} /> : <p className="pr-note">Le gérant ou un administrateur programme l&apos;export.</p> : null}
    </SousPageReglages>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Les réglages par site (ReglagesSites d'avant, mêmes portes)
   ══════════════════════════════════════════════════════════════════════ */
type Brouillon = Pick<ReglageSite, "signature" | "ton" | "formule_appel" | "formule_politesse">;

function Sites({ source, client, dirige, envoiGlobal }: { source: "exemple" | "reelle"; client: Client | null; dirige: boolean; envoiGlobal: string | null }) {
  const toast = useToast();
  const [sites, setSites] = useState<ReglageSite[] | null>(source === "exemple" ? SITES_EXEMPLE : null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [b, setB] = useState<Brouillon | null>(null);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [tour, setTour] = useState(0);

  useEffect(() => {
    if (source === "exemple" || !client) return;
    let vivant = true;
    chargerSites(client.client_id)
      .then((x) => {
        if (vivant) setSites(x);
      })
      .catch((e) => {
        if (vivant) {
          setSites([]);
          toast(e instanceof Error ? e.message : "La base n'a pas répondu.", "rouge");
        }
      });
    return () => {
      vivant = false;
    };
  }, [source, client, tour, toast]);

  if (sites === null)
    return (
      <p className="pr-chargement" aria-busy="true">
        Sites…
      </p>
    );
  const autres = sites.filter((s) => !s.principale);
  if (!autres.length) return <VideReglage icone={<Building2 />} titre="Aucun autre site" texte="Les sites de votre périmètre, hors le principal, se règlent ici." />;
  const occupe = envoi !== null || envoiGlobal !== null;

  const agir = async (cle: string, reel: () => Promise<unknown>, local: (x: ReglageSite[]) => ReglageSite[], message: string) => {
    setEnvoi(cle);
    try {
      if (source === "reelle") {
        await reel();
        setTour((n) => n + 1);
      } else setSites((x) => local(x ?? []));
      toast(message, "vert");
      setOuvert(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : "La base n'a pas répondu.", "rouge");
    } finally {
      setEnvoi(null);
    }
  };

  return (
    <BoiteReglage libelle="Réglages par site">
      {autres.map((s) => (
        <LigneReglage
          key={s.entite_id}
          avatar={<Building2 aria-hidden="true" />}
          nom={s.nom}
          second={`${s.ton === "tutoiement" ? "Tutoiement" : "Vouvoiement"} · signature : ${s.signature}`}
          droite={
            <>
              {s.source === "propres" ? <BadgeReglage teinte="bleu">Réglages propres</BadgeReglage> : <BadgeReglage contour>Suit l&apos;organisation</BadgeReglage>}
              {dirige && ouvert !== s.entite_id ? (
                <>
                  <BoutonReglage
                    petit
                    disabled={occupe}
                    onClick={() => {
                      setOuvert(s.entite_id);
                      setB({ signature: s.signature, ton: s.ton, formule_appel: s.formule_appel, formule_politesse: s.formule_politesse });
                    }}
                  >
                    Régler ce site
                  </BoutonReglage>
                  {s.source === "propres" ? (
                    <BoutonReglage
                      petit
                      disabled={occupe}
                      onClick={() =>
                        void agir(
                          `suivre:${s.entite_id}`,
                          () => suivreOrganisation(client!.client_id, s.entite_id),
                          (x) => x.map((y) => (y.entite_id === s.entite_id ? { ...y, source: "organisation" } : y)),
                          `${s.nom} reprend les réglages de l'organisation.`,
                        )
                      }
                    >
                      {envoi === `suivre:${s.entite_id}` ? <Loader variant="spin" /> : null} Revenir à l&apos;organisation
                    </BoutonReglage>
                  ) : null}
                </>
              ) : null}
            </>
          }
          suite={
            dirige && ouvert === s.entite_id && b ? (
              <div>
                <ChampReglage libelle="Signature du site">
                  <textarea className="pr-textarea" rows={2} value={b.signature} onChange={(e) => setB({ ...b, signature: e.target.value })} />
                </ChampReglage>
                <ChampReglage libelle="Formule d'appel">
                  <input className="pr-input" value={b.formule_appel} onChange={(e) => setB({ ...b, formule_appel: e.target.value })} />
                </ChampReglage>
                <ChampReglage libelle="Formule de politesse">
                  <input className="pr-input" value={b.formule_politesse} onChange={(e) => setB({ ...b, formule_politesse: e.target.value })} />
                </ChampReglage>
                <ChampReglage libelle="Ton">
                  <SelectReglage value={b.ton} onChange={(e) => setB({ ...b, ton: e.target.value as ReglageSite["ton"] })}>
                    <option value="vouvoiement">Vouvoiement</option>
                    <option value="tutoiement">Tutoiement</option>
                  </SelectReglage>
                </ChampReglage>
                <div className="pr-actions">
                  <BoutonReglage
                    plein
                    disabled={occupe || !b.signature.trim()}
                    onClick={() =>
                      void agir(
                        `regler:${s.entite_id}`,
                        () => reglerSite(client!.client_id, s.entite_id, b),
                        (x) => x.map((y) => (y.entite_id === s.entite_id ? { ...y, ...b, source: "propres" } : y)),
                        `${s.nom} a désormais ses propres réglages.`,
                      )
                    }
                  >
                    {envoi === `regler:${s.entite_id}` ? <Loader variant="spin" /> : null} Enregistrer pour ce site
                  </BoutonReglage>
                  <BoutonReglage disabled={occupe} onClick={() => setOuvert(null)}>
                    Annuler
                  </BoutonReglage>
                </div>
              </div>
            ) : null
          }
        />
      ))}
    </BoiteReglage>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   L'export à date fixe (ExportProgramme d'avant, mêmes portes)
   ══════════════════════════════════════════════════════════════════════ */
function Export({ source, client }: { source: "exemple" | "reelle"; client: Client | null }) {
  const toast = useToast();
  const [etat, setEtat] = useState<typeof EXPORTS_EXEMPLE | null>(source === "exemple" ? EXPORTS_EXEMPLE : null);
  const [frequence, setFrequence] = useState<ProgrammeExport["frequence"]>("hebdomadaire");
  const [jour, setJour] = useState(1);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [tour, setTour] = useState(0);

  useEffect(() => {
    if (source === "exemple" || !client) return;
    let vivant = true;
    chargerExports(client.client_id)
      .then((x) => {
        if (vivant) setEtat(x);
      })
      .catch((e) => {
        if (vivant) {
          setEtat({ programmes: [], exports: [] });
          toast(e instanceof Error ? e.message : "La base n'a pas répondu.", "rouge");
        }
      });
    return () => {
      vivant = false;
    };
  }, [source, client, tour, toast]);

  if (etat === null)
    return (
      <p className="pr-chargement" aria-busy="true">
        Exports…
      </p>
    );
  const prog = etat.programmes.find((p) => p.entite_id === null);

  const agir = async (cle: string, reel: () => Promise<unknown>, local: () => void, msg: string) => {
    setEnvoi(cle);
    try {
      if (source === "reelle") {
        await reel();
        setTour((n) => n + 1);
      } else local();
      toast(msg, "vert");
    } catch (e) {
      toast(e instanceof Error ? e.message : "La base n'a pas répondu.", "rouge");
    } finally {
      setEnvoi(null);
    }
  };

  const enregistrer = (actif: boolean) =>
    void agir(
      "programme",
      () => programmerExport(client!.client_id, frequence, jour, actif),
      () => setEtat((x) => ({ ...(x ?? EXPORTS_EXEMPLE), programmes: [{ id: prog?.id ?? crypto.randomUUID(), entite_id: null, frequence, jour, actif }] })),
      actif ? `Export programmé : ${frequence === "hebdomadaire" ? `chaque ${JOURS[jour - 1]}, les sept jours précédents` : `le ${jour} de chaque mois, le mois précédent`}.` : "Export programmé suspendu.",
    );

  const prendre = (x: ExportFait) =>
    void agir(
      `fichier:${x.id}`,
      async () => telecharger(x.nom_fichier, await contenuExport(x.id)),
      () => telecharger(x.nom_fichier, "﻿Reçue le;Canal;Client\r\n(exemple : aucun fichier réel)"),
      `${x.nom_fichier} téléchargé.`,
    );

  return (
    <>
      <BlocReglages icone={<CalendarClock aria-hidden="true" />} titre="Programme">
        <ChampReglage libelle="État">
          <span className="pr-lecture">
            {prog?.actif ? (
              <BadgeReglage teinte="vert">{prog.frequence === "hebdomadaire" ? `Chaque ${JOURS[prog.jour - 1]}` : `Le ${prog.jour} de chaque mois`}</BadgeReglage>
            ) : (
              <BadgeReglage contour>Aucun export programmé</BadgeReglage>
            )}
          </span>
        </ChampReglage>
        <ChampReglage libelle="Fréquence">
          <SelectReglage
            value={frequence}
            onChange={(e) => {
              setFrequence(e.target.value as ProgrammeExport["frequence"]);
              setJour(1);
            }}
          >
            <option value="hebdomadaire">Chaque semaine</option>
            <option value="mensuel">Chaque mois</option>
          </SelectReglage>
        </ChampReglage>
        <ChampReglage libelle={frequence === "hebdomadaire" ? "Jour" : "Jour du mois"}>
          <SelectReglage value={jour} onChange={(e) => setJour(Number(e.target.value))}>
            {frequence === "hebdomadaire"
              ? JOURS.map((j, i) => (
                  <option key={j} value={i + 1}>
                    {j}
                  </option>
                ))
              : Array.from({ length: 28 }, (_, i) => (
                  <option key={i} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
          </SelectReglage>
        </ChampReglage>
        <div className="pr-actions">
          <BoutonReglage plein disabled={envoi !== null} onClick={() => enregistrer(true)}>
            {envoi === "programme" ? <Loader variant="spin" /> : null} Programmer l&apos;export
          </BoutonReglage>
          {prog?.actif ? (
            <BoutonReglage disabled={envoi !== null} onClick={() => enregistrer(false)}>
              Suspendre
            </BoutonReglage>
          ) : null}
        </div>
      </BlocReglages>
      <BlocReglages icone={<Download aria-hidden="true" />} titre="Fichiers prêts">
        {etat.exports.length ? (
          <BoiteReglage libelle="Fichiers prêts">
            {etat.exports.map((x) => (
              <LigneReglage
                key={x.id}
                avatar={<Download aria-hidden="true" />}
                nom={`Du ${dateCourte(x.periode_du)} au ${dateCourte(x.periode_au)}`}
                second={`${pluriel(x.lignes, "demande")} · ${x.nom_fichier}`}
                droite={
                  <BoutonReglage petit icone={<Download aria-hidden="true" />} disabled={envoi !== null} onClick={() => prendre(x)}>
                    {envoi === `fichier:${x.id}` ? <Loader variant="spin" /> : null} Télécharger
                  </BoutonReglage>
                }
              />
            ))}
          </BoiteReglage>
        ) : (
          <VideReglage icone={<Download />} titre="Aucun fichier prêt" texte="Le premier est préparé au jour choisi, pour la période échue." />
        )}
      </BlocReglages>
    </>
  );
}
