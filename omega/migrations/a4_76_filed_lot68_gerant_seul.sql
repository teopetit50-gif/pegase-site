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
