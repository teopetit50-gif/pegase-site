import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SystemSigne } from "@/components/logos";
import { MENU } from "@/lib/menu";
import "./UnSeulAudit.css";

/* ══════════════════════════════════════════════════════════════════════
   <UnSeulAudit> — « Tout se combine, sur un seul audit »,
   /reserver-un-audit (27/09/2026)

   REMPLACE LE SIMULATEUR (<CalculCout>, posé le matin même). Teo, sur
   capture de la section : « remplace cette section complet, je veux pas
   de comparateur ». Plus rien à régler ni à calculer ici : la section dit
   ce que l'audit passe en revue.

   ORIGINE. `integrations-5` de Tailark (@meschacirung sur 21st.dev,
   registre ouvert, lu le 27/09) : deux arcs de tuiles-logos autour d'une
   tuile centrale plus grande, posée à leur base, puis un titre centré,
   une phrase et un bouton au trait.

   CE QUI EST REPRIS : les deux arcs en dôme, les tuiles rondes blanches
   ombrées, la tuile centrale sur son socle gris, le titre centré.
   CE QUI CHANGE —
   · les logos d'éditeurs tiers (Gemini, Replit…) deviennent NOS signes :
     les quatre systèmes du catalogue et le sur-mesure, autour d'Omega.
     C'est le propos de la section, en image : un seul audit au centre ;
   · cinq tuiles au lieu de six — l'arc intérieur perd sa tuile du haut,
     pour rester symétrique sans inventer un sixième système ;
   · les arcs sont de vrais cercles concentriques (la source étire des
     pilules sur un cadre 16/10) et une lueur dorée en fait lentement le
     tour — le geste de la source (anneaux qui tournent au survol) rendu
     visible sans survol ;
   · le bouton unique devient la liste des cinq offres, chacune avec la
     ligne du menu et un lien vers sa page : un visiteur qui ne connaît
     pas nos noms sait enfin ce que représente chaque signe.

   Les textes des offres sont LUS dans lib/menu.ts (entrées de « Nos
   offres » qui mènent à /offres/…) : renommer une offre ou changer sa
   ligne dans le menu met cette section à jour. Le titre est la vedette
   du même panneau (« Tout se combine, sur un seul audit. »).
   ══════════════════════════════════════════════════════════════════════ */

const OFFRES = (MENU.find((r) => r.label === "Nos offres")?.entrees ?? []).filter((e) =>
  e.href.startsWith("/offres/"),
);

/* place de chaque tuile sur les arcs, dans l'ordre des offres :
   arc extérieur gauche, haut, droite ; arc intérieur gauche, droite */
const PLACES = ["ext-g", "ext-h", "ext-d", "int-g", "int-d"] as const;

export default function UnSeulAudit() {
  return (
    <section id="perimetre" data-monde="clair" className="r-wrap ua py-12 sm:py-24">
      <div aria-hidden className="ua-orbite">
        <span className="ua-arc ua-arc--ext">
          <span className="ua-lueur" />
        </span>
        <span className="ua-arc ua-arc--int">
          <span className="ua-lueur ua-lueur--int" />
        </span>
        {OFFRES.slice(0, PLACES.length).map((o, i) => (
          <span key={o.href} className={`ua-tuile ua-tuile--${PLACES[i]}`}>
            <SystemSigne system={o.label.toUpperCase()} taille={20} />
          </span>
        ))}
        <span className="ua-socle">
          <span className="ua-tuile ua-tuile--centre">
            <Image src="/logo-pegase.png" alt="" width={96} height={96} className="ua-omega" />
          </span>
        </span>
      </div>

      <div className="ua-texte">
        <h2 className="r-h2 ua-titre">Tout se combine, sur un seul audit</h2>
        <p className="r-lead ua-chapo">
          Le même entretien passe en revue les quatre systèmes et ce qui
          n&apos;entre dans aucune case. Vous repartez avec une seule
          recommandation, dans l&apos;ordre où la déployer.
        </p>
      </div>

      <ul data-reveal className="ua-liste">
        {OFFRES.map((o) => (
          <li key={o.href} className="ua-item">
            <Link href={o.href} className="ua-offre">
              <span aria-hidden className="ua-offre-signe">
                <SystemSigne system={o.label.toUpperCase()} taille={18} />
              </span>
              <span className="ua-offre-corps">
                <span className="ua-offre-nom">{o.label}</span>
                {o.texte ? <span className="ua-offre-ligne">{o.texte}</span> : null}
              </span>
              <ArrowUpRight aria-hidden strokeWidth={1.6} className="ua-offre-fleche" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
