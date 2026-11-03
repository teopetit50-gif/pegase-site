"use client";

/* DALIRO — « Daliro chiffre l'avenant sur vos prix unitaires et y joint les photos datées » (03/11/2026).
   Un avenant ouvert depuis un message garde origine.message (b6_24b) ; les photos sont les pièces du message
   (btp_messages.pieces, dans le bucket omega-clients). Aucune page ne les montrait. Base réelle : URL signées
   de 10 minutes ; exemple : origine.photos, des photos libres de public/exemples/daliro. */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dateCourte } from "@/components/espace/format";
import type { PieceMessage } from "@/components/espace/daliro/types";

type Photo = { url: string; nom: string };

export default function PhotosAvenant({ origine, source }: { origine: Record<string, unknown>; source: "exemple" | "reelle" }) {
  const message = typeof origine.message === "string" ? origine.message : null;
  const [reelles, setReelles] = useState<Photo[]>([]);
  useEffect(() => {
    if (source !== "reelle" || !message) return;
    let actif = true;
    (async () => {
      const s = createClient();
      const { data } = await s.from("btp_messages").select("pieces").eq("id", message).maybeSingle();
      const pieces = (((data as { pieces?: PieceMessage[] } | null)?.pieces ?? []) as PieceMessage[]).filter((p) => !p.vocal && (p.mime ?? "").startsWith("image/"));
      if (!pieces.length) return;
      const { data: urls } = await s.storage.from("omega-clients").createSignedUrls(pieces.map((p) => p.chemin), 600);
      if (actif) setReelles(pieces.map((p, i) => ({ url: urls?.[i]?.signedUrl ?? "", nom: p.nom })).filter((p) => p.url));
    })().catch(() => undefined);
    return () => {
      actif = false;
    };
  }, [source, message]);
  const photos = source === "exemple" ? ((Array.isArray(origine.photos) ? origine.photos : []) as Photo[]) : reelles;
  if (!photos.length) return null;
  const le = typeof origine.date === "string" ? ` · prises le ${dateCourte(origine.date)}` : "";
  return (
    <div style={{ padding: "8px 0" }} aria-label="Photos jointes à l'avenant">
      <p style={{ fontSize: 12, margin: "0 0 6px", opacity: 0.75 }}>
        {photos.length} photo{photos.length > 1 ? "s" : ""} jointe{photos.length > 1 ? "s" : ""}
        {le}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
        {photos.map((p) => (
          <a key={p.url} href={p.url} target="_blank" rel="noreferrer" title={p.nom}>
            {/* eslint-disable-next-line @next/next/no-img-element -- URL signée du bucket ou photo d'exemple */}
            <img src={p.url} alt={p.nom} loading="lazy" style={{ display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 6 }} />
          </a>
        ))}
      </div>
    </div>
  );
}
