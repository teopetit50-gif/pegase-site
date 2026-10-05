/* Le facsimilé d'une pièce en mode exemple (05/10/2026) : la page est
   dessinée à partir des valeurs lues — chaque texte à sa boîte — plus les
   repères d'une facture (logo, intitulés, filets). Pour un document sans
   facture (scan), c'est le texte de la page qui est posé. Aucune donnée
   réelle : voir exemples/filed.ts. */

import type { DossierFiled } from "../types";

export default function FactureDessinee({ dossier, page }: { dossier: DossierFiled; page: number }) {
  const { facture, valeurs, pages } = dossier;
  const vals = valeurs.filter((v) => (v.page ?? 1) === page && v.boite);
  if (!facture) {
    const p = pages.find((x) => x.n === page);
    return (
      <div className="esp-fac" aria-hidden="true">
        <div className="esp-fac-logo" style={{ left: "7%", top: "4.5%" }}>?</div>
        <div className="esp-page-texte" style={{ position: "absolute", inset: 0, paddingTop: "16%" }}>
          {p?.texte ?? ""}
        </div>
      </div>
    );
  }
  const initiale = String(facture.fournisseur_lu?.nom ?? "F").charAt(0).toUpperCase();
  const nbLignes = dossier.lignes.length;
  return (
    <div className="esp-fac" aria-hidden="true">
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
