"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO — les réglages (29/10/2026, refonte des pages métiers)

   Ce qui vaut pour toute l'entreprise, sorti du dossier d'un chantier où
   l'écran d'avant le rangeait (ChantierVue, cartes « Annuaire et
   bibliothèque » et « Contrôles ») :
     · la bibliothèque de prix (B26, partie prix ; F34 / G59 « Poser un
       prix », G60 « Valider ») sur Settings › Issue labels de Linear :
       titre et boutons, champ « Filtrer par désignation… », tableau trié
       par colonne, lignes de 44 ;
     · l'accord permanent des confirmations J-2 (B04, F02, G02-G04) et les
       contrôles de l'organisation (B12, partie organisation) sur Settings ›
       Issue templates : colonne de 640, cartes à rangées.
   Relevé : docs/refonte-metiers/releves/linear-labels-templates.md ;
   mesures : components/espace2/lin/linear-labels.css (préfixe llb-).

   Mêmes portes que l'écran d'avant (poserPrix, validerPrix). En exemple,
   la bibliothèque est recopiée dans chaque tableau : un prix posé ou
   validé l'est dans tous, pour que chaque fiche de chantier le voie.
   « Valider » écrivait au premier clic : il passe par une fenêtre.
   Le filtre, le tri et l'état affiché sont dans l'adresse (?q, ?statut,
   ?tri, ?sens).
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUp, BookOpen, BookUser, CheckCircle2, ListFilter, Search, Users } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis } from "@/components/espace/ui";
import { dateCourte, montant } from "@/components/espace/format";
import { GRAVITES, UNITES, familleControle, libelleUnite } from "@/components/espace/daliro/etats";
import { poserPrix, validerPrix } from "@/components/espace/daliro/portes";
import type { Gravite, Prix, Tableau } from "@/components/espace/daliro/types";
import AccordJ2 from "@/components/espace/daliro/AccordJ2";
import { HabilleSb } from "../Habille";
import { MenuActions, MenuOptions } from "../lin/Lin";
import { RACINE } from "../modules";
import { useToast } from "../Toasts";
import { useDaliro } from "./donnees";
import "../lin/lin.css";
import "../lin/linear-labels.css";

const BASE = `${RACINE}/daliro`;

type Tri = "designation" | "origine" | "unite" | "prix" | "statut" | "date";
type Filtre = "tous" | "valide" | "propose";
type Form = { type: "poser"; designation?: string; unite?: string } | { type: "valider"; prix: Prix } | null;

const TEINTE_STATUT: Record<"valide" | "propose", string> = { valide: "var(--lin-vert)", propose: "var(--lin-jaune)" };
const TEINTE_GRAVITE: Record<Gravite, string> = { bloquant: "var(--lin-rouge)", attention: "var(--lin-jaune)", info: "var(--lin-fait)" };
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const nid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const nombre = (v: string) => Number(v.replace(",", "."));

/* le prix validé de même désignation et même unité est retiré (règle de la porte, rejouée en exemple) */
const memePrix = (x: Prix, designation: string, unite: string) => x.designation.toLowerCase() === designation.toLowerCase() && x.unite === unite;

export default function Reglages() {
  const { source, pret, erreur: erreurBase, client, liste, tableau, premier, demander, onLocal, relireChantier } = useDaliro();
  const params = useSearchParams();
  const routeur = useRouter();
  const chemin = usePathname();
  const toast = useToast();

  /* en base réelle, la bibliothèque et les contrôles se lisent dans un tableau de chantier */
  useEffect(() => {
    if (source === "reelle" && pret && !premier && liste[0]) demander(liste[0].id);
  }, [source, pret, premier, liste, demander]);

  /* ——— l'adresse porte le filtre et le tri ——— */
  const q = params.get("q") ?? "";
  const filtre: Filtre = params.get("statut") === "valide" || params.get("statut") === "propose" ? (params.get("statut") as Filtre) : "tous";
  const tri: Tri = (["designation", "origine", "unite", "prix", "statut", "date"] as Tri[]).find((t) => t === params.get("tri")) ?? "designation";
  const sens = params.get("sens") === "desc" ? "desc" : "asc";
  const adresse = (changes: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const s = p.toString();
    return s ? `${chemin}?${s}` : chemin;
  };
  const [saisie, setSaisie] = useState(q);
  const filtrer = (v: string) => {
    setSaisie(v);
    routeur.replace(adresse({ q: v.trim() || null }), { scroll: false });
  };
  /* un clic trie la colonne ; un second clic sur la même inverse le sens */
  const trier = (t: Tri) => {
    const inverse = tri === t && sens === "asc";
    routeur.replace(adresse({ tri: t === "designation" ? null : t, sens: inverse ? "desc" : null }), { scroll: false });
  };

  const voitPrix = premier?.voit_prix ?? true;
  const bibliotheque = useMemo(() => (premier?.bibliotheque ?? []).filter((p) => p.statut !== "retire"), [premier]);
  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    const l = bibliotheque.filter((p) => (filtre === "tous" || p.statut === filtre) && (!t || p.designation.toLowerCase().includes(t)));
    const cle = (p: Prix): string | number =>
      tri === "prix" ? (p.prix_unitaire_ht ?? -1) : tri === "origine" ? p.origine : tri === "unite" ? libelleUnite(p.unite) : tri === "statut" ? p.statut : tri === "date" ? p.date_prix : p.designation;
    return [...l].sort((a, b) => {
      const ka = cle(a);
      const kb = cle(b);
      const r = typeof ka === "number" && typeof kb === "number" ? ka - kb : String(ka).localeCompare(String(kb), "fr");
      return (sens === "desc" ? -r : r) || a.designation.localeCompare(b.designation, "fr");
    });
  }, [bibliotheque, q, filtre, tri, sens]);
  const nbValides = bibliotheque.filter((p) => p.statut === "valide").length;
  const nbProposes = bibliotheque.length - nbValides;

  const controlesOrga = useMemo(
    () => [...(premier?.controles_organisation ?? [])].sort((a, b) => ["bloquant", "attention", "info"].indexOf(a.gravite) - ["bloquant", "attention", "info"].indexOf(b.gravite)),
    [premier],
  );

  /* ——— les gestes : F34 / G59 poser, G60 valider ——— */
  const [form, setForm] = useState<Form>(null);
  const [champs, setChamps] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const ch = (k: string) => champs[k] ?? "";
  const pose = (k: string, v: string) => setChamps((p) => ({ ...p, [k]: v }));
  const ouvrir = (f: Form) => {
    setErreur(null);
    setChamps(f?.type === "poser" ? { designation: f.designation ?? "", unite: f.unite ?? "u", pu: "" } : {});
    setForm(f);
  };

  /* en base réelle : la porte puis la relecture ; en exemple : chaque tableau modifié en mémoire */
  const agir = async (reelle: () => Promise<unknown>, locale: (t: Tableau) => Tableau, message: string) => {
    setEnvoi(true);
    setErreur(null);
    try {
      if (source === "reelle") {
        await reelle();
        if (premier) await relireChantier(premier.chantier.id);
      } else {
        await new Promise((r) => setTimeout(r, 250));
        for (const c of liste) {
          const t = tableau(c.id);
          if (t) onLocal(locale(t));
        }
      }
      toast(message, "vert");
      setForm(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'action.");
    } finally {
      setEnvoi(false);
    }
  };
  const faireValider = (p: Prix) =>
    agir(
      () => validerPrix(p.id, null),
      (t) => ({ ...t, bibliotheque: t.bibliotheque.map((x) => (x.id === p.id ? { ...x, statut: "valide" as const } : memePrix(x, p.designation, p.unite) && x.statut === "valide" ? { ...x, statut: "retire" as const } : x)) }),
      `« ${p.designation} » vaut ${montant(p.prix_unitaire_ht)} / ${libelleUnite(p.unite)} : les avenants peuvent s'en servir.`,
    );
  const fairePoser = () => {
    const designation = ch("designation").trim();
    const unite = ch("unite") || "u";
    const pu = nombre(ch("pu"));
    const id = nid();
    const clientId = premier?.chantier.client_id ?? client?.client_id ?? "";
    return agir(
      () => poserPrix(clientId, designation, unite, pu, null),
      (t) => ({
        ...t,
        bibliotheque: [
          ...t.bibliotheque.map((x) => (memePrix(x, designation, unite) && x.statut === "valide" ? { ...x, statut: "retire" as const } : x)),
          { id, designation, unite, corps_etat: null, origine: "saisie" as const, ligne_marche_id: null, date_prix: aujourdhui(), statut: "valide" as const, prix_unitaire_ht: pu },
        ],
      }),
      "Le prix est posé et validé dans la bibliothèque.",
    );
  };

  const enLecture = source === "reelle" && (!pret || (!premier && liste.length > 0));
  const sansChantier = source === "reelle" && pret && liste.length === 0;
  const dirige = source === "exemple" || client?.role === "gerant" || client?.role === "admin";

  const enTete = (t: Tri, libelle: string, classe: string) => (
    <span className={classe}>
      <button type="button" className="llb-tri" data-sens={tri === t ? sens : undefined} aria-sort={tri === t ? (sens === "asc" ? "ascending" : "descending") : undefined} onClick={() => trier(t)}>
        {libelle}
        {tri === t ? <ArrowUp aria-hidden="true" /> : null}
      </button>
    </span>
  );

  return (
    <div className="lin llb">
      <h1 className="v2-sr">Réglages</h1>

      {/* ——— la bibliothèque de prix : Settings › Issue labels ——— */}
      <div className="llb-bande" aria-hidden="true" />
      <div className="llb-titre">
        <h2 className="llb-h2">Bibliothèque de prix</h2>
        <div className="llb-boutons">
          <Link href={`${BASE}/annuaire`} className="llb-btn llb-btn--second" aria-label="Annuaire">
            <BookUser aria-hidden="true" />
            <span>Annuaire</span>
          </Link>
          <button type="button" className="llb-btn llb-btn--plein" onClick={() => ouvrir({ type: "poser" })} disabled={enLecture || sansChantier}>
            Poser un prix
          </button>
        </div>
      </div>

      <div className="llb-filtre">
        <label className="llb-recherche">
          <Search aria-hidden="true" />
          <input className="llb-champ" type="search" placeholder="Filtrer par désignation…" aria-label="Filtrer par désignation" value={saisie} onChange={(e) => filtrer(e.target.value)} />
        </label>
        <div className="llb-outils">
          <MenuOptions
            rond
            aDroite
            libelle="Filtrer par statut"
            titre="Statut…"
            declencheur={<ListFilter aria-hidden="true" />}
            largeur={220}
            options={[
              { cle: "tous", libelle: "Tous les prix", meta: String(bibliotheque.length), coche: filtre === "tous", href: adresse({ statut: null }) },
              { cle: "valide", libelle: "Validés", meta: String(nbValides), coche: filtre === "valide", icone: <span className="llb-pastille" style={{ "--lin-teinte": TEINTE_STATUT.valide } as React.CSSProperties} />, href: adresse({ statut: "valide" }) },
              { cle: "propose", libelle: "Proposés", meta: String(nbProposes), coche: filtre === "propose", icone: <span className="llb-pastille" style={{ "--lin-teinte": TEINTE_STATUT.propose } as React.CSSProperties} />, href: adresse({ statut: "propose" }) },
            ]}
          />
        </div>
      </div>

      <div className="llb-tableau" data-sans-prix={voitPrix ? undefined : ""} role="table" aria-label="Bibliothèque de prix">
        <div className="llb-entete" role="row">
          <span aria-hidden="true" />
          {enTete("designation", "Désignation", "llb-cel-entete")}
          {enTete("origine", "Origine", "llb-col-origine")}
          {enTete("unite", "Unité", "llb-col-unite")}
          {voitPrix ? enTete("prix", "PU HT", "llb-col-prix llb-num") : null}
          {enTete("statut", "Statut", "llb-col-statut")}
          {enTete("date", "Date", "llb-col-date")}
        </div>
        {erreurBase ? (
          <p className="llb-vide" data-erreur="" role="alert">
            La base réelle n&apos;a pas répondu. {erreurBase}
          </p>
        ) : enLecture ? (
          <p className="llb-vide">Lecture de la bibliothèque…</p>
        ) : sansChantier ? (
          <p className="llb-vide">La bibliothèque se lit avec vos chantiers : créez d&apos;abord un chantier.</p>
        ) : !bibliotheque.length ? (
          <p className="llb-vide">La bibliothèque se remplit des prix des marchés vérifiés ; un prix ne vaut qu&apos;une fois validé.</p>
        ) : !visibles.length ? (
          <p className="llb-vide">Aucun prix ne correspond.</p>
        ) : (
          <ul className="llb-lignes" role="rowgroup">
            {visibles.map((p) => {
              const statut = p.statut === "valide" ? "valide" : "propose";
              const libelleStatut = statut === "valide" ? "Validé" : "Proposé";
              const origine = `${p.origine === "marche" ? "Marché vérifié" : "Saisie"}`;
              return (
                <li key={p.id} className="llb-ligne" role="row">
                  <span aria-hidden="true" />
                  <span className="llb-cel-nom" role="cell">
                    <span className="llb-pastille" style={{ "--lin-teinte": TEINTE_STATUT[statut] } as React.CSSProperties} title={libelleStatut} aria-hidden="true" />
                    <span className="llb-boite" title={p.designation}>
                      {p.designation}
                    </span>
                    <span className="llb-mobile">
                      <span className="llb-meta">{libelleUnite(p.unite)}</span>
                      {voitPrix ? <span className="llb-prix">{montant(p.prix_unitaire_ht)}</span> : null}
                      <span className="llb-meta">{libelleStatut}</span>
                    </span>
                  </span>
                  <span className="llb-col-origine" role="cell">
                    <span className="llb-boite llb-boite--gris">{origine}</span>
                  </span>
                  <span className="llb-col-unite" role="cell">
                    <span className="llb-meta">{libelleUnite(p.unite)}</span>
                  </span>
                  {voitPrix ? (
                    <span className="llb-col-prix llb-num" role="cell">
                      <span className="llb-prix">{montant(p.prix_unitaire_ht)}</span>
                    </span>
                  ) : null}
                  <span className="llb-col-statut llb-statut" role="cell">
                    <span className="llb-statut-texte">{libelleStatut}</span>
                    {statut === "propose" ? (
                      <button type="button" className="llb-valider" onClick={() => ouvrir({ type: "valider", prix: p })} disabled={envoi}>
                        Valider
                      </button>
                    ) : null}
                  </span>
                  <span className="llb-col-date" role="cell">
                    <span className="llb-meta">{dateCourte(p.date_prix)}</span>
                  </span>
                  <span className="llb-cel-menu" role="cell">
                    <MenuActions
                      rond
                      titre={`Actions sur « ${p.designation} »`}
                      options={[
                        ...(statut === "propose" ? [{ cle: "valider", libelle: "Valider ce prix", icone: <CheckCircle2 width={16} height={16} />, action: () => ouvrir({ type: "valider", prix: p }) }] : []),
                        { cle: "poser", libelle: "Poser un nouveau prix", icone: <BookOpen width={16} height={16} />, action: () => ouvrir({ type: "poser", designation: p.designation, unite: p.unite }) },
                      ]}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ——— l'organisation : Settings › Issue templates ——— */}
      <div className="llb-colonne">
        <div className="llb-colonne-tete">
          <h2 className="llb-h2">Organisation</h2>
          <p className="llb-aide">
            Ce qui vaut pour toute l&apos;entreprise, pas pour un chantier : l&apos;accord qui laisse partir seules les demandes de confirmation à J-2, et les contrôles de l&apos;
            <Link href={`${BASE}/annuaire`}>annuaire</Link>.
          </p>
        </div>

        {dirige ? (
          <section className="llb-carte llb-accord" aria-label="Accord permanent des confirmations J-2">
            <HabilleSb>
              <AccordJ2 key={`${source}:${client?.client_id ?? ""}`} source={source} client={source === "reelle" ? client : null} />
            </HabilleSb>
          </section>
        ) : (
          <section className="llb-carte" aria-labelledby="llb-accord-titre">
            <div className="llb-carte-tete">
              <h3 id="llb-accord-titre" className="llb-carte-titre">
                Accord permanent des confirmations J-2
              </h3>
            </div>
            <ul className="llb-modeles">
              <li className="llb-modele">
                <span className="llb-modele-texte">
                  <span className="llb-modele-meta">Réservé au gérant et aux administrateurs de l&apos;organisation.</span>
                </span>
              </li>
            </ul>
          </section>
        )}

        <section className="llb-carte" aria-labelledby="llb-controles-titre">
          <div className="llb-carte-tete">
            <h3 id="llb-controles-titre" className="llb-carte-titre">
              {enLecture ? "Contrôles de l'organisation" : `${controlesOrga.length} contrôle${controlesOrga.length > 1 ? "s" : ""} de l'organisation`}
            </h3>
          </div>
          <ul className="llb-modeles">
            {enLecture ? (
              <li className="llb-modele">
                <span className="llb-modele-meta">Lecture des contrôles…</span>
              </li>
            ) : controlesOrga.length ? (
              controlesOrga.map((k) => (
                <li key={`${k.code}-${k.objet_id}`} className="llb-modele" style={{ "--lin-teinte": TEINTE_GRAVITE[k.gravite] } as React.CSSProperties}>
                  <Link href={`${BASE}/annuaire`} className="llb-modele-lien" aria-label={`${k.message} — ouvrir l'annuaire`} />
                  <span className="llb-vignette" aria-hidden="true">
                    <Users />
                  </span>
                  <span className="llb-modele-texte">
                    <span className="llb-modele-nom">{k.message}</span>
                    <span className="llb-modele-meta">
                      {GRAVITES[k.gravite].libelle} · {familleControle(k.code)}
                    </span>
                  </span>
                </li>
              ))
            ) : (
              <li className="llb-modele">
                <span className="llb-modele-meta">Rien à signaler : l&apos;annuaire et les attestations de vigilance sont à jour.</span>
              </li>
            )}
          </ul>
        </section>
      </div>

      {/* ——— les fenêtres ——— */}
      <Dialog open={form !== null} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          {form?.type === "poser" ? (
            <>
              <DialogHeader>
                <DialogIcone>
                  <BookOpen width={18} height={18} aria-hidden="true" />
                </DialogIcone>
                <DialogTitle>Poser un prix dans la bibliothèque</DialogTitle>
                <DialogDescription>Réservé à qui a le droit de valider les prix. Un nouveau prix validé pour la même désignation retire l&apos;ancien.</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <div className="esp-form">
                  <label className="rv-libelle">
                    Désignation <span className="esp-obligatoire">(obligatoire)</span>
                    <input className="rv-champ" value={ch("designation")} onChange={(e) => pose("designation", e.target.value)} />
                  </label>
                  <div className="esp-form-ligne">
                    <label className="rv-libelle">
                      Unité
                      <select className="rv-champ" value={ch("unite") || "u"} onChange={(e) => pose("unite", e.target.value)}>
                        {UNITES.map((u) => (
                          <option key={u.cle} value={u.cle}>
                            {u.libelle}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="rv-libelle">
                      PU HT <span className="esp-obligatoire">(obligatoire)</span>
                      <input className="rv-champ" inputMode="decimal" value={ch("pu")} onChange={(e) => pose("pu", e.target.value)} />
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
                <button type="button" className="r-btn r-btn--noir" disabled={!ch("designation").trim() || !nombre(ch("pu")) || envoi} onClick={() => void fairePoser()}>
                  {envoi ? <Loader variant="spin" /> : null} Poser et valider
                </button>
              </DialogFooter>
            </>
          ) : null}
          {form?.type === "valider" ? (
            <>
              <DialogHeader>
                <DialogIcone>
                  <CheckCircle2 width={18} height={18} aria-hidden="true" />
                </DialogIcone>
                <DialogTitle>Valider ce prix</DialogTitle>
                <DialogDescription>
                  « {form.prix.designation} »{voitPrix ? ` à ${montant(form.prix.prix_unitaire_ht)}` : ""} / {libelleUnite(form.prix.unite)}. Une fois validé, les avenants peuvent s&apos;en servir ; un prix déjà validé pour la même désignation et la même unité est retiré.
                </DialogDescription>
              </DialogHeader>
              {erreur ? (
                <DialogBody>
                  <Avis teinte="rouge" role="alert">
                    {erreur}
                  </Avis>
                </DialogBody>
              ) : null}
              <DialogFooter>
                <button type="button" className="r-btn r-btn--fil" onClick={() => setForm(null)} disabled={envoi}>
                  Annuler
                </button>
                <button type="button" className="r-btn r-btn--noir" onClick={() => void faireValider(form.prix)} disabled={envoi}>
                  {envoi ? <Loader variant="spin" /> : null} Valider le prix
                </button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
