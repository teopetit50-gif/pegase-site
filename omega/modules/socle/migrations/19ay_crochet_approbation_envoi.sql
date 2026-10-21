-- 19ay_crochet_approbation_envoi.sql — un crochet par module, appelé à l'approbation, réécrit le texte d'un envoi
-- AVANT qu'il ne soit figé (A5, 21/10/2026 ; pour CASHD, TCASHD-10b / c2_35 : la date limite « {limite} » doit compter
-- depuis la validation, pas depuis la préparation).
--
-- Avant : à l'approbation, private.envois_suivre_demande appelait envoi_valide, qui fait passer l'envoi à « pret » ;
-- garder_envoi refuse ensuite tout changement de contenu (« Le contenu d'un envoi décidé ne change plus »), et
-- envois_suivre_modification ignore les envois adossés. Aucun module ne pouvait recalculer son texte.
--
-- Ce lot :
--   · private.crochets_approbation_envoi (module → fonction) et private.inscrire_crochet_approbation_envoi (service) ;
--     la fonction d'un module reçoit l'envoi (public.envois) et rend un jsonb : { sujet?, corps?, variables? } (null ou
--     {} : rien ne change ; toute autre clé est refusée) ;
--   · private.envoi_crochet_approbation(envoi) : si l'envoi est encore « a_valider » et que son module a un crochet,
--     l'appelle, vérifie le texte comme une modification (longueur, sujet selon le canal ; un message WhatsApp sur
--     modèle Meta ne se réécrit pas : le crochet est ignoré), recalcule l'empreinte, marque un texte de santé comme
--     envois_suivre_modification, et inscrit la réécriture au journal opposable ;
--   · private.envois_suivre_demande : appelle ce crochet juste avant envoi_valide (réécriture par repère, exactement
--     une fois ; sinon le lot s'arrête sans rien changer). Destinataire, canal, objet et échéance restent intouchables.
-- Rien n'est supprimé. Rejouable.

create table if not exists private.crochets_approbation_envoi (
  module   text primary key check (module ~ '^[a-z][a-z_]{1,29}$'),
  fonction regprocedure not null,
  note     text,
  maj_le   timestamptz not null default now()
);
comment on table private.crochets_approbation_envoi is
  'Lot 19ay : par module, la fonction (public.envois) → jsonb {sujet, corps, variables} appelée à l''approbation, avant que l''envoi ne soit figé.';
revoke all on table private.crochets_approbation_envoi from public, anon, authenticated;
grant select on table private.crochets_approbation_envoi to service_role;

create or replace function private.inscrire_crochet_approbation_envoi(p_module text, p_fonction regprocedure, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from pg_proc p where p.oid = p_fonction and p.pronargs = 1
                   and p.proargtypes[0] = 'public.envois'::regtype and p.prorettype = 'jsonb'::regtype) then
    raise exception 'Un crochet d''approbation reçoit un envoi (public.envois) et rend un jsonb : % ne convient pas.', p_fonction
      using errcode = '22023';
  end if;
  insert into private.crochets_approbation_envoi (module, fonction, note) values (p_module, p_fonction, p_note)
  on conflict (module) do update set fonction = excluded.fonction, note = excluded.note, maj_le = now();
end $$;

create or replace function private.envoi_crochet_approbation(p_envoi uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  e public.envois; v_fonction regprocedure; v jsonb; v_cle text; v_canal private.canaux_envoi;
  v_sujet text; v_corps text; v_variables jsonb; v_contexte boolean;
begin
  select * into e from public.envois x where x.id = p_envoi for update;
  if e.id is null or e.statut <> 'a_valider' then return false; end if;
  select c.fonction into v_fonction from private.crochets_approbation_envoi c where c.module = e.module;
  if v_fonction is null then return false; end if;
  execute format('select %I.%I($1)',
                 (select n.nspname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.oid = v_fonction),
                 (select p.proname from pg_proc p where p.oid = v_fonction)) into v using e;
  if v is null or v = '{}'::jsonb then return false; end if;
  if jsonb_typeof(v) <> 'object' then
    raise exception 'Le crochet d''approbation du module % doit rendre un objet JSON.', e.module using errcode = '22023';
  end if;
  for v_cle in select jsonb_object_keys(v) loop
    if v_cle not in ('sujet', 'corps', 'variables') then
      raise exception 'Le crochet d''approbation du module % ne réécrit que le sujet, le corps et les variables (clé « % »).', e.module, v_cle
        using errcode = '22023';
    end if;
  end loop;
  if e.canal = 'whatsapp' and e.gabarit_id is not null then
    perform private.journaliser(e.client_id, 'envoi.reecriture_ignoree', 'envoi', e.id::text,
      jsonb_build_object('module', e.module, 'motif', 'Message WhatsApp sur modèle Meta : il ne se retouche pas.'), e.entite_id);
    return false;
  end if;
  v_sujet := case when v ? 'sujet' then nullif(btrim(v ->> 'sujet'), '') else e.sujet end;
  v_corps := case when v ? 'corps' then v ->> 'corps' else e.corps end;
  v_variables := case when v ? 'variables' then v -> 'variables' else e.variables end;
  select * into v_canal from private.canaux_envoi c where c.canal = e.canal;
  if nullif(btrim(v_corps), '') is null or char_length(v_corps) > v_canal.longueur_max
     or char_length(coalesce(v_sujet, '')) > 300
     or (v_canal.sujet = 'obligatoire' and v_sujet is null) or (v_canal.sujet = 'interdit' and v_sujet is not null) then
    raise exception 'Le texte réécrit à l''approbation (module %) ne convient pas au canal % (sujet, longueur).', e.module, v_canal.libelle
      using errcode = '22023';
  end if;
  v_contexte := coalesce((select m.sante from private.modules_envois m where m.module = e.module), false)
                or coalesce((private.reglages_envois_effectifs(e.client_id, e.module) ->> 'sante')::boolean, false);
  update public.envois
     set sujet = v_sujet, corps = v_corps, variables = v_variables,
         empreinte = private.empreinte_contenu(e.canal, e.destinataire_adresse, v_sujet, v_corps, e.pieces),
         donnees_sante = e.donnees_sante or (v_contexte and (v ? 'corps' or v ? 'sujet'))
   where id = e.id;
  perform private.journaliser(e.client_id, 'envoi.reecrit_a_approbation', 'envoi', e.id::text,
    jsonb_build_object('module', e.module, 'champs', (select jsonb_agg(k) from jsonb_object_keys(v) k)), e.entite_id);
  return true;
end $$;

do $$ declare f text; begin
  foreach f in array array['private.inscrire_crochet_approbation_envoi(text, regprocedure, text)',
                           'private.envoi_crochet_approbation(uuid)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

-- envois_suivre_demande : le crochet passe juste avant envoi_valide.
do $lot$
declare
  d text; n integer;
  m constant text := 'perform private\.envoi_valide\(v_id\);';
  r constant text := 'perform private.envoi_crochet_approbation(v_id);  -- 19ay : le module réécrit son texte avant qu''il ne soit figé' || chr(10)
                  || '    perform private.envoi_valide(v_id);';
begin
  select pg_get_functiondef('private.envois_suivre_demande()'::regprocedure) into d;
  if position('private.envoi_crochet_approbation' in d) > 0 then
    raise notice 'Lot 19ay : envois_suivre_demande appelle déjà le crochet, corps inchangé.';
    return;
  end if;
  select count(*) into n from regexp_matches(d, m, 'g');
  if n <> 1 then
    raise exception 'Lot 19ay, envois_suivre_demande : repère « perform private.envoi_valide(v_id); » trouvé % fois (1 attendu) ; rien n''est changé.', n;
  end if;
  execute regexp_replace(d, m, r);
end $lot$;
