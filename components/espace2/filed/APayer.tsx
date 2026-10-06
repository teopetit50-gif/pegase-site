"use client";

/* ══════════════════════════════════════════════════════════════════════
   FILED « À payer », nouveau design (06/10/2026, session C1)

   Le même écran que /espace/filed/a-payer — mêmes règles (./calculs.ts),
   mêmes portes (chargerVueFournisseurs, etatPaiement, noterPaiement),
   même temps réel — dans la grammaire du tableau de bord de référence :
   quatre compteurs qui filtrent, une barre de recherche, une liste par
   échéance dans des cartes, un menu « … » par ligne, une fenêtre pour
   noter un paiement, un toast quand c'est fait.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Banknote, Building2, ChevronDown, Copy, FileText, MoreHorizontal, Search, X } from "lucide-react";
import { Button, Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { useSource } from "@/components/espace/source";
import { useTempsReel } from "@/components/espace/tempsReel";
import { dateCourte, masquerIban, montant } from "@/components/espace/format";
import { statutFacture } from "@/components/espace/filed/etats";
import { vueExemple } from "@/components/espace/filed/EcranFournisseurs";
import { MOYENS_PAIEMENT, chargerVueFournisseurs, etatPaiement, noterPaiement, type EtatPaiement, type FactureDuFournisseur, type MoyenPaiement, type VueFournisseurs } from "@/components/espace/filed/portes";
import { A_PAYER, GROUPES, JOUR, aPayer, du, etatsExemple, groupeDe, jourDe, minuit, totaux, type Etats, type Groupe } from "./calculs";
import { Badge, Etat, ItemMenu, MenuDeroulant, Note, SeparateurMenu, Squelette, Vide, teinte } from "../ui";
import { useToast } from "../Toasts";

const LIBELLES_MOYEN: Record<MoyenPaiement, string> = { virement: "Virement", prelevement: "Prélèvement", cheque: "Chèque", carte: "Carte", especes: "Espèces", compensation: "Compensation", autre: "Autre" };
const aujourdhuiIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const sansAccents = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export default function APayer() {
  const { source } = useSource();
  const toast = useToast();
  const [aujourdhui] = useState(minuit);
  const exemple = useMemo(() => vueExemple(), []);
  const [etatsEx, setEtatsEx] = useState<Etats>(() => etatsExemple(exemple.factures, aujourdhui));
  const [reel, setReel] = useState<VueFournisseurs | null>(null);
  const [etatsReels, setEtatsReels] = useState<Etats>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Groupe | null>(null);
  const [recherche, setRecherche] = useState("");
  const [montrerPayees, setMontrerPayees] = useState(false);
  /* « Noter un paiement » */
  const [aNoter, setANoter] = useState<FactureDuFournisseur | null>(null);
  const [date, setDate] = useState(aujourdhuiIso);
  const [montantSaisi, setMontantSaisi] = useState("");
  const [moyen, setMoyen] = useState<MoyenPaiement>("virement");
  const [referenceSaisie, setReferenceSaisie] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreurPaiement, setErreurPaiement] = useState<string | null>(null);

  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    try {
      const v = await chargerVueFournisseurs();
      const aLire = v.factures.filter((f) => A_PAYER.has(f.statut) && f.nature !== "avoir");
      const lus = await Promise.all(aLire.map((f) => etatPaiement(f.id).then((e) => [f.id, e] as const).catch(() => [f.id, null] as const)));
      setEtatsReels(Object.fromEntries(lus.filter((x): x is readonly [string, EtatPaiement] => !!x[1])));
      setReel(v);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ fournisseurs: [], ibans: [], factures: [], deposants: {} });
    }
  }, []);
  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);
  useTempsReel(["filed_factures", "filed_fournisseurs", "filed_fournisseurs_ibans"], source === "reelle", charger);

  const vue = source === "exemple" ? exemple : reel;
  const etats = source === "exemple" ? etatsEx : etatsReels;
  const payee = (f: FactureDuFournisseur) => etats[f.id]?.etat === "payee";
  const fournisseur = (id: string | null) => vue?.fournisseurs.find((f) => f.id === id) ?? null;
  const ibanValide = (id: string | null) => vue?.ibans.find((i) => i.fournisseur_id === id && i.statut === "valide") ?? null;
  const ibanPropose = (id: string | null) => vue?.ibans.some((i) => i.fournisseur_id === id && i.statut === "propose") ?? false;

  const validees = useMemo(() => (vue?.factures ?? []).filter((f) => A_PAYER.has(f.statut)), [vue]);
  const nbPayees = validees.filter((f) => etats[f.id]?.etat === "payee").length;
  const lignes = useMemo(
    () =>
      validees
        .filter((f) => montrerPayees || etats[f.id]?.etat !== "payee")
        .sort((a, b) => (a.echeance_lue ?? "9999").localeCompare(b.echeance_lue ?? "9999") || aPayer(b, etats) - aPayer(a, etats)),
    [validees, etats, montrerPayees],
  );
  const parGroupe = useMemo(() => {
    const g: Record<Groupe, FactureDuFournisseur[]> = { retard: [], semaine: [], mois: [], plus_tard: [], sans: [] };
    for (const l of lignes) g[groupeDe(l, aujourdhui)].push(l);
    return g;
  }, [lignes, aujourdhui]);
  const q = sansAccents(recherche.trim());
  const correspond = (l: FactureDuFournisseur) =>
    !q || [fournisseur(l.fournisseur_id)?.nom, l.reference, l.numero].some((x) => x && sansAccents(x).includes(q));
  const sansIban = lignes.filter((l) => l.nature !== "avoir" && !payee(l) && !ibanValide(l.fournisseur_id)).length;
  const groupesVisibles = GROUPES.filter((g) => (!filtre || filtre === g.cle) && parGroupe[g.cle].some(correspond));
  const compteurs = GROUPES.filter((g) => g.cle !== "sans" || parGroupe.sans.length);

  const ouvrirPaiement = (f: FactureDuFournisseur) => {
    setErreurPaiement(null);
    setDate(aujourdhuiIso());
    setMontantSaisi(String(aPayer(f, etats)).replace(".", ","));
    setMoyen(ibanValide(f.fournisseur_id) ? "virement" : "autre");
    setReferenceSaisie("");
    setANoter(f);
  };
  const montantNet = Number(montantSaisi.replace(/\s/g, "").replace(",", "."));
  const resteANoter = aNoter ? aPayer(aNoter, etats) : 0;
  const montantOk = !montantSaisi.trim() || (Number.isFinite(montantNet) && montantNet > 0 && montantNet <= resteANoter + 0.001);
  const dateOk = !!date && date <= aujourdhuiIso();

  async function soumettrePaiement() {
    if (!aNoter) return;
    const f = aNoter;
    const m = montantSaisi.trim() ? Math.round(montantNet * 100) / 100 : null;
    setEnvoi(true);
    setErreurPaiement(null);
    try {
      if (source === "reelle") {
        await noterPaiement({ facture: f.id, date, montant: m, moyen, reference: referenceSaisie.trim() || null });
        await charger();
      } else {
        await new Promise((r) => setTimeout(r, 300));
        setEtatsEx((e) => {
          const avant = e[f.id] ?? { du: du(f), regle: 0, reste: du(f), etat: "a_payer" as const, dernier_le: null, nb_reglements: 0 };
          const regle = Math.round((avant.regle + (m ?? avant.reste)) * 100) / 100;
          const reste = Math.round((avant.du - regle) * 100) / 100;
          return { ...e, [f.id]: { ...avant, regle, reste, etat: reste <= 0 ? "payee" : "partielle", dernier_le: new Date(date).toISOString(), nb_reglements: avant.nb_reglements + 1 } };
        });
      }
      const reste = resteANoter - (m ?? resteANoter);
      toast(`Paiement noté : ${montant(m ?? resteANoter, f.devise)} sur ${f.reference ?? "la facture"}${reste > 0.004 ? `, reste ${montant(Math.round(reste * 100) / 100, f.devise)}` : ", facture payée"}`, "vert");
      setANoter(null);
    } catch (e) {
      setErreurPaiement(e instanceof Error ? e.message : "La base a refusé le paiement.");
    } finally {
      setEnvoi(false);
    }
  }

  const copier = (texte: string) =>
    navigator.clipboard?.writeText(texte).then(
      () => toast("Référence copiée", "vert"),
      () => toast("Impossible de copier. Réessayez.", "rouge"),
    );

  const chargement = source === "reelle" && !reel;

  return (
    <div className="v2-page v2-arrivee">
      <div className="v2-tete">
        <div>
          <h1>À payer</h1>
          <p>Les factures validées, par échéance : le retard d&apos;abord, le reste à payer, et ce qui empêcherait de payer.</p>
        </div>
        <div className="v2-actions">
          <Link href="/espace2/filed/fournisseurs" className="v2-btn">
            <Building2 width={16} height={16} aria-hidden="true" /> Fournisseurs
          </Link>
          <Link href="/espace2/filed" className="v2-btn">
            <FileText width={16} height={16} aria-hidden="true" /> Documents reçus
          </Link>
        </div>
      </div>

      <div className="v2-stats" style={{ "--nb": compteurs.length } as React.CSSProperties} role="group" aria-label="Filtrer par échéance">
        {compteurs.map((g) => {
          const n = parGroupe[g.cle].length;
          return (
            <button key={g.cle} type="button" className="v2-stat" aria-pressed={filtre === g.cle} onClick={() => setFiltre(filtre === g.cle ? null : g.cle)}>
              <span className="v2-stat-etiquette">
                <span className="v2-point" data-teinte={n && g.cle !== "plus_tard" && g.cle !== "sans" ? g.teinte : "gris"} aria-hidden="true" />
                {g.libelle}
              </span>
              <span className="v2-stat-valeur">{chargement ? <Squelette largeur={32} hauteur={28} /> : n}</span>
              <span className="v2-stat-sous">{chargement ? <Squelette largeur="70%" hauteur={14} /> : n ? totaux(parGroupe[g.cle], etats) : g.sous}</span>
            </button>
          );
        })}
      </div>

      <div className="v2-outils">
        <label className="v2-champ">
          <Search width={16} height={16} aria-hidden="true" />
          <span className="v2-sr">Rechercher une facture</span>
          <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un fournisseur, une référence, un numéro…" />
          {recherche ? (
            <button type="button" className="v2-btn v2-btn--petit v2-btn--fantome v2-btn--icone" style={{ width: 24, height: 24, marginRight: -6 }} onClick={() => setRecherche("")} aria-label="Effacer la recherche">
              <X width={14} height={14} aria-hidden="true" />
            </button>
          ) : null}
        </label>
        {nbPayees ? (
          <button type="button" className="v2-btn" aria-pressed={montrerPayees} onClick={() => setMontrerPayees((v) => !v)}>
            {montrerPayees ? "Masquer" : "Afficher"} les payées ({nbPayees})
          </button>
        ) : null}
      </div>

      <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
        {sansIban ? (
          <Note teinte="ambre">
            <strong>
              {sansIban} facture{sansIban > 1 ? "s" : ""} sans IBAN validé.
            </strong>{" "}
            Le virement attend qu&apos;un IBAN du fournisseur soit validé dans « À valider », ou passera par un autre moyen.
          </Note>
        ) : null}
        {erreur ? (
          <Note teinte="rouge" role="alert">
            <strong>La base réelle n&apos;a pas répondu.</strong> {erreur}
          </Note>
        ) : null}
      </div>

      {chargement ? (
        <section className="v2-carte" aria-label="Chargement des factures" aria-busy="true">
          <div className="v2-carte-corps" style={{ display: "grid", gap: 16 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr", gap: 16 }}>
                <Squelette />
                <Squelette />
                <Squelette />
                <Squelette />
              </div>
            ))}
          </div>
        </section>
      ) : !lignes.length ? (
        <Vide icone={<Banknote width={20} height={20} />} titre="Rien à payer">
          Aucune facture validée pour l&apos;instant : elles arrivent ici après leur validation dans « À valider ».
        </Vide>
      ) : !groupesVisibles.length ? (
        <Vide
          icone={<Search width={20} height={20} />}
          titre="Aucune facture ne correspond"
          action={
            <button
              type="button"
              className="v2-btn v2-btn--petit"
              onClick={() => {
                setRecherche("");
                setFiltre(null);
              }}
            >
              Effacer les filtres
            </button>
          }
        >
          Rien ne répond à « {recherche || GROUPES.find((g) => g.cle === filtre)?.libelle} ».
        </Vide>
      ) : (
        <div style={{ display: "grid", gap: 24 }}>
          {groupesVisibles.map((g) => {
            const visibles = parGroupe[g.cle].filter(correspond);
            return (
              <section key={g.cle} aria-labelledby={`groupe-${g.cle}`}>
                <div className="v2-section-titre">
                  <h2 className="v2-h2" id={`groupe-${g.cle}`}>
                    <Etat teinte={g.cle === "plus_tard" || g.cle === "sans" ? "gris" : g.teinte}>{g.libelle}</Etat>
                  </h2>
                  <span className="v2-gris v2-tabulaire" style={{ fontSize: 13 }}>
                    {visibles.length} facture{visibles.length > 1 ? "s" : ""} · {totaux(visibles, etats)}
                  </span>
                </div>
                <div className="v2-carte">
                  <div className="v2-tableau-cadre">
                    <table className="v2-tableau v2-tableau--empile v2-tableau--fixe">
                      <colgroup>
                        <col style={{ width: "12%" }} />
                        <col style={{ width: "20%" }} />
                        <col style={{ width: "16%" }} />
                        <col style={{ width: "15%" }} />
                        <col style={{ width: "15%" }} />
                        <col style={{ width: "22%" }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th scope="col">Échéance</th>
                          <th scope="col">Fournisseur</th>
                          <th scope="col">Document</th>
                          <th scope="col" className="v2-num">
                            À payer
                          </th>
                          <th scope="col">IBAN</th>
                          <th scope="col">
                            <span className="v2-sr">État et actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibles.map((l) => {
                          const four = fournisseur(l.fournisseur_id);
                          const ib = ibanValide(l.fournisseur_id);
                          const st = statutFacture(l.statut);
                          const ep = etats[l.id];
                          const jours = l.echeance_lue ? Math.round((jourDe(l.echeance_lue) - aujourdhui) / JOUR) : null;
                          const peutPayer = l.nature !== "avoir" && ep?.etat !== "payee";
                          const lien = `/espace/filed?objet=facture:${encodeURIComponent(l.id)}`;
                          return (
                            <tr key={l.id}>
                              <td data-etiquette="Échéance">
                                {l.echeance_lue ? dateCourte(l.echeance_lue) : "—"}
                                {jours !== null ? <small>{jours < 0 ? `${-jours} j de retard` : jours === 0 ? "aujourd'hui" : `dans ${jours} j`}</small> : null}
                              </td>
                              <td data-etiquette="Fournisseur">
                                <span style={{ fontWeight: 500 }}>{four?.nom ?? "Fournisseur inconnu"}</span>
                                {four?.statut === "bloque" ? (
                                  <div style={{ marginTop: 4 }}>
                                    <Badge teinte="rouge">Bloqué : ne pas payer</Badge>
                                  </div>
                                ) : null}
                              </td>
                              <td data-etiquette="Document">
                                <Link href={lien} className="v2-mono">
                                  {l.reference ?? "dossier"}
                                </Link>
                                <small>
                                  {l.nature === "avoir" ? "Avoir" : "Facture"}
                                  {l.numero ? ` n° ${l.numero}` : ""}
                                </small>
                              </td>
                              <td data-etiquette="À payer" className="v2-num">
                                <span style={{ fontWeight: 500 }}>{montant(aPayer(l, etats), l.devise)}</span>
                                {ep && ep.regle > 0 ? (
                                  <small>
                                    sur {montant(ep.du, l.devise)} · {montant(ep.regle, l.devise)} réglés
                                  </small>
                                ) : null}
                              </td>
                              <td data-etiquette="IBAN">
                                {l.nature === "avoir" ? (
                                  <span className="v2-gris">en déduction</span>
                                ) : ib ? (
                                  <span className="v2-mono">{ib.iban_masque}</span>
                                ) : ibanPropose(l.fournisseur_id) ? (
                                  <Badge teinte="ambre">IBAN à valider</Badge>
                                ) : (
                                  <Badge teinte="rouge">IBAN manquant</Badge>
                                )}
                                {!ib && l.iban && l.nature !== "avoir" ? <small>lu : {masquerIban(l.iban)}</small> : null}
                              </td>
                              <td data-etiquette="État" data-plein="">
                                <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
                                  {ep?.etat === "payee" ? (
                                    <Etat teinte="vert">Payée</Etat>
                                  ) : ep?.etat === "partielle" ? (
                                    <Etat teinte="ambre">En partie</Etat>
                                  ) : (
                                    <Etat teinte={teinte(st.teinte)}>{st.libelle}</Etat>
                                  )}
                                  <span style={{ display: "inline-flex", gap: 4 }}>
                                    {peutPayer ? (
                                      <button type="button" className="v2-btn v2-btn--petit" onClick={() => ouvrirPaiement(l)} aria-label={`Noter un paiement sur ${l.reference ?? "la facture"}`}>
                                        <Banknote width={14} height={14} aria-hidden="true" /> Payer
                                      </button>
                                    ) : null}
                                    <MenuDeroulant etiquette={`Actions sur ${l.reference ?? "la facture"}`} declencheur={<MoreHorizontal width={16} height={16} aria-hidden="true" />}>
                                      <ItemMenu id="payer" isDisabled={!peutPayer} onAction={() => ouvrirPaiement(l)} icone={<Banknote width={16} height={16} aria-hidden="true" />}>
                                        Noter un paiement…
                                      </ItemMenu>
                                      <ItemMenu id="dossier" href={lien} icone={<FileText width={16} height={16} aria-hidden="true" />}>
                                        Ouvrir le dossier
                                      </ItemMenu>
                                      <SeparateurMenu />
                                      <ItemMenu id="copier" onAction={() => void copier(l.reference ?? l.id)} icone={<Copy width={16} height={16} aria-hidden="true" />}>
                                        Copier la référence
                                      </ItemMenu>
                                    </MenuDeroulant>
                                  </span>
                                </div>
                                {ep?.dernier_le ? (
                                  <small>
                                    dernier règlement le {dateCourte(ep.dernier_le)}
                                    {ep.nb_reglements > 1 ? ` (${ep.nb_reglements})` : ""}
                                  </small>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            );
          })}
          <p className="v2-gris" style={{ textAlign: "right", margin: 0 }}>
            Reste à payer : <strong style={{ color: "var(--v2-gray-1000)" }}>{totaux(lignes.filter((l) => !payee(l)), etats)}</strong>
          </p>
        </div>
      )}

      <ModalOverlay isOpen={!!aNoter} onOpenChange={(o) => !o && !envoi && setANoter(null)} isDismissable={!envoi} className="v2-jetons v2-voile">
        <Modal className="v2-modale">
          <Dialog className="v2-modale-dialogue">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (montantOk && dateOk && !envoi) void soumettrePaiement();
              }}
            >
              <div className="v2-modale-corps">
                <Heading slot="title">Noter un paiement</Heading>
                <p>
                  {aNoter ? `${fournisseur(aNoter.fournisseur_id)?.nom ?? "Fournisseur"} — ${aNoter.reference ?? ""}${aNoter.numero ? ` (n° ${aNoter.numero})` : ""}. Reste à payer : ${montant(resteANoter, aNoter.devise)}.` : ""} Le paiement est noté, pas exécuté : faites le virement dans votre banque.
                </p>
                <div className="v2-grille-champs">
                  <label className="v2-libelle">
                    Date du paiement
                    <span className={`v2-champ${dateOk ? "" : " v2-champ--erreur"}`}>
                      <input type="date" value={date} max={aujourdhuiIso()} onChange={(e) => setDate(e.target.value)} aria-invalid={!dateOk} />
                    </span>
                    {!dateOk ? <span className="v2-aide v2-aide--erreur">La date ne peut pas être dans le futur.</span> : null}
                  </label>
                  <label className="v2-libelle">
                    Montant
                    <span className={`v2-champ${montantOk ? "" : " v2-champ--erreur"}`}>
                      <input inputMode="decimal" value={montantSaisi} onChange={(e) => setMontantSaisi(e.target.value)} placeholder="vide = tout le reste" aria-invalid={!montantOk} />
                      <span aria-hidden="true">{aNoter?.devise === "EUR" || !aNoter ? "€" : aNoter.devise}</span>
                    </span>
                    {!montantOk ? <span className="v2-aide v2-aide--erreur">Positif, et pas plus que le reste ({aNoter ? montant(resteANoter, aNoter.devise) : ""}).</span> : null}
                  </label>
                  <label className="v2-libelle">
                    Moyen
                    <span className="v2-champ">
                      <select value={moyen} onChange={(e) => setMoyen(e.target.value as MoyenPaiement)}>
                        {MOYENS_PAIEMENT.map((m) => (
                          <option key={m} value={m}>
                            {LIBELLES_MOYEN[m]}
                          </option>
                        ))}
                      </select>
                      <ChevronDown width={16} height={16} aria-hidden="true" style={{ pointerEvents: "none" }} />
                    </span>
                  </label>
                  <label className="v2-libelle">
                    Référence (facultatif)
                    <span className="v2-champ">
                      <input value={referenceSaisie} onChange={(e) => setReferenceSaisie(e.target.value)} maxLength={120} placeholder="libellé du virement, n° de chèque…" />
                    </span>
                  </label>
                </div>
                <p className="v2-aide" style={{ margin: 0 }}>
                  La même référence sur la même facture ne compte qu&apos;une fois. Réservé au gérant, à l&apos;administrateur et au valideur.
                </p>
                {erreurPaiement ? (
                  <Note teinte="rouge" role="alert">
                    <strong>Refusé par la base.</strong> {erreurPaiement}
                  </Note>
                ) : null}
              </div>
              <div className="v2-modale-pied">
                <Button className="v2-btn v2-btn--petit" slot="close" isDisabled={envoi}>
                  Annuler
                </Button>
                <button type="submit" className="v2-btn v2-btn--petit v2-btn--primaire" disabled={!montantOk || !dateOk || envoi}>
                  {envoi ? "Enregistrement…" : "Noter le paiement"}
                </button>
              </div>
            </form>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </div>
  );
}
