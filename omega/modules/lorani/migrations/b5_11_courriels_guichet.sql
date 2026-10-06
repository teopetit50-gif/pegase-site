-- LORANI, lot B5-11 — les courriels du guichet numérique se rangent seuls dans le bon dossier (vague 3, manque n° 1).
--
-- Pourquoi : depuis le 1er janvier 2022, les demandes d'autorisation d'urbanisme se déposent en ligne (SVE,
-- art. L.112-8 CRPA ; art. L.423-3 du code de l'urbanisme). Le pétitionnaire ne voit pas PLAT'AU : la mairie lui écrit
-- par courriel. L'accusé de réception électronique (ARE) y tient lieu de récépissé (art. L.112-11 CRPA), puis viennent
-- par la même voie la demande de pièces, la majoration du délai, l'arrêté. Jusqu'ici l'agence devait enregistrer chaque
-- pièce jointe et la redéposer dans l'écran. Sources et raisonnement : omega/NOTES-B5.md, « Vague 3 ».
--
-- Ce qui est posé :
--   · private.abonnements : reception.nouvelle → travail lorani.reception (module lorani).
--   · private.lorani_numeros_cites(text) → text[] : les numéros d'autorisation cités dans un texte
--     (« PC 044 109 26 A0042 », « DP0441092600107 », « PA 044109 26 N0001 »), normalisés comme
--     private.lorani_numero_dossier, sans doublon, dans l'ordre du texte.
--   · private.lorani_rattacher_reception(bigint) → jsonb : cherche ces numéros dans le sujet, le corps (texte ou HTML)
--     et les noms des pièces jointes ; s'ils désignent les permis actifs d'UN seul dossier Lorani de l'organisation,
--     chaque pièce jointe lisible (PDF, PNG, JPEG) devient une pièce du dossier (source « courriel », statut « recue ») :
--     le socle dépose alors lui-même le travail lecteur.lire, et la lecture suit la chaîne des courriers déjà prouvée
--     (b5_01 à b5_10). Idempotent (contrainte pieces_une_fois : une pièce déjà rattachée ne l'est pas deux fois).
--     L'empreinte est celle que la réception porte (« sha256 ») ; à défaut, celle du chemin dans le bucket, qui est
--     propre à chaque réception (<client>/receptions/<identifiant>/<nom>).
--     Un courriel sans pièce jointe sur un dossier reconnu (un ARE envoyé dans le corps du message) : alerte « à
--     lire » sur le dossier, avec le sujet. Un courriel arrivé sur une boîte Lorani (module lorani) sans numéro
--     reconnu, ou qui en cite plusieurs dossiers : alerte « à ranger ». Un courriel d'un autre module sans numéro
--     Lorani est ignoré, sans bruit. La réception d'une boîte Lorani passe « traitee » quand elle est rangée ; celle
--     d'un autre module garde son statut.
--   · private.lorani_lectures_passage() (cron du socle, toutes les cinq minutes) : prend aussi lorani.reception.
--     Corps du socle recopié, seul le tableau des genres et l'aiguillage changent.
-- Journal : lorani.courriel_rattache. Migration idempotente (where not exists, create or replace) ; rien n'est retiré.

insert into private.abonnements (evenement, module, genre)
select 'reception.nouvelle', 'lorani', 'lorani.reception'
where not exists (select 1 from private.abonnements a
                  where a.evenement = 'reception.nouvelle' and a.module = 'lorani' and a.genre = 'lorani.reception');

CREATE OR REPLACE FUNCTION private.lorani_numeros_cites(p_texte text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select coalesce(array_agg(n order by premier), '{}'::text[])
  from (select private.lorani_numero_dossier(m[1]) as n, min(o) as premier
        from regexp_matches(coalesce(p_texte, ''),
                            '((?:PC|PA|PD|DP|CU)[[:space:].-]*[0-9AB]{3}[[:space:].-]*[0-9]{3}[[:space:].-]*[0-9]{2}[[:space:].-]*[A-Z0-9][[:space:].-]*[0-9]{4})',
                            'gi') with ordinality as t(m, o)
        group by 1) x
  where n is not null
$function$;
REVOKE EXECUTE ON FUNCTION private.lorani_numeros_cites(text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.lorani_rattacher_reception(p_reception bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r public.receptions;
  v_texte text;
  v_numeros text[];
  v_projets uuid[];
  pr public.lorani_projets;
  v_permis text;
  e jsonb;
  v_nom text;
  v_mime text;
  v_sha text;
  v_id uuid;
  v_pieces jsonb := '[]'::jsonb;
  n_jointes integer := 0;
  v_lorani boolean;
begin
  select * into r from public.receptions where id = p_reception;
  if not found then
    return jsonb_build_object('ignore', 'réception absente');
  end if;
  v_lorani := r.module = 'lorani';

  v_texte := concat_ws(E'\n', r.sujet, r.corps,
                       regexp_replace(regexp_replace(coalesce(r.corps_html, ''), '<(br|/p|/div|/td|/tr)[^>]*>', E'\n', 'gi'), '<[^>]+>', ' ', 'g'),
                       (select string_agg(x ->> 'nom', E'\n') from jsonb_array_elements(r.pieces) x));
  v_numeros := private.lorani_numeros_cites(v_texte);

  select coalesce(array_agg(distinct x.projet_id), '{}'::uuid[]) into v_projets
  from public.lorani_permis x
  where x.client_id = r.client_id and x.actif and x.numero is not null
    and private.lorani_numero_dossier(x.numero) = any (v_numeros);

  if cardinality(v_projets) <> 1 then
    if not v_lorani then
      return jsonb_build_object('ignore', case when cardinality(v_numeros) = 0 then 'aucun numéro d''autorisation cité'
                                               else 'numéros sans dossier Lorani' end, 'numeros', to_jsonb(v_numeros));
    end if;
    perform private.lever_alerte_module(r.client_id, 'lorani', 'attention',
      left(format('Courriel du guichet à ranger : « %s » (%s).', left(coalesce(nullif(btrim(r.sujet), ''), 'sans objet'), 90),
                  case when cardinality(v_projets) > 1 then 'il cite plusieurs dossiers'
                       when cardinality(v_numeros) > 0 then 'numéro ' || v_numeros[1] || ' sans permis connu'
                       else 'aucun numéro de dossier' end), 200),
      jsonb_build_object('reception', r.id, 'de', r.de_adresse, 'numeros', to_jsonb(v_numeros), 'lien', '/espace/lorani'),
      'courriel:' || r.id, true, null);
    return jsonb_build_object('reception', r.id, 'range', false, 'numeros', to_jsonb(v_numeros), 'dossiers', cardinality(v_projets));
  end if;

  select * into pr from public.lorani_projets where id = v_projets[1];
  select string_agg(x.numero, ', ' order by x.cree_le) into v_permis
  from public.lorani_permis x
  where x.client_id = r.client_id and x.projet_id = pr.id and x.actif
    and private.lorani_numero_dossier(x.numero) = any (v_numeros);

  for e in select x from jsonb_array_elements(r.pieces) x loop
    v_nom := left(coalesce(nullif(btrim(e ->> 'nom'), ''), 'piece-jointe'), 255);
    v_mime := lower(coalesce(nullif(e ->> 'mime', ''),
                             case when v_nom ~* '\.pdf$' then 'application/pdf'
                                  when v_nom ~* '\.png$' then 'image/png'
                                  when v_nom ~* '\.jpe?g$' then 'image/jpeg' end, ''));
    continue when v_mime not in ('application/pdf', 'image/png', 'image/jpeg') or coalesce(e ->> 'chemin', '') = '';
    n_jointes := n_jointes + 1;
    v_sha := case when lower(coalesce(e ->> 'sha256', '')) ~ '^[0-9a-f]{64}$' then lower(e ->> 'sha256')
                  else encode(sha256(convert_to(e ->> 'chemin', 'UTF8')), 'hex') end;
    v_id := null;
    insert into public.pieces (client_id, module, objet_type, objet_id, source, depose_par, nom_fichier, mime, octets, sha256,
                               chemin, statut)
    values (r.client_id, 'lorani', 'lorani_projet', pr.id::text, 'courriel', null, v_nom, v_mime,
            greatest(coalesce((e ->> 'taille')::bigint, 0), 0), v_sha, e ->> 'chemin', 'recue')
    on conflict on constraint pieces_une_fois do nothing
    returning id into v_id;
    if v_id is not null then
      v_pieces := v_pieces || to_jsonb(v_id);
    end if;
  end loop;

  if n_jointes = 0 then
    perform private.lever_alerte_module(r.client_id, 'lorani', 'attention',
      left(format('« %s » (%s) : courriel du guichet sans pièce jointe, à lire : « %s ».', left(pr.nom, 60), v_permis,
                  left(coalesce(nullif(btrim(r.sujet), ''), 'sans objet'), 80)), 200),
      jsonb_build_object('projet', pr.id, 'reception', r.id, 'de', r.de_adresse, 'lien', private.lorani_lien_projet(pr.id)),
      'courriel:' || r.id, true, private.lorani_chef_de_projet(r.client_id, pr.id));
  end if;

  if jsonb_array_length(v_pieces) > 0 or n_jointes = 0 then
    perform private.journaliser_module(r.client_id, 'lorani', 'lorani.courriel_rattache', 'lorani_projet', pr.id::text,
      jsonb_build_object('reception', r.id, 'sujet', left(r.sujet, 200), 'de', r.de_adresse, 'numeros', to_jsonb(v_numeros),
                         'pieces', v_pieces),
      pr.entite_id);
  end if;
  if (v_lorani or r.module is null) and r.statut = 'nouvelle' then
    update public.receptions set statut = 'traitee' where id = r.id;
  end if;
  return jsonb_build_object('reception', r.id, 'range', true, 'projet', pr.id, 'numeros', to_jsonb(v_numeros),
                            'pieces', v_pieces, 'jointes', n_jointes);
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_rattacher_reception(bigint) FROM PUBLIC;

-- Le passage des lectures (corps du socle) prend aussi les courriels.
CREATE OR REPLACE FUNCTION private.lorani_lectures_passage()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  t public.travaux;
  r record;
  v_res jsonb;
  n integer := 0;
  n_erreurs integer := 0;
  n_agences integer := 0;
begin
  for t in select * from private.prendre_travaux(array['lorani.piece_lue', 'lorani.reception'], 200, interval '10 minutes', 'lorani_lecture') loop
    begin
      if t.genre = 'lorani.reception' then
        v_res := private.lorani_rattacher_reception((t.charge ->> 'reception')::bigint);
      else
        v_res := private.lorani_lire_piece((t.charge ->> 'piece')::uuid);
      end if;
      perform private.finir_travail(t.id, v_res);
      n := n + 1;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 2000));
      n_erreurs := n_erreurs + 1;
    end;
  end loop;
  -- Le battement de chaque agence qui a des dossiers en cours, même à vide.
  for r in select distinct pr.client_id from public.lorani_projets pr where pr.actif loop
    perform private.battre(r.client_id, 'lorani_lecture', jsonb_build_object('passage', now()), interval '15 minutes');
    n_agences := n_agences + 1;
  end loop;
  return jsonb_build_object('pieces', n, 'erreurs', n_erreurs, 'agences', n_agences);
end $function$;
