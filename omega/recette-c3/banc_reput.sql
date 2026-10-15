-- Recette seulement : REPUT installé sur le banc, en mode ESSAI (tout envoi part à l'adresse d'essai du banc),
-- trois fiches de démonstration validées au nom du gérant, et la boîte banc@recu.omegaai.fr active.
-- Rejouable. Rien ici ne part vers un vrai client.
do $$
declare
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_gerant uuid := (select c.user_id from public.comptes c where c.client_id = v_client and c.role = 'gerant' order by c.user_id limit 1);
begin
  perform public.reput_installer(v_client);
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai',
         coalesce((select r.essai_adresse from public.reglages_envois r where r.client_id = v_client and r.module is null), 'essais@omegaai.fr'),
         array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  if not exists (select 1 from public.reput_connaissances k where k.client_id = v_client) then
    insert into public.reput_connaissances (client_id, origine_id, sujet, genre, titre, contenu, source, statut, cree_par, valide_par, valide_le, id)
    select v_client, x.id, x.sujet, x.genre, x.titre, x.contenu, x.source, 'validee', v_gerant, v_gerant, now(), x.id
    from (values
      (gen_random_uuid(), 'horaires', 'horaires', 'Horaires d''ouverture', 'Du lundi au vendredi de 8 h 30 à 18 h ; le samedi de 9 h à 12 h. Fermé le dimanche et les jours fériés.', 'Banc C3 — fiche de démonstration'),
      (gen_random_uuid(), 'tarifs', 'tarif', 'Diagnostic à domicile', 'Le diagnostic à domicile coûte 89 € TTC, déduits de la facture si les travaux sont commandés dans le mois.', 'Banc C3 — fiche de démonstration'),
      (gen_random_uuid(), 'rendez_vous', 'question', 'Comment prendre rendez-vous ?', 'Un rendez-vous se prend en répondant à ce message avec deux créneaux qui vous conviennent ; l''agence confirme sous 24 h ouvrées.', 'Banc C3 — fiche de démonstration')
    ) as x(id, sujet, genre, titre, contenu, source);
  end if;
end $$;
