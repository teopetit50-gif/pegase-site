"use client";

/* ══════════════════════════════════════════════════════════════════════
   ProfilCarte — « Profil professionnel », le formulaire de /compte
   (03/09/2026)

   Demande Teo du 03/09 : « modif de profil pro ». Jusqu'ici le profil
   (prénom, nom, entreprise, téléphone) n'était écrit qu'en passant — à
   la création du compte, ou par le module de réservation après une
   installation. Ici la personne le relit et le corrige elle-même, et
   ajoute ce qui sert à la facture et au brief : secteur (la liste
   SECTEURS du module de réservation), commune, SIRET.

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

export default function ProfilCarte({ utilisateur }: { utilisateur: Utilisateur }) {
  const router = useRouter();
  const [c, setC] = useState<Champs>(() => depuisUtilisateur(utilisateur));
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
      setC((prev) => ({ ...prev, siret: donnees.siret ?? "" }));
      setFait(true);
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

  return (
    <form onSubmit={enregistrer} noValidate>
      <fieldset disabled={envoi} className="m-0 min-w-0 border-0 p-0">
        <div className="grid gap-4 sm:grid-cols-2">
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
              Téléphone / WhatsApp <small>— on vous appelle sur ce numéro</small>
            </label>
            <input
              id="cp-tel"
              type="tel"
              className="rv-champ"
              autoComplete="tel"
              placeholder="0690 …"
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
              SIRET <small>— facultatif, 14 chiffres</small>
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
              Adresse e-mail <small>— identifiant de connexion</small>
            </label>
            <input id="cp-email" className="rv-champ cp-champ--lecture" value={utilisateur.email} readOnly />
            <p className="cp-aide">Pour changer d&apos;adresse, écrivez-nous.</p>
          </div>
        </div>

        {erreur ? (
          <p className="rv-erreur mt-5" role="alert">
            {erreur}
          </p>
        ) : null}
        {fait && !erreur ? (
          <p className="cp-ok mt-5" role="status">
            Profil enregistré. Il sert à vos factures et pré-remplit vos prochaines demandes.
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="submit" className={`r-btn ${envoi ? "rv-btn--attente" : "r-btn--noir"}`} disabled={envoi}>
            {envoi ? "Enregistrement…" : "Enregistrer mon profil"}
          </button>
          <button
            type="button"
            className="r-btn r-btn--fil"
            onClick={() => {
              setC(depuisUtilisateur(utilisateur));
              setErreur(null);
              setFait(false);
            }}
            disabled={envoi}
          >
            Annuler les modifications
          </button>
        </div>
      </fieldset>
    </form>
  );
}
