"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le mode appels (09/10/2026) — une séance de prospection au téléphone,
   un établissement à la fois.

   La file : les établissements avec un téléphone, « Rappeler » d'abord,
   puis « À contacter », filtrés par secteur avec ⌃⌄. Pour chacun : le
   numéro, ce qu'on lui vend (les moteurs du secteur), l'ouverture à dire,
   une note. Un bouton par issue :
     · chaque appel s'écrit dans omega_lignes (tableau « appels ») — les
       chiffres de la semaine le comptent ;
     · le statut de l'établissement bouge dans omega_prospects ;
     · « RDV pris » ajoute le contact (omega_contacts) et le rendez-vous
       (tableau « rdv ») à la date choisie.
   À droite, les objections les plus fréquentes : « +1 » compte celle qu'on
   vient d'entendre et rappelle la réponse qui marche.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, CalendarCheck, ChevronsUpDown, LayoutGrid, Phone, PhoneMissed, PhoneOff, Plus, RotateCcw, SkipForward } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ItemMenu, MenuDeroulant, SectionMenu } from "@/components/espace2/ui";
import { ROLE } from "./Prospects";
import type { Ligne } from "./Tableaux";
import type { Prospect, Secteur } from "@/lib/omega/donnees";

const I = { width: 16, height: 16, strokeWidth: 1.6, "aria-hidden": true } as const;
const jour = (d: Date) => d.toISOString().slice(0, 10);
const nomModule = (m: string) => m.toUpperCase();

/* les questions qui ramènent au vrai blocage (Hormozi, « les 3A », Méthode de vente) */
const RELANCES = ["« Ah ? » … et 2 secondes de silence", "« Qu'est-ce qui vous fait poser cette question ? »", "« Qu'est-ce qui vous inquiète le plus ? »", "« Qu'est-ce qu'il faudrait pour que ce soit un oui ? »", "« Vous comparez à quoi ? »"];

type Issue = { cle: string; libelle: string; statut: string; icone: React.ReactNode };
const ISSUES: Issue[] = [
  { cle: "Pas de réponse", libelle: "Pas de réponse", statut: "Rappeler", icone: <PhoneMissed {...I} /> },
  { cle: "Rappeler", libelle: "À rappeler", statut: "Rappeler", icone: <RotateCcw {...I} /> },
  { cle: "Pas intéressé", libelle: "Pas intéressé", statut: "Pas intéressé", icone: <PhoneOff {...I} /> },
  { cle: "Ne plus appeler", libelle: "Ne plus appeler", statut: "Ne plus contacter", icone: <PhoneOff {...I} /> },
];

export default function ModeAppels({ file: initiale, secteurs, secteur, lignes: initiales, selecteur }: { file: Prospect[]; secteurs: Secteur[]; secteur?: string; lignes: Ligne[]; selecteur: React.ReactNode }) {
  const [file, setFile] = useState(initiale);
  const [lignes, setLignes] = useState(initiales);
  const [note, setNote] = useState("");
  const [dateRdv, setDateRdv] = useState("");
  const [etat, setEtat] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [aujourdhui] = useState(() => jour(new Date()));
  const p = file[0] ?? null;
  const actif = secteurs.find((s) => s.secteur === secteur) ?? null;

  const appels = lignes.filter((l) => l.tableau === "appels" && (l.donnees["Date"] ?? "").startsWith(aujourdhui));
  const decroches = appels.filter((l) => l.donnees["Issue"] !== "Pas de réponse").length;
  const rdv = appels.filter((l) => l.donnees["Issue"] === "RDV pris").length;
  const objections = lignes.filter((l) => l.tableau === "objections").sort((a, b) => Number(b.donnees["Fois"] || 0) - Number(a.donnees["Fois"] || 0));

  async function noter(issue: string, statut: string) {
    if (!p || envoi) return;
    setEnvoi(true);
    const sb = createClient();
    const nom = p.enseigne || p.entreprise;
    const maintenant = new Date();
    const donnees = { Date: maintenant.toISOString(), Entreprise: nom, Secteur: p.secteur, Issue: issue, Note: note.trim(), Prospect: String(p.id) };
    const ordre = Math.floor(maintenant.getTime() / 1000);
    const [a, b] = await Promise.all([
      sb.from("omega_lignes").insert({ tableau: "appels", ordre, donnees }).select("id, tableau, ordre, donnees").single(),
      sb.from("omega_prospects").update({ statut, note: note.trim() ? [p.note, `${maintenant.toLocaleDateString("fr-FR")} : ${note.trim()}`].filter(Boolean).join("\n") : p.note, maj: maintenant.toISOString() }).eq("id", p.id),
    ]);
    if (issue === "RDV pris") {
      const dirigeant = p.dirigeant?.replace(/\s*\(.*\)$/, "");
      const quand = dateRdv ? new Date(`${dateRdv}`) : null;
      await Promise.all([
        sb.from("omega_contacts").insert({ nom: dirigeant || nom, entreprise: nom, role: p.dirigeant?.match(/\((.*)\)/)?.[1] ?? null, type: "Prospect", telephone: p.telephone, courriel: p.courriel, commune: p.commune, secteur: p.secteur, etape: "Audit réservé", source: "Mode appels", prospect_id: p.id, prochaine_action: "Audit", prochaine_date: dateRdv ? dateRdv.slice(0, 10) : null, note: `À vendre : ${p.moteurs.join(", ")}${note.trim() ? `\n${note.trim()}` : ""}` }),
        sb.from("omega_lignes").insert({ tableau: "rdv", ordre, donnees: { Date: quand ? quand.toLocaleDateString("fr-FR") : "", Heure: quand && dateRdv.length > 10 ? dateRdv.slice(11, 16) : "", Personne: dirigeant || "", Entreprise: nom, Type: "Audit", Statut: "Prévu", "Ce qui en sort": note.trim() } }),
      ]);
    }
    setEnvoi(false);
    if (a.error || b.error) return setEtat("Échec de l'enregistrement : vérifiez votre connexion.");
    setLignes((ls) => [...ls, a.data as Ligne]);
    setFile((f) => f.slice(1));
    setNote("");
    setDateRdv("");
    setEtat(`${nom} : ${issue.toLowerCase()}${issue === "RDV pris" ? " — ajouté aux contacts et aux rendez-vous" : ""}`);
  }

  async function plusUn(o: Ligne) {
    const donnees = { ...o.donnees, Fois: String(Number(o.donnees["Fois"] || 0) + 1), "Dernière fois": new Date().toLocaleDateString("fr-FR") };
    setLignes((ls) => ls.map((l) => (l.id === o.id ? { ...l, donnees } : l)));
    const { error } = await createClient().from("omega_lignes").update({ donnees, maj: new Date().toISOString() }).eq("id", o.id);
    setEtat(error ? "Échec de l'enregistrement." : `Objection comptée : « ${o.donnees["Objection"]} »`);
  }

  const lien = (s?: string) => (s ? `/omega/appels?secteur=${encodeURIComponent(s)}` : "/omega/appels");
  const dirigeant = p?.dirigeant?.replace(/\s*\(.*\)$/, "");
  const moteur = p?.moteurs[0];

  return (
    <div className="v2-page v2-arrivee v2-val om-appels">
      <h1 className="v2-sr">Mode appels</h1>

      <div className="v2-val-filtres">
        {selecteur}
        <MenuDeroulant
          etiquette={`Secteur : ${actif?.secteur ?? "Tous les secteurs"}. Changer de secteur`}
          classe="v2-portee om-portee-secteur"
          placement="bottom start"
          largeur={340}
          declencheur={
            <>
              {actif ? <Building2 {...I} /> : <LayoutGrid {...I} />}
              <span className="v2-portee-nom">{actif?.secteur ?? "Tous les secteurs"}</span>
              <ChevronsUpDown width={14} height={14} aria-hidden="true" />
            </>
          }
        >
          <ItemMenu id="tous" href={lien()} textValue="Tous les secteurs" icone={<LayoutGrid {...I} />}>
            Tous les secteurs
          </ItemMenu>
          <SectionMenu titre="Secteurs">
            {secteurs.map((s) => (
              <ItemMenu key={s.secteur} id={s.secteur} href={lien(s.secteur)} textValue={s.secteur} icone={<Building2 {...I} />} suffixe={<span className="v2-gris">{s.avec_tel.toLocaleString("fr-FR")}</span>}>
                {s.secteur}
              </ItemMenu>
            ))}
          </SectionMenu>
        </MenuDeroulant>
        <span className="om-appels-compteurs">
          <span>
            <strong>{appels.length}</strong> appels
          </span>
          <span>
            <strong>{decroches}</strong> décrochés
          </span>
          <span>
            <strong>{rdv}</strong> RDV
          </span>
          <span className="v2-gris">aujourd&apos;hui</span>
        </span>
      </div>

      <p className="om-etat" role="status">
        {etat}
      </p>

      <div className="om-appels-grille">
        {p ? (
          <section key={p.id} className="v2-carte om-appel" aria-label={`Appel : ${p.enseigne || p.entreprise}`}>
            <div className="om-appel-tete">
              <div>
                <span className="v2-gris om-appel-file">
                  {p.statut === "Rappeler" ? "À rappeler" : "Premier appel"} · encore {file.length - 1} dans la file
                </span>
                <h2>{p.enseigne || p.entreprise}</h2>
                <p className="v2-gris">{[dirigeant, p.commune, p.effectif, p.secteur].filter(Boolean).join(" · ")}</p>
              </div>
              <a className="v2-btn v2-btn--primaire om-appel-numero" href={`tel:${p.telephone}`}>
                <Phone width={16} height={16} aria-hidden="true" />
                {p.telephone}
              </a>
            </div>

            <div className="om-appel-vente">
              {p.moteurs.map((m, i) => (
                <Link key={m} href={`/omega/${m.toLowerCase()}`} className="om-appel-moteur" data-premier={i === 0 ? "" : undefined}>
                  <span className="om-moteur" data-premier={i === 0 ? "" : undefined}>
                    {nomModule(m)}
                  </span>
                  <small>{ROLE[m] ?? ""}</small>
                  <ArrowUpRight width={12} height={12} aria-hidden="true" />
                </Link>
              ))}
            </div>

            <blockquote className="om-appel-script">
              « Bonjour{dirigeant ? ` ${dirigeant.split(" ").slice(-1)[0]}` : ""}, Teo, d&apos;Omega. Je vous appelle parce que je travaille avec des entreprises de votre métier, ici aux Antilles.
              {moteur ? ` On installe un système qui ${ROLE[moteur] ?? "fait gagner du temps sur l'administratif"}.` : ""} Je ne vous vends rien aujourd&apos;hui : je vous propose un audit gratuit de 30 minutes pour voir ce que ça donnerait chez vous. Vous auriez un créneau cette semaine ? »
            </blockquote>

            <div className="om-appel-relances" aria-label="Si ça bloque">
              <span className="v2-gris">Question piège : accueillir, associer, puis une question sur sa question.</span>
              <ul>
                {RELANCES.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>

            <textarea className="om-formation-champ om-appel-note" rows={2} placeholder="Ce qu'il a dit, ce qui l'intéresse, quand rappeler…" aria-label="Note de l'appel" value={note} onChange={(e) => setNote(e.target.value)} />

            <div className="om-appel-issues">
              <span className="om-appel-rdv">
                <input type="datetime-local" className="om-formation-champ" aria-label="Date et heure du rendez-vous" value={dateRdv} onChange={(e) => setDateRdv(e.target.value)} />
                <button type="button" className="v2-btn v2-btn--primaire v2-btn--petit" disabled={envoi} onClick={() => noter("RDV pris", "Audit réservé")}>
                  <CalendarCheck width={14} height={14} aria-hidden="true" />
                  RDV pris
                </button>
              </span>
              {ISSUES.map((x) => (
                <button key={x.cle} type="button" className="v2-val-bouton" disabled={envoi} onClick={() => noter(x.cle, x.statut)}>
                  {x.icone}
                  {x.libelle}
                </button>
              ))}
              <button type="button" className="v2-val-bouton" disabled={envoi} onClick={() => setFile((f) => [...f.slice(1), f[0]])} title="Passer sans rien noter">
                <SkipForward {...I} />
                Passer
              </button>
            </div>
          </section>
        ) : (
          <section className="v2-carte om-appel om-formation-vide">
            <span>File vide pour ce secteur : tous les établissements avec un téléphone ont été appelés.</span>
            <Link className="v2-val-bouton" href={lien()}>
              Voir tous les secteurs
            </Link>
          </section>
        )}

        <section className="v2-carte om-objections" aria-label="Objections fréquentes">
          <div className="om-section-tete">
            <h2 className="v2-val-groupe">Objections fréquentes</h2>
            <Link href="/omega/appels/objections" className="v2-gris">
              Toutes
            </Link>
          </div>
          <ul>
            {objections.slice(0, 6).map((o) => (
              <li key={o.id}>
                <details>
                  <summary>
                    <span>{o.donnees["Objection"]}</span>
                    <small className="v2-gris">{o.donnees["Fois"] || 0} fois</small>
                  </summary>
                  <p>{o.donnees["Réponse qui marche"] || "Réponse à écrire dans Objections entendues."}</p>
                </details>
                <button type="button" className="v2-btn v2-btn--petit v2-btn--fantome" aria-label={`Compter : ${o.donnees["Objection"]}`} onClick={() => plusUn(o)}>
                  <Plus width={14} height={14} aria-hidden="true" />1
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
