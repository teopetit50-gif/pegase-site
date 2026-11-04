-- 20261017155520 c3_11_prevenir_decideurs_bis
-- Source : dépôt : 2918187d omega/modules/reput/migrations/c3_11_prevenir_decideurs.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c3_11_prevenir_decideurs.sql @ 2918187d.
-- ═══ omega/modules/reput/migrations/c3_11_prevenir_decideurs.sql @ 2918187d
-- c3_11 — REPUT : un courriel prévient les décideurs qu'une réponse attend leur validation (session C3, 17/10/2026)
--
-- CE QUE ÇA TIENT (chiffrage #15, lot 2) : « Vous n'avez aucun logiciel de plus à ouvrir » — on n'a plus à aller voir
-- s'il y a quelque chose : quand une réponse préparée attend une décision, chaque décideur qui peut la valider reçoit
-- un courriel, au plus un par heure, avec le nombre de réponses en attente et le lien vers /espace2/reput.
-- Le courriel part par l'envoi interne du socle (19as, A1) : vers un MEMBRE, gabarit validé FERMÉ (une date, un
-- nombre), exempté de validation. Il ne porte ni le nom du client, ni sa question, ni la réponse : tout reste derrière
-- la connexion, et la décision reste celle d'une personne connectée (reput_decider ; private.preparer_approbation).
--
-- Qui est prévenu : les comptes gérant, administrateur ou valideur dont le périmètre couvre la réponse
-- (private.perimetre_couvre) ; si le sujet est routé vers un service (c3_07), seuls ses membres.
-- Quand : la tâche reput-prevenir, chaque minute ; un courriel par décideur et par heure (clé d'idempotence
-- reput.a_valider:<membre>:<heure UTC>), et seulement s'il est arrivé une réponse à valider dans l'heure — pas de
-- rappel en boucle sur un stock ancien (le point du matin le reprend).
--
-- Règles de pose : insert … on conflict do nothing, create or replace ; ni DROP ni DELETE. Fonctions privées
-- fermées à public, anon, authenticated.

insert into public.gabarits_messages (client_id, module, code, langue, version, canal, libelle, sujet, corps, variables,
                                      transactionnel, donnees_sante, espacement, statut)
values (null, 'reput', 'reput.a_valider', 'fr', 1, 'email',
        'REPUT — réponses à valider (compteur, sans contenu client)',
        'Réponses clients à valider — {{organisation}}',
        'Bonjour,' || chr(10) || chr(10)
        || 'REPUT a préparé des réponses à vos clients ; {{attente}} attendent votre validation ({{organisation}}, {{jour}}).' || chr(10)
        || 'Aucune ne part sans votre accord.' || chr(10) || chr(10)
        || 'Pour les relire, les corriger ou les valider : https://omegaai.fr/espace2/reput' || chr(10)
        || '(la connexion à votre espace vous est demandée ; le contenu des demandes ne sort jamais par courriel).' || chr(10) || chr(10)
        || 'REPUT, pour {{organisation}}.',
        '{"jour": "date", "attente": "nombre"}'::jsonb,
        true, false, false, 'brouillon')
on conflict (client_id, code, langue, version) do nothing;

-- La validation revient au serveur : on l'endosse le temps de l'appel (comme b3_10).
do $$
declare v_id uuid;
begin
  select g.id into v_id from public.gabarits_messages g
  where g.client_id is null and g.code = 'reput.a_valider' and g.langue = 'fr' and g.version = 1 and g.statut = 'brouillon';
  if v_id is not null then
    set local role service_role;
    perform public.valider_gabarit(v_id, 'C3 — courriel « réponses à valider », 17/10/2026');
    reset role;
  end if;
end $$;

create or replace function private.reput_prevenir_decideurs(p_maintenant timestamptz default now())
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  x record;
  v_cle text;
  n integer := 0;   -- courriels nouveaux (un déjà parti dans l'heure ne compte pas)
begin
  for x in
    select p.client_id, c.user_id, count(distinct p.id)::int as attente, max(p.cree_le) as derniere
    from public.reput_reponses p
    join public.reput_reglages g on g.client_id = p.client_id and g.entite_id is null and g.actif
    join public.comptes c on c.client_id = p.client_id and c.role in ('gerant', 'admin', 'valideur')
    left join public.reput_sujets s on s.client_id = p.client_id and s.code = p.sujet
    where p.statut = 'a_valider' and p.demande_validation_id is not null
      and (s.equipe_id is null
           or exists (select 1 from public.equipes_membres m where m.equipe_id = s.equipe_id and m.user_id = c.user_id))
      and private.perimetre_couvre(c.user_id, p.client_id, p.entite_id)
    group by p.client_id, c.user_id
    having max(p.cree_le) >= date_trunc('hour', p_maintenant)
    order by p.client_id, c.user_id
  loop
    v_cle := 'reput.a_valider:' || x.user_id::text || ':' || to_char(p_maintenant at time zone 'UTC', 'YYYY-MM-DD"T"HH24');
    continue when exists (select 1 from public.envois e where e.client_id = x.client_id and e.cle_idempotence = v_cle);
    begin
      perform private.envoyer_interne(
        x.client_id, 'reput', null, null, 'email', x.user_id, 'reput.a_valider',   -- un compteur : aucun objet
        jsonb_build_object('jour', to_char(p_maintenant at time zone 'Europe/Paris', 'YYYY-MM-DD'), 'attente', x.attente),
        v_cle, null);
      n := n + 1;
    exception when others then
      -- Un membre sans adresse, un verrou du socle : les autres sont prévenus quand même ; le point du matin reste.
      raise notice 'reput_prevenir_decideurs : % (%)', sqlerrm, sqlstate;
    end;
  end loop;
  return n;
end $function$;

revoke execute on function private.reput_prevenir_decideurs(timestamptz) from public, anon, authenticated;
grant execute on function private.reput_prevenir_decideurs(timestamptz) to service_role;

-- La tâche : chaque minute (cron.schedule d'un nom existant remplace sa commande ; rejouable).
select cron.schedule('reput-prevenir', '* * * * *', $cron$select private.reput_prevenir_decideurs()$cron$);
