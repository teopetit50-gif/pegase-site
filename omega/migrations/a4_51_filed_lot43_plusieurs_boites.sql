-- FILED, lot 43 (a4_51) — plusieurs boîtes de réception par organisation, et la limite du palier (Teo, 18/10 ;
-- chiffrage n° 23 : « une boîte mail connectée » / « deux boîtes » / « boîtes mail illimitées »).
--
-- Les boîtes sont celles du socle (public.expediteurs, canal email, module filed ; A2 les crée). Le socle n'admet qu'un
-- expéditeur ACTIF par organisation, canal et module (expediteurs_un_actif_idx) : c'est l'identité d'envoi. Une boîte
-- qui ne fait que recevoir reste donc non active (« a_verifier ») ; public.resoudre_boite la trouve quel que soit son
-- statut. FILED n'exige aucun statut à la déclaration et tient la liste :
--   · public.filed_boites : chaque boîte FILED déclarée, la société où ses factures sont rangées, un libellé ;
--   · la limite du palier (filed_paliers.boites, a4_50) s'applique à la déclaration ; sans abonnement, pas de limite ;
--   · le rattachement d'un courriel (private.filed_rattacher_reception, a4_20) range les pièces dans la société de la
--     boîte qui l'a reçu (une société donnée par la réception elle-même passe avant ; sinon la société principale) ;
--   · une boîte non déclarée continue de recevoir comme avant : aucune facture n'est perdue, l'état le signale.
-- Portes : filed_declarer_boite, filed_retirer_boite (gérant, admin) ; filed_boites_etat (gérant, admin, valideur).
-- Branchement par repère. Migration idempotente ; aucun DROP, aucune suppression ; aucun envoi.

create table if not exists public.filed_boites (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients(id) on delete cascade,
  expediteur_id uuid not null unique references public.expediteurs(id) on delete cascade,
  entite_id     uuid references public.entites(id) on delete set null,
  libelle       text check (libelle is null or char_length(libelle) <= 120),
  actif         boolean not null default true,
  declaree_par  uuid,
  cree_le       timestamptz not null default now(),
  maj_le        timestamptz not null default now()
);
comment on table public.filed_boites is
  'Lot 43 (a4_51) : les boîtes de réception FILED de l''organisation (expéditeurs du socle, canal email) et la société où leurs factures sont rangées.';
alter table public.filed_boites enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_boites' and policyname = 'filed_boites_lecture') then
    create policy filed_boites_lecture on public.filed_boites for select to authenticated using (client_id in (select private.mes_clients()));
  end if;
end $$;
revoke all on table public.filed_boites from anon, authenticated;
grant select on public.filed_boites to authenticated;
grant all on public.filed_boites to service_role;
create or replace trigger filed_boites_maj_le before update on public.filed_boites for each row execute function private.filed_lot4_maj_le();
insert into private.tables_locataires (nom, ordre_effacement, note)
select 'filed_boites', 36, 'FILED, lot 43' where not exists (select 1 from private.tables_locataires where nom = 'filed_boites');

-- La société d'une boîte déclarée, par son adresse (comme le socle résout une boîte).
create or replace function private.filed_entite_de_boite(p_client uuid, p_boite text)
returns uuid language sql stable security definer set search_path to '' as $$
  select b.entite_id from public.filed_boites b join public.expediteurs e on e.id = b.expediteur_id
   where b.client_id = p_client and b.actif and lower(e.identite) = lower(p_boite) limit 1
$$;
revoke all on function private.filed_entite_de_boite(uuid, text) from public, anon, authenticated;
grant execute on function private.filed_entite_de_boite(uuid, text) to service_role;

create or replace function private.filed_declarer_boite(p_client uuid, p_expediteur uuid, p_entite uuid default null, p_libelle text default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_par uuid; v_e public.expediteurs; v_p public.filed_paliers; v_n integer; v_id uuid;
begin
  v_par := private.filed_exiger_acteur(p_client, array['gerant', 'admin']);
  select * into v_e from public.expediteurs e where e.id = p_expediteur and e.client_id = p_client;
  if not found or v_e.canal <> 'email' or v_e.module is distinct from 'filed' then
    raise exception 'Cette boîte n''est pas une boîte de réception FILED de l''organisation.' using errcode = '22023';
  end if;
  if p_entite is not null and not exists (select 1 from public.entites x where x.id = p_entite and x.client_id = p_client) then
    raise exception 'La société n''est pas à cette organisation.' using errcode = '22023';
  end if;
  v_p := private.filed_palier_du(p_client, current_date);
  select count(*) into v_n from public.filed_boites b where b.client_id = p_client and b.actif and b.expediteur_id <> p_expediteur;
  if v_p.boites is not null and v_n >= v_p.boites then
    raise exception 'Le palier % permet % boîte(s) ; retirez-en une ou changez de palier.', v_p.libelle, v_p.boites using errcode = '55000';
  end if;
  insert into public.filed_boites (client_id, expediteur_id, entite_id, libelle, declaree_par)
  values (p_client, p_expediteur, p_entite, left(nullif(btrim(p_libelle), ''), 120), v_par)
  on conflict (expediteur_id) do update set entite_id = excluded.entite_id, libelle = excluded.libelle, actif = true, declaree_par = excluded.declaree_par
  returning id into v_id;
  perform private.filed_journaliser(p_client, 'filed.boite.declaree', 'filed_boite', v_id::text,
    jsonb_build_object('adresse', v_e.identite, 'entite', p_entite));
  return v_id;
end $$;
revoke all on function private.filed_declarer_boite(uuid, uuid, uuid, text) from public, anon;
grant execute on function private.filed_declarer_boite(uuid, uuid, uuid, text) to authenticated, service_role;
create or replace function public.filed_declarer_boite(p_client uuid, p_expediteur uuid, p_entite uuid default null, p_libelle text default null)
returns uuid language sql set search_path to '' as $$ select private.filed_declarer_boite(p_client, p_expediteur, p_entite, p_libelle) $$;
comment on function public.filed_declarer_boite(uuid, uuid, uuid, text) is
  'Lot 43 (a4_51) : déclare une boîte de réception FILED (expéditeur du socle) et la société où ranger ses factures, dans la limite du palier. Gérant ou admin.';
revoke all on function public.filed_declarer_boite(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.filed_declarer_boite(uuid, uuid, uuid, text) to authenticated, service_role;

create or replace function private.filed_retirer_boite(p_boite uuid)
returns void language plpgsql security definer set search_path to '' as $$
declare v_b public.filed_boites;
begin
  select * into v_b from public.filed_boites where id = p_boite for update;
  if not found then raise exception 'Boîte introuvable.' using errcode = 'P0002'; end if;
  perform private.filed_exiger_acteur(v_b.client_id, array['gerant', 'admin']);
  update public.filed_boites set actif = false where id = p_boite;
  perform private.filed_journaliser(v_b.client_id, 'filed.boite.retiree', 'filed_boite', v_b.id::text, jsonb_build_object('expediteur', v_b.expediteur_id));
end $$;
revoke all on function private.filed_retirer_boite(uuid) from public, anon;
grant execute on function private.filed_retirer_boite(uuid) to authenticated, service_role;
create or replace function public.filed_retirer_boite(p_boite uuid)
returns void language sql set search_path to '' as $$ select private.filed_retirer_boite(p_boite) $$;
comment on function public.filed_retirer_boite(uuid) is
  'Lot 43 (a4_51) : retire une boîte de la liste FILED (elle compte de nouveau hors limite ; ses courriels sont rangés dans la société principale). Gérant ou admin.';
revoke all on function public.filed_retirer_boite(uuid) from public, anon;
grant execute on function public.filed_retirer_boite(uuid) to authenticated, service_role;

create or replace function private.filed_boites_etat(p_client uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare v_p public.filed_paliers; v_n integer; v_liste jsonb;
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur']);
  v_p := private.filed_palier_du(p_client, current_date);
  select count(*) into v_n from public.filed_boites b where b.client_id = p_client and b.actif;
  select coalesce(jsonb_agg(jsonb_build_object('expediteur', e.id, 'adresse', e.identite, 'statut', e.statut,
           'declaree', coalesce(b.actif, false), 'boite', b.id, 'societe', b.entite_id,
           'societe_nom', (select x.nom from public.entites x where x.id = b.entite_id), 'libelle', b.libelle) order by e.cree_le), '[]'::jsonb)
    into v_liste
    from public.expediteurs e left join public.filed_boites b on b.expediteur_id = e.id
   where e.client_id = p_client and e.module = 'filed' and e.canal = 'email';
  return jsonb_build_object('palier', v_p.code, 'limite', v_p.boites, 'declarees', v_n,
    'non_declarees', (select count(*) from jsonb_array_elements(v_liste) x where not (x ->> 'declaree')::boolean),
    'boites', v_liste);
end $$;
revoke all on function private.filed_boites_etat(uuid) from public, anon;
grant execute on function private.filed_boites_etat(uuid) to authenticated, service_role;
create or replace function public.filed_boites_etat(p_client uuid)
returns jsonb language sql stable set search_path to '' as $$ select private.filed_boites_etat(p_client) $$;
comment on function public.filed_boites_etat(uuid) is
  'Lot 43 (a4_51) : les boîtes FILED de l''organisation (déclarées ou non, statut, société), la limite du palier. Gérant, admin, valideur.';
revoke all on function public.filed_boites_etat(uuid) from public, anon;
grant execute on function public.filed_boites_etat(uuid) to authenticated, service_role;

-- Le rattachement d'un courriel range ses pièces dans la société de la boîte (texte d'a4_20, par repère).
do $do$
declare
  v_def text;
  v_ancien text := $o$(case when r.entite_id is null then x.principale else x.id = r.entite_id end)$o$;
  v_nouveau text := $n$(case when coalesce(r.entite_id, private.filed_entite_de_boite(r.client_id, r.boite)) is null then x.principale   -- a4_51 : la société de la boîte
                else x.id = coalesce(r.entite_id, private.filed_entite_de_boite(r.client_id, r.boite)) end)$n$;
begin
  v_def := pg_get_functiondef('private.filed_rattacher_reception(bigint)'::regprocedure);
  if position('private.filed_entite_de_boite(r.client_id, r.boite)' in v_def) > 0 then
    raise notice 'a4_51 : private.filed_rattacher_reception déjà branchée.';
    return;
  end if;
  if (length(v_def) - length(replace(v_def, v_ancien, ''))) / length(v_ancien) <> 1 then
    raise exception 'a4_51 : le repère attendu n''est pas une fois et une seule dans private.filed_rattacher_reception. Rien n''est posé.';
  end if;
  execute replace(v_def, v_ancien, v_nouveau);
  raise notice 'a4_51 : private.filed_rattacher_reception branchée.';
end $do$;
