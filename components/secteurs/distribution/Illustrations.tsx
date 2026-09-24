import { Fleche } from "./Fleche";

/* ══════════════════════════════════════════════════════════════════════
   Les quatre illustrations de la grille d'atouts (24/09/2026)

   Chez Toolio ce sont des IMAGES : des fragments d'interface qui flottent
   (petits tableaux, pastilles de personne sur fond bleu pâle, bouton gris
   « Rationalize », bulles de discussion, courbes). On en reprend la
   grammaire en balisage — cartes blanches filées #d7dbe1, ombre douce,
   pastilles bleu pâle #dae8fa — avec nos objets : le message du matin,
   le conteneur, le transfert entre îles, les sources lues.
   Aucune photo de personne : les pastilles portent des initiales et un
   rôle, jamais un nom (règles maison). Largeur naturelle : 520 px.
   ══════════════════════════════════════════════════════════════════════ */

function Personne({ initiales, role, className = "" }: { initiales: string; role: string; className?: string }) {
  return (
    <span className={`nm-il__personne ${className}`}>
      <span className="nm-il__initiales">{initiales}</span>
      <span>{role}</span>
    </span>
  );
}

export function IllustrationMatin() {
  return (
    <div className="nm-il" aria-hidden>
      <div className="nm-il__carte nm-il__message">
        <div className="nm-il__message-tete">
          <span className="nm-il__signe" />
          <span>
            <b>Namolu</b> · point du matin
          </span>
          <span className="nm-il__heure">7 h 00</span>
        </div>
        {[
          ["#de444c", "Disjoncteur 20 A par avion", "bouclier qualité-prix, rupture lundi"],
          ["#ffbb16", "Ajouter 480 bâches au conteneur", "départ dans 6 jours"],
          ["#0c66dc", "Transférer 140 ventilateurs", "22 semaines de stock au magasin 1"],
        ].map(([c, t, r]) => (
          <div key={t} className="nm-il__decision">
            <i style={{ background: c }} />
            <span>
              <b>{t}</b>
              <small>{r}</small>
            </span>
          </div>
        ))}
      </div>
      <span className="nm-il__action">
        <Fleche /> Valider les trois
      </span>
      <Personne initiales="DA" role="Direction des achats" className="nm-il__pos-a" />
      <Personne initiales="M2" role="Directeur, magasin 2" className="nm-il__pos-b" />
    </div>
  );
}

export function IllustrationConteneur() {
  return (
    <div className="nm-il" aria-hidden>
      <div className="nm-il__carte nm-il__conteneur">
        <div className="nm-il__ligne-titre">
          <span>Conteneur 40 pieds</span>
          <b>86 %</b>
        </div>
        <div className="nm-il__jauge">
          <i style={{ width: "42%" }} />
          <i style={{ width: "31%" }} />
          <i style={{ width: "13%" }} />
        </div>
        <table className="nm-il__table">
          <tbody>
            <tr>
              <td>Fournisseur A</td>
              <td>42 %</td>
              <td>départ 8/10</td>
            </tr>
            <tr>
              <td>Fournisseur B</td>
              <td>31 %</td>
              <td>départ 8/10</td>
            </tr>
            <tr>
              <td>Fournisseur C</td>
              <td>13 %</td>
              <td>départ 8/10</td>
            </tr>
          </tbody>
        </table>
      </div>
      <span className="nm-il__action nm-il__pos-c">
        <Fleche /> Compléter à 95 %
      </span>
      <div className="nm-il__carte nm-il__avion">
        <span>Par avion</span>
        <b>12 références</b>
        <small>arriveraient après la rupture</small>
      </div>
      <Personne initiales="AG" role="Achats groupe" className="nm-il__pos-d" />
    </div>
  );
}

export function IllustrationIles() {
  const barres = [
    ["Magasin 1", 22],
    ["Magasin 2", 9],
    ["Magasin 3", 3],
    ["Magasin 4", 5],
  ] as const;
  return (
    <div className="nm-il" aria-hidden>
      <div className="nm-il__carte nm-il__couverture">
        <div className="nm-il__ligne-titre">
          <span>Couverture, en semaines</span>
          <small>Ventilateur colonne</small>
        </div>
        {barres.map(([m, v]) => (
          <div key={m} className="nm-il__barre">
            <span>{m}</span>
            <i style={{ width: `${(v / 22) * 100}%` }} className={v < 4 ? "is-bas" : undefined} />
            <b>{v}</b>
          </div>
        ))}
      </div>
      <div className="nm-il__carte nm-il__transfert">
        <span className="nm-il__ile">Martinique · magasin 1</span>
        <span className="nm-il__vers">
          <Fleche />
        </span>
        <span className="nm-il__ile">Guadeloupe · magasin 3</span>
        <small>140 unités · caboteur du 8 octobre</small>
      </div>
      <Personne initiales="LG" role="Logistique" className="nm-il__pos-e" />
      <span className="nm-il__action nm-il__pos-f">
        <Fleche /> Démarquer avant les soldes
      </span>
    </div>
  );
}

export function IllustrationSources() {
  const sources = ["ERP", "Caisses", "Entrepôt", "Transitaires", "Fournisseurs", "Fichiers Excel", "Commandes", "Vigilance météo"];
  return (
    <div className="nm-il nm-il--sources" aria-hidden>
      <div className="nm-il__grille">
        {sources.map((s) => (
          <span key={s} className="nm-il__source">
            {s}
          </span>
        ))}
        <span className="nm-il__source nm-il__source--plus">
          <b>+</b>
          Sur mesure
        </span>
      </div>
    </div>
  );
}
