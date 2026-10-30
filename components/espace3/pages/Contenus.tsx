"use client";

/* Contenus : ce que l'IA a préparé pour chaque enseigne — posts, e-mails,
   SMS, réponses aux avis — à valider, programmé ou publié. */

import { useState } from "react";
import { Check } from "lucide-react";
import { useToast } from "@/components/espace2/Toasts";
import { CONTENUS, enseigne, quand } from "../donnees";
import { Carte, Grille, Kpi, Kpis, Ligne, Liste, Page, Pastille, Tete } from "../ui3";

export default function Contenus() {
  const toast = useToast();
  const [valides, setValides] = useState<string[]>([]);
  const aValider = CONTENUS.filter((c) => c.etat === "a_valider" && !valides.includes(c.id));
  const programmes = CONTENUS.filter((c) => c.etat === "programme" || valides.includes(c.id));
  const publies = CONTENUS.filter((c) => c.etat === "publie");
  const valider = (id: string, titre: string) => {
    setValides((v) => [...v, id]);
    toast(`Validé et programmé : ${titre}`, "vert");
  };
  return (
    <Page>
      <Tete titre="Contenus" sous="Posts, stories, e-mails, SMS et réponses aux avis, préparés chaque nuit à partir de la charte, des arrivages et des promotions de chaque enseigne. Rien n'est publié sans votre accord." />
      <Kpis colonnes={3}>
        <Kpi libelle="À valider" valeur={aValider.length} teinte={aValider.length ? "ambre" : "vert"} sous="préparés cette nuit" />
        <Kpi libelle="Programmés" valeur={programmes.length} sous="dans les 7 prochains jours" />
        <Kpi libelle="Publiés ce mois" valeur="146" sous="sur 10 enseignes" />
      </Kpis>
      <Carte titre="À valider" sous={aValider.length ? "Un clic pour programmer" : "Tout est validé"}>
        <Liste>
          {aValider.map((c) => (
            <Ligne
              key={c.id}
              teinte="ambre"
              titre={c.titre}
              sous={`${enseigne(c.enseigne)?.nom} · ${c.format} · ${quand(c.jours)}`}
              fin={
                <button type="button" className="v2-btn v2-btn--petit v2-btn--primaire" onClick={() => valider(c.id, c.titre)}>
                  <Check width={14} height={14} aria-hidden="true" /> Valider
                </button>
              }
            />
          ))}
        </Liste>
      </Carte>
      <Grille>
        <Carte titre="Programmés">
          <Liste>
            {programmes.map((c) => (
              <Ligne key={c.id} teinte="bleu" titre={c.titre} sous={`${enseigne(c.enseigne)?.nom} · ${c.format}`} fin={<Pastille>{quand(c.jours)}</Pastille>} />
            ))}
          </Liste>
        </Carte>
        <Carte titre="Publiés récemment">
          <Liste>
            {publies.map((c) => (
              <Ligne key={c.id} teinte="vert" titre={c.titre} sous={`${enseigne(c.enseigne)?.nom} · ${c.format}`} fin={`il y a ${-c.jours} j`} />
            ))}
          </Liste>
        </Carte>
      </Grille>
    </Page>
  );
}
