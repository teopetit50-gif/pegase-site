"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAMILA › Conformité du cabinet (30/10/2026, refonte des pages métiers)

   Les Tasks de Plain, au 1:1 : relevé docs/refonte-metiers/releves/
   plain-tasks.md, mesures dans components/espace2/lin/plain-tasks.css
   (préfixe pta-). Un segment de vues, des lignes de 49, la tâche ouverte
   dans le panneau de 360 à droite (?tache=).

   Les deux vues du cabinet qui manquaient (inventaire § 8.5-2) et le
   journal :
     · Conflits et vigilance (E7) : par dossier vivant, la porte de lecture
       tamila_conformite (stable, aucune trace) ; conflits sans décision,
       vigilance LCB-FT à faire, parties jamais contrôlées ;
     · Temps proposé (E4) : les audiences et actes des 60 derniers jours
       sans temps saisi par vous (proposerTemps, le calcul du dossier), sur
       les délais et audiences du cabinet ; ce que vous avez ignoré est lu
       par dossier (chargerHonoraires, sans trace) ;
     · Journal des accès : il se lit dossier par dossier (tamila_journal_
       acces trace sa propre lecture) ; la liste mène à chaque journal.
   Les gestes (décider un conflit, poser la vigilance, saisir ou ignorer un
   temps, exporter le journal) restent dans le dossier : le panneau y mène,
   à l'onglet et à la partie où ils se font.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowUpRight, Clock, History, ShieldAlert, X } from "lucide-react";
import { conformiteExemple, honorairesExemple, MOI } from "@/components/espace/tamila/exemples";
import * as portes from "@/components/espace/tamila/portes";
import { proposerTemps } from "@/components/espace/tamila/temps";
import type { Conformite as Conf, Temps } from "@/components/espace/tamila/types";
import { couleurDe, initiales, lienDossier } from "./commun";
import { useTamila } from "./donnees";
import "../lin/lin.css";
import "../lin/plain-tasks.css";

type Vue = "conflits" | "temps" | "journal";
const VUES: { cle: Vue; libelle: string; icone: React.ReactNode }[] = [
  { cle: "conflits", libelle: "Conflits et vigilance", icone: <ShieldAlert aria-hidden="true" /> },
  { cle: "temps", libelle: "Temps proposé", icone: <Clock aria-hidden="true" /> },
  { cle: "journal", libelle: "Journal des accès", icone: <History aria-hidden="true" /> },
];

type Tache = { cle: string; vue: Vue; dossier: string; ref: string; titre: string; description: string; qui: string | null; geste: string; lien: string; proprietes: { libelle: string; valeur: string }[]; aFaire: boolean };

function Avatar({ nom }: { nom: string | null }) {
  if (!nom || nom === "—") return null;
  return (
    <span className="pta-avatar" style={{ "--pta-teinte": couleurDe(nom) } as React.CSSProperties} title={nom} aria-label={nom} role="img">
      {initiales(nom)}
    </span>
  );
}

export default function ConformiteCabinet() {
  const { source, pret, lignes, moi, nomDe, delaisCabinet, audiencesCabinet, local } = useTamila();
  const params = useSearchParams();
  const chemin = usePathname();
  const v = params.get("vue");
  const vue: Vue = v === "temps" || v === "journal" ? v : "conflits";
  const tache = params.get("tache");
  const lienVue = (x: Vue) => (x === "conflits" ? chemin : `${chemin}?vue=${x}`);
  const lienTache = (cle: string | null) => {
    const p = new URLSearchParams();
    if (vue !== "conflits") p.set("vue", vue);
    if (cle) p.set("tache", cle);
    const s = p.toString();
    return `${chemin}${s ? `?${s}` : ""}`;
  };

  const vivants = useMemo(() => lignes.filter((x) => ["attente", "ouvert", "audit"].includes(x.dossier.statut)), [lignes]);
  const ids = vivants.map((x) => x.dossier.id).join(",");

  /* ——— conflits et vigilance : une lecture par dossier vivant (tamila_conformite, sans trace) ——— */
  const [confs, setConfs] = useState<Record<string, Conf | null> | undefined>(undefined);
  useEffect(() => {
    if (!pret) return;
    let actif = true;
    const t = window.setTimeout(async () => {
      const liste = ids.split(",").filter(Boolean);
      const n: Record<string, Conf | null> = {};
      if (source === "exemple") for (const id of liste) n[id] = conformiteExemple(id);
      else
        for (let i = 0; i < liste.length; i += 8) {
          const lot = liste.slice(i, i + 8);
          const r = await Promise.all(lot.map((id) => portes.conformite(id)));
          lot.forEach((id, j) => (n[id] = r[j]));
        }
      if (actif) setConfs(n);
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [pret, source, ids]);

  /* ——— le temps proposé : les événements récents du cabinet, puis ce que j'ai saisi ou ignoré dans chaque dossier concerné ——— */
  const moiId = source === "exemple" ? MOI : (moi?.user_id ?? null);
  const candidats = useMemo(() => {
    const par: Record<string, number> = {};
    for (const x of vivants) {
      const ev = source === "exemple" ? local.find((c) => c.dossier.id === x.dossier.id) : null;
      const p = proposerTemps({ audiences: audiencesCabinet.filter((a) => a.dossier_id === x.dossier.id), delais: delaisCabinet.filter((d) => d.dossier_id === x.dossier.id), avis: ev?.avis ?? [] }, { temps: [] }, moiId);
      if (p.length) par[x.dossier.id] = p.length;
    }
    return Object.keys(par).join(",");
  }, [vivants, audiencesCabinet, delaisCabinet, local, source, moiId]);
  const [honos, setHonos] = useState<Record<string, { temps: Temps[]; ecartes: string[] }> | undefined>(undefined);
  useEffect(() => {
    if (!pret || vue !== "temps") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      const n: Record<string, { temps: Temps[]; ecartes: string[] }> = {};
      for (const id of candidats.split(",").filter(Boolean)) {
        const h = source === "exemple" ? honorairesExemple(id) : await portes.chargerHonoraires(id);
        n[id] = { temps: h?.temps ?? [], ecartes: h?.ecartes ?? [] };
      }
      if (actif) setHonos(n);
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [pret, vue, source, candidats]);

  const taches = useMemo<Tache[]>(() => {
    const n: Tache[] = [];
    for (const x of vivants) {
      const ref = x.clair?.reference ?? "Chiffré";
      const qui = x.dossier.responsable_id ? nomDe(x.dossier.responsable_id) : null;
      const c = confs?.[x.dossier.id];
      if (c) {
        if (c.conflits_sans_decision)
          n.push({ cle: `c:${x.dossier.id}`, vue: "conflits", dossier: x.dossier.id, ref, titre: `${c.conflits_sans_decision} conflit${c.conflits_sans_decision > 1 ? "s" : ""} d'intérêts sans décision`, description: "Avant d'aller plus loin, levez le conflit (accord écrit des clients) ou refusez le dossier (RIN art. 4).", qui, geste: "Décider dans le dossier", lien: `${lienDossier(x.dossier.id, "conformite")}&partie=conflits`, proprietes: [{ libelle: "Dossier", valeur: `${ref}${x.clair ? ` — ${x.clair.intitule}` : ""}` }, { libelle: "Dernier contrôle", valeur: c.dernier_controle ? new Date(c.dernier_controle.le).toLocaleDateString("fr-FR") : "jamais" }], aFaire: true });
        if (c.vigilance_a_faire)
          n.push({ cle: `v:${x.dossier.id}`, vue: "conflits", dossier: x.dossier.id, ref, titre: "Vigilance LCB-FT à faire", description: "Identification du client et du bénéficiaire effectif, pièce d'identité, niveau de risque (CMF L.561-3).", qui, geste: "Poser la vigilance", lien: `${lienDossier(x.dossier.id, "conformite")}&partie=conflits`, proprietes: [{ libelle: "Dossier", valeur: ref }], aFaire: true });
        const jamais = Math.max(0, c.parties - c.parties_indexees);
        if (c.index && jamais)
          n.push({ cle: `p:${x.dossier.id}`, vue: "conflits", dossier: x.dossier.id, ref, titre: `${jamais} partie${jamais > 1 ? "s" : ""} jamais contrôlée${jamais > 1 ? "s" : ""}`, description: "Ces parties n'ont pas encore été comparées aux autres dossiers du cabinet.", qui, geste: "Contrôler les conflits", lien: `${lienDossier(x.dossier.id, "conformite")}&partie=conflits`, proprietes: [{ libelle: "Parties indexées", valeur: `${c.parties_indexees} sur ${c.parties}` }], aFaire: true });
      }
      const h = honos?.[x.dossier.id];
      if (h) {
        const ev = source === "exemple" ? local.find((k) => k.dossier.id === x.dossier.id) : null;
        for (const p of proposerTemps({ audiences: audiencesCabinet.filter((a) => a.dossier_id === x.dossier.id), delais: delaisCabinet.filter((d) => d.dossier_id === x.dossier.id), avis: ev?.avis ?? [] }, h, moiId))
          n.push({ cle: `t:${x.dossier.id}:${p.origine}`, vue: "temps", dossier: x.dossier.id, ref, titre: p.libelle, description: `${Math.floor(p.minutes / 60) ? `${Math.floor(p.minutes / 60)} h ` : ""}${p.minutes % 60 ? `${p.minutes % 60} min` : ""} proposées à la saisie, le ${new Date(`${p.jour}T12:00:00`).toLocaleDateString("fr-FR")}.`, qui: nomDe(moiId), geste: "Saisir ou ignorer dans le dossier", lien: lienDossier(x.dossier.id, "honoraires"), proprietes: [{ libelle: "Dossier", valeur: ref }, { libelle: "Nature", valeur: p.nature }], aFaire: true });
      }
      n.push({ cle: `j:${x.dossier.id}`, vue: "journal", dossier: x.dossier.id, ref, titre: x.clair?.intitule ?? "Intitulé chiffré", description: "Les 30 dernières lectures du dossier : qui, quand, consulté ou exporté. Ouvrir le journal est lui-même tracé ; il s'exporte en CSV depuis le dossier.", qui, geste: "Ouvrir le journal", lien: `${lienDossier(x.dossier.id, "conformite")}&partie=journal`, proprietes: [{ libelle: "Dossier", valeur: ref }], aFaire: false });
    }
    return n;
  }, [vivants, confs, honos, nomDe, source, local, audiencesCabinet, delaisCabinet, moiId]);

  const comptes: Record<Vue, number> = { conflits: taches.filter((t) => t.vue === "conflits").length, temps: taches.filter((t) => t.vue === "temps").length, journal: taches.filter((t) => t.vue === "journal").length };
  const visibles = taches.filter((t) => t.vue === vue);
  const ouverte = visibles.find((t) => t.cle === tache) ?? null;
  const chargement = !pret || (vue === "conflits" && confs === undefined) || (vue === "temps" && honos === undefined);

  return (
    <div className="lin pta" data-panneau={ouverte ? "" : undefined}>
      <h1 className="v2-sr">Conformité du cabinet</h1>
      <div className="pta-grille">
        <div className="pta-gauche">
          <header className="pta-entete">
            <p className="pta-h1" aria-hidden="true">
              Conformité du cabinet
            </p>
          </header>
          <section aria-label="Ce qui attend une décision">
            <div className="pta-barre">
              <nav className="pta-segment" aria-label="Vues">
                {VUES.map((x) => (
                  <Link key={x.cle} href={lienVue(x.cle)} scroll={false} className="pta-onglet" aria-current={x.cle === vue ? "page" : undefined}>
                    {x.icone}
                    {x.libelle}
                    <span className="pta-compte">{chargement && x.cle === vue ? "·" : comptes[x.cle]}</span>
                  </Link>
                ))}
              </nav>
            </div>

            {chargement ? (
              <ul className="pta-lignes" aria-busy="true">
                {[0, 1, 2, 3].map((i) => (
                  <li key={i} className="pta-li" aria-hidden="true">
                    <span className="pta-ligne">
                      <span className="pta-case" />
                      <span className="pta-squelette" style={{ width: `${60 - i * 8}%` }} />
                      <span />
                    </span>
                  </li>
                ))}
              </ul>
            ) : visibles.length ? (
              <ul className="pta-lignes">
                {visibles.map((x) => {
                  const actif = ouverte?.cle === x.cle;
                  return (
                    <li key={x.cle} className="pta-li" data-actif={actif ? "" : undefined}>
                      <div className="pta-ligne">
                        <span className="pta-case" data-attente={x.aFaire ? undefined : ""} role="img" aria-label={x.aFaire ? "À faire" : "À lire"} />
                        <Link className="pta-lien" href={lienTache(x.cle)} scroll={false} aria-current={actif ? "true" : undefined}>
                          <span className="pta-id">{x.ref}</span>
                          <span className="pta-nom">{x.titre}</span>
                        </Link>
                        <span className="pta-qui">
                          <Avatar nom={x.qui} />
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="pta-vide">
                <strong>{vue === "conflits" ? "Aucun conflit en attente" : vue === "temps" ? "Aucun temps proposé" : "Aucun dossier vivant"}</strong>
                <span>{vue === "conflits" ? "Chaque conflit d'intérêts a sa décision et chaque vigilance est posée." : vue === "temps" ? "Les audiences et actes des 60 derniers jours ont leur temps saisi, ou vous les avez ignorés." : "Les journaux des dossiers ouverts, audits et en attente se lisent d'ici."}</span>
              </div>
            )}
          </section>
        </div>

        {ouverte ? (
          <aside className="pta-panneau" aria-label={`Tâche : ${ouverte.titre}`}>
            <div className="pta-p-tete">
              <span className="pta-p-id">{ouverte.ref}</span>
              <h2 className="pta-p-feuille">{VUES.find((x) => x.cle === ouverte.vue)?.libelle}</h2>
              <div className="pta-p-ronds">
                <Link className="pta-rond" href={ouverte.lien} aria-label="Ouvrir le dossier à cet endroit" title="Ouvrir le dossier">
                  <ArrowUpRight aria-hidden="true" />
                </Link>
                <Link className="pta-rond" href={lienTache(null)} scroll={false} aria-label="Fermer la tâche" title="Fermer">
                  <X aria-hidden="true" />
                </Link>
              </div>
            </div>
            <div className="pta-actions">
              <span className="pta-etat" data-attente={ouverte.aFaire ? undefined : ""}>
                {ouverte.aFaire ? "À faire" : "À lire"}
              </span>
              {ouverte.qui && ouverte.qui !== "—" ? (
                <span className="pta-bouton">
                  <Avatar nom={ouverte.qui} />
                  <span>{ouverte.qui}</span>
                </span>
              ) : null}
              <Link className="pta-bouton pta-bouton--geste" href={ouverte.lien}>
                <ArrowUpRight aria-hidden="true" />
                <span>{ouverte.geste}</span>
              </Link>
            </div>
            <h3 className="pta-p-titre">{ouverte.titre}</h3>
            <p className="pta-p-desc">{ouverte.description}</p>
            <dl className="pta-props">
              {ouverte.proprietes.map((p) => (
                <div key={p.libelle} style={{ display: "contents" }}>
                  <dt>{p.libelle}</dt>
                  <dd>
                    <span className="pta-valeur">
                      <span>{p.valeur}</span>
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="pta-p-aide">« {ouverte.geste} » ouvre le dossier à l&apos;endroit où le geste se fait. Ouvrir un dossier est tracé au journal.</p>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
