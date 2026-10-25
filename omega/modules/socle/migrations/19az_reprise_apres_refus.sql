-- 19az_reprise_apres_refus.sql — le socle de la « reprise après refus par le moteur » (A5, 25/10/2026 ; décision de
-- Teo du 23/10, 15 h 05 Z, NOTES-COORDINATEUR). Quand une demande est refusée, son moteur relit la consigne (motif et
-- commentaire du refus) et repropose UNE demande corrigée, liée à la refusée. Le socle pose :
--   · private.reprises : la file des reprises à faire, une ligne par demande refusée (unique), avec la consigne ;
--   · un déclencheur AFTER INSERT sur public.approbations (decision = 'rejete'), nommé pour passer après
--     approbations_appliquer : si la demande est passée « rejetee » et n'est pas elle-même une reprise, la consigne
--     est déposée (motif ; commentaire ; sans commentaire, le motif seul fait consigne) ;
--   · private.reprises_a_faire(module) : ce que le cron d'un moteur doit traiter ;
--   · private.proposer_reprise(refusee, resume, payload, corrections, montant) : la nouvelle demande « en_attente »,
--     au nom du moteur (jamais du valideur), même client, module, type, objet, entité ; payload.reprise_de = id de la
--     refusée, payload.corrections = [{champ, avant, apres}] (au moins une), payload.consigne ; résumé préfixé
--     « Reprise après refus — » ; le circuit est recalculé par preparer_demande sur le même module et type ;
--   · private.reprise_impossible(refusee, motif) : pas de demande ; note au journal de la refusée et avis au client ;
--   · garde-fous : une seule reprise par demande refusée (index unique sur payload.reprise_de) ; une reprise refusée
--     ne relance rien (elle revient au demandeur).
-- Rien ne part et rien ne s'exécute sans une nouvelle validation humaine. Rien n'est supprimé. Rejouable.

create table if not exists private.reprises (
  demande_id  uuid primary key references public.demandes_validation(id) on delete cascade,
  client_id   uuid not null,
  module      text not null,
  consigne    jsonb not null,
  statut      text not null default 'a_faire' check (statut in ('a_faire', 'proposee', 'impossible')),
  reprise_id  uuid,
  motif       text,
  cree_le     timestamptz not null default now(),
  traite_le   timestamptz
);
comment on table private.reprises is 'Lot 19az : la file des reprises après refus, une par demande refusée ; la consigne vient du refus.';
create index if not exists reprises_a_faire on private.reprises (module, cree_le) where statut = 'a_faire';
revoke all on table private.reprises from public, anon, authenticated;
grant select on table private.reprises to service_role;

create unique index if not exists demandes_validation_une_reprise
  on public.demandes_validation ((payload ->> 'reprise_de')) where payload ? 'reprise_de';

create or replace function private.reprise_deposer() returns trigger
language plpgsql security definer set search_path = '' as $$
declare d public.demandes_validation;
begin
  if new.decision <> 'rejete' then return null; end if;
  select * into d from public.demandes_validation x where x.id = new.demande_id;
  if d.id is null or d.statut <> 'rejetee' then return null; end if;
  if d.payload ? 'reprise_de' then return null; end if;   -- une reprise refusée revient au demandeur : pas de boucle
  insert into private.reprises (demande_id, client_id, module, consigne)
  values (d.id, d.client_id, d.module, jsonb_strip_nulls(jsonb_build_object(
            'motif', nullif(btrim(to_jsonb(new) ->> 'motif'), ''),
            'commentaire', nullif(btrim(regexp_replace(coalesce(new.commentaire, ''), '^\[seul décideur\]', '')), ''),
            'piece_id', to_jsonb(new) ->> 'piece_id',
            'refuse_par', new.user_id, 'refuse_le', coalesce(new.decide_le, now()))))
  on conflict (demande_id) do nothing;
  return null;
end $$;
revoke all on function private.reprise_deposer() from public, anon, authenticated;

do $do$ begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.approbations'::regclass and tgname = 'approbations_zz_reprise') then
    create trigger approbations_zz_reprise after insert on public.approbations
      for each row execute function private.reprise_deposer();
  end if;
end $do$;

create or replace function private.reprises_a_faire(p_module text)
returns table (demande_id uuid, client_id uuid, consigne jsonb, cree_le timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.demande_id, r.client_id, r.consigne, r.cree_le from private.reprises r
  where r.module = p_module and r.statut = 'a_faire' order by r.cree_le
$$;

create or replace function private.proposer_reprise(p_refusee uuid, p_resume text, p_payload jsonb, p_corrections jsonb,
                                                    p_montant numeric default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare r private.reprises; d public.demandes_validation; v_id uuid; c jsonb;
begin
  select * into r from private.reprises x where x.demande_id = p_refusee for update;
  if r.demande_id is null then
    raise exception 'Aucune reprise à faire pour cette demande.' using errcode = 'P0002';
  end if;
  if r.statut <> 'a_faire' then
    raise exception 'Une seule reprise par demande refusée : celle-ci est déjà %.', r.statut using errcode = '23505';
  end if;
  select * into d from public.demandes_validation x where x.id = p_refusee;
  if jsonb_typeof(p_corrections) <> 'array' or jsonb_array_length(p_corrections) = 0 then
    raise exception 'Une reprise dit ce qu''elle corrige : au moins une correction (champ, avant, apres). Sinon, reprise_impossible.'
      using errcode = '22023';
  end if;
  for c in select * from jsonb_array_elements(p_corrections) loop
    if jsonb_typeof(c) <> 'object' or not (c ? 'champ' and c ? 'avant' and c ? 'apres') then
      raise exception 'Chaque correction porte champ, avant et apres.' using errcode = '22023';
    end if;
    if (c -> 'avant') is not distinct from (c -> 'apres') then
      raise exception 'La correction de « % » ne change rien : même résultat qu''avant.', c ->> 'champ' using errcode = '22023';
    end if;
  end loop;
  insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, montant,
                                          devise, payload, echeance, cle_idempotence)
  values (d.client_id, d.entite_id, d.module, d.type_action, d.objet_type, d.objet_id,
          left('Reprise après refus — ' || coalesce(nullif(btrim(p_resume), ''), d.resume), 500),
          coalesce(p_montant, d.montant), d.devise,
          coalesce(p_payload, d.payload) - 'reprise_de' - 'corrections' - 'consigne'
            || jsonb_build_object('reprise_de', d.id, 'corrections', p_corrections, 'consigne', r.consigne),
          null, left('reprise:' || d.id::text, 200))
  returning id into v_id;
  update private.reprises set statut = 'proposee', reprise_id = v_id, traite_le = now() where demande_id = p_refusee;
  perform private.journaliser(d.client_id, 'validation.reprise_proposee', 'demande', d.id::text,
    jsonb_build_object('reprise', v_id, 'corrections', jsonb_array_length(p_corrections)), d.entite_id);
  return v_id;
end $$;

create or replace function private.reprise_impossible(p_refusee uuid, p_motif text) returns void
language plpgsql security definer set search_path = '' as $$
declare r private.reprises;
begin
  select * into r from private.reprises x where x.demande_id = p_refusee for update;
  if r.demande_id is null or r.statut <> 'a_faire' then
    raise exception 'Aucune reprise à faire pour cette demande.' using errcode = 'P0002';
  end if;
  update private.reprises set statut = 'impossible', motif = left(coalesce(nullif(btrim(p_motif), ''), 'sans motif'), 500),
         traite_le = now() where demande_id = p_refusee;
  perform private.journaliser(r.client_id, 'validation.reprise_impossible', 'demande', p_refusee::text,
    jsonb_build_object('motif', p_motif), null::uuid);
  insert into public.alertes (client_id, interne, niveau, source, titre, detail)
  values (r.client_id, false, 'info', r.module,
          left('Reprise impossible : ' || coalesce(nullif(btrim(p_motif), ''), 'le moteur ne peut pas corriger cette demande'), 200),
          jsonb_build_object('demande', p_refusee));
end $$;

do $$ declare f text; begin
  foreach f in array array['private.reprises_a_faire(text)',
                           'private.proposer_reprise(uuid, text, jsonb, jsonb, numeric)',
                           'private.reprise_impossible(uuid, text)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
