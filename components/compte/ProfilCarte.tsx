"use client";

/* ══════════════════════════════════════════════════════════════════════
   ProfilCarte — « Profil professionnel », le formulaire de /compte
   (03/09/2026, replié en résumé depuis le 14/09)

   Demande Teo du 03/09 : « modif de profil pro ». Jusqu'ici le profil
   (prénom, nom, entreprise, téléphone) n'était écrit qu'en passant — à
   la création du compte, ou par le module de réservation après une
   installation. Ici la personne le relit et le corrige elle-même, et
   ajoute ce qui sert à la facture et au brief : secteur (la liste
   SECTEURS du module de réservation), commune, SIRET.

   14/09 — DEUX ÉTATS. La page tient désormais sur un écran (CompteVue,
   la carte de verre) et huit champs ouverts en permanence coûtaient un
   rang de 360 px pour une chose qu'on corrige deux fois par an. Au
   repos, le panneau montre un RÉSUMÉ (six valeurs sur une grille, les
   absentes en « — ») et un bouton « Modifier le profil » ; le formulaire
   se déplie à la demande, dans le même panneau, et se replie après
   l'enregistrement (le résumé relit alors les champs enregistrés). Un
   profil INCOMPLET (sans prénom, nom ou entreprise — le cas d'un compte
   créé par code de secours) s'ouvre directement sur le formulaire, avec
   un mot qui dit pourquoi : le résumé n'aurait rien à montrer.

   Le panneau est un BANDEAU en pleine largeur (GlassPanel bande) : le
   résumé est une ligne de paires étiquette/valeur qui se replie en
   plusieurs rangs quand la place manque, le bouton à droite. La grille
   du formulaire se règle sur la largeur du bandeau (container query,
   @container / @md: @2xl: @4xl:) — quatre colonnes dès 896 px de large,
   deux rangs de champs.

   Où ça s'enregistre : dans les user_metadata du compte, par
   updateUser({ data }) — la même porte que ConnexionInline et
   PriseDeCreneau. updateUser FUSIONNE : mdp_defini et les clés qu'on ne
   touche pas restent. Un champ vidé part en null (pas en "") pour que
   utilisateurDepuis le lise « absent » et que l'en-tête ne montre pas une
   chaîne vide.

   L'e-mail ne se change pas ici : c'est l'identifiant de connexion, sur
   le site comme sur le cockpit, et un changement d'adresse passe par une
   vérification de la nouvelle adresse que le site ne porte pas encore —
   on l'affiche en lecture seule, « écrivez-nous ».

   Après enregistrement : un merci, puis router.refresh() pour que la
   ligne d'identité en tête de page (composant serveur) relise les
   métadonnées. SUBTILITÉ vérifiée en écrivant la carte : le serveur lit
   les métadonnées dans les CLAIMS du jeton (utilisateurCourant →
   getClaims), et updateUser ne réémet pas le jeton — sans rien d'autre,
   l'en-tête garderait l'ancien nom jusqu'au prochain rafraîchissement
   (jusqu'à une heure). D'où refreshSession() avant router.refresh() : un
   jeton neuf, avec les métadonnées à jour, écrit dans les cookies que le
   serveur relit à la requête suivante. S'il échoue (réseau), le profil
   est quand même enregistré : on le dit, et l'en-tête suivra plus tard.

   Validation côté client, en français : prénom, nom et entreprise sont
   nécessaires (un profil PRO sans entreprise n'en est pas un — même
   règle que ConnexionInline) ; le SIRET, facultatif, fait 14 chiffres
   (espaces tolérés, lib/compte siretValide).
   ══════════════════════════════════════════════════════════════════════ */

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SECTEURS } from "@/lib/creneaux";
import { siretNormalise, siretValide, type Utilisateur } from "@/lib/compte";
import { createClient } from "@/lib/supabase/client";

type Champs = {
  prenom: string;
  nom: string;
  entreprise: string;
  telephone: string;
  secteur: string;
  commune: string;
  siret: string;
};

function depuisUtilisateur(u: Utilisateur): Champs {
  return {
    prenom: u.prenom ?? "",
    nom: u.nom ?? "",
    entreprise: u.entreprise ?? "",
    telephone: u.telephone ?? "",
    secteur: u.secteur ?? "",
    commune: u.commune ?? "",
    siret: u.siret ?? "",
  };
}

const complet = (c: Champs) => Boolean(c.prenom.trim() && c.nom.trim() && c.entreprise.trim());

/* « 123 456 789 00012 » — le SIRET s'affiche comme l'INSEE l'imprime */
const siretLisible = (s: string) => {
  const n = siretNormalise(s);
  return n.length === 14 ? `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 9)} ${n.slice(9)}` : s;
};

export default function ProfilCarte({ utilisateur }: { utilisateur: Utilisateur }) {
  const router = useRouter();
  const [c, setC] = useState<Champs>(() => depuisUtilisateur(utilisateur));
  /* ce que le résumé montre : les champs tels qu'ENREGISTRÉS, pas la
     saisie en cours — on annule sans toucher au résumé */
  const [enregistre, setEnregistre] = useState<Champs>(() => depuisUtilisateur(utilisateur));
  const [ouvert, setOuvert] = useState(() => !complet(depuisUtilisateur(utilisateur)));
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState(false);
  /* verrou synchrone contre le double clic : l'état React arrive un
     rendu plus tard, la référence tout de suite */
  const verrou = useRef(false);

  const maj = (k: keyof Champs) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setC((prev) => ({ ...prev, [k]: e.target.value }));
    setFait(false);
  };

  const ouvrir = () => {
    setC(enregistre);
    setErreur(null);
    setFait(false);
    setOuvert(true);
  };
  const annuler = () => {
    setC(enregistre);
    setErreur(null);
    setFait(false);
    /* un profil incomplet reste ouvert : il n'y a rien à résumer */
    if (complet(enregistre)) setOuvert(false);
  };

  const enregistrer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);
    if (!c.prenom.trim() || !c.nom.trim() || !c.entreprise.trim()) {
      setErreur("Prénom, nom et entreprise sont nécessaires.");
      return;
    }
    if (c.siret.trim() && !siretValide(c.siret)) {
      setErreur("Le SIRET fait 14 chiffres (les espaces sont acceptés).");
      return;
    }
    if (verrou.current) return;
    verrou.current = true;
    setEnvoi(true);

    /* les champs vidés partent en null : voir l'en-tête */
    const ouNull = (v: string) => (v.trim() ? v.trim() : null);
    const donnees = {
      prenom: c.prenom.trim(),
      nom: c.nom.trim(),
      entreprise: c.entreprise.trim(),
      telephone: ouNull(c.telephone),
      secteur: ouNull(c.secteur),
      commune: ouNull(c.commune),
      siret: c.siret.trim() ? siretNormalise(c.siret) : null,
    };

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ data: donnees });
      if (error) {
        setErreur(
          /session|jwt|token|expired/i.test(error.message)
            ? "Votre session a expiré. Reconnectez-vous, puis réessayez."
            : "Le profil n'a pas été enregistré. Vérifiez votre connexion et réessayez.",
        );
        return;
      }
      const propre: Champs = {
        prenom: donnees.prenom,
        nom: donnees.nom,
        entreprise: donnees.entreprise,
        telephone: donnees.telephone ?? "",
        secteur: donnees.secteur ?? "",
        commune: donnees.commune ?? "",
        siret: donnees.siret ?? "",
      };
      setC(propre);
      setEnregistre(propre);
      setFait(true);
      setOuvert(false);
      /* un jeton neuf (métadonnées à jour dans les claims), puis l'en-tête
         — composant serveur — se relit : voir l'en-tête du fichier */
      await supabase.auth.refreshSession().catch(() => null);
      router.refresh();
    } catch {
      setErreur("Le profil n'a pas été enregistré. Vérifiez votre connexion et réessayez.");
    } finally {
      verrou.current = false;
      setEnvoi(false);
    }
  };

  /* ——— le résumé ——— */
  if (!ouvert) {
    const secteur = SECTEURS.find((s) => s.valeur === enregistre.secteur)?.libelle;
    /* le nom n'y est pas : il est déjà dans l'en-tête de la carte, juste
       au-dessus — et sans lui les six paires tiennent sur UNE ligne à 1440 */
    const lignes: { etiquette: string; valeur: string; num?: boolean }[] = [
      { etiquette: "Entreprise", valeur: enregistre.entreprise },
      { etiquette: "Téléphone / WhatsApp", valeur: enregistre.telephone, num: true },
      { etiquette: "Secteur", valeur: secteur ?? enregistre.secteur },
      { etiquette: "Commune", valeur: enregistre.commune },
      { etiquette: "SIRET", valeur: enregistre.siret ? siretLisible(enregistre.siret) : "", num: true },
    ];
    return (
      <div className="cp-resume-bloc">
        {fait ? (
          <p className="cp-ok mb-3" role="status">
            Profil enregistré. Il sert à vos factures et pré-remplit vos prochaines demandes.
          </p>
        ) : null}
        <div className="cp-resume">
          <dl className="cp-resume-liste">
            {lignes.map((l) => (
              <div key={l.etiquette} className="cp-resume-item">
                <dt className="cp-resume-etiquette">{l.etiquette}</dt>
                <dd className={`cp-resume-valeur${l.num ? " num" : ""}${l.valeur ? "" : " cp-resume-valeur--vide"}`}>
                  {l.valeur || "—"}
                </dd>
              </div>
            ))}
          </dl>
          <button type="button" className="r-btn r-btn--fil shrink-0" onClick={ouvrir}>
            Modifier le profil
          </button>
        </div>
      </div>
    );
  }

  /* ——— le formulaire ——— */
  return (
    <form onSubmit={enregistrer} noValidate className="@container">
      <fieldset disabled={envoi} className="m-0 min-w-0 border-0 p-0">
        {!complet(enregistre) ? (
          <p className="cp-texte mb-4">
            Votre profil n&apos;est pas complet&nbsp;: prénom, nom et entreprise servent à vos factures
            et à vos prochaines demandes.
          </p>
        ) : null}
        <div className="grid gap-3 @md:grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-4">
          <div>
            <label className="rv-libelle" htmlFor="cp-prenom">
              Prénom
            </label>
            <input
              id="cp-prenom"
              className="rv-champ"
              autoComplete="given-name"
              maxLength={80}
              value={c.prenom}
              onChange={maj("prenom")}
              required
            />
          </div>
          <div>
            <label className="rv-libelle" htmlFor="cp-nom">
              Nom
            </label>
            <input
              id="cp-nom"
              className="rv-champ"
              autoComplete="family-name"
              maxLength={80}
              value={c.nom}
              onChange={maj("nom")}
              required
            />
          </div>
          <div>
            <label className="rv-libelle" htmlFor="cp-entreprise">
              Entreprise
            </label>
            <input
              id="cp-entreprise"
              className="rv-champ"
              autoComplete="organization"
              maxLength={120}
              value={c.entreprise}
              onChange={maj("entreprise")}
              required
            />
          </div>
          <div>
            <label className="rv-libelle" htmlFor="cp-tel">
              Téléphone / WhatsApp <small>(nous vous appelons sur ce numéro)</small>
            </label>
            <input
              id="cp-tel"
              type="tel"
              className="rv-champ"
              autoComplete="tel"
              placeholder="06 12 34 56 78"
              maxLength={30}
              value={c.telephone}
              onChange={maj("telephone")}
            />
          </div>
          <div>
            <label className="rv-libelle" htmlFor="cp-secteur">
              Secteur d&apos;activité
            </label>
            <select id="cp-secteur" className="rv-champ" value={c.secteur} onChange={maj("secteur")}>
              <option value="">Choisir…</option>
              {SECTEURS.map((s) => (
                <option key={s.valeur} value={s.valeur}>
                  {s.libelle}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="rv-libelle" htmlFor="cp-commune">
              Commune
            </label>
            <input
              id="cp-commune"
              className="rv-champ"
              autoComplete="address-level2"
              maxLength={80}
              value={c.commune}
              onChange={maj("commune")}
            />
          </div>
          <div>
            <label className="rv-libelle" htmlFor="cp-siret">
              SIRET <small>(facultatif, 14 chiffres)</small>
            </label>
            <input
              id="cp-siret"
              className="rv-champ num"
              inputMode="numeric"
              autoComplete="off"
              placeholder="123 456 789 00012"
              maxLength={20}
              value={c.siret}
              onChange={maj("siret")}
            />
          </div>
          <div>
            <label className="rv-libelle" htmlFor="cp-email">
              Adresse e-mail <small>(identifiant de connexion)</small>
            </label>
            <input id="cp-email" className="rv-champ cp-champ--lecture" value={utilisateur.email} readOnly />
            <p className="cp-aide">Pour changer d&apos;adresse, écrivez-nous.</p>
          </div>
        </div>

        {erreur ? (
          <p className="rv-erreur mt-4" role="alert">
            {erreur}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="submit" className={`r-btn ${envoi ? "rv-btn--attente" : "r-btn--noir"}`} disabled={envoi}>
            {envoi ? "Enregistrement…" : "Enregistrer mon profil"}
          </button>
          <button type="button" className="r-btn r-btn--fil" onClick={annuler} disabled={envoi}>
            {complet(enregistre) ? "Annuler" : "Annuler les modifications"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
