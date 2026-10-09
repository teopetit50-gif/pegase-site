"use client";

/* ══════════════════════════════════════════════════════════════════════
   « Contacts » du pilotage : les personnes suivies (09/10/2026)

   Demande de Teo : « la même page qu'Entreprises, adaptée aux contacts,
   pour noter tous mes contacts et l'avancement ». Même grammaire :
     1. la barre : le type au sélecteur ⌃⌄, l'étape, « à relancer », la
        recherche, « + Ajouter » ;
     2. trois cartes à jauge : suivis, relances dues, avancés ;
     3. deux colonnes, comme « À valider » : la file groupée par relance
        (en retard, cette semaine, plus tard, sans relance) et, à droite,
        la fiche du contact : coordonnées, étape, prochaine action, et le
        JOURNAL des échanges (appel, visite, WhatsApp…) qui fait avancer.
   Tables omega_contacts et omega_echanges, réservées aux admins.
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { BellRing, CalendarClock, CheckCheck, ChevronDown, ChevronRight, ChevronsUpDown, LayoutGrid, Mail, MessageCircle, Phone, Plus, Search, Trash2, UserRound, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Chiffre } from "@/components/espace2/vivant";
import { ItemMenu, MenuDeroulant, SectionMenu, SeparateurMenu } from "@/components/espace2/ui";
import type { Contact, Echange } from "@/lib/omega/donnees";

const TYPES = ["Prospect", "Client", "Partenaire", "Réseau", "Prestataire", "Candidat", "Autre"];
const ETAPES = ["À contacter", "Contacté", "En conversation", "Audit réservé", "Audit tenu", "Récap envoyé", "Signé", "Installé", "En réel", "Partenaire actif", "En pause", "Perdu"];
const AVANCEES = ["Audit réservé", "Audit tenu", "Récap envoyé", "Signé", "Installé", "En réel", "Partenaire actif"];
const CANAUX = ["Appel", "Visite", "WhatsApp", "E-mail", "Rendez-vous", "Message LinkedIn"];
const ICONE_CANAL: Record<string, typeof Phone> = { Appel: Phone, Visite: UserRound, WhatsApp: MessageCircle, "E-mail": Mail, "Rendez-vous": CalendarClock, "Message LinkedIn": MessageCircle };
const JOUR = 86_400_000;
const I = { width: 16, height: 16, strokeWidth: 1.6, "aria-hidden": true } as const;
const minuit = (t: number) => new Date(new Date(t).toDateString()).getTime();
const teinte = (e: string) => (["Signé", "Installé", "En réel", "Partenaire actif"].includes(e) ? "vert" : ["Audit réservé", "Audit tenu", "Récap envoyé", "En conversation", "Contacté"].includes(e) ? "bleu" : e === "Perdu" ? "rouge" : "gris");
const jourCourt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

export default function Contacts({ contacts: initiaux, echanges: echangesInitiaux }: { contacts: Contact[]; echanges: Echange[] }) {
  const [contacts, setContacts] = useState(initiaux);
  const [echanges, setEchanges] = useState(echangesInitiaux);
  const [aujourdhui] = useState(() => minuit(Date.now()));
  const [type, setType] = useState("");
  const [etape, setEtape] = useState("");
  const [relancer, setRelancer] = useState(false);
  const [recherche, setRecherche] = useState<string | null>(null);
  const [choix, setChoix] = useState<number | null>(null);
  const [etat, setEtat] = useState("");
  const [nouveau, setNouveau] = useState(false);

  const echeance = (c: Contact) => (c.prochaine_date ? new Date(`${c.prochaine_date}T12:00:00`).getTime() : null);
  const groupe = (c: Contact) => {
    const e = echeance(c);
    if (e === null) return "sans";
    return e < aujourdhui ? "retard" : e < aujourdhui + 7 * JOUR ? "semaine" : "plus_tard";
  };

  const visibles = useMemo(
    () =>
      contacts
        .filter((c) => !type || c.type === type)
        .filter((c) => !etape || c.etape === etape)
        .filter((c) => !relancer || (echeance(c) ?? Infinity) < aujourdhui + JOUR)
        .filter((c) => !recherche || [c.nom, c.entreprise, c.role, c.commune, c.secteur].some((x) => (x ?? "").toLowerCase().includes(recherche.toLowerCase()))),
    [contacts, type, etape, relancer, recherche, aujourdhui],
  );
  const groupes = new Map<string, Contact[]>();
  for (const c of visibles) groupes.set(groupe(c), [...(groupes.get(groupe(c)) ?? []), c]);
  const choisi = contacts.find((c) => c.id === choix) ?? visibles[0] ?? null;
  const dues = contacts.filter((c) => (echeance(c) ?? Infinity) < aujourdhui + JOUR && c.etape !== "Perdu").length;
  const avances = contacts.filter((c) => AVANCEES.includes(c.etape)).length;
  const parType = TYPES.map((t) => ({ t, n: contacts.filter((c) => c.type === t).length })).filter((x) => x.n);

  async function maj(id: number, champs: Partial<Contact>) {
    setContacts((cs) => cs.map((c) => (c.id === id ? { ...c, ...champs } : c)));
    const { error } = await createClient().from("omega_contacts").update({ ...champs, maj: new Date().toISOString() }).eq("id", id);
    setEtat(error ? "Échec de l'enregistrement." : "Enregistré");
  }
  async function creer(c: Partial<Contact>) {
    const { data, error } = await createClient().from("omega_contacts").insert(c).select("id, nom, entreprise, role, type, telephone, courriel, commune, secteur, etape, source, prochaine_action, prochaine_date, note, maj").single();
    if (error || !data) return setEtat("Échec de l'ajout.");
    setContacts((cs) => [data as Contact, ...cs]);
    setChoix((data as Contact).id);
    setNouveau(false);
    setEtat("Contact ajouté");
  }
  async function supprimer(c: Contact) {
    if (!window.confirm(`Supprimer ${c.nom} et tout son journal ?`)) return;
    const { error } = await createClient().from("omega_contacts").delete().eq("id", c.id);
    if (error) return setEtat("Échec de la suppression.");
    setContacts((cs) => cs.filter((x) => x.id !== c.id));
    setChoix(null);
  }
  async function noter(contact: Contact, e: { canal: string; resume: string; prochaine_action: string; prochaine_date: string; etape: string }) {
    const { data, error } = await createClient().from("omega_echanges").insert({ contact_id: contact.id, canal: e.canal, resume: e.resume }).select("id, contact_id, quand, canal, resume").single();
    if (error || !data) return setEtat("Échec de l'enregistrement de l'échange.");
    setEchanges((es) => [data as Echange, ...es]);
    await maj(contact.id, { etape: e.etape, prochaine_action: e.prochaine_action || null, prochaine_date: e.prochaine_date || null });
    setEtat("Échange noté");
  }

  const GROUPES = [
    { cle: "retard", libelle: "À relancer, en retard" },
    { cle: "semaine", libelle: "À relancer cette semaine" },
    { cle: "plus_tard", libelle: "Plus tard" },
    { cle: "sans", libelle: "Sans relance prévue" },
  ];

  return (
    <div className="v2-page v2-arrivee v2-val v2-dr om-contacts">
      <h1 className="v2-sr">Contacts</h1>

      {/* ——— 1. la barre ——— */}
      <div className="v2-val-filtres">
        <MenuDeroulant
          etiquette={`Type : ${type || "tous les contacts"}. Changer`}
          classe="v2-portee om-portee-secteur"
          placement="bottom start"
          largeur={300}
          declencheur={
            <>
              {type ? <UserRound {...I} /> : <LayoutGrid {...I} />}
              <span className="v2-portee-nom">{type ? `${type}s` : "Tous les contacts"}</span>
              <ChevronsUpDown width={14} height={14} aria-hidden="true" />
            </>
          }
        >
          <ItemMenu id="tous" onAction={() => setType("")} textValue="Tous les contacts" icone={<LayoutGrid {...I} />} suffixe={<span className="v2-gris">{contacts.length}</span>}>
            Tous les contacts
          </ItemMenu>
          <SeparateurMenu />
          <SectionMenu titre="Types">
            {TYPES.map((t) => (
              <ItemMenu key={t} id={t} onAction={() => setType(t)} textValue={t} icone={<UserRound {...I} />} suffixe={<span className="v2-gris">{contacts.filter((c) => c.type === t).length}</span>}>
                {t}
              </ItemMenu>
            ))}
          </SectionMenu>
        </MenuDeroulant>

        <label className="v2-val-bouton" data-actif={etape ? "" : undefined}>
          <CheckCheck {...I} />
          <span>{etape || "Toutes les étapes"}</span>
          <ChevronDown width={14} height={14} aria-hidden="true" className="v2-val-bouton-chevron" />
          <select value={etape} onChange={(e) => setEtape(e.target.value)} aria-label="Étape">
            <option value="">Toutes les étapes</option>
            {ETAPES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>

        <button type="button" className="v2-val-bouton" data-actif={relancer ? "" : undefined} aria-pressed={relancer} onClick={() => setRelancer((v) => !v)}>
          <BellRing {...I} />
          <span>À relancer</span>
        </button>

        <span className="v2-val-droite">
          {recherche !== null ? (
            <span className="v2-val-recherche">
              <Search width={16} height={16} aria-hidden="true" />
              <input autoFocus value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Nom, entreprise, commune…" aria-label="Rechercher un contact" />
              <button type="button" className="v2-val-icone" aria-label="Fermer la recherche" onClick={() => setRecherche(null)}>
                <X width={14} height={14} />
              </button>
            </span>
          ) : (
            <button type="button" className="v2-val-bouton v2-val-bouton--icone" aria-label="Rechercher" onClick={() => setRecherche("")}>
              <Search width={16} height={16} />
            </button>
          )}
          <button type="button" className="v2-btn v2-btn--petit v2-btn--primaire" onClick={() => setNouveau(true)}>
            <Plus width={14} height={14} aria-hidden="true" /> Ajouter
          </button>
        </span>
      </div>

      {/* ——— 2. trois jauges ——— */}
      <div className="v2-dr-trois">
        <Jauge icone={Users} titre="Contacts suivis" fort={String(contacts.length)} faible={parType.length ? ` · ${parType.map((x) => `${x.n} ${x.t.toLowerCase()}${x.n > 1 ? "s" : ""}`).join(", ")}` : ""} part={1} pied="tes prospects, clients, partenaires et réseau" />
        <Jauge icone={BellRing} titre="Relances dues" fort={String(dues)} faible={` / ${contacts.length}`} part={contacts.length ? dues / contacts.length : 0} pied={dues ? "à rappeler aujourd'hui ou en retard" : "rien à relancer aujourd'hui"} />
        <Jauge icone={CheckCheck} titre="Avancés" fort={String(avances)} faible={` / ${contacts.length}`} part={contacts.length ? avances / contacts.length : 0} pied="audit réservé ou plus loin" />
      </div>

      <p className="om-etat" role="status">
        {etat}
      </p>

      {/* ——— 3. la file et la fiche ——— */}
      <div className="v2-val-grille">
        <div className="v2-val-col">
          {nouveau ? <NouveauContact annuler={() => setNouveau(false)} creer={creer} /> : null}
          {visibles.length === 0 ? (
            <div className="v2-carte v2-val-vide">{contacts.length ? "Aucun contact ne correspond à ces filtres." : "Aucun contact pour l'instant : ajoute le premier, ou depuis la liste des entreprises."}</div>
          ) : (
            GROUPES.map((g) => {
              const liste = groupes.get(g.cle);
              if (!liste?.length) return null;
              return (
                <section key={g.cle} className="v2-carte" aria-label={g.libelle}>
                  <h2 className="v2-val-groupe">{g.libelle}</h2>
                  <ul className="v2-val-liste">
                    {liste.map((c) => (
                      <li key={c.id} className="v2-val-ligne" aria-current={choisi?.id === c.id ? "true" : undefined}>
                        <button type="button" className="v2-val-corps" onClick={() => setChoix(c.id)}>
                          <span className="v2-val-texte">
                            <span>{c.nom}</span>
                            <small>{[c.role, c.entreprise && c.entreprise !== c.nom ? c.entreprise : null, c.type].filter(Boolean).join(" · ")}</small>
                          </span>
                          <span className="om-etape" data-teinte={teinte(c.etape)}>
                            {c.etape}
                          </span>
                          <span className="v2-val-montant">
                            <span>{c.prochaine_date ? jourCourt(c.prochaine_date) : "—"}</span>
                            <small data-retard={g.cle === "retard" ? "" : undefined}>{c.prochaine_action ?? ""}</small>
                          </span>
                          <ChevronRight width={16} height={16} aria-hidden="true" className="v2-val-chevron" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </div>

        <div className="v2-val-col v2-val-cote">
          {choisi ? <Fiche key={choisi.id} c={choisi} echanges={echanges.filter((e) => e.contact_id === choisi.id)} maj={maj} noter={noter} supprimer={supprimer} /> : <div className="v2-carte v2-val-vide">Choisis un contact pour voir sa fiche.</div>}
        </div>
      </div>
    </div>
  );
}

/* ——— la fiche : coordonnées, étape, prochaine action, journal ——— */
function Fiche({ c, echanges, maj, noter, supprimer }: { c: Contact; echanges: Echange[]; maj: (id: number, champs: Partial<Contact>) => void; noter: (c: Contact, e: { canal: string; resume: string; prochaine_action: string; prochaine_date: string; etape: string }) => Promise<void>; supprimer: (c: Contact) => void }) {
  const [canal, setCanal] = useState("Appel");
  const [resume, setResume] = useState("");
  const [action, setAction] = useState(c.prochaine_action ?? "");
  const [date, setDate] = useState(c.prochaine_date ?? "");
  const [etape, setEtape] = useState(c.etape);
  const champ = (cle: keyof Contact, libelle: string, type = "text") => (
    <label className="om-fiche-champ">
      <span>{libelle}</span>
      <input type={type} defaultValue={(c[cle] as string | null) ?? ""} onBlur={(e) => e.target.value.trim() !== ((c[cle] as string | null) ?? "") && maj(c.id, { [cle]: e.target.value.trim() || null })} />
    </label>
  );
  return (
    <>
      <section className="v2-carte" aria-label={`Fiche de ${c.nom}`}>
        <div className="om-fiche-tete">
          <div>
            <p className="v2-val-circuit-titre">{c.nom}</p>
            <p className="v2-val-gris">{[c.role, c.entreprise && c.entreprise !== c.nom ? c.entreprise : null, c.secteur, c.commune].filter(Boolean).join(" · ") || "Complète la fiche ci-dessous"}</p>
          </div>
          <button type="button" className="v2-btn v2-btn--petit v2-btn--icone v2-btn--fantome" aria-label="Supprimer le contact" onClick={() => supprimer(c)}>
            <Trash2 width={14} height={14} aria-hidden="true" />
          </button>
        </div>
        <div className="om-fiche-actions">
          {c.telephone ? (
            <a className="v2-val-bouton" href={`tel:${c.telephone.replace(/[^\d+]/g, "")}`}>
              <Phone width={14} height={14} aria-hidden="true" /> {c.telephone}
            </a>
          ) : null}
          {c.telephone ? (
            <a className="v2-val-bouton" href={`https://wa.me/${c.telephone.replace(/[^\d]/g, "").replace(/^0/, "590")}`} target="_blank" rel="noreferrer">
              <MessageCircle width={14} height={14} aria-hidden="true" /> WhatsApp
            </a>
          ) : null}
          {c.courriel ? (
            <a className="v2-val-bouton" href={`mailto:${c.courriel}`}>
              <Mail width={14} height={14} aria-hidden="true" /> E-mail
            </a>
          ) : null}
        </div>
        <div className="om-fiche-grille">
          <label className="om-fiche-champ">
            <span>Type</span>
            <select defaultValue={c.type} onChange={(e) => maj(c.id, { type: e.target.value })}>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="om-fiche-champ">
            <span>Étape</span>
            <select value={c.etape} onChange={(e) => maj(c.id, { etape: e.target.value })}>
              {ETAPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          {champ("nom", "Nom")}
          {champ("role", "Rôle")}
          {champ("entreprise", "Entreprise")}
          {champ("secteur", "Secteur")}
          {champ("telephone", "Téléphone", "tel")}
          {champ("courriel", "E-mail", "email")}
          {champ("commune", "Commune")}
          {champ("source", "Source")}
        </div>
        <label className="om-fiche-champ om-fiche-note">
          <span>Note</span>
          <textarea rows={2} defaultValue={c.note ?? ""} onBlur={(e) => e.target.value.trim() !== (c.note ?? "") && maj(c.id, { note: e.target.value.trim() || null })} />
        </label>
      </section>

      <section className="v2-carte" aria-label="Noter un échange">
        <h2 className="v2-val-groupe">Noter un échange</h2>
        <form
          className="om-echange"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!resume.trim()) return;
            await noter(c, { canal, resume: resume.trim(), prochaine_action: action.trim(), prochaine_date: date, etape });
            setResume("");
          }}
        >
          <div className="om-echange-canaux" role="radiogroup" aria-label="Canal">
            {CANAUX.map((k) => {
              const Icone = ICONE_CANAL[k] ?? Phone;
              return (
                <button key={k} type="button" role="radio" aria-checked={canal === k} className="v2-val-bouton" data-actif={canal === k ? "" : undefined} onClick={() => setCanal(k)}>
                  <Icone width={14} height={14} aria-hidden="true" /> {k}
                </button>
              );
            })}
          </div>
          <textarea className="om-zone" rows={3} value={resume} onChange={(e) => setResume(e.target.value)} placeholder="Ce qui s'est dit, ce qu'il a répondu, l'objection…" aria-label="Résumé de l'échange" />
          <div className="om-fiche-grille">
            <label className="om-fiche-champ">
              <span>Nouvelle étape</span>
              <select value={etape} onChange={(e) => setEtape(e.target.value)}>
                {ETAPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="om-fiche-champ">
              <span>Date de relance</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="om-fiche-champ om-fiche-large">
              <span>Prochaine action</span>
              <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Rappeler pour caler l'audit…" />
            </label>
          </div>
          <div className="om-actions">
            <button type="submit" className="v2-btn v2-btn--petit v2-btn--primaire" disabled={!resume.trim()}>
              Noter l&apos;échange
            </button>
          </div>
        </form>
      </section>

      <section className="v2-carte" aria-label="Journal">
        <h2 className="v2-val-groupe">Journal · {echanges.length} échange{echanges.length > 1 ? "s" : ""}</h2>
        {echanges.length ? (
          <ol className="v2-val-etapes om-journal">
            {echanges.map((e) => {
              const Icone = ICONE_CANAL[e.canal] ?? Phone;
              return (
                <li key={e.id}>
                  <span className="v2-val-etape-icone">
                    <Icone width={16} height={16} />
                  </span>
                  <span>
                    <span className="v2-val-etape-nom">
                      {e.canal} · {new Date(e.quand).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} à {new Date(e.quand).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <small className="v2-val-gris om-journal-texte">{e.resume}</small>
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="v2-val-gris v2-val-pad">Aucun échange noté pour l&apos;instant.</p>
        )}
      </section>
    </>
  );
}

function NouveauContact({ annuler, creer }: { annuler: () => void; creer: (c: Partial<Contact>) => void }) {
  const [f, setF] = useState({ nom: "", entreprise: "", role: "", type: "Prospect", telephone: "", courriel: "", commune: "", prochaine_action: "", prochaine_date: "" });
  const champ = (k: keyof typeof f, libelle: string, type = "text") => (
    <label className="om-fiche-champ">
      <span>{libelle}</span>
      <input type={type} value={f[k]} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} />
    </label>
  );
  return (
    <section className="v2-carte om-nouveau" aria-label="Nouveau contact">
      <h2 className="v2-val-groupe">Nouveau contact</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!f.nom.trim()) return;
          creer(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim() || null])) as Partial<Contact>);
        }}
      >
        <div className="om-fiche-grille">
          {champ("nom", "Nom *")}
          {champ("entreprise", "Entreprise")}
          {champ("role", "Rôle")}
          <label className="om-fiche-champ">
            <span>Type</span>
            <select value={f.type} onChange={(e) => setF((x) => ({ ...x, type: e.target.value }))}>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          {champ("telephone", "Téléphone", "tel")}
          {champ("courriel", "E-mail", "email")}
          {champ("commune", "Commune")}
          {champ("prochaine_date", "Date de relance", "date")}
          <label className="om-fiche-champ om-fiche-large">
            <span>Prochaine action</span>
            <input value={f.prochaine_action} onChange={(e) => setF((x) => ({ ...x, prochaine_action: e.target.value }))} />
          </label>
        </div>
        <div className="om-actions">
          <button type="button" className="v2-btn v2-btn--petit v2-btn--fantome" onClick={annuler}>
            Annuler
          </button>
          <button type="submit" className="v2-btn v2-btn--petit v2-btn--primaire" disabled={!f.nom.trim()}>
            Ajouter le contact
          </button>
        </div>
      </form>
    </section>
  );
}

function Jauge({ icone: Icone, titre, fort, faible, part, pied }: { icone: typeof Phone; titre: string; fort: string; faible: string; part: number; pied: string }) {
  const N = 40;
  const pleins = Math.round(Math.max(0, Math.min(1, part)) * N);
  return (
    <div className="v2-dr-carte v2-dr-jauge">
      <span className="v2-dr-jauge-tete">
        <Icone width={18} height={18} aria-hidden="true" /> {titre}
      </span>
      <span className="v2-dr-jauge-valeur">
        <strong>
          <Chiffre valeur={fort} />
        </strong>
        {faible}
      </span>
      <span className="v2-dr-jauge-barre" aria-hidden="true">
        {Array.from({ length: N }, (_, i) => (
          <i key={i} data-plein={i < pleins ? "" : undefined} />
        ))}
      </span>
      <small>{pied}</small>
    </div>
  );
}

