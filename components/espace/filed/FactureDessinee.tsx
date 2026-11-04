/* Le facsimilé d'une pièce en mode exemple (05/10/2026) : la page est
   dessinée à partir des valeurs lues — chaque texte à sa boîte — plus les
   repères d'une facture (logo, intitulés, filets). Pour un document sans
   facture (scan), c'est le texte de la page qui est posé. Aucune donnée
   réelle : voir exemples/filed.ts. */

import type { DossierFiled } from "../types";

/* 04/11 — les formes de pièce (promesse FILED n° 5) : une photo est dessinée de biais, comme prise sur le parking ;
   une facture manuscrite à l'encre, d'une écriture penchée ; un ticket de caisse froissé, en colonne étroite et à
   chasse fixe ; une note de frais ou un relevé, leur texte. Les boîtes restent celles des valeurs lues. */
const MANUSCRITE = "'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive";
const PLIS = "repeating-linear-gradient(115deg, rgba(0,0,0,0.035) 0 2px, transparent 2px 38px), repeating-linear-gradient(32deg, rgba(0,0,0,0.03) 0 1px, transparent 1px 54px), #fbfaf6";

export default function FactureDessinee({ dossier, page }: { dossier: DossierFiled; page: number }) {
  const { facture, valeurs, pages } = dossier;
  const vals = valeurs.filter((v) => (v.page ?? 1) === page && v.boite);
  const type = dossier.piece?.type_piece ?? null;
  const photo = !!dossier.piece?.mime.startsWith("image/");
  if (!facture) {
    const p = pages.find((x) => x.n === page);
    return (
      <div className="esp-fac" aria-hidden="true">
        <div className="esp-fac-logo" style={{ left: "7%", top: "4.5%" }}>{type === "note_de_frais" ? "NF" : type === "releve" ? "R" : "?"}</div>
        <div className="esp-page-texte" style={{ position: "absolute", inset: 0, paddingTop: "16%", whiteSpace: "pre-line", fontFamily: type === "releve" || type === "note_de_frais" ? "ui-monospace, SFMono-Regular, Menlo, monospace" : undefined }}>
          {p?.texte ?? ""}
        </div>
      </div>
    );
  }
  if (type === "ticket_caisse") {
    return (
      <div className="esp-fac" aria-hidden="true" style={{ background: PLIS, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", textTransform: "uppercase" }}>
        <div className="esp-fac-gris" style={{ left: "8%", top: "8.6%" }}>{String(facture.fournisseur_lu?.adresse ?? "")}</div>
        <div className="esp-fac-filet" style={{ left: "8%", right: "8%", top: "23%" }} />
        <div className="esp-fac-filet" style={{ left: "8%", right: "8%", top: "37%" }} />
        <div className="esp-fac-gris" style={{ left: "8%", top: "56%" }}>Carte bancaire · payé</div>
        <div className="esp-fac-gris" style={{ left: "8%", top: "62%" }}>Merci de votre visite</div>
        {vals.map((v) => {
          const b = v.boite!;
          return (
            <div
              key={v.id}
              className={v.champ === "totaux.ttc" || v.champ === "fournisseur.nom" ? "esp-fac-gras" : undefined}
              style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.l * 100}%`, height: `${b.h * 100}%`, display: "flex", alignItems: "center", justifyContent: v.champ.startsWith("totaux") || v.champ.endsWith("montant_ht") ? "flex-end" : "flex-start", overflow: "hidden" }}
            >
              {v.texte}
            </div>
          );
        })}
      </div>
    );
  }
  const initiale = String(facture.fournisseur_lu?.nom ?? "F").charAt(0).toUpperCase();
  const nbLignes = dossier.lignes.length;
  const style = photo
    ? { transform: "rotate(-1.2deg) scale(0.985)", filter: "contrast(0.9) brightness(0.96) sepia(0.12)", background: "linear-gradient(160deg, #fff 0%, #f1efe9 70%, #e4e1d8 100%)", boxShadow: "0 6px 18px rgba(0,0,0,0.18)" }
    : type === "manuscrit"
      ? { fontFamily: MANUSCRITE, color: "#1f3a8a", fontStyle: "italic" as const }
      : undefined;
  return (
    <div className="esp-fac" aria-hidden="true" style={style}>
      <div className="esp-fac-logo" style={{ left: "72%", top: "4.5%" }}>{initiale}</div>
      <div className="esp-fac-gris" style={{ left: "7%", top: "15%" }}>{String(facture.fournisseur_lu?.adresse ?? "")}</div>
      <div className="esp-fac-titre" style={{ left: "62%", top: "9.2%" }}>{facture.nature === "avoir" ? "AVOIR" : "FACTURE"}</div>
      <div className="esp-fac-gris" style={{ left: "52%", top: "13.4%" }}>N°</div>
      <div className="esp-fac-gris" style={{ left: "52%", top: "16.8%" }}>Date</div>
      <div className="esp-fac-gris" style={{ left: "52%", top: "19.3%" }}>Échéance</div>
      <div className="esp-fac-gris" style={{ left: "7%", top: "21.5%" }}>Facturé à</div>
      <div style={{ left: "7%", top: "27%" }}>{String(facture.acheteur_lu?.adresse ?? "")}</div>
      <div className="esp-fac-filet" style={{ left: "7%", right: "7%", top: "36%" }} />
      <div className="esp-fac-gras esp-fac-gris" style={{ left: "7%", top: "37%" }}>Désignation</div>
      <div className="esp-fac-gras esp-fac-gris" style={{ left: "56%", top: "37%" }}>Qté</div>
      <div className="esp-fac-gras esp-fac-gris" style={{ left: "66%", top: "37%" }}>P.U. HT</div>
      <div className="esp-fac-gras esp-fac-gris" style={{ left: "78%", top: "37%" }}>Montant HT</div>
      <div className="esp-fac-filet" style={{ left: "7%", right: "7%", top: "39.6%" }} />
      {dossier.lignes.map((l, i) => (
        <div key={l.id}>
          <div style={{ left: "56%", top: `${40.3 + i * 4.5}%` }}>{l.quantite ?? ""}{l.unite ? ` ${l.unite}` : ""}</div>
          <div style={{ left: "66%", top: `${40.3 + i * 4.5}%` }}>{l.prix_unitaire !== null ? l.prix_unitaire.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) : ""}</div>
        </div>
      ))}
      <div className="esp-fac-filet" style={{ left: "7%", right: "7%", top: `${40 + nbLignes * 4.5 + 2}%` }} />
      <div className="esp-fac-gris" style={{ left: "56%", top: "65.7%" }}>Total HT</div>
      <div className="esp-fac-gris" style={{ left: "56%", top: "69%" }}>TVA {dossier.tva[0]?.taux ?? 20} %</div>
      <div className="esp-fac-gras" style={{ left: "56%", top: "72.6%" }}>Total TTC</div>
      <div className="esp-fac-filet" style={{ left: "56%", right: "7%", top: "71.6%" }} />
      <div className="esp-fac-gris" style={{ left: "7%", top: "83%" }}>Règlement par virement</div>
      <div className="esp-fac-gris" style={{ left: "7%", top: "90%" }}>BIC {String(facture.iban ?? "").slice(4, 9)}XXXX · Pénalités de retard : 3 × taux légal · Indemnité forfaitaire 40 €</div>
      {vals.map((v) => {
        const b = v.boite!;
        const titre = v.champ === "fournisseur.nom";
        const total = v.champ === "totaux.ttc";
        return (
          <div
            key={v.id}
            className={titre ? "esp-fac-titre" : total ? "esp-fac-gras" : undefined}
            style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.l * 100}%`, height: `${b.h * 100}%`, display: "flex", alignItems: "center", justifyContent: v.champ.startsWith("totaux") || v.champ.endsWith("montant_ht") ? "flex-end" : "flex-start", overflow: "hidden" }}
          >
            {v.texte}
          </div>
        );
      })}
    </div>
  );
}
