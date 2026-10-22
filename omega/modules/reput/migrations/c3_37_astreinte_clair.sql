-- c3_37 — REPUT, écarts TREPUT-10 et TREPUT-11 (T-REPUT, 22/10) : l'astreinte refuse en clair ; elle part aussitôt
-- (session C3, 22/10/2026)
--
--   · TREPUT-10 : public.reput_regler_astreinte et public.reput_poser_garde (reprises de c3_22) disent ce qui manque —
--     délai hors de 2 à 60 minutes, membre absent de l'organisation / lecteur / hors du périmètre du site, numéro
--     illisible, fin avant le début, rang hors de 1 à 5 — au lieu de l'erreur brute d'une contrainte ; code 22023.
--   · TREPUT-11 : une demande qui devient urgente lance l'astreinte AUSSITÔT (déclencheur reput_astreinte_aussitot sur
--     reput_demandes, quand urgence passe à vrai) au lieu d'attendre la tâche reput-astreinte de la minute suivante.
--     Rappel : l'astreinte n'est pas un envoi (aucun message au client ni à la garde par envois) : elle crée des APPELS
--     (public.reput_appels, a_appeler), que l'ouvrier Edge reput-astreinte passe par Twilio. Il faut : l'astreinte
--     activée (reput_regler_astreinte), une garde en cours, et une demande jugée urgente à la préparation (le modèle,
--     ou une personne) — un champ « urgence » dans le détail de la réception n'est pas lu.
--
-- Règles de pose : create or replace (fonctions, déclencheur) ; ni DROP ni DELETE.

create or replace function public.reput_regler_astreinte(p_client uuid, p_actif boolean, p_minutes integer default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  perform private.reput_dirige_planning(p_client, null);
  -- c3_37 (TREPUT-10) : le refus dit la règle, au lieu de l'erreur brute de la contrainte.
  if p_minutes is not null and p_minutes not between 2 and 60 then
    raise exception 'Délai avant d''appeler la garde suivante : de 2 à 60 minutes (reçu : %).', p_minutes using errcode = '22023';
  end if;
  perform private.reput_installer(p_client, null);
  update public.reput_reglages r set astreinte = coalesce(p_actif, r.astreinte), astreinte_minutes = coalesce(p_minutes, r.astreinte_minutes)
  where r.client_id = p_client and r.entite_id is null;
  perform private.journaliser_module(p_client, 'reput', 'reput.astreinte_reglee', 'clients', p_client::text,
    jsonb_build_object('actif', p_actif, 'minutes', p_minutes, 'par', (select auth.uid())), null);
  return (select jsonb_build_object('astreinte', r.astreinte, 'minutes', r.astreinte_minutes)
          from public.reput_reglages r where r.client_id = p_client and r.entite_id is null);
end $function$;

create or replace function public.reput_poser_garde(p_client uuid, p_entite uuid, p_membre uuid, p_telephone text,
                                                    p_du timestamptz, p_au timestamptz, p_rang integer default 1)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_id uuid; v_role text; v_tel text := regexp_replace(coalesce(p_telephone, ''), '[\s.()-]', '', 'g');
begin
  perform private.reput_dirige_planning(p_client, p_entite);
  -- c3_37 (TREPUT-10) : chaque refus dit ce qui manque, au lieu de l'erreur brute d'une contrainte.
  if p_membre is null then
    raise exception 'Choisissez le membre de garde.' using errcode = '22023';
  end if;
  select c.role into v_role from public.comptes c where c.client_id = p_client and c.user_id = p_membre;
  if v_role is null then
    raise exception 'Ce membre n''appartient pas à l''organisation : invitez-le d''abord (Équipe), puis posez sa garde.' using errcode = '22023';
  elsif v_role = 'lecteur' then
    raise exception 'Ce membre est lecteur : il ne traite pas les demandes. Donnez-lui un rôle de collaborateur ou plus pour sa garde.' using errcode = '22023';
  elsif not private.perimetre_couvre(p_membre, p_client, p_entite) then
    raise exception 'Le périmètre de ce membre ne couvre pas ce site : élargissez-le, ou posez la garde sur un site qu''il couvre.' using errcode = '22023';
  end if;
  if v_tel ~ '^0[1-9][0-9]{8}$' then v_tel := '+33' || substr(v_tel, 2); end if;
  if v_tel !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Numéro de garde illisible (« % ») : un numéro français (06 12 34 56 78) ou international (+32…).', left(coalesce(p_telephone, ''), 40)
      using errcode = '22023';
  end if;
  if p_du is null or p_au is null then
    raise exception 'La garde a un début et une fin.' using errcode = '22023';
  elsif p_du >= p_au then
    raise exception 'La garde finit après son début (début %, fin %).', to_char(p_du, 'DD/MM/YYYY HH24:MI'), to_char(p_au, 'DD/MM/YYYY HH24:MI')
      using errcode = '22023';
  end if;
  if coalesce(p_rang, 1) not between 1 and 5 then
    raise exception 'Rang de garde : de 1 (appelé d''abord) à 5.' using errcode = '22023';
  end if;
  insert into public.reput_gardes (client_id, entite_id, user_id, telephone, du, au, rang, cree_par)
  values (p_client, p_entite, p_membre, v_tel, p_du, p_au, coalesce(p_rang, 1), (select auth.uid()))
  returning id into v_id;
  perform private.journaliser_module(p_client, 'reput', 'reput.garde_posee', 'reput_gardes', v_id::text,
    jsonb_build_object('entite', p_entite, 'membre', p_membre, 'du', p_du, 'au', p_au, 'rang', coalesce(p_rang, 1)), p_entite);
  return jsonb_build_object('garde', v_id);
end $function$;

create or replace function private.reput_astreinte_aussitot()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  perform private.reput_astreinte(now());
  return null;
exception when others then
  raise notice 'reput_astreinte_aussitot : %', sqlerrm;   -- la tâche de la minute rattrape
  return null;
end $function$;
revoke execute on function private.reput_astreinte_aussitot() from public, anon, authenticated;

create or replace trigger reput_astreinte_aussitot after update of urgence on public.reput_demandes
  for each row when (new.urgence and old.urgence is distinct from true) execute function private.reput_astreinte_aussitot();
