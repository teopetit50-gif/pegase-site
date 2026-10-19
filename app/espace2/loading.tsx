import { Squelette } from "@/components/espace2/ui";

/* Le squelette affiché pendant qu'une page de /espace2 se prépare. */

export default function Chargement() {
  return (
    <div className="v2-page" role="status" aria-label="Chargement">
      <div style={{ display: "grid", gap: 12, marginBottom: 32 }}>
        <Squelette largeur={220} hauteur={36} />
        <Squelette largeur={420} hauteur={16} />
      </div>
      <div className="v2-stats">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="v2-carte" style={{ padding: 16, display: "grid", gap: 8 }}>
            <Squelette largeur="50%" hauteur={14} />
            <Squelette largeur={40} hauteur={28} />
          </div>
        ))}
      </div>
      <div className="v2-carte" style={{ padding: 16, display: "grid", gap: 16 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Squelette key={i} hauteur={18} />
        ))}
      </div>
    </div>
  );
}
