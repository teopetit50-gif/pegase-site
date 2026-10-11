-- LORANI, lot B5-27 — les liens des alertes, du point du matin et des courriels mènent au nouvel espace (11/10/2026).
--
-- Pourquoi : consigne de Teo relayée par le coordinateur (11/10) — le tableau de bord client prend le dessin de
-- omegaai.fr/omega, dans /espace2 ; aucun lien vers l'ancien dessin (/espace sans le 2). /espace2/lorani rend le même
-- écran (components/espace/lorani/EcranLorani.tsx), qui ouvre le dossier visé par ?permis=<id> ou ?projet=<id>.
--
-- Ce qui change (corps de b5_02 et de b5_11, seul le chemin change) :
--   · private.lorani_lien_permis(permis) → /espace2/lorani?permis=<id> ;
--   · private.lorani_lien_projet(projet) → /espace2/lorani?projet=<id> ;
--   · private.lorani_rattacher_reception(reception) : l'alerte « courriel du guichet à ranger » mène à /espace2/lorani.
-- Toutes les alertes, lignes du point du matin et courriels de Lorani passent par ces deux fonctions. Les alertes déjà
-- levées gardent leur ancien lien (/espace/lorani, qui répond toujours). Idempotent (create or replace).

create or replace function private.lorani_lien_permis(p_permis uuid)
returns text language sql immutable set search_path to '' as $$
  select '/espace2/lorani?permis=' || p_permis::text
$$;

create or replace function private.lorani_lien_projet(p_projet uuid)
returns text language sql immutable set search_path to '' as $$
  select '/espace2/lorani?projet=' || p_projet::text
$$;

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
      return jsonb_build_object('reception', r.id, 'module', r.module, 'ignore', case when cardinality(v_numeros) = 0 then 'aucun numéro d''autorisation cité'
                                               else 'numéros sans dossier Lorani' end, 'numeros', to_jsonb(v_numeros));
    end if;
    perform private.lever_alerte_module(r.client_id, 'lorani', 'attention',
      left(format('Courriel du guichet à ranger : « %s » (%s).', left(coalesce(nullif(btrim(r.sujet), ''), 'sans objet'), 90),
                  case when cardinality(v_projets) > 1 then 'il cite plusieurs dossiers'
                       when cardinality(v_numeros) > 0 then 'numéro ' || v_numeros[1] || ' sans permis connu'
                       else 'aucun numéro de dossier' end), 200),
      jsonb_build_object('reception', r.id, 'de', r.de_adresse, 'numeros', to_jsonb(v_numeros), 'lien', '/espace2/lorani'),
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
