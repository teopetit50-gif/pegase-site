-- c4_41 — OFFLOAD : le point du matin et les validations arrivent dans la messagerie (session C4, 27/10/2026 ; audit
-- omega/CHIFFRAGE/offload.md, ligne 39 : « Vous ne changez pas d'outil, puisque tout vous arrive dans votre messagerie. »)
--
-- Le point du matin du socle part déjà par courriel (point_assembler → point_remettre → preparer_envoi, canal email par
-- défaut) avec la section OFFLOAD. Il ne disait des validations qu'un nombre (« 3 messages attendent votre validation »).
-- Désormais :
--   · une section « Messages à valider », adressée au gérant et au valideur, porte CHAQUE message qui attend une
--     décision : sa nature (reprise, retrait, échéance ; corrigé après refus ; retenu et pourquoi), son destinataire,
--     son objet et le début de son texte, avec le lien qui ouvre cette demande dans « À valider » ;
--   · la décision se prend dans l'espace, connecté, d'un clic depuis le courriel : jamais depuis le seul courriel (un
--     lien qui déciderait sans connexion serait une porte ouverte à quiconque lit la boîte) ;
--   · les liens du point mènent à /espace2 (ils menaient encore à /espace) ;
--   · le jour du point se compte au fuseau de l'organisation (c4_31), plus à l'heure de Paris.
--
-- Règles de pose : create or replace, rejouable. Aucun DROP, aucun DELETE.

-- Un texte sur une seule ligne, sans caractère de contrôle (une ligne de point n'en admet pas).
create or replace function private.offload_une_ligne(p text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select btrim(regexp_replace(regexp_replace(coalesce(p, ''), '[[:cntrl:]]+', ' ', 'g'), ' {2,}', ' ', 'g'))
$function$;
revoke execute on function private.offload_une_ligne(text) from public, anon, authenticated;
grant execute on function private.offload_une_ligne(text) to service_role;

-- Les messages d'OFFLOAD qui attendent une décision, un par ligne de point (20 au plus, puis le reste en une ligne).
create or replace function private.offload_point_validations(p_client uuid, p_limite integer default 20)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_items jsonb := '[]'::jsonb;
  r record;
  v_n integer;
  v_nature text;
  v_extrait text;
  v_ligne text;
begin
  for r in
    select d.id, d.objet_type, d.type_action, d.payload, d.cree_le
    from public.demandes_validation d
    where d.client_id = p_client and d.module = 'offload' and d.statut = 'en_attente'
    order by d.cree_le, d.id
    limit greatest(1, least(coalesce(p_limite, 20), 49))
  loop
    v_nature := case r.objet_type when 'offload_reprises' then 'Reprise' when 'offload_affaires' then 'Retrait'
                                  when 'offload_echeances' then 'Échéance' else 'Message' end
      || case when r.payload ? 'reprise_de' then ', corrigée après refus' else '' end
      || case when r.type_action = 'offload.message_retenu'
              then ', retenue (' || coalesce(r.payload ->> 'raison', 'à lire') || ')' else '' end;
    -- Le début du texte : sans la salutation, sur une ligne.
    v_extrait := private.offload_une_ligne(regexp_replace(coalesce(r.payload ->> 'corps', ''), '^Bonjour[^\n]*\n+', ''));
    v_ligne := private.offload_une_ligne(format('%s · %s%s — « %s » — %s', v_nature,
                 coalesce(nullif(r.payload #>> '{destinataire,nom}', ''), 'destinataire'),
                 coalesce(' <' || nullif(r.payload #>> '{destinataire,adresse}', '') || '>', ''),
                 left(coalesce(r.payload ->> 'sujet', 'sans objet'), 90), v_extrait));
    v_items := v_items || jsonb_build_object(
      'texte', case when char_length(v_ligne) > 300 then left(v_ligne, 299) || '…' else v_ligne end,
      'gravite', 'attention',
      'lien', '/espace2/validations?demande=' || r.id);
  end loop;
  select count(*) into v_n from public.demandes_validation d
  where d.client_id = p_client and d.module = 'offload' and d.statut = 'en_attente';
  if v_n > jsonb_array_length(v_items) then
    v_items := v_items || jsonb_build_object(
      'texte', format('Et %s autre%s message%s à valider : la file complète est dans « À valider ».',
                      v_n - jsonb_array_length(v_items), case when v_n - jsonb_array_length(v_items) > 1 then 's' else '' end,
                      case when v_n - jsonb_array_length(v_items) > 1 then 's' else '' end),
      'gravite', 'info', 'lien', '/espace2/validations');
  end if;
  return v_items;
end $function$;
revoke execute on function private.offload_point_validations(uuid, integer) from public, anon, authenticated;
grant execute on function private.offload_point_validations(uuid, integer) to service_role;

-- Le dépôt du point : la section des comptes (gérant, valideur, collaborateur) et celle des messages à valider (gérant,
-- valideur), au jour et à l'heure de l'organisation.
create or replace function private.offload_deposer_points(p_maintenant timestamp with time zone default now())
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k record;
  v_fuseau text;
  v_jour date;
  v_items jsonb;
  v_valider jsonb;
  v_role text;
  v_titre constant text := 'Clients qui décrochent';
  v_titre_valider constant text := 'Messages à valider';
  n integer := 0;
begin
  for k in select g.client_id from public.offload_reglages g order by g.client_id loop
    begin
      v_fuseau := private.offload_fuseau(k.client_id);
      if (p_maintenant at time zone v_fuseau)::time < time '05:00' then
        continue;
      end if;
      v_jour := (p_maintenant at time zone v_fuseau)::date;
      v_items := replace(replace(private.offload_point_lignes(k.client_id, v_jour)::text,
                                 '"/espace/offload"', '"/espace2/offload"'),
                         '"/espace/validations"', '"/espace2/validations"')::jsonb;
      v_valider := private.offload_point_validations(k.client_id, 20);
      foreach v_role in array array['gerant', 'valideur', 'collaborateur'] loop
        if jsonb_array_length(v_items) = 0 then
          perform private.retirer_section(k.client_id, 'offload', v_jour, null, v_role, v_titre, null, null);
        else
          perform private.deposer_section(k.client_id, 'offload', v_jour, null, v_role, v_titre, v_items,
                                          null, null, false, p_maintenant, false, 45);
        end if;
      end loop;
      foreach v_role in array array['gerant', 'valideur'] loop
        if jsonb_array_length(v_valider) = 0 then
          perform private.retirer_section(k.client_id, 'offload', v_jour, null, v_role, v_titre_valider, null, null);
        else
          perform private.deposer_section(k.client_id, 'offload', v_jour, null, v_role, v_titre_valider, v_valider,
                                          null, null, false, p_maintenant, false, 44);
        end if;
      end loop;
      n := n + 1;
    exception when others then
      perform private.lever_alerte_module(k.client_id, 'offload', 'attention',
        'Le point du matin « Clients qui décrochent » n''a pas pu être déposé.',
        jsonb_build_object('erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'point:depot:offload', false, null);
    end;
  end loop;
  return n;
end $function$;
revoke execute on function private.offload_deposer_points(timestamp with time zone) from public, anon, authenticated;
grant execute on function private.offload_deposer_points(timestamp with time zone) to service_role;
