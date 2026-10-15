-- b6_24 — DALIRO : le fil du chantier — photos, vocaux et messages du terrain rangés au chantier (session B6, 06/10/2026)
--
-- CE QUE ÇA AJOUTE. La réception d'A2 (v12) range désormais les messages WhatsApp avec leurs médias en pièces
-- (bucket omega-clients, `receptions.pieces` = [{nom, mime, taille, chemin}], vocal marqué `detail.media.vocal`).
-- Daliro les recevait déjà (abonnement reception.nouvelle → travail daliro.reception, b6_07) mais n'en lisait que les
-- réponses aux demandes J-2. Désormais :
--   · public.btp_messages : un message du terrain (compagnon, chef d'équipe, sous-traitant, maître d'ouvrage connus
--     de l'annuaire, ou tout message arrivé sur la boîte de Daliro), son texte, ses photos et vocaux, rattaché à un
--     chantier ;
--   · private.btp_ranger_reception : le chantier est trouvé, dans l'ordre : nommé dans le message (nom ou alias du
--     chantier) ; sinon le seul chantier où l'expéditeur (son équipe, ou son entreprise) a un passage en cours ; sinon
--     le seul où il en a un à trois jours près ; sinon « à ranger » ;
--   · portes : btp_ranger_message (à la main), btp_ecarter_message, btp_avenant_depuis_message (un avenant brouillon
--     dont l'origine est le message : « signé avant exécution » commence là), btp_fil_chantier et btp_messages_a_ranger
--     (l'écran). Les réponses J-2 sans pièce restent lues par b6_07 et ne sont pas recopiées.
--   · private.btp_ouvrier : le travail daliro.reception lit la réponse J-2 (b6_07) puis range le message.
-- La LECTURE du contenu (transcription des vocaux, description des photos, travaux supplémentaires repérés) est
-- l'affaire du lecteur d'A1 : contrat à poser ensuite (omega/CONTRAT-DALIRO-MEDIAS.md). Rien ici n'appelle d'IA.
--
-- Règles de pose : create … if not exists / create or replace ; rien n'est retiré ni effacé.

create table if not exists public.btp_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  reception_id bigint not null,
  chantier_id uuid,
  entite_id uuid,
  canal text not null,
  de_nom text,
  de_adresse text,
  intervenant_id uuid,
  tiers_id uuid,
  texte text,
  pieces jsonb not null default '[]'::jsonb,
  rangement text,
  statut text not null default 'a_ranger',
  avenant_id uuid,
  motif text,
  recu_le timestamptz not null,
  range_par uuid,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint btp_messages_client_id_id_key unique (client_id, id),
  constraint btp_messages_une_reception unique (client_id, reception_id),
  constraint btp_messages_chantier_fkey foreign key (client_id, chantier_id) references public.btp_chantiers(client_id, id) on delete set null (chantier_id),
  constraint btp_messages_intervenant_fkey foreign key (client_id, intervenant_id) references public.btp_intervenants(client_id, id) on delete set null (intervenant_id),
  constraint btp_messages_tiers_fkey foreign key (client_id, tiers_id) references public.btp_tiers(client_id, id) on delete set null (tiers_id),
  constraint btp_messages_avenant_fkey foreign key (client_id, avenant_id) references public.btp_avenants(client_id, id) on delete set null (avenant_id),
  constraint btp_messages_statut_check check (statut in ('a_ranger', 'range', 'ecarte')),
  constraint btp_messages_rangement_check check (rangement is null or rangement in ('nom', 'passage', 'passage_proche', 'manuel')),
  constraint btp_messages_range_check check (statut <> 'range' or chantier_id is not null),
  constraint btp_messages_texte_check check (char_length(texte) <= 4000),
  constraint btp_messages_motif_check check (char_length(motif) <= 300)
);
comment on table public.btp_messages is 'DALIRO — messages du terrain (texte, photos, vocaux) rangés au chantier. Écrite par le serveur et les portes.';
create index if not exists btp_messages_chantier_idx on public.btp_messages (chantier_id, recu_le desc);
create index if not exists btp_messages_a_ranger_idx on public.btp_messages (client_id, statut) where statut = 'a_ranger';
alter table public.btp_messages enable row level security;
do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'btp_messages' and policyname = 'membres lisent les messages de leurs chantiers') then
    create policy "membres lisent les messages de leurs chantiers" on public.btp_messages
      for select to authenticated
      using (client_id in (select private.mes_clients())
             and (case when entite_id is null then private.a_un_role(client_id, array['gerant', 'admin', 'valideur', 'collaborateur'])
                       else private.voit_entite(client_id, entite_id) end));
  end if;
end $do$;
revoke all on table public.btp_messages from anon, authenticated;
grant select on table public.btp_messages to authenticated;
do $do$ begin
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom) select x from unnest(array['btp_messages']) x
               where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then raise notice 'tables_locataires : % (à inscrire à la main)', sqlerrm; end;
  end if;
end $do$;

-- ─────────────────────────────────────────────────────────────────────────
-- Ranger une réception
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.btp_chiffres(p text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$ select nullif(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '') $function$;

create or replace function private.btp_ranger_reception(p_reception bigint)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r public.receptions;
  i public.btp_intervenants;
  v_tiers uuid;
  v_texte text;
  v_norm text;
  v_chiffres text;
  v_jour date;
  v_chantiers uuid[];
  v_chantier uuid;
  v_rangement text;
  v_pieces jsonb;
  v_vocal boolean;
  v_id uuid;
begin
  select * into r from public.receptions where id = p_reception;
  if not found then
    return jsonb_build_object('ignore', 'réception absente');
  end if;
  if r.canal not in ('whatsapp', 'sms', 'email') then
    return jsonb_build_object('ignore', 'canal hors terrain');
  end if;
  if exists (select 1 from public.btp_messages m where m.client_id = r.client_id and m.reception_id = r.id) then
    return jsonb_build_object('ignore', 'déjà rangée');
  end if;
  -- Une réponse J-2 sans pièce est lue par btp_lire_reponse (b6_07) : rien à ranger de plus.
  if jsonb_array_length(coalesce(r.pieces, '[]'::jsonb)) = 0 and r.en_reponse_a is not null
     and exists (select 1 from public.envois e where e.id = r.en_reponse_a and e.module = 'daliro' and e.cle_idempotence like 'daliro:j2:%') then
    return jsonb_build_object('ignore', 'réponse J-2');
  end if;

  -- L'expéditeur : un intervenant (numéro), sinon un tiers (numéro ou adresse).
  v_chiffres := private.btp_chiffres(r.de_adresse);
  if v_chiffres is not null and char_length(v_chiffres) >= 9 then
    select * into i from public.btp_intervenants x
    where x.client_id = r.client_id and x.actif and right(private.btp_chiffres(x.telephone), 9) = right(v_chiffres, 9)
    order by x.cree_le limit 1;
    if i.id is null then
      select t.id into v_tiers from public.btp_tiers t
      where t.client_id = r.client_id and t.actif and right(private.btp_chiffres(t.telephone), 9) = right(v_chiffres, 9)
      order by t.cree_le limit 1;
    end if;
  end if;
  if i.id is null and v_tiers is null and r.de_adresse like '%@%' then
    select t.id into v_tiers from public.btp_tiers t
    where t.client_id = r.client_id and t.actif and lower(t.email) = lower(btrim(r.de_adresse))
    order by t.cree_le limit 1;
  end if;
  if i.id is null and v_tiers is null and coalesce(r.module, '') <> 'daliro' then
    return jsonb_build_object('ignore', 'expéditeur inconnu de l''annuaire');
  end if;

  v_texte := left(coalesce(nullif(btrim(r.corps), ''),
                           btrim(regexp_replace(regexp_replace(coalesce(r.corps_html, ''), '<(br|/p|/div)[^>]*>', E'\n', 'gi'), '<[^>]+>', ' ', 'g'))), 4000);
  v_norm := ' ' || private.btp_normaliser(coalesce(r.sujet, '') || ' ' || coalesce(v_texte, '')) || ' ';
  v_jour := (r.recu_le at time zone 'Europe/Paris')::date;

  -- 1. Le chantier nommé dans le message (nom ou alias, au moins 4 caractères).
  select array_agg(distinct c.id) into v_chantiers
  from public.btp_chantiers c
  where c.client_id = r.client_id and c.statut in ('preparation', 'ouvert', 'suspendu', 'receptionne')
    and exists (select 1 from unnest(array[c.nom] || c.alias) n
                where char_length(private.btp_normaliser(n)) >= 4 and v_norm like '% ' || private.btp_normaliser(n) || ' %');
  if cardinality(v_chantiers) = 1 then
    v_chantier := v_chantiers[1];
    v_rangement := 'nom';
  end if;

  -- 2. Le chantier du passage en cours de l'expéditeur ; 3. à trois jours près.
  if v_chantier is null and (i.id is not null or v_tiers is not null) then
    select array_agg(distinct p.chantier_id) into v_chantiers
    from public.btp_passages p join public.btp_chantiers c on c.id = p.chantier_id
    where p.client_id = r.client_id and p.statut <> 'annule' and p.remplace_par_id is null
      and c.statut in ('ouvert', 'suspendu')
      and ((i.id is not null and (p.equipe_id = i.equipe_id or p.equipe_id in (select e.id from public.btp_equipes e where e.chef_id = i.id)))
           or (v_tiers is not null and p.tiers_id = v_tiers))
      and v_jour between p.debut and p.fin;
    if cardinality(v_chantiers) = 1 then
      v_chantier := v_chantiers[1];
      v_rangement := 'passage';
    else
      select array_agg(distinct p.chantier_id) into v_chantiers
      from public.btp_passages p join public.btp_chantiers c on c.id = p.chantier_id
      where p.client_id = r.client_id and p.statut <> 'annule' and p.remplace_par_id is null
        and c.statut in ('ouvert', 'suspendu')
        and ((i.id is not null and (p.equipe_id = i.equipe_id or p.equipe_id in (select e.id from public.btp_equipes e where e.chef_id = i.id)))
             or (v_tiers is not null and p.tiers_id = v_tiers))
        and v_jour between p.debut - 3 and p.fin + 3;
      if cardinality(v_chantiers) = 1 then
        v_chantier := v_chantiers[1];
        v_rangement := 'passage_proche';
      end if;
    end if;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('nom', x ->> 'nom', 'mime', x ->> 'mime', 'taille', x -> 'taille', 'chemin', x ->> 'chemin',
                                               'vocal', coalesce((r.detail -> 'media' ->> 'vocal')::boolean, false)
                                                        and coalesce(x ->> 'mime', '') like 'audio/%')), '[]'::jsonb)
    into v_pieces
  from jsonb_array_elements(coalesce(r.pieces, '[]'::jsonb)) x
  where x ->> 'chemin' is not null;
  v_vocal := exists (select 1 from jsonb_array_elements(v_pieces) x where (x ->> 'vocal')::boolean);

  insert into public.btp_messages (client_id, reception_id, chantier_id, entite_id, canal, de_nom, de_adresse, intervenant_id, tiers_id,
                                   texte, pieces, rangement, statut, recu_le)
  values (r.client_id, r.id, v_chantier, (select c.entite_id from public.btp_chantiers c where c.id = v_chantier), r.canal,
          left(coalesce((select x.nom from public.btp_intervenants x where x.id = i.id), (select t.nom from public.btp_tiers t where t.id = v_tiers), r.de_nom), 200),
          left(r.de_adresse, 200), i.id, v_tiers, v_texte, v_pieces, v_rangement,
          case when v_chantier is null then 'a_ranger' else 'range' end, r.recu_le)
  on conflict on constraint btp_messages_une_reception do nothing
  returning id into v_id;
  return jsonb_build_object('message', v_id, 'chantier', v_chantier, 'rangement', coalesce(v_rangement, 'a_ranger'),
                            'pieces', jsonb_array_length(v_pieces), 'vocal', v_vocal);
end $function$;

-- L'ouvrier de Daliro (b6_07) : la réponse J-2, puis le rangement.
create or replace function private.btp_ouvrier(p_nombre integer default 20)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  t public.travaux;
  v_res jsonb;
  v_rang jsonb;
  v_faits integer := 0;
  v_rendus integer := 0;
  v_ignores integer := 0;
begin
  for t in
    select * from private.prendre_travaux(array['daliro.confirmation', 'daliro.reception'], p_nombre, interval '5 minutes', 'daliro-base')
  loop
    begin
      if t.genre = 'daliro.confirmation' then
        v_res := private.btp_envoyer_demande(t);
      else
        v_res := case when (t.charge ->> 'reception') ~ '^[0-9]+$' and t.charge ->> 'en_reponse_a' is not null
                      then private.btp_lire_reponse((t.charge ->> 'reception')::bigint)
                      else jsonb_build_object('ignore', 'ne répond à aucun envoi') end;
        if (t.charge ->> 'reception') ~ '^[0-9]+$' then
          v_rang := private.btp_ranger_reception((t.charge ->> 'reception')::bigint);
          v_res := v_res || jsonb_build_object('fil', v_rang);
          if v_rang ? 'message' then
            v_res := v_res - 'ignore';
          end if;
        end if;
      end if;
      perform private.finir_travail(t.id, v_res);
      if v_res ? 'ignore' then v_ignores := v_ignores + 1; else v_faits := v_faits + 1; end if;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 300), true);
      v_rendus := v_rendus + 1;
    end;
  end loop;
  begin
    perform private.battre_ouvrier('daliro', array['daliro.confirmation', 'daliro.reception'],
      jsonb_build_object('faits', v_faits, 'rendus', v_rendus, 'ignores', v_ignores), interval '15 minutes');
  exception when others then
    raise notice 'battre_ouvrier : %', sqlerrm;
  end;
  return jsonb_build_object('faits', v_faits, 'rendus', v_rendus, 'ignores', v_ignores);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Les portes du bureau
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.btp_exiger_fil(p_client uuid)
 returns void
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
begin
  if private.btp_est_serveur() then
    return;
  end if;
  if (select auth.uid()) is null or not private.a_un_role(p_client, array['gerant', 'admin', 'valideur', 'collaborateur']) then
    raise exception 'Le fil des chantiers ne vous est pas ouvert.' using errcode = '42501';
  end if;
end $function$;

create or replace function public.btp_ranger_message(p_message uuid, p_chantier uuid)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  m public.btp_messages;
  c public.btp_chantiers;
begin
  select * into m from public.btp_messages where id = p_message for update;
  if not found then
    raise exception 'Message introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_fil(m.client_id);
  select * into c from public.btp_chantiers where id = p_chantier and client_id = m.client_id;
  if not found then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  if not private.btp_est_serveur() and not private.voit_entite(c.client_id, c.entite_id) then
    raise exception 'Ce chantier ne vous est pas ouvert.' using errcode = '42501';
  end if;
  update public.btp_messages set chantier_id = c.id, entite_id = c.entite_id, statut = 'range', rangement = 'manuel',
         range_par = (select auth.uid()), maj_le = now()
  where id = m.id;
  perform private.journaliser(m.client_id, 'daliro.message_range', 'btp_messages', m.id::text,
    jsonb_build_object('chantier', c.id, 'avant', m.chantier_id), c.entite_id);
end $function$;

create or replace function public.btp_ecarter_message(p_message uuid, p_motif text default null)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  m public.btp_messages;
begin
  select * into m from public.btp_messages where id = p_message for update;
  if not found then
    raise exception 'Message introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_fil(m.client_id);
  if m.entite_id is not null and not private.btp_est_serveur() and not private.voit_entite(m.client_id, m.entite_id) then
    raise exception 'Ce chantier ne vous est pas ouvert.' using errcode = '42501';
  end if;
  update public.btp_messages set statut = 'ecarte', motif = left(nullif(btrim(p_motif), ''), 300), range_par = (select auth.uid()), maj_le = now()
  where id = m.id;
end $function$;

-- Le travail supplémentaire vu sur place devient un avenant brouillon, avec le message pour origine.
create or replace function public.btp_avenant_depuis_message(p_message uuid, p_objet text)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  m public.btp_messages;
  v_avenant uuid;
begin
  select * into m from public.btp_messages where id = p_message for update;
  if not found then
    raise exception 'Message introuvable.' using errcode = 'P0002';
  end if;
  if m.chantier_id is null then
    raise exception 'Rangez d''abord le message à son chantier.' using errcode = '23514';
  end if;
  if m.avenant_id is not null then
    raise exception 'Ce message a déjà son avenant.' using errcode = '23514';
  end if;
  v_avenant := private.btp_ouvrir_avenant(m.chantier_id, coalesce(nullif(btrim(p_objet), ''), left(m.texte, 500), 'Travail supplémentaire signalé du chantier'),
    jsonb_build_object('canal', case when exists (select 1 from jsonb_array_elements(m.pieces) x where (x ->> 'vocal')::boolean) then 'vocal'
                                     when jsonb_array_length(m.pieces) > 0 then 'photo' else m.canal end,
                       'auteur', m.de_nom, 'date', (m.recu_le at time zone 'Europe/Paris')::date, 'texte', left(m.texte, 1000),
                       'message', m.id, 'reception', m.reception_id, 'pieces', m.pieces));
  update public.btp_messages set avenant_id = v_avenant, maj_le = now() where id = m.id;
  return v_avenant;
end $function$;

-- L'écran : le fil d'un chantier, et les messages à ranger.
create or replace function public.btp_fil_chantier(p_chantier uuid, p_nombre integer default 50)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  c public.btp_chantiers;
begin
  select * into c from public.btp_chantiers where id = p_chantier;
  if not found then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  if not private.btp_est_serveur() and ((select auth.uid()) is null or c.client_id not in (select private.mes_clients())
                                       or not private.voit_entite(c.client_id, c.entite_id)) then
    raise exception 'Ce chantier ne vous est pas ouvert.' using errcode = '42501';
  end if;
  return (select coalesce(jsonb_agg(to_jsonb(m) - 'client_id' - 'entite_id' order by m.recu_le desc), '[]'::jsonb)
          from (select * from public.btp_messages x where x.chantier_id = c.id and x.statut = 'range'
                order by x.recu_le desc limit greatest(1, least(coalesce(p_nombre, 50), 200))) m);
end $function$;

create or replace function public.btp_messages_a_ranger(p_client uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
begin
  perform private.btp_exiger_fil(p_client);
  if not private.btp_est_serveur() and p_client not in (select private.mes_clients()) then
    raise exception 'Cette organisation ne vous est pas ouverte.' using errcode = '42501';
  end if;
  return (select coalesce(jsonb_agg(to_jsonb(m) - 'client_id' order by m.recu_le desc), '[]'::jsonb)
          from (select * from public.btp_messages x where x.client_id = p_client and x.statut = 'a_ranger' order by x.recu_le desc limit 100) m);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Droits (à inscrire dans omega/a5_01_liste_figee.txt)
-- ─────────────────────────────────────────────────────────────────────────
revoke execute on function private.btp_chiffres(text) from public, anon, authenticated;
revoke execute on function private.btp_ranger_reception(bigint) from public, anon, authenticated;
revoke execute on function private.btp_ouvrier(integer) from public, anon, authenticated;
revoke execute on function private.btp_exiger_fil(uuid) from public, anon, authenticated;
grant execute on function private.btp_chiffres(text) to service_role;
grant execute on function private.btp_ranger_reception(bigint) to service_role;
grant execute on function private.btp_ouvrier(integer) to service_role;
grant execute on function private.btp_exiger_fil(uuid) to service_role;
revoke execute on function public.btp_ranger_message(uuid, uuid) from public, anon;
revoke execute on function public.btp_ecarter_message(uuid, text) from public, anon;
revoke execute on function public.btp_avenant_depuis_message(uuid, text) from public, anon;
revoke execute on function public.btp_fil_chantier(uuid, integer) from public, anon;
revoke execute on function public.btp_messages_a_ranger(uuid) from public, anon;
grant execute on function public.btp_ranger_message(uuid, uuid) to authenticated, service_role;
grant execute on function public.btp_ecarter_message(uuid, text) to authenticated, service_role;
grant execute on function public.btp_avenant_depuis_message(uuid, text) to authenticated, service_role;
grant execute on function public.btp_fil_chantier(uuid, integer) to authenticated, service_role;
grant execute on function public.btp_messages_a_ranger(uuid) to authenticated, service_role;
