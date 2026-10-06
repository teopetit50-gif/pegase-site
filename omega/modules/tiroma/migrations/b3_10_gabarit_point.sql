-- b3_10 — Le courriel du point du matin SANS donnée de santé : un gabarit validé, aux variables non libres.
--
-- CE QUE ÇA CORRIGE : private.creer_envoi tient tout texte libre d'un module `sante = true` pour de la santé
-- (v_contexte_sante) ; sans expéditeur agréé (aucun ne l'est), même un courriel de simples compteurs est bloqué
-- SANTE_HORS_CANAL_AGREE (test 08). Un gabarit validé dont aucune variable n'est de type « texte » rend
-- texte_libre = false : le message n'est pas santé et part par le circuit ordinaire (validation, essai, Brevo).
-- La page /secteurs/dentaire promet « Point du matin par WhatsApp ou e-mail » : voici le seul contenu qui peut
-- partir tant qu'aucun canal n'est agréé — des nombres et un lien vers l'espace, jamais un nom.
--
-- CE QUE ÇA POSE : le gabarit global (client_id null) tiroma.point_matin, canal email, langue fr, version 1,
-- variables {jour: date, creneaux: entier, plans: entier, verifications: entier, demi_journees_vides: entier},
-- transactionnel, donnees_sante = false ; posé en brouillon puis validé par le serveur (public.valider_gabarit,
-- réservé à service_role). Idempotent : « on conflict do nothing » sur (client_id, code, langue, version), et la
-- validation ne touche qu'un brouillon.

insert into public.gabarits_messages (client_id, module, code, langue, version, canal, libelle, sujet, corps, variables,
                                      transactionnel, donnees_sante, espacement, statut)
values (null, 'tiroma', 'tiroma.point_matin', 'fr', 1, 'email',
        'Point du matin Tiroma — compteurs, sans donnée de santé',
        'Point du matin du {{jour}} — {{entite}}',
        'Bonjour,' || chr(10) || chr(10)
        || 'Le point du matin du {{jour}} pour {{entite}} ({{organisation}}) :' || chr(10)
        || '— {{creneaux}} créneau(x) libéré(s) à reprendre ;' || chr(10)
        || '— {{plans}} plan(s) signé(s) sans rendez-vous ;' || chr(10)
        || '— {{verifications}} vérification(s) avant les rendez-vous des deux prochains jours ;' || chr(10)
        || '— {{demi_journees_vides}} demi-journée(s) de fauteuil sous le seuil d''occupation.' || chr(10) || chr(10)
        || 'Le détail, avec les patients à appeler, est dans votre espace : https://app.omegaai.fr/espace/tiroma' || chr(10)
        || '(il ne sort jamais d''Omega par courriel : aucun prestataire d''envoi n''est agréé pour les données de santé).' || chr(10) || chr(10)
        || 'Tiroma, pour {{organisation}}.',
        '{"jour": "date", "creneaux": "entier", "plans": "entier", "verifications": "entier", "demi_journees_vides": "entier"}'::jsonb,
        true, false, false, 'brouillon')
on conflict (client_id, code, langue, version) do nothing;

-- La validation revient au serveur (private.exiger_ouvrier) : on l'endosse le temps de l'appel.
do $$
declare v_id uuid;
begin
  select g.id into v_id from public.gabarits_messages g
  where g.client_id is null and g.code = 'tiroma.point_matin' and g.langue = 'fr' and g.version = 1 and g.statut = 'brouillon';
  if v_id is not null then
    set local role service_role;
    perform public.valider_gabarit(v_id, 'B3 — recette, 06/10/2026');
    reset role;
  end if;
end $$;
