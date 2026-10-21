-- accord_sceau_banc.sql — l'accord permanent du gérant pour l'envoi seul du sceau mensuel (a4_64), client du banc.
-- À exécuter par le coordinateur sur la RECETTE (service_role / postgres), une fois. Rejouable : un accord déjà
-- proposé ou actif n'est pas reposé.
--
-- Accord donné par écrit par Teo le 21/10/2026, au nom du gérant du client banc cccccccc-0000-4000-8000-00000000000c.
--
-- Par la porte du socle, sans insert de service :
--   · la proposition se fait SOUS L'IDENTITÉ DU GÉRANT (rôle authenticated, ses claims) : c'est la porte du socle pour
--     un accord permanent (politique RLS « gérants et admins proposent un accord permanent » sur public.politiques ;
--     private.preparer_politique la met « a_valider », private.deposer_activation dépose sa demande d'activation) ;
--   · elle est notée au journal du module (public.journaliser_module) : qui, quand, l'accord écrit, la politique.
--
-- Ce que ce script NE fait PAS, exprès : activer l'accord. Le socle refuse que le demandeur décide de sa propre
-- demande (« Le demandeur ne décide pas de sa propre demande », constaté par B6, b6_09) ; l'activation est la
-- décision d'une seconde personne (un autre gérant, ou — si une règle « politique.activer » de FILED l'ouvre — un
-- admin ou un valideur), dans « À valider » de l'espace. Le script dit à la fin qui peut la prendre.
--
-- Portée, à savoir : un accord du socle couvre un module et un type d'action (ici « filed » / « envoi.email »), pas un
-- objet. Il couvrirait donc tout courriel d'un moteur FILED qui passe par private.preparer_envoi sans demande adossée —
-- aujourd'hui, seul le sceau (a4_64) ; les réponses aux fournisseurs (a4_38) sont adossées à « filed.repondre », que
-- les accords ne couvrent jamais. Il est borné à 3 courriels par mois (un sceau par gérant) et à 12 mois.

do $accord$
declare
  v_client constant uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_gerant uuid;
  v_email text;
  v_nb_gerants int;
  v_existe uuid;
  v_pol public.politiques;
  v_decideurs text;
begin
  if not exists (select 1 from public.clients c where c.id = v_client) then
    raise exception 'Client du banc introuvable : %', v_client;
  end if;
  if exists (select 1 from private.actions_sans_accord a where a.module = 'filed' and a.type_action = 'envoi.email') then
    raise exception 'filed / envoi.email est inscrit aux actions sans accord : rien n''est posé.';
  end if;
  select count(*) into v_nb_gerants from public.comptes c where c.client_id = v_client and c.role = 'gerant';
  select c.user_id, u.email into v_gerant, v_email
    from public.comptes c join auth.users u on u.id = c.user_id
   where c.client_id = v_client and c.role = 'gerant'
   order by (u.email = 'gerant@banc-varelo.test') desc, c.user_id
   limit 1;
  if v_gerant is null then
    raise exception 'Le client du banc n''a pas de gérant.';
  end if;

  select p.id into v_existe from public.politiques p
   where p.client_id = v_client and p.module = 'filed' and p.type_action = 'envoi.email'
     and (p.statut = 'a_valider' or (p.statut = 'active' and p.fin > now() + interval '30 days'))
   limit 1;
  if v_existe is not null then
    raise notice 'Un accord filed / envoi.email est déjà proposé ou actif (%) : rien n''est reposé.', v_existe;
    return;
  end if;

  -- 1. La proposition, sous l'identité du gérant.
  perform set_config('request.jwt.claims', json_build_object('sub', v_gerant, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.politiques (client_id, entite_id, module, type_action, libelle, nombre_mensuel, debut, fin)
  values (v_client, null, 'filed', 'envoi.email',
          'Sceau mensuel de l''historique FILED, envoyé seul au gérant (accord écrit de Teo, 21/10/2026)',
          3, now(), now() + interval '365 days')
  returning * into v_pol;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);

  -- 2. La note au journal du module.
  perform public.journaliser_module(v_client, 'filed', 'filed.accord_sceau_propose', 'politiques', v_pol.id::text,
    jsonb_build_object('politique', v_pol.id, 'demande_activation', v_pol.demande_id, 'propose_par', v_gerant, 'gerant', v_email,
                       'accord_ecrit', 'Teo, 21/10/2026 : envoi seul du sceau mensuel (a4_64)', 'portee', 'filed / envoi.email',
                       'nombre_mensuel', 3, 'fin', v_pol.fin, 'pose_par', 'coordinateur, script omega/banc/accord_sceau_banc.sql'),
    null);

  -- 3. Qui peut l'activer (le gérant qui propose en est exclu par le socle).
  select string_agg(format('%s (%s)', u.email, c.role), ', ' order by c.role, u.email) into v_decideurs
    from public.comptes c join auth.users u on u.id = c.user_id
   where c.client_id = v_client and c.user_id <> v_gerant
     and (c.role = 'gerant'
          or (c.role in ('admin', 'valideur') and exists (select 1 from public.regles_validation r
                                                          where r.client_id = v_client and r.module = 'filed'
                                                            and r.type_action = 'politique.activer' and r.actif
                                                            and c.role = any (r.roles_autorises))));
  raise notice 'Accord proposé : politique %, statut %, demande d''activation %. Proposé au nom de % (% gérant(s)).',
    v_pol.id, (select statut from public.politiques where id = v_pol.id), v_pol.demande_id, v_email, v_nb_gerants;
  raise notice 'Activation : décision d''une seconde personne dans « À valider ». Peuvent la prendre : %.',
    coalesce(v_decideurs, 'PERSONNE aujourd''hui — il faut un second gérant, ou une règle « politique.activer » de FILED (à décider par Teo, comme b6_09 pour Daliro)');
end $accord$;

-- Contrôle : l'accord et sa demande d'activation.
select p.id, p.statut, p.module, p.type_action, p.nombre_mensuel, p.fin, p.demande_id,
       d.statut as demande_statut, d.type_action as demande_type, d.roles_autorises
  from public.politiques p left join public.demandes_validation d on d.id = p.demande_id
 where p.client_id = 'cccccccc-0000-4000-8000-00000000000c' and p.module = 'filed' and p.type_action = 'envoi.email'
 order by p.cree_le desc limit 1;
