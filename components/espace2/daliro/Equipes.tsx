"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › Équipes (29/10/2026) : la page Projects de Linear en affichage
   « Timeline », au 1:1, sur la même frise que Chantiers (./Frise.tsx,
   ../lin/linear-timeline.css ; relevé : docs/refonte-metiers/releves/
   linear-timeline.md).

   Une ligne par intervenant : nos équipes et les sous-traitants de
   l'annuaire, plus ceux que le planning nomme sans les avoir rapprochés.
   Ses barres : ses passages prévus sur les 30 prochains jours, tous
   chantiers (libellé « chantier · tâche », teinte de la confirmation J-2),
   et ses absences, hachurées. C'est le bloc B27 de l'écran d'avant
   (DisponibilitesBloc, rangé dans l'annuaire d'un chantier) sorti à
   l'échelle de l'entreprise : mêmes portes, mêmes gestes.

     lecture  base réelle : les tableaux de tous les chantiers
              (useDaliro().demanderTous) et btp_disponibilites
              (chargerDisponibilites, gérant, admin ou valideur) ;
              exemple : les passages des tableaux en mémoire, les absences
              notées gardées le temps de la visite, comme l'écran d'avant
     G61      « Noter une absence » (barre du titre, ou le « ··· » d'un
              sous-traitant) : noterIndisponibilite, dans une fenêtre
     G62      « Annuler l'absence » (clic sur une absence, ou le « ··· ») :
              annulerIndisponibilite, après une fenêtre de confirmation
   Le coût horaire (G48) reste dans la fiche du chantier.
   Filtre ?type=sous-traitants|equipes, zoom ?zoom= (Mois par défaut).
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, CalendarOff, CircleHelp, Plus } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { RACINE } from "@/components/espace2/modules";
import { dateCourte } from "@/components/espace/format";
import { Avis } from "@/components/espace/ui";
import { CONFIRMATIONS } from "@/components/espace/daliro/etats";
import { annulerIndisponibilite, chargerDisponibilites, noterIndisponibilite } from "@/components/espace/daliro/portes";
import type { Confirmation, Disponibilite, Tableau } from "@/components/espace/daliro/types";
import { MenuActions, type Option } from "../lin/Lin";
import { IconeGroupe, IconeSante, type Sante } from "../lin/icones";
import { useToast } from "../Toasts";
import { useDaliro } from "./donnees";
import Frise, { estZoom, type BarreFrise, type LigneFrise, type TeinteFrise, type Zoom } from "./Frise";
import "@/components/espace/espace.css";

type Absence = Disponibilite["absences"][number];
type PassageVu = { id: string; chantierId: string | null; chantier: string; tache: string | null; debut: string; fin: string; confirmation: Confirmation | null };
type Genre = "equipe" | "tiers" | "inconnu";
type Intervenant = { cle: string; nom: string; genre: Genre; tiers: string | null; passages: PassageVu[]; absences: Absence[] };

const RANG: Record<Genre, number> = { equipe: 0, tiers: 1, inconnu: 2 };
const GENRE: Record<Genre, string> = { equipe: "Nos équipes", tiers: "Sous-traitant", inconnu: "Intervenant non rapproché de l'annuaire" };
const TYPES = [
  { cle: null, libelle: "Tous les intervenants" },
  { cle: "equipes", libelle: "Nos équipes" },
  { cle: "sous-traitants", libelle: "Sous-traitants" },
] as const;

const iso = (d: Date) => `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
const plus = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
};
const jj = (s: string) => s.slice(0, 10);
const nid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const teinteDe = (t: string): TeinteFrise => (t === "rouge" || t === "ambre" || t === "bleu" || t === "vert" ? t : "gris");
const chevauche = (a: { debut: string; fin: string }, b: { du: string; au: string }) => jj(a.debut) <= b.au && jj(a.fin) >= b.du;
const periode = (du: string, au: string) => (du === au ? `le ${dateCourte(du)}` : `du ${dateCourte(du)} au ${dateCourte(au)}`);

export default function Equipes() {
  const { source, pret, erreur, client, liste, tableau, demanderTous } = useDaliro();
  const params = useSearchParams();
  const routeur = useRouter();
  const chemin = usePathname();
  const toast = useToast();
  const du = useMemo(() => plus(0), []);
  const au = useMemo(() => plus(30), []);

  /* base réelle : tous les tableaux (les passages de chaque chantier) */
  useEffect(() => {
    if (source === "reelle") demanderTous();
  }, [source, demanderTous]);

  /* les disponibilités : la porte b6_31 en base réelle, la mémoire en exemple */
  const [reel, setReel] = useState<Disponibilite[] | null>(null);
  const [erreurDispo, setErreurDispo] = useState<string | null>(null);
  const [locales, setLocales] = useState<Record<string, Absence[]>>({});
  const clientId = client?.client_id ?? null;
  const lire = useCallback(async () => {
    if (!clientId) return;
    try {
      setReel(await chargerDisponibilites(clientId, du, au));
      setErreurDispo(null);
    } catch (e) {
      setErreurDispo(e instanceof Error ? e.message : "La base n'a pas répondu.");
    }
  }, [clientId, du, au]);
  useEffect(() => {
    if (source !== "reelle" || !clientId) return;
    const t = window.setTimeout(() => void lire(), 0);
    return () => window.clearTimeout(t);
  }, [source, clientId, lire]);

  const tableaux = liste.map((c) => tableau(c.id)).filter((t): t is Tableau => !!t);
  const enLecture = source === "reelle" && tableaux.length < liste.length;

  /* recalculé à chaque rendu : les tableaux arrivent un à un en base réelle */
  const intervenants = (() => {
    const m = new Map<string, Intervenant>();
    const ajouter = (cle: string, nom: string, genre: Genre, tiers: string | null) => {
      if (!m.has(cle)) m.set(cle, { cle, nom, genre, tiers, passages: [], absences: [] });
      return m.get(cle)!;
    };
    for (const t of tableaux) {
      for (const x of t.tiers) if (x.actif && x.roles.includes("sous_traitant")) ajouter(`t:${x.id}`, x.nom, "tiers", x.id);
      for (const e of t.equipes) ajouter(`e:${e.id}`, e.nom, "equipe", null);
    }
    const vus = new Set<string>();
    for (const t of tableaux)
      for (const p of t.passages) {
        if (p.statut !== "prevu" || !chevauche(p, { du, au })) continue;
        const nom = p.intervenant_nom ?? p.intervenant_lu ?? "Intervenant à désigner";
        const iv = p.tiers_id ? ajouter(`t:${p.tiers_id}`, nom, "tiers", p.tiers_id) : p.equipe_id ? ajouter(`e:${p.equipe_id}`, nom, "equipe", null) : ajouter(`n:${nom.toLocaleLowerCase("fr")}`, nom, "inconnu", null);
        iv.passages.push({ id: p.id, chantierId: t.chantier.id, chantier: t.chantier.nom, tache: p.tache, debut: jj(p.debut), fin: jj(p.fin), confirmation: p.confirmation });
        vus.add(p.id);
      }
    if (source === "reelle")
      for (const d of reel ?? []) {
        const iv = ajouter(`t:${d.tiers}`, d.nom, "tiers", d.tiers);
        iv.absences = d.absences;
        /* un passage d'un chantier dont le tableau n'est pas encore lu : sans confirmation connue */
        for (const p of d.passages) if (!vus.has(p.passage)) iv.passages.push({ id: p.passage, chantierId: liste.find((c) => c.nom === p.chantier)?.id ?? null, chantier: p.chantier, tache: p.tache, debut: jj(p.debut), fin: jj(p.fin), confirmation: null });
      }
    else for (const iv of m.values()) if (iv.tiers) iv.absences = locales[iv.tiers] ?? [];
    return [...m.values()].sort((a, b) => RANG[a.genre] - RANG[b.genre] || a.nom.localeCompare(b.nom, "fr"));
  })();

  const typeParam = params.get("type");
  const type = typeParam === "equipes" || typeParam === "sous-traitants" ? typeParam : null;
  const zParam = params.get("zoom");
  const zoom: Zoom = estZoom(zParam) ? zParam : "mois";
  const lien = (modif: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(modif)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    const s = p.toString();
    return `${chemin}${s ? `?${s}` : ""}`;
  };
  const compte = (t: (typeof TYPES)[number]["cle"]) => intervenants.filter((i) => !t || (t === "equipes" ? i.genre === "equipe" : i.genre === "tiers")).length;
  const visibles = intervenants.filter((i) => !type || (type === "equipes" ? i.genre === "equipe" : i.genre === "tiers"));
  const sousTraitants = intervenants.filter((i) => i.tiers);

  /* ——— G61 : noter une absence ——— */
  const [form, setForm] = useState<{ tiers: string; du: string; au: string; motif: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreurGeste, setErreurGeste] = useState<string | null>(null);
  const ouvrirNoter = (tiers?: string) => {
    setErreurGeste(null);
    setForm({ tiers: tiers ?? sousTraitants[0]?.tiers ?? "", du, au: du, motif: "" });
  };
  const noter = async () => {
    if (!form) return;
    setEnvoi(true);
    setErreurGeste(null);
    try {
      if (!form.tiers) throw new Error("Choisissez le sous-traitant absent.");
      if (form.au < form.du) throw new Error("Une absence a un premier et un dernier jour, dans cet ordre.");
      const motif = form.motif.trim() || null;
      if (source === "reelle") {
        await noterIndisponibilite(form.tiers, form.du, form.au, motif);
        await lire();
      } else setLocales((a) => ({ ...a, [form.tiers]: [...(a[form.tiers] ?? []), { id: nid(), du: form.du, au: form.au, motif }] }));
      const nom = intervenants.find((i) => i.tiers === form.tiers)?.nom ?? "Le sous-traitant";
      toast(`Absence notée : ${nom}, ${periode(form.du, form.au)}.`, "vert");
      setForm(null);
    } catch (e) {
      setErreurGeste(e instanceof Error ? e.message : "La base a refusé l'absence.");
    } finally {
      setEnvoi(false);
    }
  };

  /* ——— G62 : annuler une absence, après confirmation ——— */
  const [aAnnuler, setAAnnuler] = useState<{ tiers: string; nom: string; absence: Absence } | null>(null);
  const ouvrirAnnuler = (iv: Intervenant, a: Absence) => {
    setErreurGeste(null);
    setAAnnuler({ tiers: iv.tiers ?? "", nom: iv.nom, absence: a });
  };
  const annuler = async () => {
    if (!aAnnuler) return;
    setEnvoi(true);
    setErreurGeste(null);
    try {
      const { tiers, absence } = aAnnuler;
      if (source === "reelle") {
        await annulerIndisponibilite(absence.id);
        await lire();
      } else setLocales((a) => ({ ...a, [tiers]: (a[tiers] ?? []).filter((x) => x.id !== absence.id) }));
      toast(`Absence annulée : ${aAnnuler.nom}.`, "vert");
      setAAnnuler(null);
    } catch (e) {
      setErreurGeste(e instanceof Error ? e.message : "La base a refusé l'annulation.");
    } finally {
      setEnvoi(false);
    }
  };

  const ligne = (iv: Intervenant): LigneFrise => {
    const conflits = iv.passages.filter((p) => iv.absences.some((a) => chevauche(p, a)));
    const confs = new Set(iv.passages.map((p) => p.confirmation));
    const etat: { sante: Sante; teinte: TeinteFrise; texte: string } = conflits.length
      ? { sante: "hors", teinte: "rouge", texte: `Absent pendant ${pluriel(conflits.length, "passage")} prévu${conflits.length > 1 ? "s" : ""}` }
      : confs.has("declinee")
        ? { sante: "hors", teinte: "rouge", texte: "Un passage décliné" }
        : confs.has("sans_reponse")
          ? { sante: "risque", teinte: "ambre", texte: "Un passage sans réponse" }
          : confs.has("demandee")
            ? { sante: "risque", teinte: "bleu", texte: "Demande envoyée, réponse attendue" }
            : iv.passages.length
              ? { sante: "bien", teinte: "vert", texte: iv.absences.length ? `Occupé, ${pluriel(iv.absences.length, "absence")} notée${iv.absences.length > 1 ? "s" : ""}` : "Occupé, rien à confirmer" }
              : iv.absences.length
                ? { sante: "risque", teinte: "ambre", texte: `${pluriel(iv.absences.length, "absence")} notée${iv.absences.length > 1 ? "s" : ""}, aucun passage` }
                : { sante: "neutre", teinte: "gris", texte: "Libre sur la période" };
    const actions: Option[] = iv.tiers
      ? [
          { cle: "noter", libelle: "Noter une absence", icone: <CalendarOff aria-hidden="true" />, action: () => ouvrirNoter(iv.tiers ?? undefined) },
          ...iv.absences.map((a) => ({ cle: `annuler-${a.id}`, libelle: `Annuler l'absence ${periode(a.du, a.au)}`, action: () => ouvrirAnnuler(iv, a) })),
        ]
      : [];
    const barres: BarreFrise[] = [
      ...iv.absences.map((a) => ({
        cle: `a:${a.id}`,
        debut: a.du,
        fin: a.au,
        libelle: "Absent",
        meta: a.motif ?? undefined,
        hachure: true,
        titre: `${iv.nom} absent ${periode(a.du, a.au)}${a.motif ? ` (${a.motif})` : ""}${iv.tiers ? " : cliquez pour annuler l'absence" : ""}`,
        onClick: iv.tiers ? () => ouvrirAnnuler(iv, a) : undefined,
      })),
      ...iv.passages.map((p) => {
        const conf = p.confirmation ? CONFIRMATIONS[p.confirmation] : null;
        return {
          cle: `p:${p.id}`,
          debut: p.debut,
          fin: p.fin,
          libelle: `${p.chantier}${p.tache ? ` · ${p.tache}` : ""}`,
          teinte: conf ? teinteDe(conf.teinte) : undefined,
          titre: `${p.chantier}${p.tache ? ` · ${p.tache}` : ""}, ${periode(p.debut, p.fin)}${conf ? ` · ${conf.libelle.toLowerCase()}` : ""}`,
          href: p.chantierId ? `${RACINE}/daliro/chantiers/${encodeURIComponent(p.chantierId)}` : undefined,
        };
      }),
    ];
    return {
      cle: iv.cle,
      icone: iv.genre === "equipe" ? <IconeGroupe /> : iv.genre === "tiers" ? <Building2 aria-hidden="true" /> : <CircleHelp aria-hidden="true" />,
      teinteIcone: iv.genre === "equipe" ? "bleu" : iv.genre === "tiers" ? "ambre" : "gris",
      nom: iv.nom,
      pilule: iv.passages.length ? pluriel(iv.passages.length, "passage") : iv.absences.length ? "Absent" : "Libre",
      puces: true,
      ronds: (
        <>
          <span className="ltl-rond" data-teinte={etat.teinte} title={etat.texte} aria-label={etat.texte} role="img">
            <IconeSante etat={etat.sante} />
          </span>
          <span className="ltl-rond ltl-rond--chiffre" data-liste="non" title={`${GENRE[iv.genre]} · ${pluriel(iv.passages.length, "passage")} prévu${iv.passages.length > 1 ? "s" : ""} sur 30 jours`} aria-label={`${pluriel(iv.passages.length, "passage")} prévu${iv.passages.length > 1 ? "s" : ""}`} role="img">
            {iv.passages.length}
          </span>
          {actions.length ? (
            <span className="ltl-rond">
              <MenuActions titre={`Actions pour ${iv.nom}`} options={actions} rond />
            </span>
          ) : null}
        </>
      ),
      barres,
    };
  };

  const vide = !pret || (enLecture && !intervenants.length) ? (
    <p className="lin-vide">Lecture du planning…</p>
  ) : (
    <p className="lin-vide">
      {type ? "Personne dans ce groupe." : "Aucun intervenant : les équipes et les sous-traitants viennent de l'annuaire et du planning de vos chantiers."}{" "}
      <Link href={`${RACINE}/daliro/annuaire`} className="lin-voir-tout" style={{ marginTop: 0 }}>
        Ouvrir l&apos;annuaire
      </Link>
    </p>
  );
  const choisi = form ? intervenants.find((i) => i.tiers === form.tiers) : null;
  const pendant = form && choisi ? choisi.passages.filter((p) => chevauche(p, { du: form.du, au: form.au })) : [];

  return (
    <div className="lin">
      <h1 className="v2-sr">Équipes</h1>
      <header className="lin-tete">
        <span className="lin-tete-titre">Équipes</span>
        <div className="lin-tete-droite">
          <span className="lin-position">
            {dateCourte(du)} → {dateCourte(au)}
          </span>
          <button type="button" className="v2-btn v2-btn--petit" onClick={() => ouvrirNoter()} disabled={!sousTraitants.length}>
            <Plus width={14} height={14} aria-hidden="true" />
            <span>Noter une absence</span>
          </button>
        </div>
      </header>

      <div className="lin-outils">
        <nav className="lin-onglets" aria-label="Intervenants">
          {TYPES.map((t) => (
            <Link key={t.libelle} href={lien({ type: t.cle })} className="v2-btn v2-btn--petit" data-actif={type === t.cle ? "" : undefined} aria-current={type === t.cle ? "page" : undefined} scroll={false}>
              {t.libelle} <span className="ltl-compte">{compte(t.cle)}</span>
            </Link>
          ))}
        </nav>
      </div>

      {erreur && source === "reelle" ? (
        <p className="ltl-note" data-teinte="rouge" role="alert">
          La base réelle n&apos;a pas répondu. {erreur}
        </p>
      ) : null}
      {erreurDispo ? (
        <p className="ltl-note" data-teinte="rouge" role="alert">
          Les absences n&apos;ont pas pu être lues (réservé au gérant, à l&apos;administrateur et au valideur). {erreurDispo}
        </p>
      ) : null}
      {enLecture && intervenants.length ? (
        <p className="ltl-note" role="status">
          Lecture des chantiers : {tableaux.length} sur {liste.length}.
        </p>
      ) : null}

      <Frise libelle="Frise des équipes et sous-traitants" lignes={pret ? visibles.map(ligne) : []} zoom={zoom} onZoom={(z) => routeur.replace(lien({ zoom: z === "mois" ? null : z }), { scroll: false })} aujourdhui={du} vide={vide} />

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <CalendarOff width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Noter une absence</DialogTitle>
            <DialogDescription>Les jours notés ne sont plus proposés pour ce sous-traitant : ni pour un passage, ni comme remplaçant.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {form ? (
              <div className="esp-form">
                <label className="rv-libelle">
                  Sous-traitant
                  <select className="rv-champ" value={form.tiers} onChange={(e) => setForm({ ...form, tiers: e.target.value })}>
                    {sousTraitants.map((i) => (
                      <option key={i.cle} value={i.tiers ?? ""}>
                        {i.nom}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">
                    Du
                    <input className="rv-champ" type="date" value={form.du} onChange={(e) => setForm({ ...form, du: e.target.value, au: form.au < e.target.value ? e.target.value : form.au })} />
                  </label>
                  <label className="rv-libelle">
                    Au
                    <input className="rv-champ" type="date" value={form.au} min={form.du} onChange={(e) => setForm({ ...form, au: e.target.value })} />
                  </label>
                </div>
                <label className="rv-libelle">
                  Motif
                  <input className="rv-champ" maxLength={200} value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} placeholder="Congés, autre chantier" />
                </label>
                {pendant.length ? (
                  <Avis teinte="ambre">
                    {pluriel(pendant.length, "passage")} prévu{pendant.length > 1 ? "s" : ""} sur ces jours : {pendant.map((p) => `${p.chantier}${p.tache ? ` (${p.tache})` : ""} ${periode(p.debut, p.fin)}`).join(" ; ")}.
                  </Avis>
                ) : null}
                {erreurGeste ? (
                  <Avis teinte="rouge" role="alert">
                    {erreurGeste}
                  </Avis>
                ) : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi || !form?.tiers || !form?.du || !form?.au} onClick={() => void noter()}>
              {envoi ? <Loader variant="spin" /> : null} Noter l&apos;absence
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!aAnnuler} onOpenChange={(o) => !o && setAAnnuler(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <CalendarOff width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Annuler cette absence ?</DialogTitle>
            <DialogDescription>
              {aAnnuler
                ? `${aAnnuler.nom}, absent ${periode(aAnnuler.absence.du, aAnnuler.absence.au)}${aAnnuler.absence.motif ? ` (${aAnnuler.absence.motif})` : ""}. Ces jours redeviennent libres : il pourra être proposé pour un passage ou comme remplaçant.`
                : null}
            </DialogDescription>
          </DialogHeader>
          {erreurGeste ? (
            <DialogBody>
              <Avis teinte="rouge" role="alert">
                {erreurGeste}
              </Avis>
            </DialogBody>
          ) : null}
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={() => void annuler()}>
              {envoi ? <Loader variant="spin" /> : null} Annuler l&apos;absence
            </button>
            <button type="button" className="r-btn r-btn--fil" onClick={() => setAAnnuler(null)}>
              Garder l&apos;absence
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
