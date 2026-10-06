"use client";

/* L'activité de l'organisation : un tableau, du plus récent au plus
   ancien — documents reçus, demandes de validation, décisions. Un menu
   filtre par module. Mêmes sources que la vue d'ensemble (./donnees). */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Inbox } from "lucide-react";
import { dateHeure, libelleModule, relatif } from "@/components/espace/format";
import { Etat, ItemMenu, MenuDeroulant, Note, Squelette, Vide } from "./ui";
import { useDonnees } from "./donnees";
import { evenements } from "./evenements";

export default function Activite() {
  const { donnees, erreur } = useDonnees();
  const [module, setModule] = useState<string | null>(null);

  const lignes = useMemo(() => (donnees ? evenements(donnees) : []), [donnees]);

  const modules = Array.from(new Set(lignes.map((l) => l.module))).sort();
  const visibles = lignes.filter((l) => !module || l.module === module);

  return (
    <div className="v2-page v2-arrivee">
      <h1 className="v2-sr">Activité</h1>
      <div className="v2-tete">
        <div>
          <p>Ce qui s&apos;est passé dans l&apos;organisation, du plus récent au plus ancien.</p>
        </div>
        <MenuDeroulant
          etiquette="Filtrer par module"
          classe="v2-btn v2-btn--petit"
          largeur={220}
          declencheur={
            <>
              {module ? libelleModule(module) : "Tous les modules"}
              <ChevronDown width={16} height={16} aria-hidden="true" />
            </>
          }
        >
          <ItemMenu id="tous" onAction={() => setModule(null)} suffixe={!module ? <Check width={16} height={16} aria-label="choisi" /> : null}>
            Tous les modules
          </ItemMenu>
          {modules.map((m) => (
            <ItemMenu key={m} id={m} textValue={libelleModule(m)} onAction={() => setModule(m)} suffixe={module === m ? <Check width={16} height={16} aria-label="choisi" /> : null}>
              {libelleModule(m)}
            </ItemMenu>
          ))}
        </MenuDeroulant>
      </div>

      {erreur ? (
        <div style={{ marginBottom: 24 }}>
          <Note teinte="rouge" role="alert">
            <strong>La base réelle n&apos;a pas répondu.</strong> {erreur}
          </Note>
        </div>
      ) : null}

      {donnees && !visibles.length ? (
        <Vide icone={<Inbox width={20} height={20} />} titre="Aucune activité">
          Rien ne s&apos;est encore passé ici.
        </Vide>
      ) : (
        <div className="v2-carte">
          <div className="v2-tableau-cadre">
            <table className="v2-tableau v2-tableau--empile">
              <thead>
                <tr>
                  <th scope="col">Quand</th>
                  <th scope="col">Quoi</th>
                  <th scope="col">Module</th>
                  <th scope="col">Par</th>
                  <th scope="col">État</th>
                </tr>
              </thead>
              <tbody>
                {!donnees
                  ? [0, 1, 2, 3, 4, 5].map((i) => (
                      <tr key={i}>
                        {[0, 1, 2, 3, 4].map((j) => (
                          <td key={j}>
                            <Squelette hauteur={14} />
                          </td>
                        ))}
                      </tr>
                    ))
                  : visibles.map((l) => (
                      <tr key={l.id}>
                        <td data-etiquette="Quand" style={{ whiteSpace: "nowrap" }}>
                          <span title={dateHeure(l.quand)}>{relatif(l.quand)}</span>
                        </td>
                        <td data-etiquette="Quoi" data-plein="">
                          {l.lien ? <Link href={l.lien}>{l.quoi}</Link> : l.quoi}
                          <small>{l.detail}</small>
                        </td>
                        <td data-etiquette="Module">{libelleModule(l.module)}</td>
                        <td data-etiquette="Par">{l.par}</td>
                        <td data-etiquette="État">
                          <Etat teinte={l.etat.teinte}>{l.etat.libelle}</Etat>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
