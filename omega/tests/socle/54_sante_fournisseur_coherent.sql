-- 54 — le fournisseur écrit sur l'envoi est celui que verrous_envoi a jugé (cohérence de fournisseur_hds)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql. Lecture seule.
-- verrous_envoi juge agree_sante sur le fournisseur de l'expéditeur actif (réel) ou sur envois_essai_fournisseur (essai) ;
-- commencer_envoi (19ab) rend fournisseur_hds d'après envois.fournisseur. Les deux doivent désigner le même fournisseur,
-- sinon l'ouvrier reçoit un fournisseur_hds qui n'est pas celui que le verrou a jugé. Vérifié sur les envois existants.

create or replace function tests.test_54_sante_fournisseur_coherent() returns setof text
language plpgsql as $f$
declare
  essai_f text := coalesce((select g.valeur from private.reglages g where g.cle = 'envois_essai_fournisseur'), 'brevo');
  n_essai int; n_reel int; ecarts_essai text; ecarts_reel text; sante_non_agree text; sans_fournisseur int;
begin
  if not tests.table_existe('envois') or not tests.table_existe('expediteurs') then
    return next ok(true, 'envois ou expediteurs absents : sans objet');
    return;
  end if;
  select count(*), string_agg(e.id::text || ' (' || e.fournisseur || ')', ', ') filter (where e.fournisseur <> essai_f)
    into n_essai, ecarts_essai
  from public.envois e where e.mode = 'essai' and e.fournisseur is not null;
  select count(*), string_agg(e.id::text || ' (' || e.fournisseur || ' ≠ ' || x.fournisseur || ')', ', ') filter (where e.fournisseur is distinct from x.fournisseur)
    into n_reel, ecarts_reel
  from public.envois e join public.expediteurs x on x.client_id = e.client_id and x.id = e.expediteur_id
  where e.mode = 'reel' and e.fournisseur is not null;
  select string_agg(e.id::text || ' (' || coalesce(e.fournisseur, 'aucun') || ', ' || e.statut || ')', ', ')
    into sante_non_agree
  from public.envois e
  where e.donnees_sante and e.statut in ('pret', 'en_cours', 'envoye')
    and not coalesce((select f.agree_sante from private.fournisseurs_envoi f where f.fournisseur = e.fournisseur), false);
  select count(*) into sans_fournisseur from public.envois e where e.statut in ('pret', 'en_cours', 'envoye') and e.fournisseur is null;
  return next ok(ecarts_essai is null, format('Envois d''essai : fournisseur = envois_essai_fournisseur (%s) sur %s envoi(s)', essai_f, n_essai));
  return next ok(ecarts_reel is null, format('Envois réels : fournisseur = celui de l''expéditeur retenu, sur %s envoi(s)', n_reel));
  return next ok(sante_non_agree is null, 'aucun envoi de santé prêt, en cours ou parti vers un fournisseur non agréé');
  if ecarts_essai is not null then return next diag('Écarts essai : ' || left(ecarts_essai, 600)); end if;
  if ecarts_reel is not null then return next diag('Écarts réel : ' || left(ecarts_reel, 600)); end if;
  if sante_non_agree is not null then return next diag('Santé non agréé : ' || left(sante_non_agree, 600)); end if;
  return next diag(format('Envois prêts/en cours/partis sans fournisseur écrit : %s ; un envoi réel sans expediteur_id n''est pas comparé', sans_fournisseur));
end $f$;

select * from runtests('tests'::name, '^test_54_');
