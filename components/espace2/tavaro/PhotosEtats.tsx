"use client";

/* TAVARO — « Photos de départ et de retour comparées » (03/11/2026). Les photos des états des lieux sont dans
   le bucket (loc_etats_des_lieux.photos, dommages[].preuves) ; aucune page ne les montrait, seulement leur
   nombre. Ici, vue par vue, la photo du départ à gauche et celle du retour à droite, comme deux pièces
   jointes d'un ticket Linear. Base réelle : URL signées de 10 minutes (bucket omega-clients, comme le
   téléchargement des pièces) ; exemple : des photos libres de public/exemples/tavaro. */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dateHeure } from "@/components/espace/format";
import type { EtatDesLieux } from "@/components/espace/tavaro/types";

const VUES: Record<string, string> = { avant: "Avant", arriere: "Arrière", flanc_gauche: "Flanc gauche", flanc_droit: "Flanc droit", compteur: "Compteur", jauge: "Jauge" };
/* l'exemple : les vues qui ont une photo libre */
const EXEMPLE: Record<string, { depart: string; retour: string }> = {
  arriere: { depart: "/exemples/tavaro/arriere-depart.jpg", retour: "/exemples/tavaro/arriere-retour.jpg" },
  flanc_droit: { depart: "/exemples/tavaro/roue-depart.jpg", retour: "/exemples/tavaro/roue-retour.jpg" },
};

type Paire = { vue: string; depart: { url: string; le?: string } | null; retour: { url: string; le?: string } | null };

export default function PhotosEtats({ dep, ret, source }: { dep: EtatDesLieux | null; ret: EtatDesLieux | null; source: "exemple" | "reelle" }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const chemins = [...(dep?.photos ?? []), ...(ret?.photos ?? [])].map((p) => p.chemin);
  const cle = chemins.join("|");
  useEffect(() => {
    if (source !== "reelle" || !cle) return;
    let actif = true;
    createClient()
      .storage.from("omega-clients")
      .createSignedUrls(cle.split("|"), 600)
      .then(({ data }) => {
        if (actif) setUrls(Object.fromEntries((data ?? []).filter((x) => x.signedUrl && x.path).map((x) => [x.path as string, x.signedUrl as string])));
      });
    return () => {
      actif = false;
    };
  }, [source, cle]);

  const vues = [...new Set([...(dep?.photos ?? []), ...(ret?.photos ?? [])].map((p) => p.vue))];
  const paires: Paire[] = vues
    .map((vue) => {
      const d = dep?.photos.find((p) => p.vue === vue);
      const r = ret?.photos.find((p) => p.vue === vue);
      const url = (p: typeof d, moment: "depart" | "retour") => (!p ? null : source === "exemple" ? (EXEMPLE[vue]?.[moment] ?? null) : (urls[p.chemin] ?? null));
      const ud = url(d, "depart");
      const ur = url(r, "retour");
      return { vue, depart: ud ? { url: ud, le: d?.prise_le } : null, retour: ur ? { url: ur, le: r?.prise_le } : null };
    })
    .filter((p) => p.depart || p.retour);
  if (!paires.length) return null;

  const image = (x: Paire["depart"], legende: string) =>
    x ? (
      <figure style={{ margin: 0, minWidth: 0 }}>
        <a href={x.url} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL signée du bucket ou photo d'exemple */}
          <img src={x.url} alt={legende} loading="lazy" style={{ display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 6, border: "1px solid var(--lin-bordure, rgba(128,128,128,.25))" }} />
        </a>
        <figcaption className="tav-t-gris" style={{ fontSize: 12, marginTop: 4 }}>
          {legende}
          {x.le ? ` · ${dateHeure(x.le)}` : ""}
        </figcaption>
      </figure>
    ) : (
      <p className="tav-t-gris" style={{ fontSize: 12, margin: 0 }}>
        {legende} : pas de photo
      </p>
    );

  return (
    <div style={{ display: "grid", gap: 14, padding: "8px 0 4px" }} aria-label="Photos de départ et de retour">
      {paires.map((p) => (
        <div key={p.vue}>
          <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 6px" }}>{VUES[p.vue] ?? p.vue}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {image(p.depart, "Départ")}
            {image(p.retour, "Retour")}
          </div>
        </div>
      ))}
    </div>
  );
}
