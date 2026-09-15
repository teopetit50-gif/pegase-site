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

   14/09 — DEUX ÉTATS. Huit champs ouverts en permanence coûtaient un rang
   de 360 px pour une chose qu'on corrige deux fois par an. Au repos, la
   carte montre un RÉSUMÉ (cinq valeurs, les absentes en « — ») ; le
   formulaire s'ouvre à la demande et se referme après l'enregistrement,
   le résumé relisant alors les champs enregistrés.

   15/09 — LE FORMULAIRE PASSE DANS UNE MODALE. Teo : « il faut de beaux
   composants — quand on clique sur le profil, ça nous fait un beau
   truc. » Le dialogue est la reprise de `@originui/dialog` (21st.dev,
   MIT) posée dans components/ui/dialog.tsx, avec les cinq adaptations
   qu'exige ce dépôt (jetons, filets, animations) écrites en tête de ce
   fichier-là. Ce qui change ICI : le formulaire ne se déplie plus dans
   la carte — il s'ouvre par-dessus la page, en une colonne à partir de
   laquelle rien ne bouge derrière ; et la grille en `@container` cède la
   place à `sm:grid-cols-2`, le panneau faisant 460 px au plus (une
   requête de conteneur n'aurait plus rien à mesurer).

   Un profil INCOMPLET (sans prénom, nom ou entreprise — compte créé par
   code de secours) n'ouvre PLUS la modale d'office : une modale qui
   s'ouvre seule au chargement de la page se referme par réflexe, sans
   être lue. La carte le dit et propose « Compléter mon profil ».

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

import { UserRound } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogIcone,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  /* 15/09 : plus d'ouverture d'office sur un profil incomplet — voir
     l'en-tête. La carte porte l'alerte, la modale attend un clic. */
  const [ouvert, setOuvert] = useState(false);
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
    setOuvert(false);
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

  /* ——— la carte au repos : le résumé, et la porte vers la modale ——— */
  const secteurLisible = SECTEURS.find((s) => s.valeur === enregistre.secteur)?.libelle;
  /* le nom n'est pas dans la liste : il est déjà dans l'en-tête de page */
  const lignes: { etiquette: string; valeur: string; num?: boolean }[] = [
    { etiquette: "Entreprise", valeur: enregistre.entreprise },
    { etiquette: "Téléphone / WhatsApp", valeur: enregistre.telephone, num: true },
    { etiquette: "Secteur", valeur: secteurLisible ?? enregistre.secteur },
    { etiquette: "Commune", valeur: enregistre.commune },
    {
      etiquette: "SIRET",
      valeur: enregistre.siret ? siretLisible(enregistre.siret) : "",
      num: true,
    },
  ];
  const incomplet = !complet(enregistre);

  return (
    <div className="cp-resume-bloc">
      {fait ? (
        <p className="cp-ok mb-3" role="status">
          Profil enregistré. Il sert à vos factures et pré-remplit vos prochaines demandes.
        </p>
      ) : null}
      {incomplet ? (
        <p className="cp-texte mb-3">
          Votre profil n&apos;est pas complet&nbsp;: prénom, nom et entreprise servent à vos
          factures et à vos prochaines demandes.
        </p>
      ) : null}
      <div className="cp-resume">
        <dl className="cp-resume-liste">
          {lignes.map((l) => (
            <div key={l.etiquette} className="cp-resume-item">
              <dt className="cp-resume-etiquette">{l.etiquette}</dt>
              <dd
                className={`cp-resume-valeur${l.num ? " num" : ""}${l.valeur ? "" : " cp-resume-valeur--vide"}`}
              >
                {l.valeur || "—"}
              </dd>
            </div>
          ))}
        </dl>

        {/* ——— la modale ———
            Le déclencheur EST le bouton (DialogTrigger asChild) : Radix
            pose alors l'état d'ouverture, `aria-haspopup`, et rend le
            focus au bouton à la fermeture — ce qu'un onClick à la main ne
            fait pas. */}
        <Dialog
          open={ouvert}
          onOpenChange={(o) => {
            if (o) ouvrir();
            else annuler();
          }}
        >
          <DialogTrigger asChild>
            <button type="button" className="r-btn r-btn--fil shrink-0">
              {incomplet ? "Compléter mon profil" : "Modifier le profil"}
            </button>
          </DialogTrigger>

          <DialogContent>
            <DialogIcone>
              <UserRound size={18} strokeWidth={1.75} aria-hidden="true" />
            </DialogIcone>
            <DialogHeader>
              <DialogTitle>Profil professionnel</DialogTitle>
              <DialogDescription>
                Ce que nous savons de votre entreprise&nbsp;: ces informations figurent sur vos
                factures et pré-remplissent vos demandes.
              </DialogDescription>
            </DialogHeader>

            {/* ⚠ LE <fieldset> EST À L'INTÉRIEUR DU CORPS, PAS AUTOUR.
                Il désactive les huit champs d'un coup pendant l'envoi,
                mais un fieldset ne contraint pas ses enfants comme une
                boîte flexible : intercalé entre le <form> et le corps
                défilant, il allouait 540 px et laissait le corps en
                occuper 596 — le pied, donc le bouton « Enregistrer »,
                sortait du panneau à 375 px de large (mesuré le 15/09).
                Les deux boutons du pied portent leur propre `disabled`. */}
            <form onSubmit={enregistrer} noValidate className="flex min-h-0 flex-1 flex-col">
                <DialogBody>
                  <fieldset disabled={envoi} className="m-0 min-w-0 border-0 p-0">
                  <div className="grid gap-3 sm:grid-cols-2">
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
                  </fieldset>
                </DialogBody>

                <DialogFooter>
                  <button
                    type="submit"
                    className={`r-btn w-full justify-center ${envoi ? "rv-btn--attente" : "r-btn--noir"}`}
                    disabled={envoi}
                  >
                    {envoi ? "Enregistrement…" : "Enregistrer mon profil"}
                  </button>
                  <DialogClose asChild>
                    <button type="button" className="dlg-sortie" disabled={envoi}>
                      Annuler
                    </button>
                  </DialogClose>
                </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
