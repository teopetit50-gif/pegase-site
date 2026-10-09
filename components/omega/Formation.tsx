"use client";

/* ══════════════════════════════════════════════════════════════════════
   La formation vidéo (09/10/2026) — « des vidéos pour former les gens à
   utiliser Omega ». Le programme tient dans omega_lignes (tableau
   « formation ») : une ligne = une vidéo, rangée par module.

   Tout tient sur un écran, sans rien à faire défiler sous la page : le
   module se choisit avec ⌃⌄, la liste des vidéos à gauche, la vidéo
   choisie à droite (lecteur + ce qu'on y apprend + le script, tout se
   modifie sur place). Le lien accepte YouTube, Loom, Vimeo ou un fichier
   vidéo direct ; sans lien, la vidéo est « à tourner » et le script sert
   de prompteur.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { Check, ChevronsUpDown, Circle, CirclePlay, GraduationCap, LayoutGrid, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ItemMenu, MenuDeroulant, SectionMenu } from "@/components/espace2/ui";
import type { Ligne } from "./Tableaux";

const STATUTS = ["Script à écrire", "À tourner", "À monter", "En ligne"];
const teinte = (s: string) => (s === "En ligne" ? "vert" : s === "À monter" || s === "À tourner" ? "bleu" : "gris");
const I = { width: 16, height: 16, strokeWidth: 1.6, "aria-hidden": true } as const;

/* l'adresse que le lecteur peut afficher, ou null (le lien s'ouvre alors à part) */
function lecteur(lien: string): { type: "cadre" | "fichier"; src: string } | null {
  const l = lien.trim();
  if (!l) return null;
  const yt = l.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return { type: "cadre", src: `https://www.youtube-nocookie.com/embed/${yt[1]}` };
  const loom = l.match(/loom\.com\/(?:share|embed)\/([\w-]+)/);
  if (loom) return { type: "cadre", src: `https://www.loom.com/embed/${loom[1]}` };
  const vimeo = l.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return { type: "cadre", src: `https://player.vimeo.com/video/${vimeo[1]}` };
  if (/^https:\/\/.+\.(mp4|webm|mov)(\?.*)?$/i.test(l)) return { type: "fichier", src: l };
  return null;
}

const minutes = (d: string | undefined) => {
  const m = (d ?? "").match(/(\d+)\s*(?:min|:|$)/);
  return m ? Number(m[1]) : 0;
};

export default function Formation({ lignes: initiales, selecteur }: { lignes: Ligne[]; selecteur: React.ReactNode }) {
  const [lignes, setLignes] = useState(() => initiales.filter((l) => l.tableau === "formation").sort((a, b) => a.ordre - b.ordre));
  const modules = [...new Set(lignes.map((l) => l.donnees["Module"] || "Sans module"))];
  const [module, setModule] = useState<string | null>(null);
  const visibles = lignes.filter((l) => !module || (l.donnees["Module"] || "Sans module") === module);
  const [choisie, setChoisie] = useState<string | null>(visibles[0]?.id ?? null);
  const video = lignes.find((l) => l.id === choisie) ?? visibles[0] ?? null;
  const [etat, setEtat] = useState("");

  const enLigne = lignes.filter((l) => l.donnees["Statut"] === "En ligne").length;
  const total = lignes.reduce((s, l) => s + minutes(l.donnees["Durée"]), 0);

  async function maj(id: string, cle: string, valeur: string) {
    const avant = lignes.find((l) => l.id === id);
    if (!avant || (avant.donnees[cle] ?? "") === valeur) return;
    const donnees = { ...avant.donnees, [cle]: valeur };
    setLignes((ls) => ls.map((l) => (l.id === id ? { ...l, donnees } : l)));
    const { error } = await createClient().from("omega_lignes").update({ donnees, maj: new Date().toISOString() }).eq("id", id);
    setEtat(error ? "Échec de l'enregistrement : vérifiez votre connexion." : "Enregistré");
  }

  async function ajouter() {
    const ordre = Math.max(0, ...lignes.map((l) => l.ordre)) + 1;
    const donnees = { Module: module ?? modules[0] ?? "Démarrer", Vidéo: "Nouvelle vidéo", Statut: "Script à écrire" };
    const { data, error } = await createClient().from("omega_lignes").insert({ tableau: "formation", ordre, donnees }).select("id, tableau, ordre, donnees").single();
    if (error || !data) return setEtat("Échec de l'ajout : vérifiez votre connexion.");
    setLignes((ls) => [...ls, data as Ligne]);
    setChoisie((data as Ligne).id);
    setEtat("Vidéo ajoutée");
  }

  async function supprimer(id: string) {
    if (!window.confirm("Retirer cette vidéo du programme ?")) return;
    const { error } = await createClient().from("omega_lignes").delete().eq("id", id);
    if (error) return setEtat("Échec de la suppression.");
    setLignes((ls) => ls.filter((l) => l.id !== id));
    setChoisie(null);
    setEtat("Vidéo retirée");
  }

  const lect = video ? lecteur(video.donnees["Lien"] ?? "") : null;

  return (
    <div className="v2-page v2-arrivee v2-val om-formation">
      <h1 className="v2-sr">Formation</h1>

      <div className="v2-val-filtres">
        {selecteur}
        <MenuDeroulant
          etiquette={`Module : ${module ?? "Tous les modules"}. Changer de module`}
          classe="v2-portee om-portee-secteur"
          placement="bottom start"
          largeur={300}
          declencheur={
            <>
              {module ? <GraduationCap {...I} /> : <LayoutGrid {...I} />}
              <span className="v2-portee-nom">{module ?? "Tous les modules"}</span>
              <ChevronsUpDown width={14} height={14} aria-hidden="true" />
            </>
          }
        >
          <ItemMenu id="tous" textValue="Tous les modules" icone={<LayoutGrid {...I} />} suffixe={<span className="v2-gris">{lignes.length}</span>} onAction={() => setModule(null)}>
            Tous les modules
          </ItemMenu>
          <SectionMenu titre="Modules">
            {modules.map((m) => (
              <ItemMenu key={m} id={m} textValue={m} icone={<GraduationCap {...I} />} suffixe={<span className="v2-gris">{lignes.filter((l) => (l.donnees["Module"] || "Sans module") === m).length}</span>} onAction={() => setModule(m)}>
                {m}
              </ItemMenu>
            ))}
          </SectionMenu>
        </MenuDeroulant>
        <span className="om-formation-compte v2-gris">
          {enLigne} / {lignes.length} en ligne · {total} min au programme
        </span>
        <button type="button" className="v2-val-bouton om-pousse" onClick={ajouter}>
          <Plus width={14} height={14} aria-hidden="true" />
          Ajouter une vidéo
        </button>
      </div>

      <p className="om-etat" role="status">
        {etat}
      </p>

      <div className="om-formation-grille">
        <section className="v2-carte om-formation-liste" aria-label="Vidéos du programme">
          <ol>
            {visibles.map((l, i) => (
              <li key={l.id}>
                <button type="button" className="om-formation-item" aria-current={video?.id === l.id ? "true" : undefined} onClick={() => setChoisie(l.id)}>
                  <span className="om-formation-num" data-teinte={teinte(l.donnees["Statut"] ?? "")}>
                    {l.donnees["Statut"] === "En ligne" ? <Check width={12} height={12} aria-hidden="true" /> : i + 1}
                  </span>
                  <span className="om-formation-texte">
                    <span>{l.donnees["Vidéo"] || "Sans titre"}</span>
                    <small>
                      {module ? "" : `${l.donnees["Module"] ?? ""} · `}
                      {l.donnees["Durée"] || "durée à fixer"}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        {video ? (
          <section key={video.id} className="v2-carte om-formation-video" aria-label={video.donnees["Vidéo"]}>
            <div className="om-formation-ecran">
              {lect?.type === "cadre" ? (
                <iframe src={lect.src} title={video.donnees["Vidéo"]} allow="fullscreen; picture-in-picture" allowFullScreen />
              ) : lect?.type === "fichier" ? (
                <video src={lect.src} controls preload="metadata" />
              ) : (
                <div className="om-formation-vide">
                  {video.donnees["Lien"] ? <CirclePlay width={28} height={28} strokeWidth={1.4} aria-hidden="true" /> : <Circle width={28} height={28} strokeWidth={1.4} aria-hidden="true" />}
                  <span>{video.donnees["Lien"] ? "Lien non lisible ici : il s'ouvre dans un nouvel onglet" : "Vidéo pas encore tournée : le script ci-dessous sert de prompteur"}</span>
                  {video.donnees["Lien"] ? (
                    <a className="v2-val-bouton" href={video.donnees["Lien"]} target="_blank" rel="noreferrer">
                      Ouvrir la vidéo
                    </a>
                  ) : null}
                </div>
              )}
            </div>
            <div className="om-formation-fiche">
              <div className="om-formation-tete">
                <Champ valeur={video.donnees["Vidéo"] ?? ""} etiquette="Titre" classe="om-formation-titre" onValider={(v) => maj(video.id, "Vidéo", v)} />
                <select className="om-choix" data-teinte={teinte(video.donnees["Statut"] ?? "")} value={video.donnees["Statut"] ?? STATUTS[0]} onChange={(e) => maj(video.id, "Statut", e.target.value)} aria-label="Statut">
                  {STATUTS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <button type="button" className="v2-btn v2-btn--petit v2-btn--icone v2-btn--fantome" aria-label="Retirer la vidéo" onClick={() => supprimer(video.id)}>
                  <Trash2 width={14} height={14} aria-hidden="true" />
                </button>
              </div>
              <div className="om-formation-champs">
                <label>
                  <span>Module</span>
                  <Champ valeur={video.donnees["Module"] ?? ""} etiquette="Module" onValider={(v) => maj(video.id, "Module", v)} />
                </label>
                <label>
                  <span>Durée</span>
                  <Champ valeur={video.donnees["Durée"] ?? ""} etiquette="Durée" onValider={(v) => maj(video.id, "Durée", v)} />
                </label>
                <label className="om-formation-lien">
                  <span>Lien de la vidéo</span>
                  <Champ valeur={video.donnees["Lien"] ?? ""} etiquette="Lien de la vidéo" indice="YouTube, Loom, Vimeo ou .mp4" onValider={(v) => maj(video.id, "Lien", v)} />
                </label>
              </div>
              <label className="om-formation-bloc">
                <span>Ce qu&apos;on y apprend</span>
                <Champ valeur={video.donnees["Ce qu'on apprend"] ?? ""} etiquette="Ce qu'on y apprend" multi onValider={(v) => maj(video.id, "Ce qu'on apprend", v)} />
              </label>
              <label className="om-formation-bloc">
                <span>Script</span>
                <Champ valeur={video.donnees["Script"] ?? ""} etiquette="Script" multi indice="Les phrases à dire, écran par écran" onValider={(v) => maj(video.id, "Script", v)} />
              </label>
            </div>
          </section>
        ) : (
          <section className="v2-carte om-formation-video om-formation-vide">Aucune vidéo dans ce module.</section>
        )}
      </div>
    </div>
  );
}

function Champ({ valeur, etiquette, classe, indice, multi, onValider }: { valeur: string; etiquette: string; classe?: string; indice?: string; multi?: boolean; onValider: (v: string) => void }) {
  const [v, setV] = useState(valeur);
  const commun = {
    className: `om-formation-champ${classe ? ` ${classe}` : ""}`,
    value: v,
    placeholder: indice,
    "aria-label": etiquette,
    onBlur: () => onValider(v.trim()),
  };
  return multi ? (
    <textarea {...commun} rows={3} onChange={(e) => setV(e.target.value)} />
  ) : (
    <input
      {...commun}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
