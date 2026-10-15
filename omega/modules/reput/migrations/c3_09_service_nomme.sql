-- c3_09 — REPUT : une demande transférée dit au client quel service la reprend (session C3, 15/10/2026)
--
-- CE QUE ÇA TIENT : « Elle est routée vers le service compétent selon les règles définies avec vous, et le client
-- en est informé. » (catalogue, cas tordus). Le routage existe depuis c3_07 (reput_sujets.equipe_id, règles du
-- socle) ; le modèle ne connaissait pas le service. La base en vigueur porte désormais, pour chaque sujet routé,
-- le nom de son équipe (« service ») : quand la réponse est un transfert, elle dit que la question est transmise à
-- ce service. Sans équipe, rien ne change (« l'équipe »).
--
-- Règles de pose : create or replace ; ni DROP ni DELETE. Droits inchangés, réaffirmés en fin de fichier.

create or replace function private.reput_base(p_client uuid, p_entite uuid default null, p_instant timestamptz default now())
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  with jour as (select (p_instant at time zone 'Europe/Paris')::date as j),
  reg as (
    select r.* from public.reput_reglages r
    where r.client_id = p_client and (r.entite_id = p_entite or r.entite_id is null)
    order by (r.entite_id is not null) desc limit 1
  )
  select jsonb_build_object(
    'client', p_client,
    'entite', p_entite,
    'instant', p_instant,
    'organisation', (select c.nom from public.clients c where c.id = p_client),
    'installe', exists (select 1 from reg),
    'reglages', (select jsonb_build_object('signature', r.signature, 'formule_appel', r.formule_appel,
                                           'formule_politesse', r.formule_politesse, 'ton', r.ton,
                                           'mention_automatisee', r.mention_automatisee, 'langues', to_jsonb(r.langues),
                                           'actif', r.actif, 'entite', r.entite_id)
                 from reg r),
    'sujets', (select coalesce(jsonb_agg(jsonb_build_object('code', s.code, 'libelle', s.libelle,
                                                            'description', s.description, 'autorisable', s.autorisable,
                                                            'service', (select e.nom from public.equipes e
                                                                        where e.id = s.equipe_id and e.client_id = p_client))
                                         order by s.ordre, s.code), '[]'::jsonb)
               from public.reput_sujets s where s.client_id = p_client and s.actif),
    'fiches', (select coalesce(jsonb_agg(private.reput_fiche_json(c) order by c.sujet, c.genre, c.titre), '[]'::jsonb)
               from public.reput_connaissances c, jour
               where c.client_id = p_client and c.statut = 'validee'
                 and (c.entite_id is null or c.entite_id = p_entite)
                 and c.valide_du <= jour.j and (c.valide_au is null or c.valide_au >= jour.j)))
$function$;

revoke execute on function private.reput_base(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function private.reput_base(uuid, uuid, timestamptz) to service_role;
