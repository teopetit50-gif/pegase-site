-- b6_32 — DALIRO : la réserve hors devis devient un avenant (session B6, 15/10/2026)
--
-- LA PROMESSE (/secteurs/btp, Peinture-finitions) : « Les reprises demandées à la réception sont photographiées, et
-- celles qui ne figuraient pas au devis sont chiffrées à part. » Une réserve (b6_13) ne pouvait que se lever ; et un
-- chantier réceptionné n'ouvrait plus d'avenant.
--
-- CE QUI EST POSÉ.
--   · btp_reserves.avenant_id : la réserve reconnue hors devis porte son avenant.
--   · public.btp_avenant_depuis_reserve(reserve, objet) : le bureau (comme les avenants) ouvre un avenant brouillon
--     dont l'objet est la réserve (ou l'objet donné), l'origine { canal « reception », reserve, reception, texte }, et
--     origine.chiffrage la recherche de prix de b6_26 (sans unité dite, elle rend au moins la ligne du marché proche).
--     Une réserve n'a qu'un avenant ; une réserve levée n'en ouvre plus.
--   · private.btp_ouvrir_avenant (b6_01) : sur un chantier RÉCEPTIONNÉ, il n'ouvre que l'avenant d'une réserve. Le
--     reste est inchangé (chantier ouvert ou suspendu, objet, origine, numéro, journal).
--   · L'avenant suit ensuite son chemin habituel : chiffré ligne à ligne, soumis, signé (sur place, b6_20).
--
-- Règles de pose : alter table … add column if not exists ; create or replace ; rien n'est retiré ni effacé.

alter table public.btp_reserves add column if not exists avenant_id uuid;
do $do$ begin
  if not exists (select 1 from pg_constraint where conname = 'btp_reserves_avenant_fkey') then
    alter table public.btp_reserves add constraint btp_reserves_avenant_fkey
      foreign key (client_id, avenant_id) references public.btp_avenants(client_id, id) on delete set null (avenant_id);
  end if;
end $do$;

create or replace function private.btp_ouvrir_avenant(p_chantier uuid, p_objet text, p_origine jsonb default '{}'::jsonb)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.btp_chantiers;
  v_marche uuid;
  v_id uuid;
begin
  select * into c from public.btp_chantiers where id = p_chantier;
  if not found then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(c.client_id, c.entite_id);
  -- b6_32 : après la réception, seul un avenant né d'une réserve hors devis s'ouvre encore.
  if c.statut not in ('ouvert', 'suspendu')
     and not (c.statut = 'receptionne' and coalesce(p_origine ->> 'reserve', '') <> '') then
    raise exception 'Un avenant se prépare sur un chantier ouvert.' using errcode = '23514';
  end if;
  if coalesce(btrim(p_objet), '') = '' then
    raise exception 'Un avenant a un objet : ce qui est demandé en plus du marché.' using errcode = '22023';
  end if;
  if p_origine is not null and jsonb_typeof(p_origine) <> 'object' then
    raise exception 'L''origine d''un avenant est un objet (canal, auteur, date, texte).' using errcode = '22023';
  end if;
  -- Le marché de référence : le dernier vérifié du chantier (il peut n'y en avoir pas encore).
  select m.id into v_marche from public.btp_marches m
  where m.client_id = c.client_id and m.chantier_id = c.id and m.statut = 'verifie'
  order by m.verifie_le desc nulls last limit 1;
  perform pg_advisory_xact_lock(hashtextextended('daliro.avenants:' || c.id::text, 0));
  insert into public.btp_avenants (client_id, chantier_id, marche_id, numero, objet, origine)
  values (c.client_id, c.id, v_marche,
          (select coalesce(max(a.numero), 0) + 1 from public.btp_avenants a where a.chantier_id = c.id),
          p_objet, coalesce(p_origine, '{}'::jsonb))
  returning id into v_id;
  perform private.journaliser(c.client_id, 'daliro.avenant_ouvert', 'btp_avenants', v_id::text,
    jsonb_build_object('chantier', c.id, 'marche', v_marche, 'objet', btrim(p_objet), 'origine', coalesce(p_origine, '{}'::jsonb)), c.entite_id);
  return v_id;
end $function$;

create or replace function public.btp_avenant_depuis_reserve(p_reserve uuid, p_objet text default null)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v public.btp_reserves;
  x public.btp_receptions;
  v_objet text;
  v_avenant uuid;
begin
  select * into v from public.btp_reserves where id = p_reserve for update;
  if not found then
    raise exception 'Réserve introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(v.client_id, v.entite_id);
  if v.avenant_id is not null then
    raise exception 'Cette réserve a déjà son avenant.' using errcode = '23514';
  end if;
  if v.statut = 'levee' then
    raise exception 'Une réserve levée n''ouvre plus d''avenant.' using errcode = '23514';
  end if;
  select * into x from public.btp_receptions where id = v.reception_id;
  v_objet := left(coalesce(nullif(btrim(p_objet), ''), 'Reprise hors devis demandée à la réception : ' || v.description), 500);
  v_avenant := private.btp_ouvrir_avenant(v.chantier_id, v_objet,
    jsonb_build_object('canal', 'reception', 'reserve', v.id, 'reception', v.reception_id, 'date', x.date_reception,
                       'texte', left(v.description, 1000),
                       'chiffrage', private.btp_prix_pour(v.client_id, v.chantier_id, v.description, null)));
  update public.btp_reserves set avenant_id = v_avenant where id = v.id;
  perform private.journaliser(v.client_id, 'daliro.reserve_hors_devis', 'btp_receptions', v.reception_id::text,
    jsonb_build_object('reserve', v.id, 'avenant', v_avenant, 'description', left(v.description, 200)), v.entite_id);
  return v_avenant;
end $function$;

-- Droits (à inscrire dans omega/a5_01_liste_figee.txt).
revoke execute on function public.btp_avenant_depuis_reserve(uuid, text) from public, anon;
grant execute on function public.btp_avenant_depuis_reserve(uuid, text) to authenticated, service_role;
revoke execute on function private.btp_ouvrir_avenant(uuid, text, jsonb) from public, anon;
grant execute on function private.btp_ouvrir_avenant(uuid, text, jsonb) to authenticated, service_role;
