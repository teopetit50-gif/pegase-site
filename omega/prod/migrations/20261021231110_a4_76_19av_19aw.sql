-- 20261021231110 a4_76+19av+19aw
-- Source : dépôt : 2ee67ed7 omega/migrations/a4_76_filed_lot68_gerant_seul.sql ; 6752be66 omega/modules/socle/migrations/19av_decision_seule_gerant.sql ; 9d869631 omega/modules/socle/migrations/19aw_approbation_exige_commentaire.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_76_filed_lot68_gerant_seul.sql @ 2ee67ed7, 19av_decision_seule_gerant.sql @ 6752be66, 19aw_approbation_exige_commentaire.sql @ 9d869631 ; a4_06 cité comme test : ignoré ; a4_64 cité comme test : ignoré.
-- ═══ omega/migrations/a4_76_filed_lot68_gerant_seul.sql @ 2ee67ed7
-- a4_76 (FILED lot 68) : un gérant suffit, seul, sauf au-delà d'un seuil que l'organisation règle.
--
-- Décision de Teo (21/10/2026, 23 h 05 Z, transmise par le coordinateur ; clôt TFILED-12) : une seule personne suffit
-- quand elle est gérante. Elle peut saisir puis approuver une facture, et activer seule l'accord permanent du sceau
-- mensuel (ce dernier point est dans le socle : A5). Côté FILED, rien ne doit exiger une seconde personne pour un
-- gérant, sauf un seuil réglé par l'organisation.
--
--   · Nouveau réglage, filed_reglages.seconde_personne_des_ttc : nul (par défaut) = un gérant décide toujours seul ;
--     sinon, à partir de ce montant TTC, une seconde personne reste exigée, même pour un gérant. Réglé par un gérant
--     ou un admin (public.filed_regler_seconde_personne), noté au journal.
--   · Les quatre gardes de FILED qui exigeaient une autre personne laissent passer un gérant sous le seuil :
--       - confirmer le fournisseur né d'une pièce qu'il a lui-même déposée (montant : la facture d'origine) ;
--       - approuver une note de frais dont il est le bénéficiaire ;
--       - décider de son propre trajet kilométrique ;
--       - se rembourser une note de frais.
--     Elles restent entières pour tout autre rôle (valideur, admin, collaborateur).
--   · La demande de validation d'une facture : payload.saisi_par, que le socle lit pour refuser l'approbation de
--     celui qui a saisi, ne nomme plus un gérant sous le seuil ; au-delà, il y reste.
--   · Inchangé, parce que l'organisation le règle elle-même : la séparation « qui approuve ne comptabilise pas »
--     (filed_comptabilisation_reglages.separation, a4_48) et le nombre d'approbations des circuits.
-- Repères dans private.filed_confirmer_fournisseur, private.filed_note_frais_approbation, private.filed_decider_trajet,
-- private.filed_rembourser_note_frais, private.filed_refuser_levee_a_confirmer (le message) et
-- private.filed_deposer_validation ; chaque pose s'arrête si son repère n'est pas trouvé une fois. Rejouable ; aucune
-- suppression.

alter table public.filed_reglages add column if not exists seconde_personne_des_ttc numeric;
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.filed_reglages'::regclass and conname = 'filed_reglages_seconde_personne_check') then
    alter table public.filed_reglages add constraint filed_reglages_seconde_personne_check
      check (seconde_personne_des_ttc is null or seconde_personne_des_ttc >= 0);
  end if;
end $$;
comment on column public.filed_reglages.seconde_personne_des_ttc is
  'a4_76 : à partir de ce montant TTC, un gérant ne décide plus seul (une seconde personne). Nul : un gérant décide toujours seul.';

-- Vrai quand p_uid est gérant de l'organisation et que le montant reste sous le seuil réglé (s'il y en a un).
create or replace function private.filed_gerant_seul(p_client uuid, p_uid uuid, p_montant numeric, p_entite uuid default null)
returns boolean language plpgsql stable security definer set search_path to '' as $$
declare v_seuil numeric;
begin
  if p_uid is null or not exists (select 1 from public.comptes c where c.client_id = p_client and c.user_id = p_uid and c.role = 'gerant') then
    return false;
  end if;
  v_seuil := (private.filed_reglage(p_client, p_entite)).seconde_personne_des_ttc;
  return v_seuil is null or abs(coalesce(p_montant, 0)) < v_seuil;
end $$;

-- Ceux qui ont saisi la facture et ne l'approuvent pas : les saisisseurs, moins un gérant sous le seuil.
create or replace function private.filed_saisisseurs_tenus(p_facture uuid)
returns uuid[] language sql stable security definer set search_path to '' as $$
  select coalesce(array_agg(u order by u), '{}')
    from public.filed_factures f, unnest(private.filed_saisisseurs(f.id)) u
   where f.id = p_facture and not private.filed_gerant_seul(f.client_id, u, f.montant_ttc, f.entite_id)
$$;

-- Le seuil, réglé par un gérant ou un admin (nul : un gérant décide toujours seul).
create or replace function private.filed_regler_seconde_personne(p_client uuid, p_des_ttc numeric)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare v_par uuid; v_id uuid;
begin
  v_par := private.filed_exiger_acteur(p_client, array['gerant', 'admin']);
  if p_des_ttc is not null and p_des_ttc < 0 then
    raise exception 'Le seuil est un montant positif, ou rien.' using errcode = '22023';
  end if;
  select r.id into v_id from public.filed_reglages r where r.client_id = p_client and r.entite_id is null;
  if v_id is null then
    raise exception 'FILED n''est pas installé pour cette organisation.' using errcode = '55000';
  end if;
  update public.filed_reglages set seconde_personne_des_ttc = p_des_ttc, maj_le = now() where id = v_id;
  perform private.filed_journaliser(p_client, 'filed.reglage.seconde_personne', 'filed_reglages', v_id::text,
    jsonb_build_object('seconde_personne_des_ttc', p_des_ttc, 'par', v_par), null);
  return jsonb_build_object('seconde_personne_des_ttc', p_des_ttc);
end $$;
create or replace function public.filed_regler_seconde_personne(p_client uuid, p_des_ttc numeric)
returns jsonb language sql set search_path to '' as $$ select private.filed_regler_seconde_personne(p_client, p_des_ttc) $$;

revoke all on function private.filed_gerant_seul(uuid, uuid, numeric, uuid) from public, anon, authenticated;
revoke all on function private.filed_saisisseurs_tenus(uuid) from public, anon, authenticated;
revoke all on function private.filed_regler_seconde_personne(uuid, numeric) from public, anon, authenticated;
revoke all on function public.filed_regler_seconde_personne(uuid, numeric) from public, anon;
grant execute on function private.filed_gerant_seul(uuid, uuid, numeric, uuid) to service_role;
grant execute on function private.filed_saisisseurs_tenus(uuid) to service_role;
grant execute on function private.filed_regler_seconde_personne(uuid, numeric) to service_role, authenticated;
grant execute on function public.filed_regler_seconde_personne(uuid, numeric) to authenticated, service_role;

-- Une pose par repère : chaque repère doit se trouver une fois exactement.
create or replace function private.filed_a4_76_poser(p_fonction text, p_ancien text, p_nouveau text)
returns void language plpgsql set search_path to '' as $$
declare v_def text := pg_get_functiondef(p_fonction::regprocedure); v_n int;
begin
  if position('a4_76' in v_def) > 0 then return; end if;
  v_n := (length(v_def) - length(replace(v_def, p_ancien, ''))) / length(p_ancien);
  if v_n <> 1 then raise exception 'a4_76 : repère de % trouvé % fois (1 attendu)', p_fonction, v_n; end if;
  execute replace(v_def, p_ancien, p_nouveau);
end $$;
revoke all on function private.filed_a4_76_poser(text, text, text) from public, anon, authenticated;

select private.filed_a4_76_poser('private.filed_confirmer_fournisseur(uuid, text)',
  E'    if v_depose_par = v_uid then\n',
  E'    if v_depose_par = v_uid\n'
  || E'       and not private.filed_gerant_seul(v_four.client_id, v_uid,   -- a4_76 : un gérant confirme seul, sous le seuil\n'
  || E'             (select f.montant_ttc from public.filed_factures f where f.document_id = v_four.document_origine order by f.cree_le limit 1)) then\n');

select private.filed_a4_76_poser('private.filed_note_frais_approbation()',
  E'and n.beneficiaire = v_uid and n.statut <> ''refusee'') then\n',
  E'and n.beneficiaire = v_uid and n.statut <> ''refusee'')\n'
  || E'     and not private.filed_gerant_seul(new.client_id, v_uid, new.montant_ttc, new.entite_id) then   -- a4_76\n');

select private.filed_a4_76_poser('private.filed_decider_trajet(uuid, boolean, text)',
  E'  if v_uid is not null and v_uid = t.beneficiaire then\n',
  E'  if v_uid is not null and v_uid = t.beneficiaire\n'
  || E'     and not private.filed_gerant_seul(t.client_id, v_uid, t.montant, t.entite_id) then   -- a4_76\n');

select private.filed_a4_76_poser('private.filed_rembourser_note_frais(uuid, date, text, text)',
  E'  if v_uid is not null and v_uid = v_n.beneficiaire then\n',
  E'  if v_uid is not null and v_uid = v_n.beneficiaire\n'
  || E'     and not private.filed_gerant_seul(v_n.client_id, v_uid,   -- a4_76\n'
  || E'           (select f.montant_ttc from public.filed_factures f where f.id = v_n.facture_id), v_n.entite_id) then\n');

select private.filed_a4_76_poser('private.filed_refuser_levee_a_confirmer()',
  E'par une autre personne que celle qui a déposé la pièce.''',
  E'par un gérant, ou par une autre personne que celle qui a déposé la pièce (a4_76).''');

select private.filed_a4_76_poser('private.filed_deposer_validation(uuid, integer, text)',
  E'''saisi_par'', to_jsonb(private.filed_saisisseurs(v_f.id))',
  E'''saisi_par'', to_jsonb(private.filed_saisisseurs_tenus(v_f.id))   /* a4_76 : un gérant sous le seuil approuve seul */');


-- ═══ omega/modules/socle/migrations/19av_decision_seule_gerant.sql @ 6752be66
-- 19av_decision_seule_gerant.sql — une seule personne suffit quand elle est gérante (ou d'un rôle que l'organisation
-- désigne). A5, 21/10/2026, décision de Teo : « pas besoin de garder la règle des deux personnes ».
--
-- Avant : le demandeur ne décidait jamais de sa propre demande (42501), sauf l'exception étroite de 19af (gérant seul
-- décideur, accords de la liste blanche) ; celui qui avait saisi une pièce ne l'approuvait pas (19c).
-- Désormais, ces deux règles ne s'appliquent pas à qui décide EN SON NOM (pas de délégation) et tient, dans
-- l'organisation, un rôle de private.roles_decision_seule(client) : « gerant » par défaut, ou la liste que le gérant
-- règle par public.regler_decision_seule (gerant, admin, valideur). Le reste du contrôle est inchangé : rôles autorisés
-- de la demande (exiger_decideur), périmètre, accès à l'objet, échéance. L'approbation garde la trace
-- « [seul décideur] » en tête de son commentaire, et le journal la reçoit comme toute approbation. Une organisation
-- qui veut deux personnes le règle par un seuil (regles_validation.approbations_requises = 2).
--
-- Pose : le corps de private.preparer_approbation est réécrit à partir de la définition en base, par deux repères qui
-- doivent s'y trouver chacun exactement une fois ; sinon le lot s'arrête sans rien changer. Rejouable : un corps qui
-- porte déjà private.decide_seul n'est pas retouché. Rien n'est supprimé.

create or replace function private.roles_decision_seule(p_client uuid) returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce((select array_agg(r order by r) from public.clients c,
                          jsonb_array_elements_text(case when jsonb_typeof(c.config -> 'decision_seule_roles') = 'array'
                                                         then c.config -> 'decision_seule_roles' else '[]'::jsonb end) r
                   where c.id = p_client and r in ('gerant', 'admin', 'valideur')),
                  array['gerant'])
$$;

-- La personne p_uid, décidant en son nom (p_au_nom_de vide), peut-elle décider seule de la demande p_d ?
create or replace function private.decide_seul(p_d public.demandes_validation, p_au_nom_de uuid, p_uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_au_nom_de is null and p_uid is not null
     and exists (select 1 from public.comptes c
                 where c.client_id = p_d.client_id and c.user_id = p_uid
                   and c.role = any (private.roles_decision_seule(p_d.client_id)))
$$;

create or replace function public.regler_decision_seule(p_client uuid, p_roles text[]) returns text[]
language plpgsql security definer set search_path = '' as $$
declare v_roles text[];
begin
  if (select auth.uid()) is not null and not private.a_un_role(p_client, array['gerant']) then
    raise exception 'Seul le gérant désigne qui peut décider seul.' using errcode = '42501';
  end if;
  select array_agg(distinct r order by r) into v_roles from unnest(coalesce(p_roles, '{}')) r;
  if v_roles is null or not (v_roles <@ array['gerant', 'admin', 'valideur']) then
    raise exception 'Rôles permis : gerant, admin, valideur.' using errcode = '22023';
  end if;
  update public.clients set config = jsonb_set(coalesce(config, '{}'::jsonb), '{decision_seule_roles}', to_jsonb(v_roles))
   where id = p_client;
  if not found then raise exception 'Organisation introuvable.' using errcode = 'P0002'; end if;
  perform private.journaliser(p_client, 'validation.decision_seule_reglee', 'client', p_client::text,
                              jsonb_build_object('roles', v_roles), null::uuid);
  return v_roles;
end $$;

do $$ declare f text; begin
  foreach f in array array['private.roles_decision_seule(uuid)',
                           'private.decide_seul(public.demandes_validation, uuid, uuid)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
  execute 'revoke all on function public.regler_decision_seule(uuid, text[]) from public, anon';
  execute 'grant execute on function public.regler_decision_seule(uuid, text[]) to authenticated, service_role';
end $$;

-- preparer_approbation : les deux règles reçoivent l'exception ; le reste du corps est inchangé.
do $lot$
declare
  d text; n integer;
  -- Repère 1 (posé par 19af) : l'exception du demandeur.
  m1 constant text := 'if private\.activation_par_seul_decideur\(v_d, new\.au_nom_de, v_uid\) then';
  r1 constant text := 'if private.activation_par_seul_decideur(v_d, new.au_nom_de, v_uid)'
                   || ' or private.decide_seul(v_d, new.au_nom_de, v_uid) then  -- 19av';
  -- Repère 2 (posé par 19c) : celui qui a saisi la pièce.
  m2 constant text := 'if jsonb_typeof\(v_d\.payload -> ''saisi_par''\) = ''array''';
  r2 constant text :=
       '-- Lot 19av : qui décide seul (gérant, ou rôle désigné) approuve aussi ce qu''il a saisi ; c''est marqué.' || chr(10)
    || '  if private.decide_seul(v_d, new.au_nom_de, v_uid)' || chr(10)
    || '     and jsonb_typeof(v_d.payload -> ''saisi_par'') = ''array'' and v_d.payload -> ''saisi_par'' ? v_uid::text' || chr(10)
    || '     and coalesce(new.commentaire, '''') not like ''[seul décideur]%'' then' || chr(10)
    || '    new.commentaire := left(''[seul décideur] '' || coalesce(new.commentaire, ''''), 2000);' || chr(10)
    || '  end if;' || chr(10)
    || '  if not private.decide_seul(v_d, new.au_nom_de, v_uid) and jsonb_typeof(v_d.payload -> ''saisi_par'') = ''array''';
begin
  select pg_get_functiondef('private.preparer_approbation()'::regprocedure) into d;
  if position('private.decide_seul' in d) > 0 then
    raise notice 'Lot 19av : preparer_approbation porte déjà l''exception, corps inchangé.';
    return;
  end if;
  select count(*) into n from regexp_matches(d, m1, 'g');
  if n <> 1 then
    raise exception 'Lot 19av, preparer_approbation : repère de 19af trouvé % fois (1 attendu) ; rien n''est changé.', n;
  end if;
  select count(*) into n from regexp_matches(d, m2, 'g');
  if n <> 1 then
    raise exception 'Lot 19av, preparer_approbation : repère de 19c (saisi_par) trouvé % fois (1 attendu) ; rien n''est changé.', n;
  end if;
  d := regexp_replace(d, m1, r1);
  d := regexp_replace(d, m2, r2);
  execute d;
end $lot$;


-- ═══ omega/modules/socle/migrations/19aw_approbation_exige_commentaire.sql @ 9d869631
-- 19aw_approbation_exige_commentaire.sql — une demande qui exige un commentaire ne s'approuve pas sans commentaire
-- (A5, 21/10/2026, TCASHD-07). Avant : demandes_validation.exige_commentaire = true était posé par preparer_demande
-- (règle de validation ou payload.exigences.commentaire), mais une approbation « approuve » sans commentaire passait
-- et la demande devenait « approuvee ».
--
-- Ce lot ajoute un déclencheur BEFORE INSERT sur public.approbations, nommé pour passer APRÈS approbations_preparer
-- (ordre alphabétique) : le repère « [seul décideur] » posé par 19af/19av ne compte pas comme commentaire.
-- Refus : 23514, en français. Le rejet n'est pas concerné (exige_motif le règle déjà).
-- Rien n'est supprimé, aucune ligne réécrite. Rejouable.

create or replace function private.approbation_exiger_commentaire() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.decision = 'approuve'
     and exists (select 1 from public.demandes_validation d where d.id = new.demande_id and d.exige_commentaire)
     and btrim(regexp_replace(coalesce(new.commentaire, ''), '^\[seul décideur\]', '')) = '' then
    raise exception 'Cette demande exige un commentaire : dites en une phrase pourquoi vous l''approuvez.' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function private.approbation_exiger_commentaire() from public, anon, authenticated;

do $do$ begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.approbations'::regclass and tgname = 'approbations_zz_exiger_commentaire') then
    create trigger approbations_zz_exiger_commentaire before insert on public.approbations
      for each row execute function private.approbation_exiger_commentaire();
  end if;
end $do$;
