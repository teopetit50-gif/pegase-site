"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › les parties de la fiche d'un chantier, en liste et volet
   (30/10/2026)

   Les onglets Terrain et Argent montraient les tableaux de l'écran d'avant
   (ChantierVue) : 6 à 9 colonnes, cellules sur quatre lignes, gestes
   empilés. Ici chaque partie est une liste groupée de « My issues »
   (../lin/Volet.tsx) : une ligne par passage, avenant, ligne du marché…,
   et le détail de l'élément choisi dans le volet de droite, avec ses gestes.

   Rien n'est réécrit : ChantierVue rend ce composant à la place de ses
   cartes quand la page fournit un volet, et lui passe ses propres gestes
   (ouvrir une fenêtre, agir) ; les fenêtres restent les siennes.
   Les cartes à part (Questions, Météo, Appro, Fil, Situations, Heures,
   Réception) font de même chez elles.
   ══════════════════════════════════════════════════════════════════════ */

import { AlertTriangle, BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, FileSignature, FileText, FileUp, GitBranch, Layers, Link2, PenLine, Plus, Receipt, RotateCcw, Unlink, Users } from "lucide-react";
import ChiffrageLu from "@/components/espace/daliro/ChiffrageLu";
import type { FormChantier, SectionChantier } from "@/components/espace/daliro/ChantierVue";
import { ACCEPTATIONS, CONFIRMATIONS, CONTROLES_LIGNE, EXECUTIONS, GRAVITES, STATUTS_AVENANT, familleControle, libelleEnvoi, libelleStatutFacture, libelleUnite } from "@/components/espace/daliro/etats";
import { ouverte } from "@/components/espace/daliro/fonctions";
import type { Avenant, Controle, LigneAvenant, Passage, Tableau } from "@/components/espace/daliro/types";
import { dateCourte, dateHeure, montant, nombreFr, pourcent } from "@/components/espace/format";
import { Bouton, Detail, Gestes, Groupe, Ligne, Liste, Partie, Pilule, Point, Rangee, Rangees, SousLigne, SousListe, Texte, Vide, jourCourt, periodeCourte, teinte } from "../lin/Volet";

type Props = {
  tableau: Tableau;
  voir: (x: SectionChantier) => boolean;
  ouvrir: (f: FormChantier) => void;
  envoi: boolean;
  aujourdhui: string;
  faireProposerDependances: () => void;
  faireDependance: (id: string, confirmee: boolean) => void;
  faireRetirerLigne: (a: Avenant, l: LigneAvenant) => void;
};

const CANAUX: Record<string, string> = { vocal: "Vocal", photo: "Photo", visite: "Visite", courriel: "Courriel", email: "Courriel", whatsapp: "WhatsApp", sms: "SMS", telephone: "Téléphone" };
const heures = (p: Passage) => (p.heure_debut ? `${p.heure_debut.slice(0, 5)}${p.heure_fin ? ` – ${p.heure_fin.slice(0, 5)}` : ""}` : null);

export default function PartiesChantier(p: Props) {
  const { voir } = p;
  return (
    <>
      {voir("controles") ? <Controles {...p} /> : null}
      {voir("planning") ? <Planning {...p} /> : null}
      {voir("avenants") ? <Avenants {...p} /> : null}
      {voir("marche") ? <MarcheLignes {...p} /> : null}
      {voir("lots") ? <Lots {...p} /> : null}
      {voir("factures") ? <Factures {...p} /> : null}
    </>
  );
}

/* ——— Points à régler : les contrôles du chantier, par gravité, puis ceux de l'organisation ——— */
function Controles({ tableau }: Props) {
  const tous = tableau.controles;
  const orga = tableau.controles_organisation;
  const groupes: { cle: Controle["gravite"]; nom: string }[] = [
    { cle: "bloquant", nom: "Bloquants" },
    { cle: "attention", nom: "À voir" },
    { cle: "info", nom: "Pour information" },
  ];
  const ligne = (k: Controle, prefixe: string, icone: React.ReactNode) => {
    const cle = `${prefixe}:${k.code}:${k.objet_id}`;
    const g = GRAVITES[k.gravite];
    return (
      <Ligne key={cle} cle={cle} libelle={`${g.libelle} : ${k.message}`} icone={<span data-teinte={teinte(g.teinte)} className="lvp-icone-teinte">{icone}</span>} id={prefixe === "orga" ? "Organisation" : familleControle(k.code)} titre={k.message} droite={<Pilule teinte={teinte(g.teinte)} icone={<Point teinte={teinte(g.teinte)} />}>{g.libelle}</Pilule>} />
    );
  };
  const details = [...tous.map((k) => ({ k, prefixe: "controle" })), ...orga.map((k) => ({ k, prefixe: "orga" }))].map(({ k, prefixe }) => {
    const g = GRAVITES[k.gravite];
    return (
      <Detail key={`${prefixe}:${k.code}:${k.objet_id}`} cle={`${prefixe}:${k.code}:${k.objet_id}`} titre={g.libelle} sous={prefixe === "orga" ? "Contrôle de l'organisation (annuaire, vigilance)" : familleControle(k.code)}>
        <Texte>{k.message}</Texte>
      </Detail>
    );
  });
  return (
    <Partie titre="Points à régler" compte={tous.length ? `${tous.filter((k) => k.gravite === "bloquant").length} bloquant${tous.filter((k) => k.gravite === "bloquant").length > 1 ? "s" : ""} · ${tous.filter((k) => k.gravite === "attention").length} à voir` : null}>
      {tous.length || orga.length ? (
        <Liste>
          {groupes.map((gr) => {
            const ks = tous.filter((k) => k.gravite === gr.cle);
            return ks.length ? (
              <Groupe key={gr.cle} nom={gr.nom} compte={ks.length}>
                {ks.map((k) => ligne(k, "controle", <ClipboardCheck />))}
              </Groupe>
            ) : null;
          })}
          {orga.length ? (
            <Groupe nom="Organisation" compte={orga.length} precision="annuaire, vigilance">
              {orga.map((k) => ligne(k, "orga", <Users />))}
            </Groupe>
          ) : null}
        </Liste>
      ) : (
        <Vide>Rien à signaler sur ce chantier.</Vide>
      )}
      {details}
    </Partie>
  );
}

/* ——— Planning : les passages par état, la confirmation à J-2 en pastille ——— */
function Planning({ tableau, ouvrir, envoi, aujourdhui, faireProposerDependances, faireDependance }: Props) {
  const c = tableau.chantier;
  const vivant = c.statut === "ouvert" || c.statut === "suspendu";
  const passages = tableau.passages;
  const enRetard = (x: Passage) => x.statut === "prevu" && x.fin < aujourdhui;
  const groupes = [
    { nom: "En retard", liste: passages.filter(enRetard), precision: "pas notés faits" },
    { nom: "À venir", liste: passages.filter((x) => x.statut === "prevu" && !enRetard(x)), precision: null },
    { nom: "Faits", liste: passages.filter((x) => x.statut === "fait"), precision: null },
    { nom: "Annulés", liste: passages.filter((x) => x.statut === "annule"), precision: null },
  ];
  const qui = (x: Passage) => x.intervenant_nom ?? x.intervenant_lu ?? "Intervenant à ranger";
  const deps = tableau.dependances;

  return (
    <>
      <Partie
        id="planning"
        titre="Planning"
        compte={passages.length ? `${passages.filter((x) => x.statut === "prevu").length} à venir` : null}
        gestes={
          <Bouton icone={<GitBranch aria-hidden="true" />} onClick={faireProposerDependances} disabled={envoi || !passages.length}>
            Proposer les dépendances
          </Bouton>
        }
      >
        {passages.length ? (
          <Liste>
            {groupes.map((g) =>
              g.liste.length ? (
                <Groupe key={g.nom} nom={g.nom} compte={g.liste.length} precision={g.precision}>
                  {g.liste.map((x) => {
                    const k = CONFIRMATIONS[x.confirmation];
                    return (
                      <Ligne
                        key={x.id}
                        cle={`passage:${x.id}`}
                        libelle={`${x.tache ?? "Passage"}, ${qui(x)}, ${periodeCourte(x.debut, x.fin)}`}
                        icone={<CalendarDays />}
                        id={x.lot_code ?? undefined}
                        titre={x.tache ?? "Passage"}
                        second={qui(x)}
                        droite={
                          <>
                            {x.intervenant_type === "inconnu" ? <Pilule teinte="jaune">À ranger</Pilule> : null}
                            {x.intervenant_type === "tiers" ? (
                              <Pilule teinte={teinte(k.teinte)} icone={<Point teinte={teinte(k.teinte)} />}>
                                {k.libelle}
                              </Pilule>
                            ) : x.intervenant_type === "equipe" ? (
                              <Pilule>Équipe interne</Pilule>
                            ) : null}
                          </>
                        }
                        date={periodeCourte(x.debut, x.fin)}
                        dateTitre={`${dateCourte(x.debut)}${x.fin !== x.debut ? ` au ${dateCourte(x.fin)}` : ""}`}
                      />
                    );
                  })}
                </Groupe>
              ) : null,
            )}
          </Liste>
        ) : (
          <Vide>Aucun passage planifié : importez le planning (tableur) ou posez les passages ; rien à confirmer à J-2 sinon.</Vide>
        )}
        {passages.map((x) => {
          const k = CONFIRMATIONS[x.confirmation];
          const dernier = x.confirmations?.length ? x.confirmations[x.confirmations.length - 1] : null;
          const repondre = x.intervenant_type === "tiers" && x.statut === "prevu" && x.confirmation !== "non_demandee" && x.confirmation !== "confirmee";
          const remplacer = ouverte(tableau, "remplacants") && x.intervenant_type === "tiers" && x.statut === "prevu" && (x.confirmation === "declinee" || x.confirmation === "sans_reponse");
          const recaler = x.statut === "prevu" && vivant && ouverte(tableau, "ordre_lots");
          const terminer = x.statut === "prevu" && vivant && x.debut <= aujourdhui;
          const h = heures(x);
          return (
            <Detail key={x.id} cle={`passage:${x.id}`} titre={x.tache ?? "Passage"} sous={x.lot_code ? `Lot ${x.lot_code}${x.lot_libelle ? ` · ${x.lot_libelle}` : ""}` : "Aucun lot"}>
              <Rangees>
                <Rangee libelle="Dates">
                  {dateCourte(x.debut)}
                  {x.fin !== x.debut ? ` → ${dateCourte(x.fin)}` : ""}
                  {h ? ` · ${h}` : ""}
                </Rangee>
                <Rangee libelle="État" teinte={enRetard(x) ? "jaune" : undefined}>
                  {x.statut === "fait" ? "Fait" : x.statut === "annule" ? "Annulé" : enRetard(x) ? "En retard : pas noté fait" : "Prévu"}
                  {x.exterieur ? " · extérieur" : ""}
                </Rangee>
                <Rangee libelle="Qui">
                  {qui(x)}
                  {x.rapprochement === "ressemblance" && x.intervenant_lu ? ` (lu « ${x.intervenant_lu} »)` : ""}
                </Rangee>
                {x.intervenant_type === "tiers" ? (
                  <Rangee libelle="Confirmation" teinte={teinte(k.teinte)}>
                    <Point teinte={teinte(k.teinte)} />
                    {k.libelle}
                  </Rangee>
                ) : null}
                {dernier ? (
                  <Rangee libelle="Réponse">
                    {dateHeure(dernier.survenu_le)}
                    {dernier.canal ? ` · ${CANAUX[dernier.canal] ?? dernier.canal}` : ""}
                  </Rangee>
                ) : null}
                {x.envoi ? <Rangee libelle="Envoi J-2">{libelleEnvoi(x.envoi, dateHeure)}</Rangee> : null}
              </Rangees>
              {dernier && typeof dernier.detail.texte === "string" ? <Texte citation>« {dernier.detail.texte} »</Texte> : null}
              {repondre || remplacer || recaler || terminer ? (
                <Gestes>
                  {terminer ? (
                    <Bouton fort icone={<CheckCircle2 aria-hidden="true" />} onClick={() => ouvrir({ type: "terminer", passage: x })}>
                      Noter fait
                    </Bouton>
                  ) : null}
                  {repondre ? <Bouton onClick={() => ouvrir({ type: "reponse", passage: x })}>Noter la réponse</Bouton> : null}
                  {remplacer ? <Bouton icone={<Users aria-hidden="true" />} onClick={() => ouvrir({ type: "remplacants", passage: x })}>Remplaçants</Bouton> : null}
                  {recaler ? <Bouton icone={<CalendarDays aria-hidden="true" />} onClick={() => ouvrir({ type: "recaler", passage: x })}>Recaler</Bouton> : null}
                </Gestes>
              ) : null}
            </Detail>
          );
        })}
      </Partie>

      {deps.length ? (
        <Partie titre="Dépendances" compte={`${deps.filter((d) => !d.confirmee).length} à confirmer`}>
          <Liste>
            <Groupe nom="Ordre des passages" compte={deps.length}>
              {deps.map((d) => (
                <Ligne
                  key={d.id}
                  cle={`dependance:${d.id}`}
                  libelle={`« ${d.amont_tache ?? "amont"} » avant « ${d.aval_tache ?? "aval"} »`}
                  icone={<GitBranch />}
                  titre={`${d.amont_tache ?? "amont"} → ${d.aval_tache ?? "aval"}`}
                  second={d.delai_min_jours ? `${d.delai_min_jours} j ouvré${d.delai_min_jours > 1 ? "s" : ""} entre les deux` : null}
                  droite={d.confirmee ? <Pilule teinte="vert" icone={<Point teinte="vert" />}>Confirmée</Pilule> : <Pilule teinte="jaune" icone={<Point teinte="jaune" />}>À confirmer</Pilule>}
                />
              ))}
            </Groupe>
          </Liste>
          {deps.map((d) => (
            <Detail key={d.id} cle={`dependance:${d.id}`} titre={`« ${d.amont_tache ?? "amont"} » avant « ${d.aval_tache ?? "aval"} »`}>
              <Rangees>
                <Rangee libelle="Délai">{d.delai_min_jours ? `${d.delai_min_jours} jour${d.delai_min_jours > 1 ? "s" : ""} ouvré${d.delai_min_jours > 1 ? "s" : ""} entre les deux` : "Aucun"}</Rangee>
                <Rangee libelle="Origine">{d.origine === "gabarit" ? "Proposée d'après l'ordre des corps d'état" : d.origine === "import" ? "Importée" : "Posée à la main"}</Rangee>
                <Rangee libelle="État" teinte={d.confirmee ? "vert" : "jaune"}>{d.confirmee ? "Confirmée" : "À confirmer"}</Rangee>
              </Rangees>
              {!d.confirmee ? (
                <Gestes>
                  <Bouton fort onClick={() => faireDependance(d.id, true)} disabled={envoi}>
                    Confirmer
                  </Bouton>
                </Gestes>
              ) : null}
            </Detail>
          ))}
        </Partie>
      ) : null}
    </>
  );
}

/* ——— Avenants : par statut ; le message du terrain, le chiffrage et les lignes dans le détail ——— */
function Avenants({ tableau, ouvrir, envoi, faireRetirerLigne }: Props) {
  const { avenants, voit_prix, lots } = tableau;
  const lotNom = (id: string | null) => (id ? lots.find((l) => l.id === id)?.code ?? "?" : "—");
  const valide = (a: Avenant) => a.demande_statut === "approuvee" || a.demande_statut === "executee";
  const validation = (a: Avenant) => (valide(a) ? { t: "vert" as const, l: "Validé : à signer" } : a.demande_statut === "rejetee" ? { t: "rouge" as const, l: "Refusé à la validation" } : { t: "bleu" as const, l: "Dans « À valider »" });
  const groupes = [
    { nom: "À chiffrer", liste: avenants.filter((a) => a.statut === "brouillon"), precision: "brouillons" },
    { nom: "Soumis", liste: avenants.filter((a) => a.statut === "soumis"), precision: null },
    { nom: "Signés", liste: avenants.filter((a) => a.statut === "signe"), precision: null },
    { nom: "Refusés ou abandonnés", liste: avenants.filter((a) => a.statut === "refuse" || a.statut === "abandonne"), precision: null },
  ];
  return (
    <Partie
      id="avenants"
      titre="Avenants"
      compte={avenants.length ? `${avenants.length} · ${avenants.filter((a) => a.statut === "signe").length} signé${avenants.filter((a) => a.statut === "signe").length > 1 ? "s" : ""}` : null}
      gestes={
        <Bouton icone={<FileSignature aria-hidden="true" />} onClick={() => ouvrir({ type: "avenant" })} disabled={tableau.chantier.statut !== "ouvert" && tableau.chantier.statut !== "suspendu"} title={tableau.chantier.statut !== "ouvert" && tableau.chantier.statut !== "suspendu" ? "Un avenant se prépare sur un chantier ouvert" : undefined}>
          Ouvrir un avenant
        </Bouton>
      }
    >
      {avenants.length ? (
        <Liste>
          {groupes.map((g) =>
            g.liste.length ? (
              <Groupe key={g.nom} nom={g.nom} compte={g.liste.length} precision={g.precision}>
                {g.liste.map((a) => {
                  const st = STATUTS_AVENANT[a.statut];
                  const v = a.statut === "soumis" ? validation(a) : null;
                  return (
                    <Ligne
                      key={a.id}
                      cle={`avenant:${a.id}`}
                      libelle={`Avenant n° ${a.numero} : ${a.objet}`}
                      icone={<FileSignature />}
                      id={`n° ${a.numero}`}
                      titre={a.objet}
                      second={a.origine?.auteur ? String(a.origine.auteur) : null}
                      droite={
                        v ? (
                          <Pilule teinte={v.t} icone={<Point teinte={v.t} />}>{v.l}</Pilule>
                        ) : (
                          <Pilule teinte={teinte(st.teinte)} icone={<Point teinte={teinte(st.teinte)} />}>{st.libelle}</Pilule>
                        )
                      }
                      date={voit_prix ? montant(a.montant_ht) : a.signe_le ? jourCourt(a.signe_le) : null}
                      dateTitre={voit_prix ? "Montant HT" : undefined}
                    />
                  );
                })}
              </Groupe>
            ) : null,
          )}
        </Liste>
      ) : (
        <Vide>Un travail supplémentaire repéré (vocal, photo, visite) devient un avenant chiffré sur vos prix, signé avant exécution.</Vide>
      )}
      {avenants.map((a) => {
        const st = STATUTS_AVENANT[a.statut];
        const v = a.statut === "soumis" ? validation(a) : null;
        const o = a.origine ?? {};
        return (
          <Detail key={a.id} cle={`avenant:${a.id}`} titre={`Avenant n° ${a.numero}`} sous={a.objet}>
            <Rangees>
              <Rangee libelle="Statut" teinte={teinte(st.teinte)}>
                <Point teinte={teinte(st.teinte)} />
                {st.libelle}
              </Rangee>
              {v ? (
                <Rangee libelle="Validation" teinte={v.t}>
                  {v.l}
                </Rangee>
              ) : null}
              {voit_prix ? <Rangee libelle="Montant">{montant(a.montant_ht)} HT</Rangee> : null}
              {o.canal || o.auteur || o.date ? (
                <Rangee libelle="Origine">
                  {[o.canal ? CANAUX[String(o.canal)] ?? String(o.canal) : null, o.auteur ? String(o.auteur) : null, o.date ? dateCourte(String(o.date)) : null].filter(Boolean).join(" · ")}
                </Rangee>
              ) : null}
              {a.signe_le ? (
                <Rangee libelle="Signé" teinte="vert">
                  {dateCourte(a.signe_le)}
                  {a.signe_libelle ? (a.signe_libelle.startsWith("Signé sur place") ? ` · ${a.signe_libelle.charAt(0).toLowerCase()}${a.signe_libelle.slice(1)}` : ` · ${a.signe_libelle}`) : ""}
                </Rangee>
              ) : null}
              {a.motif ? <Rangee libelle="Motif">{a.motif}</Rangee> : null}
            </Rangees>
            {o.texte ? <Texte citation>« {String(o.texte)} »</Texte> : null}
            <div className="lvp-note">
              <ChiffrageLu chiffrage={o.chiffrage} chiffree={a.lignes.some((l) => l.origine_prix === "bibliotheque")} voitPrix={!!voit_prix} />
            </div>
            <SousListe titre={a.lignes.length ? `Lignes (${a.lignes.length})` : "Lignes"}>
              {a.lignes.length ? (
                a.lignes.map((l) => (
                  <SousLigne
                    key={l.id}
                    titre={`${l.designation}${l.sens === -1 ? " (moins-value)" : ""}`}
                    second={`Lot ${lotNom(l.lot_id)} · ${nombreFr(l.quantite)} ${libelleUnite(l.unite)}${voit_prix ? ` × ${montant(l.prix_unitaire_ht)}` : ""} · ${l.origine_prix === "bibliotheque" ? "prix validé" : "prix saisi, proposé"}`}
                    teinte={l.origine_prix === "bibliotheque" ? undefined : "jaune"}
                    valeur={
                      <>
                        {voit_prix ? montant(l.montant_ht) : null}
                        {a.statut === "brouillon" ? (
                          <>
                            {voit_prix ? " · " : null}
                            <button type="button" className="lvp-lien" onClick={() => faireRetirerLigne(a, l)} disabled={envoi}>
                              Retirer
                            </button>
                          </>
                        ) : null}
                      </>
                    }
                  />
                ))
              ) : (
                <SousLigne titre="Aucune ligne : chiffrez les travaux sur un prix validé de la bibliothèque." />
              )}
            </SousListe>
            {a.statut === "brouillon" || a.statut === "soumis" || a.statut === "refuse" || (a.signe_libelle?.startsWith("Signé sur place") && voit_prix) ? (
              <Gestes>
                {a.statut === "brouillon" ? (
                  <>
                    <Bouton fort icone={<FileSignature aria-hidden="true" />} onClick={() => ouvrir({ type: "soumettre", avenant: a })} disabled={!a.lignes.length}>
                      Soumettre à la signature
                    </Bouton>
                    <Bouton icone={<BookOpen aria-hidden="true" />} onClick={() => ouvrir({ type: "chiffrer", avenant: a })}>
                      Chiffrer une ligne
                    </Bouton>
                    <Bouton onClick={() => ouvrir({ type: "abandonner", avenant: a })}>Abandonner</Bouton>
                  </>
                ) : null}
                {a.statut === "soumis" ? (
                  <>
                    <Bouton fort icone={<PenLine aria-hidden="true" />} onClick={() => ouvrir({ type: "signer", avenant: a })} disabled={!valide(a)} title={!valide(a) ? "La demande de validation n'est pas encore approuvée" : undefined}>
                      Signer
                    </Bouton>
                    {a.demande_statut === "approuvee" && voit_prix ? (
                      <Bouton icone={<FileSignature aria-hidden="true" />} onClick={() => ouvrir({ type: "sur_place", avenant: a })}>
                        Faire signer sur place
                      </Bouton>
                    ) : null}
                    <Bouton onClick={() => ouvrir({ type: "abandonner", avenant: a })}>Abandonner</Bouton>
                  </>
                ) : null}
                {a.statut === "refuse" ? <Bouton onClick={() => ouvrir({ type: "soumettre", avenant: a })}>Resoumettre</Bouton> : null}
                {a.signe_libelle?.startsWith("Signé sur place") && voit_prix ? <Bouton onClick={() => ouvrir({ type: "preuve", avenant: a })}>Voir la preuve</Bouton> : null}
              </Gestes>
            ) : null}
          </Detail>
        );
      })}
    </Partie>
  );
}

/* ——— Marché : le résumé sous le titre, les contrôles puis les lignes ; une ligne s'ouvre dans le volet ——— */
function MarcheLignes({ tableau, ouvrir }: Props) {
  const { marches, voit_prix, lots } = tableau;
  const marche = marches.find((m) => m.statut === "verifie") ?? marches[0] ?? null;
  const lotNom = (id: string | null) => (id ? lots.find((l) => l.id === id)?.code ?? "?" : null);
  const bloquant = !!marche?.controles.some((k) => k.bloquant);
  const gestes = !marche ? (
    <Bouton fort icone={<FileText aria-hidden="true" />} onClick={() => ouvrir({ type: "marche" })}>
      Saisir le marché
    </Bouton>
  ) : marche.statut === "a_verifier" ? (
    <>
      <Bouton icone={<Plus aria-hidden="true" />} onClick={() => ouvrir({ type: "ligne", marche })}>
        Ajouter une ligne
      </Bouton>
      <Bouton icone={<FileUp aria-hidden="true" />} onClick={() => ouvrir({ type: "import", marche })}>
        Importer le devis
      </Bouton>
      <Bouton fort icone={<ClipboardCheck aria-hidden="true" />} onClick={() => ouvrir({ type: "verifier", marche })} disabled={bloquant} title={bloquant ? "Des contrôles bloquants restent" : undefined}>
        Vérifier le marché
      </Bouton>
    </>
  ) : (
    <Bouton icone={<RotateCcw aria-hidden="true" />} onClick={() => ouvrir({ type: "rouvrir", marche })}>
      Rouvrir (gérant)
    </Bouton>
  );
  if (!marche)
    return (
      <Partie titre="Marché" gestes={gestes}>
        <Vide>Aucun marché : les avenants et les situations ne peuvent pas être chiffrés tant que le marché signé n&apos;est pas saisi puis vérifié ligne à ligne.</Vide>
      </Partie>
    );
  const lignes = [...marche.lignes].sort((a, b) => a.ordre - b.ordre);
  const resume = [
    marche.objet,
    marche.mode_prix === "forfait" ? "Forfait" : marche.mode_prix === "unitaire" ? "Prix unitaires" : "Mixte",
    marche.date_signature ? `signé le ${dateCourte(marche.date_signature)}` : null,
    voit_prix ? `${montant(marche.total_ht_lignes)} HT${marche.montant_ht_declare !== null ? ` (devis : ${montant(marche.montant_ht_declare)})` : ""}` : null,
    marche.verifie_le ? `vérifié le ${dateCourte(marche.verifie_le)}${marche.verifie_libelle ? ` par ${marche.verifie_libelle}` : ""}` : null,
    `retenue de garantie ${pourcent(marche.retenue_taux * 100)} sur le ${marche.retenue_base.toUpperCase()}`,
  ].filter(Boolean);
  const aRevoir = lignes.filter((l) => l.controle !== "ok" && !l.ecart_accepte);
  const bonnes = lignes.filter((l) => l.controle === "ok" || l.ecart_accepte);
  const groupe = (nom: string, ls: typeof lignes, precision: string | null = null) =>
    ls.length ? (
      <Groupe key={nom} nom={nom} compte={ls.length} precision={precision}>
        {ls.map((l) => {
          const k = CONTROLES_LIGNE[l.controle];
          const t = l.ecart_accepte ? "bleu" : teinte(k.teinte);
          return (
            <Ligne
              key={l.id}
              cle={`ligne:${l.id}`}
              libelle={`Ligne ${l.numero ?? l.ordre} : ${l.designation}`}
              icone={<FileText />}
              id={l.numero ?? String(l.ordre)}
              titre={l.designation}
              second={lotNom(l.lot_id) ? `Lot ${lotNom(l.lot_id)}` : "sans lot"}
              droite={l.controle === "ok" && !l.ecart_accepte ? null : <Pilule teinte={t} icone={<Point teinte={t} />}>{l.ecart_accepte ? "Écart accepté" : k.libelle}</Pilule>}
              date={voit_prix ? montant(l.montant_ht) : `${nombreFr(l.quantite)} ${libelleUnite(l.unite)}`}
            />
          );
        })}
      </Groupe>
    ) : null;

  return (
    <Partie id="marche" titre={`Marché${marche.reference ? ` ${marche.reference}` : ""}`} compte={marche.statut === "verifie" ? "vérifié, figé" : "à vérifier ligne à ligne"} gestes={gestes}>
      <p className="lvp-resume">{resume.join(" · ")}</p>
      {marche.controles.length ? (
        <Liste>
          <Groupe nom="Contrôles du marché" compte={marche.controles.length}>
            {marche.controles.map((k, i) => (
              <Ligne
                key={i}
                cle={`controle-marche:${i}`}
                libelle={k.message ?? k.code}
                icone={<span data-teinte={k.bloquant ? "rouge" : "bleu"} className="lvp-icone-teinte"><AlertTriangle /></span>}
                id={k.ordre !== null ? `ligne ${marche.lignes.find((l) => l.id === k.ligne_id)?.numero ?? k.ordre}` : "total"}
                titre={k.message ?? k.code}
                droite={<Pilule teinte={k.bloquant ? "rouge" : "bleu"} icone={<Point teinte={k.bloquant ? "rouge" : "bleu"} />}>{k.bloquant ? "Bloquant" : "Noté"}</Pilule>}
              />
            ))}
          </Groupe>
        </Liste>
      ) : null}
      {marche.controles.map((k, i) => (
        <Detail key={i} cle={`controle-marche:${i}`} titre={k.bloquant ? "Bloquant" : "Noté"} sous={k.ordre !== null ? `Ligne ${marche.lignes.find((l) => l.id === k.ligne_id)?.numero ?? k.ordre}` : "Total du marché"}>
          <Texte>{k.message ?? k.code}</Texte>
        </Detail>
      ))}
      {lignes.length ? (
        <Liste>
          {groupe("À revoir", aRevoir, "contrôle à lever")}
          {groupe("Lignes", bonnes)}
        </Liste>
      ) : (
        <Vide>Aucune ligne : saisissez le devis ligne à ligne.</Vide>
      )}
      {lignes.map((l) => {
        const k = CONTROLES_LIGNE[l.controle];
        const rattacher = !l.lot_id && marche.statut === "a_verifier";
        const accepter = l.controle === "montant_faux" && !l.ecart_accepte && marche.statut === "a_verifier";
        return (
          <Detail key={l.id} cle={`ligne:${l.id}`} titre={l.designation} sous={`Ligne ${l.numero ?? l.ordre}${l.nature !== "ouvrage" ? ` · ${l.nature}` : ""}${l.corrigee ? " · corrigée" : ""}`}>
            <Rangees>
              <Rangee libelle="Lot">{lotNom(l.lot_id) ?? "Aucun"}</Rangee>
              <Rangee libelle="Quantité">
                {nombreFr(l.quantite)} {libelleUnite(l.unite)}
              </Rangee>
              {voit_prix ? <Rangee libelle="Prix unitaire">{montant(l.prix_unitaire_ht)} HT</Rangee> : null}
              {voit_prix ? <Rangee libelle="Montant">{montant(l.montant_ht)} HT</Rangee> : null}
              <Rangee libelle="Contrôle" teinte={l.ecart_accepte ? "bleu" : teinte(k.teinte)}>
                {l.ecart_accepte ? "Écart accepté" : k.libelle}
              </Rangee>
            </Rangees>
            {l.ecart_accepte && l.ecart_motif ? <Texte citation>{l.ecart_motif}</Texte> : null}
            {rattacher || accepter ? (
              <Gestes>
                {rattacher ? <Bouton fort onClick={() => ouvrir({ type: "lot_ligne", ligne: l })}>Rattacher à un lot</Bouton> : null}
                {accepter ? <Bouton onClick={() => ouvrir({ type: "ecart", ligne: l })}>Accepter l&apos;écart avec un motif</Bouton> : null}
              </Gestes>
            ) : null}
          </Detail>
        );
      })}
      {marches.length > 1 ? <p className="lvp-vide">{marches.length - 1} autre{marches.length > 2 ? "s" : ""} marché{marches.length > 2 ? "s" : ""} sur ce chantier.</p> : null}
    </Partie>
  );
}

/* ——— Lots et déboursé : un lot par ligne, le reste à droite ; marché, avenants et facturé dans le détail ——— */
function Lots({ tableau }: Props) {
  const { lots, debourse, voit_prix } = tableau;
  const groupes = [
    { cle: "en_cours", nom: "En cours" },
    { cle: "a_venir", nom: "À venir" },
    { cle: "termine", nom: "Terminés" },
  ] as const;
  return (
    <Partie titre="Lots et déboursé" compte={voit_prix ? "engagé, facturé, reste" : null}>
      {lots.length ? (
        <Liste>
          {groupes.map((g) => {
            const ls = lots.filter((l) => l.statut === g.cle).sort((a, b) => a.rang - b.rang);
            return ls.length ? (
              <Groupe key={g.cle} nom={g.nom} compte={ls.length}>
                {ls.map((l) => {
                  const d = debourse.find((x) => x.lot_id === l.id);
                  const qui = l.tiers_nom ?? l.equipe_nom ?? null;
                  const acc = l.execution === "sous_traitant" && l.tiers_id ? ACCEPTATIONS[l.acceptation ?? "a_demander"] : null;
                  const reste = d?.reste_ht ?? null;
                  return (
                    <Ligne
                      key={l.id}
                      cle={`lot:${l.id}`}
                      libelle={`Lot ${l.code} : ${l.libelle}`}
                      icone={<Layers />}
                      id={l.code}
                      titre={l.libelle}
                      second={qui ?? `${EXECUTIONS[l.execution]}, à désigner`}
                      droite={acc ? <Pilule teinte={teinte(acc.teinte)} icone={<Point teinte={teinte(acc.teinte)} />}>{acc.libelle}</Pilule> : null}
                      date={voit_prix && reste !== null ? <span data-teinte={reste < 0 ? "rouge" : undefined} className="lvp-montant">{montant(reste)}</span> : null}
                      dateTitre={voit_prix ? "Reste HT" : undefined}
                    />
                  );
                })}
              </Groupe>
            ) : null;
          })}
        </Liste>
      ) : (
        <Vide>Aucun lot : le planning et les lignes du marché ne peuvent pas s&apos;y rattacher.</Vide>
      )}
      {!voit_prix && lots.length ? <Vide>Les montants sont réservés aux personnes qui ont le droit de voir les prix.</Vide> : null}
      {lots.map((l) => {
        const d = debourse.find((x) => x.lot_id === l.id);
        const acc = l.execution === "sous_traitant" && l.tiers_id ? ACCEPTATIONS[l.acceptation ?? "a_demander"] : null;
        return (
          <Detail key={l.id} cle={`lot:${l.id}`} titre={`${l.code} · ${l.libelle}`} sous={l.corps_etat_libelle ?? undefined}>
            <Rangees>
              <Rangee libelle="Exécutant">
                {EXECUTIONS[l.execution]}
                {l.tiers_nom ? ` · ${l.tiers_nom}` : l.equipe_nom ? ` · ${l.equipe_nom}` : " · à désigner"}
              </Rangee>
              {acc ? (
                <Rangee libelle="Acceptation" teinte={teinte(acc.teinte)}>
                  {acc.libelle}
                </Rangee>
              ) : null}
              <Rangee libelle="État">{l.statut === "a_venir" ? "À venir" : l.statut === "en_cours" ? "En cours" : "Terminé"}</Rangee>
              {voit_prix ? (
                <>
                  <Rangee libelle="Marché HT">{montant(d?.engage_marche_ht ?? 0)}</Rangee>
                  <Rangee libelle="Avenants">{montant(d?.engage_avenants_ht ?? 0)}</Rangee>
                  <Rangee libelle="Facturé">
                    {montant(d?.facture_ht ?? 0)}
                    {d?.nb_factures ? ` (${d.nb_factures} facture${d.nb_factures > 1 ? "s" : ""})` : ""}
                  </Rangee>
                  <Rangee libelle="Reste" teinte={(d?.reste_ht ?? 0) < 0 ? "rouge" : undefined}>
                    {montant(d?.reste_ht ?? 0)}
                  </Rangee>
                </>
              ) : null}
            </Rangees>
          </Detail>
        );
      })}
    </Partie>
  );
}

/* ——— Factures fournisseurs rattachées : une par ligne ; le détail et « Détacher » dans le volet ——— */
function Factures({ tableau, ouvrir }: Props) {
  const { factures, voit_prix } = tableau;
  return (
    <Partie
      titre="Factures fournisseurs"
      compte={factures.length ? `${factures.length} rattachée${factures.length > 1 ? "s" : ""}` : null}
      gestes={
        <Bouton icone={<Link2 aria-hidden="true" />} onClick={() => ouvrir({ type: "facture" })}>
          Rattacher une facture
        </Bouton>
      }
    >
      {factures.length ? (
        <Liste>
          <Groupe nom="Rattachées" compte={factures.length}>
            {factures.map((f) => (
              <Ligne
                key={f.id}
                cle={`facture:${f.id}`}
                libelle={`Facture ${f.facture_numero ?? f.document_reference ?? ""} de ${f.fournisseur_nom ?? "fournisseur inconnu"}`}
                icone={<Receipt />}
                id={f.lot_code ?? undefined}
                titre={f.fournisseur_nom ?? "Fournisseur inconnu"}
                second={f.facture_numero ? `n° ${f.facture_numero}` : f.document_reference}
                droite={<Pilule>{libelleStatutFacture(f.facture_statut)}</Pilule>}
                date={voit_prix ? montant(f.montant_ht) : jourCourt(f.date_emission)}
                dateTitre={voit_prix ? "Montant HT" : "Émise le"}
              />
            ))}
          </Groupe>
        </Liste>
      ) : (
        <Vide>Une facture reçue par FILED se rattache ici au chantier et à son lot : le fournisseur doit être l&apos;entreprise du lot.</Vide>
      )}
      {factures.map((f) => (
        <Detail key={f.id} cle={`facture:${f.id}`} titre={f.fournisseur_nom ?? "Fournisseur inconnu"} sous={f.facture_numero ? `Facture n° ${f.facture_numero}` : undefined}>
          <Rangees>
            {f.document_reference ? <Rangee libelle="Document">{f.document_reference}</Rangee> : null}
            {f.fournisseur_siren ? <Rangee libelle="SIREN">{f.fournisseur_siren}</Rangee> : null}
            <Rangee libelle="Lot">{f.lot_code ? `${f.lot_code} · ${f.lot_libelle ?? ""}` : "Aucun"}</Rangee>
            <Rangee libelle="Émise le">{dateCourte(f.date_emission)}</Rangee>
            {voit_prix ? <Rangee libelle="Montant">{montant(f.montant_ht)} HT</Rangee> : null}
            <Rangee libelle="État FILED">{libelleStatutFacture(f.facture_statut)}</Rangee>
            {f.motif ? <Rangee libelle="Note">{f.motif}</Rangee> : null}
          </Rangees>
          <Gestes>
            <Bouton icone={<Unlink aria-hidden="true" />} onClick={() => ouvrir({ type: "detacher", facture_id: f.facture_id })}>
              Détacher
            </Bouton>
          </Gestes>
        </Detail>
      ))}
    </Partie>
  );
}
