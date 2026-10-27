-- c4_43 — OFFLOAD : les relances dans le vocabulaire du secteur (session C4, 27/10/2026 ; audit omega/CHIFFRAGE/offload.md,
-- ligne 55 : « Les relances sont rédigées en français, dans le vocabulaire de votre secteur »).
--
-- Le message de reprise disait partout « votre dernière commande » et « Avez-vous de nouveaux besoins… ». Il parle
-- désormais la langue du métier de l'organisation :
--   · négoce : « votre dernière commande », besoins d'approvisionnement, vos références habituelles ;
--   · après-vente (garage, atelier) : « votre dernier passage à l'atelier », le prochain entretien ou une révision ;
--   · maintenance (climatisation, chauffage, ascenseurs) : « notre dernière intervention chez vous », la prochaine
--     visite d'entretien de vos installations ;
--   · bâtiment : « votre dernier chantier avec nous », un nouveau projet de travaux ;
--   · conseil (cabinet, architecte, expert) : « notre dernière mission pour vous », un nouveau sujet ;
--   · immobilier (agence, syndic) : « notre dernier dossier ensemble », un nouveau projet, achat, vente ou location.
-- Le secteur se règle (public.offload_regler_secteur, gérant ou administrateur, au journal) ; tant qu'il ne l'est pas,
-- il se déduit du secteur de l'organisation (clients.secteur) ; à défaut, le texte général, inchangé.
-- Le vocabulaire ne porte jamais de prix ni de délai (c4_03) ; les règles du client s'appliquent ensuite (c4_10).
--
-- Règles de pose : alter … add column if not exists, contrainte posée si absente, create or replace. Aucun DROP, aucun DELETE.

alter table public.offload_reglages add column if not exists secteur text;
do $do$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.offload_reglages'::regclass and conname = 'offload_reglages_secteur_check') then
    alter table public.offload_reglages add constraint offload_reglages_secteur_check
      check (secteur in ('general', 'negoce', 'apres_vente', 'maintenance', 'batiment', 'conseil', 'immobilier'));
  end if;
end $do$;

-- Le secteur en vigueur : le réglage, sinon celui déduit de l'organisation, sinon « general ».
create or replace function private.offload_secteur(p_client uuid)
 returns text
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select coalesce(
    (select g.secteur from public.offload_reglages g where g.client_id = p_client),
    (select case
       when s ~ '(immo|syndic|gestion locative|transaction)' then 'immobilier'
       when s ~ '(garage|auto|atelier|concession|carross|moto|pneu|sav|apres.?vente|après.?vente)' then 'apres_vente'
       when s ~ '(clim|chauff|maintenance|ascenseur|plomb|froid|frigor|energie|énergie|cvc)' then 'maintenance'
       when s ~ '(conseil|cabinet|avocat|expert|comptab|archi|ingenier|ingénier|notaire|geometre|géomètre)' then 'conseil'
       when s ~ '(btp|batiment|bâtiment|construct|travaux|menuis|maçon|macon|charpent|couverture|electri|électri|renovation|rénovation)' then 'batiment'
       when s ~ '(negoce|négoce|grossiste|distribut|fourniture|materiaux|matériaux|commerce de gros)' then 'negoce'
     end
     from (select lower(btrim(c.secteur)) as s from public.clients c where c.id = p_client) x),
    'general')
$function$;

-- Les mots du secteur. « dernier » peut porter %s : le nom de l'organisation.
create or replace function private.offload_vocabulaire(p_client uuid)
 returns jsonb
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select jsonb_build_object('secteur', s) || case s
    when 'negoce' then jsonb_build_object(
      'dernier', 'votre dernière commande chez %s', 'sujet', 'votre commande du',
      'question', 'Avez-vous de nouveaux besoins d''approvisionnement ? Nous pouvons préparer vos références habituelles.',
      'projet', 'votre besoin', 'retour', 'nous revenons vers vous avec ce qu''il vous faut')
    when 'apres_vente' then jsonb_build_object(
      'dernier', 'votre dernier passage à l''atelier', 'sujet', 'votre passage à l''atelier du',
      'question', 'Souhaitez-vous que nous prévoyions votre prochain entretien ou une révision ?',
      'projet', 'votre demande', 'retour', 'nous vous proposons un rendez-vous à l''atelier')
    when 'maintenance' then jsonb_build_object(
      'dernier', 'notre dernière intervention chez vous', 'sujet', 'notre intervention du',
      'question', 'Souhaitez-vous que nous planifiions la prochaine visite d''entretien de vos installations ?',
      'projet', 'votre besoin d''entretien', 'retour', 'nous convenons avec vous d''une visite')
    when 'batiment' then jsonb_build_object(
      'dernier', 'votre dernier chantier avec nous', 'sujet', 'votre chantier du',
      'question', 'Avez-vous un nouveau projet de travaux pour lequel nous pourrions vous accompagner ?',
      'projet', 'votre projet de travaux', 'retour', 'nous passons voir votre projet')
    when 'conseil' then jsonb_build_object(
      'dernier', 'notre dernière mission pour vous', 'sujet', 'notre mission du',
      'question', 'Avez-vous un nouveau sujet sur lequel nous pourrions vous accompagner ?',
      'projet', 'votre projet', 'retour', 'nous en parlons au moment qui vous convient')
    when 'immobilier' then jsonb_build_object(
      'dernier', 'notre dernier dossier ensemble', 'sujet', 'votre dossier du',
      'question', 'Avez-vous un nouveau projet immobilier, achat, vente ou location, pour lequel nous pourrions vous accompagner ?',
      'projet', 'votre projet immobilier', 'retour', 'nous faisons le point sur votre recherche')
    else jsonb_build_object(
      'dernier', 'votre dernière commande chez %s', 'sujet', 'votre commande du',
      'question', 'Avez-vous de nouveaux besoins pour lesquels nous pourrions vous être utiles ?',
      'projet', 'votre projet', 'retour', 'nous vous rappelons au moment qui vous convient')
  end
  from (select private.offload_secteur(p_client) as s) x
$function$;

-- Régler le secteur (null : le déduire de l'organisation). Gérant ou administrateur, au journal.
create or replace function private.offload_regler_secteur(p_client uuid, p_secteur text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_avant text;
begin
  perform private.offload_exiger(p_client, null, array['gerant', 'admin'], 'régler le vocabulaire du secteur');
  if p_secteur is not null and p_secteur not in ('general', 'negoce', 'apres_vente', 'maintenance', 'batiment', 'conseil', 'immobilier') then
    raise exception 'Secteur inconnu : %. Secteurs : general, negoce, apres_vente, maintenance, batiment, conseil, immobilier.', p_secteur
      using errcode = '22023';
  end if;
  select g.secteur into v_avant from public.offload_reglages g where g.client_id = p_client for update;
  if not found then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  update public.offload_reglages set secteur = p_secteur, maj_le = now() where client_id = p_client;
  perform private.journaliser_module(p_client, 'offload', 'offload.reglages', 'offload_reglages', p_client::text,
    jsonb_build_object('demande', jsonb_build_object('secteur', p_secteur), 'avant', jsonb_build_object('secteur', v_avant)), null);
  return private.offload_vocabulaire(p_client) || jsonb_build_object('regle', p_secteur is not null);
end $function$;

create or replace function public.offload_regler_secteur(p_client uuid, p_secteur text)
 returns jsonb
 language sql
 set search_path to ''
as $function$ select private.offload_regler_secteur(p_client, p_secteur) $function$;

-- Lecture pour l'écran : le secteur en vigueur, réglé ou déduit, et ses mots.
create or replace function public.offload_vocabulaire(p_client uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
begin
  perform private.offload_exiger(p_client, null, array['gerant', 'admin', 'valideur', 'collaborateur'], 'lire le vocabulaire du secteur');
  return private.offload_vocabulaire(p_client)
    || jsonb_build_object('regle', exists (select 1 from public.offload_reglages g where g.client_id = p_client and g.secteur is not null));
end $function$;

-- Le message de reprise, dans le vocabulaire du secteur.
create or replace function private.offload_message(p_compte uuid, p_rang integer, p_premier_le timestamptz default null,
                                                   p_jour date default null)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  g public.offload_reglages;
  a public.offload_achats;
  v_jour date := coalesce(p_jour, (now() at time zone private.offload_fuseau_compte(p_compte))::date);
  v_org text;
  v_bonjour text;
  v_commande text;
  v_signature text;
  v_sujet text;
  v_corps text;
  v_echeance text;
  v_vocab jsonb;
  v_date text;
  v_detail text;
  v_stop constant text := 'Si vous ne souhaitez plus recevoir nos messages, répondez simplement « stop » : nous ne vous écrirons plus.';
begin
  select * into c from public.offload_comptes where id = p_compte;
  select * into g from public.offload_reglages where client_id = c.client_id;
  select x.nom into v_org from public.clients x where x.id = c.client_id;
  v_vocab := private.offload_vocabulaire(c.client_id);
  select * into a from public.offload_achats x
  where x.compte_id = c.id and x.annule_le is null and x.nature <> 'avoir'
  order by x.date_achat desc, x.montant_ht desc limit 1;

  -- Le motif daté : l'entretien qui revient dans les deux mois (hors semaine qui vient), ou tombé sans intervention.
  select case when h.statut = 'depassee'
              then format('L''entretien de votre %s%s était à refaire le %s : souhaitez-vous que nous convenions d''un créneau ?',
                          q.designation, coalesce(' (' || q.site || ')', ''),
                          private.offload_date_longue(h.due_le))
              else format('L''entretien de votre %s%s est à refaire d''ici le %s : souhaitez-vous que nous convenions d''un créneau ?',
                          q.designation, coalesce(' (' || q.site || ')', ''),
                          private.offload_date_longue(h.due_le)) end
    into v_echeance
  from public.offload_echeances h join public.offload_equipements q on q.id = h.equipement_id
  where h.compte_id = c.id and h.type = 'entretien'
    and ((h.statut = 'a_venir' and h.due_le between v_jour + 8 and v_jour + 60) or h.statut = 'depassee')
  order by (h.statut = 'depassee') desc, h.due_le limit 1;

  v_bonjour := 'Bonjour' || coalesce(' ' || c.contact, '') || ',';
  v_signature := coalesce(nullif(btrim(g.signature), ''), v_org);
  if a.id is not null then
    v_date := private.offload_date_longue(a.date_achat);
    v_detail := concat_ws(', ', 'réf. ' || a.reference, '« ' || a.libelle || ' »', private.offload_euros(a.montant_ht) || ' HT');
    -- c4_43 : le passage se dit dans le vocabulaire du secteur (« votre dernier passage à l'atelier », « notre
    -- dernière mission pour vous »…) ; en général, « votre dernière commande chez <organisation> », comme avant.
    v_commande := format('%s date du %s (%s), il y a %s', format(v_vocab ->> 'dernier', v_org), v_date, v_detail,
                         private.offload_duree(a.date_achat, v_jour));
  end if;

  if p_rang = 1 then
    v_sujet := left(v_org || case when a.id is not null then ' — ' || (v_vocab ->> 'sujet') || ' ' || v_date
                                  else ' — reprendre contact' end, 300);
    v_corps := v_bonjour || E'\n\n'
      || case when a.id is not null then 'Je reprends votre dossier : ' || v_commande || '.' || E'\n\n'
              else 'Nous n''avons pas eu l''occasion de travailler ensemble depuis un moment.' || E'\n\n' end
      || coalesce(v_echeance || E'\n\n', '')
      || (v_vocab ->> 'question') || ' Un simple retour à ce message suffit : '
      || 'nous vous rappelons au moment qui vous convient.' || E'\n\n'
      || 'Bien cordialement,' || E'\n' || v_signature || E'\n\n' || v_stop;
  else
    v_sujet := left('Re : ' || v_org || case when a.id is not null then ' — ' || (v_vocab ->> 'sujet') || ' ' || v_date
                                             else ' — reprendre contact' end, 300);
    v_corps := v_bonjour || E'\n\n'
      || 'Je me permets de revenir vers vous après mon message du '
      || coalesce(private.offload_date_longue((p_premier_le at time zone private.offload_fuseau_compte(p_compte))::date), 'dernier')
      || case when a.id is not null then format(', au sujet de %s %s (%s), il y a %s', v_vocab ->> 'sujet', v_date, v_detail,
                                                  private.offload_duree(a.date_achat, v_jour)) else '' end
      || '.' || E'\n\n'
      || 'Si le moment n''est pas le bon, dites-le-nous simplement : nous ne vous relancerons pas.' || E'\n\n'
      || 'Bien cordialement,' || E'\n' || v_signature || E'\n\n' || v_stop;
  end if;
  return jsonb_build_object('sujet', v_sujet, 'corps', v_corps);
end $function$;

revoke execute on function private.offload_secteur(uuid) from public, anon, authenticated;
grant execute on function private.offload_secteur(uuid) to service_role;
revoke execute on function private.offload_vocabulaire(uuid) from public, anon, authenticated;
grant execute on function private.offload_vocabulaire(uuid) to service_role;
revoke execute on function private.offload_regler_secteur(uuid, text) from public, anon;
grant execute on function private.offload_regler_secteur(uuid, text) to authenticated, service_role;
revoke execute on function public.offload_regler_secteur(uuid, text) from public, anon;
grant execute on function public.offload_regler_secteur(uuid, text) to authenticated, service_role;
revoke execute on function public.offload_vocabulaire(uuid) from public, anon;
grant execute on function public.offload_vocabulaire(uuid) to authenticated, service_role;
revoke execute on function private.offload_message(uuid, integer, timestamptz, date) from public, anon, authenticated;
grant execute on function private.offload_message(uuid, integer, timestamptz, date) to service_role;
