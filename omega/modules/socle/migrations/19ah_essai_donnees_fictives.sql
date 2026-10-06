-- 19ah_essai_donnees_fictives — socle : un essai d'envoi de santé, avec des données fictives, sur la recette seulement.
-- B3 pour le coordinateur, 06/10/2026 (voie acceptée le 06/10, 15 h 19 Z). Après 19ab. Pose : recette, puis production
-- (la colonne et les gardes y sont posées aussi : le drapeau y reste faux et ne peut pas y passer à vrai).
--
-- Le besoin : construire et tester dès maintenant les rappels de Tiroma (données de santé) en mode essai, avec des
-- patients fictifs, sans fournisseur agréé HDS (il sera choisi au premier client) et sans affaiblir le verrou du socle.
--
-- Ce que pose le lot :
--   1. public.reglages_envois.essai_donnees_fictives boolean not null default false, par organisation et par module ;
--      CHECK (not essai_donnees_fictives or mode = 'essai') : jamais en réel ;
--      déclencheur : passer le drapeau à vrai est refusé (42501) si private.reglages('environnement') <> 'recette'.
--      Ce réglage n'est posé que sur la recette (19ah_recette_seulement.sql, exclu de la production par A5).
--   2. verrous_envoi : SANTE_HORS_CANAL_AGREE (le fournisseur non agréé) est sauté SEULEMENT si l'envoi est en essai,
--      que la ligne reglages_envois du module (mode essai) porte le drapeau, et que l'environnement est « recette ».
--      Rien d'autre ne change : CANAL_NON_PERMIS (le SMS en santé, décision D6), consentement, oppositions, doublons,
--      plages restent. En essai, le message ne part qu'à essai_adresse, jamais au destinataire.
--   3. commencer_envoi : la réponse rendue à l'ouvrier porte 'donnees_fictives' (vrai seulement dans ce cas) ;
--      fournisseur_hds reste la vérité (faux). L'expéditeur (A2) n'accepte un envoi de santé vers un fournisseur non HDS
--      que si mode = essai et donnees_fictives = vrai.
-- Réécriture par repères (comme 19ab) : un repère absent ou multiple arrête le lot sans rien changer ; un repère déjà
-- réécrit est sauté (le lot se rejoue). Rien n'est retiré ; aucune fonction exposée de plus.

alter table public.reglages_envois add column if not exists essai_donnees_fictives boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.reglages_envois'::regclass
                 and conname = 'reglages_envois_donnees_fictives_essai') then
    alter table public.reglages_envois add constraint reglages_envois_donnees_fictives_essai
      check (not essai_donnees_fictives or mode = 'essai');
  end if;
end $$;

create or replace function private.reglages_envois_garde_fictives()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if new.essai_donnees_fictives and (tg_op = 'INSERT' or not coalesce(old.essai_donnees_fictives, false))
     and coalesce((select g.valeur from private.reglages g where g.cle = 'environnement'), '') <> 'recette' then
    raise exception 'Le drapeau d''essai « données fictives » ne vaut que sur la recette.' using errcode = '42501';
  end if;
  return new;
end $function$;
revoke all on function private.reglages_envois_garde_fictives() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.reglages_envois'::regclass
                 and tgname = 'reglages_envois_garde_fictives' and not tgisinternal) then
    create trigger reglages_envois_garde_fictives before insert or update of essai_donnees_fictives on public.reglages_envois
      for each row execute function private.reglages_envois_garde_fictives();
  end if;
end $$;

do $lot$
declare
  d text;
  rep text;
  par text;
  n integer;
begin
  -- 2. verrous_envoi.
  select pg_get_functiondef('private.verrous_envoi(public.envois, boolean, timestamp with time zone)'::regprocedure) into d;
  rep := '  if p_e.donnees_sante and not v_agree then';
  par := '  if p_e.donnees_sante and not v_agree' || chr(10)
      || '     and not (v_mode = ''essai'' and coalesce((select x.valeur from private.reglages x where x.cle = ''environnement''), '''') = ''recette''' || chr(10)
      || '              and exists (select 1 from public.reglages_envois g where g.client_id = p_e.client_id and g.module = p_e.module' || chr(10)
      || '                            and g.mode = ''essai'' and g.essai_donnees_fictives)) then';
  if position('g.essai_donnees_fictives' in d) = 0 then
    n := (length(d) - length(replace(d, rep, ''))) / length(rep);
    if n <> 1 then
      raise exception 'Lot 19ah, verrous_envoi : repère absent ou multiple (%) : %', n, rep;
    end if;
    execute replace(d, rep, par);
  end if;

  -- 3. commencer_envoi.
  select pg_get_functiondef('private.commencer_envoi(uuid)'::regprocedure) into d;
  if position('v_fictif' in d) = 0 then
    rep := '  v_hds boolean;' || chr(10) || 'begin';
    par := '  v_hds boolean;' || chr(10) || '  v_fictif boolean;' || chr(10) || 'begin';
    n := (length(d) - length(replace(d, rep, ''))) / length(rep);
    if n <> 1 then
      raise exception 'Lot 19ah, commencer_envoi : repère absent ou multiple (%) : %', n, left(rep, 80);
    end if;
    d := replace(d, rep, par);
    rep := '  v_hds := coalesce((select f.agree_sante from private.fournisseurs_envoi f where f.fournisseur = e.fournisseur), false);';
    par := rep || chr(10)
        || '  v_fictif := e.mode = ''essai'' and coalesce((select x.valeur from private.reglages x where x.cle = ''environnement''), '''') = ''recette''' || chr(10)
        || '              and exists (select 1 from public.reglages_envois g where g.client_id = e.client_id and g.module = e.module' || chr(10)
        || '                            and g.mode = ''essai'' and g.essai_donnees_fictives);';
    n := (length(d) - length(replace(d, rep, ''))) / length(rep);
    if n <> 1 then
      raise exception 'Lot 19ah, commencer_envoi : repère absent ou multiple (%) : %', n, left(rep, 80);
    end if;
    d := replace(d, rep, par);
    rep := '''fournisseur_hds'', v_hds,';
    par := '''fournisseur_hds'', v_hds, ''donnees_fictives'', coalesce(v_fictif, false),';
    n := (length(d) - length(replace(d, rep, ''))) / length(rep);
    if n <> 2 then
      raise exception 'Lot 19ah, commencer_envoi : repère attendu deux fois (essai et réel), trouvé % : %', n, rep;
    end if;
    d := replace(d, rep, par);
    execute d;
  end if;
end $lot$;

select (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'reglages_envois'
          and column_name = 'essai_donnees_fictives') as colonne,
       position('g.essai_donnees_fictives' in pg_get_functiondef('private.verrous_envoi(public.envois, boolean, timestamp with time zone)'::regprocedure)) > 0 as verrous,
       position('donnees_fictives' in pg_get_functiondef('private.commencer_envoi(uuid)'::regprocedure)) > 0 as commencer,
       coalesce((select valeur from private.reglages where cle = 'environnement'), '(absent)') as environnement;
