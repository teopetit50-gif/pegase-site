-- 20261015130726 b5_32_b5_33
-- Source : dépôt : 8d42f1c omega/modules/lorani/migrations/b5_32_avancement_constate.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : b5_32_avancement_constate.sql @ 8d42f1c ; b5_19 cité comme test : ignoré ; b5_32 cité comme test : ignoré ; b5_21 cité comme test : ignoré ; b5_33 cité comme test : ignoré ; b5_22 cité comme test : ignoré ; b5_32_b5_33 : fichier trouvé par le lot b5_32.
-- ═══ omega/modules/lorani/migrations/b5_32_avancement_constate.sql @ 8d42f1c
-- LORANI, lot B5-32 — l'avancement constaté au compte rendu, comparé à l'avancement que la situation facture (15/10/2026).
--
-- Pourquoi : la page des architectes promet « Avancement déclaré contre constaté » et montre « Une situation facture
-- 62 % d'avancement alors que le chantier en est à 55 % » (Fonctionnement.tsx:823 ; Metiers.tsx:154 ; chiffrage,
-- ligne 32 : D). L'avancement déclaré était calculé (b5_13), rien ne disait ce que le maître d'œuvre avait constaté.
--
-- Ce qui est posé :
--   · lorani_comptes_rendus.avancement_lots jsonb : l'avancement constaté à la visite, par lot du projet
--     ({"<lot>": 55}, de 0 à 100, au dixième). Figé avec le compte rendu une fois diffusé.
--   · lorani_situations.avancement_declare, avancement_constate, avancement_cr : à chaque situation, l'avancement
--     qu'elle facture (cumul / marché et avenants), et le dernier avancement constaté du lot dans un compte rendu
--     diffusé dont la visite précède la réception de la situation.
--   · private.lorani_situation_avancement(situation) : le calcul ; si la situation facture plus de 5 points au-delà du
--     constaté, alerte « attention » au chef de projet (une par situation).
--   · triggers : à la réception d'une situation (ou quand son cumul change), et à la diffusion d'un compte rendu (les
--     situations encore à viser du projet sont recomparées).
-- Idempotent ; rien n'est retiré.

ALTER TABLE public.lorani_comptes_rendus ADD COLUMN IF NOT EXISTS avancement_lots jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.lorani_situations ADD COLUMN IF NOT EXISTS avancement_declare numeric(5,1);
ALTER TABLE public.lorani_situations ADD COLUMN IF NOT EXISTS avancement_constate numeric(5,1);
ALTER TABLE public.lorani_situations ADD COLUMN IF NOT EXISTS avancement_cr uuid;

-- L'avancement par lot : des lots du projet, de 0 à 100 ; figé une fois le compte rendu diffusé.
CREATE OR REPLACE FUNCTION private.lorani_cr_avancement_lots()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  k text;
  v jsonb;
  r jsonb := '{}'::jsonb;
begin
  if tg_op = 'UPDATE' and old.statut = 'diffuse' then
    if new.avancement_lots is distinct from old.avancement_lots then
      raise exception 'Ce compte rendu est diffusé : il ne se modifie plus. Rédigez le suivant.' using errcode = '55000';
    end if;
    return new;
  end if;
  if jsonb_typeof(new.avancement_lots) <> 'object' then
    raise exception 'L''avancement par lot est une liste « lot : pourcentage ».' using errcode = '22023';
  end if;
  for k, v in select * from jsonb_each(new.avancement_lots) loop
    if jsonb_typeof(v) = 'null' then
      continue;
    end if;
    if k !~ '^[0-9a-f-]{36}$' or not exists (select 1 from public.lorani_lots l where l.id = k::uuid and l.projet_id = new.projet_id) then
      raise exception 'Avancement : ce lot n''est pas un lot du projet.' using errcode = '22023';
    end if;
    if jsonb_typeof(v) <> 'number' or (v #>> '{}')::numeric not between 0 and 100 then
      raise exception 'Avancement : un pourcentage de 0 à 100 est attendu.' using errcode = '22023';
    end if;
    r := r || jsonb_build_object(k, round((v #>> '{}')::numeric, 1));
  end loop;
  new.avancement_lots := r;
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_cr_avancement_lots() FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.lorani_situation_avancement(p_situation uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s public.lorani_situations;
  m public.lorani_marches;
  l public.lorani_lots;
  pr public.lorani_projets;
  cr public.lorani_comptes_rendus;
  v_declare numeric;
  v_constate numeric;
begin
  select * into s from public.lorani_situations where id = p_situation;
  if not found then
    return null;
  end if;
  select * into m from public.lorani_marches where id = s.marche_id;
  select * into l from public.lorani_lots where id = m.lot_id;
  v_declare := round(100 * s.cumul_ht / nullif(m.montant_ht + m.avenants_ht, 0), 1);
  select c.* into cr from public.lorani_comptes_rendus c
  where c.projet_id = s.projet_id and c.statut = 'diffuse' and c.visite_le <= s.recue_le
    and jsonb_typeof(c.avancement_lots -> m.lot_id::text) = 'number'
  order by c.visite_le desc, c.numero desc limit 1;
  v_constate := case when cr.id is not null then (cr.avancement_lots ->> m.lot_id::text)::numeric end;
  update public.lorani_situations set avancement_declare = v_declare, avancement_constate = v_constate, avancement_cr = cr.id
  where id = s.id and (avancement_declare, avancement_constate, avancement_cr) is distinct from (v_declare, v_constate, cr.id);
  if s.statut = 'a_viser' and v_constate is not null and v_declare - v_constate > 5 then
    select * into pr from public.lorani_projets where id = s.projet_id;
    perform private.lever_alerte_module(s.client_id, 'lorani', 'attention',
      left(format('« %s », lot %s %s : la situation n° %s facture %s %% d''avancement, le chantier en est à %s %% au compte rendu n° %s du %s.',
                  left(pr.nom, 40), l.numero, left(l.intitule, 30), s.numero, regexp_replace(replace(v_declare::text, '.', ','), ',0$', ''), regexp_replace(replace(v_constate::text, '.', ','), ',0$', ''),
                  cr.numero, to_char(cr.visite_le, 'DD/MM/YYYY')), 200),
      jsonb_build_object('projet', s.projet_id, 'situation', s.id, 'lot', l.id, 'declare', v_declare, 'constate', v_constate, 'compte_rendu', cr.id,
                         'lien', private.lorani_lien_projet(s.projet_id)),
      format('situation:%s:avancement', s.id), true, private.lorani_chef_de_projet(s.client_id, s.projet_id));
  end if;
  return jsonb_build_object('situation', s.id, 'declare', v_declare, 'constate', v_constate, 'compte_rendu', cr.id);
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_situation_avancement(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.lorani_situations_avancement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform private.lorani_situation_avancement(new.id);
  return null;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_situations_avancement() FROM PUBLIC;

-- Un compte rendu diffusé : les situations encore à viser du projet sont recomparées.
CREATE OR REPLACE FUNCTION private.lorani_cr_avancement_diffuse()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s record;
begin
  if new.statut = 'diffuse' and (tg_op = 'INSERT' or old.statut is distinct from 'diffuse') then
    for s in select x.id from public.lorani_situations x where x.projet_id = new.projet_id and x.statut = 'a_viser' loop
      perform private.lorani_situation_avancement(s.id);
    end loop;
  end if;
  return null;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_cr_avancement_diffuse() FROM PUBLIC;

DO $$
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_comptes_rendus'::regclass and tgname = 'lorani_comptes_rendus_avancement_lots') then
    create trigger lorani_comptes_rendus_avancement_lots before insert or update of avancement_lots on public.lorani_comptes_rendus
      for each row execute function private.lorani_cr_avancement_lots();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_comptes_rendus'::regclass and tgname = 'lorani_comptes_rendus_avancement_diffuse') then
    create trigger lorani_comptes_rendus_avancement_diffuse after insert or update of statut on public.lorani_comptes_rendus
      for each row execute function private.lorani_cr_avancement_diffuse();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_situations'::regclass and tgname = 'lorani_situations_avancement') then
    create trigger lorani_situations_avancement after insert or update of cumul_ht, recue_le on public.lorani_situations
      for each row execute function private.lorani_situations_avancement();
  end if;
end $$;
