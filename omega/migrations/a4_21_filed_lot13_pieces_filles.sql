-- FILED, lot 13 (a4_21) — un fichier qui contient plusieurs factures est découpé en pièces filles, qui vivent leur vie.
--
-- Audit des promesses (§ 2 FILED, n° 2), avec A1. Le lecteur (worker-a1, lecteur/decoupage.ts) lit la mère, garde son
-- premier document, découpe les autres groupes de pages en PDF, les range sous <client>/filed_document/<document>/<nom>
-- (l'uuid du document se déduit de la mère et des pages : rejouable), puis appelle cette porte. Un appel à vide
-- (p_filles = []) sonde la porte sans rien créer.
--
-- public.filed_creer_pieces_filles(p_mere uuid, p_filles jsonb) → jsonb (tableau), service_role seul :
--   p_filles = [{document, chemin, nom_fichier, octets, sha256, pages, type_piece}] ;
--   rend [{pages, piece, document, reference, deja}]. Pour chaque fille : une pièce (pieces.piece_mere_id = la mère,
--   même source, même expéditeur, même déposant) et un document FILED à elle (son numéro de réception, son doublon
--   éventuel, état « en lecture ») ; le socle dépose ensuite la lecture de chaque fille (pieces_demander_lecture). Chaque
--   fille devient sa propre facture, avec ses contrôles, sa validation et ses écritures. Le déposant de la mère reste
--   celui des filles : la séparation saisie / approbation tient. Rejouable : une fille déjà créée (même document) est
--   rendue avec deja = true. Historique sur la mère (« découpée ») et sur chaque fille (« reçue », pages et mère citées).
-- Refus : mère introuvable (P0002), mère d'un autre module, mère déjà fille, chemin hors de
-- <client>/filed_document/<document>/, empreinte invalide (22023).
-- Migration idempotente ; aucune suppression.

create or replace function public.filed_creer_pieces_filles(p_mere uuid, p_filles jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  m public.pieces; md public.filed_documents; f jsonb; v_doc uuid; v_chemin text; v_sha text; v_pages int[]; v_piece uuid;
  v_fuseau text; v_annee smallint; v_numero integer; v_original public.filed_documents; v_ref text; v_rendu jsonb := '[]'::jsonb;
  v_nouvelles text[] := '{}'; v_x public.filed_documents; v_plage text;
begin
  select * into m from public.pieces where id = p_mere;
  if not found then raise exception 'Pièce mère introuvable.' using errcode = 'P0002'; end if;
  if m.module <> 'filed' or coalesce(m.objet_type, '') <> 'filed_document' then
    raise exception 'Seule une pièce FILED se découpe ici (module %).', m.module using errcode = '22023';
  end if;
  if m.piece_mere_id is not null then raise exception 'Une pièce fille ne se redécoupe pas.' using errcode = '22023'; end if;
  if jsonb_typeof(coalesce(p_filles, '[]'::jsonb)) <> 'array' then raise exception 'p_filles est un tableau.' using errcode = '22023'; end if;
  if jsonb_array_length(coalesce(p_filles, '[]'::jsonb)) = 0 then return '[]'::jsonb; end if;   -- sonde du lecteur
  select * into md from public.filed_documents where piece_id = m.id;
  if not found then raise exception 'La pièce mère n''a pas de document FILED.' using errcode = 'P0002'; end if;
  select e.fuseau into v_fuseau from public.entites e where e.id = md.entite_id;

  for f in select * from jsonb_array_elements(p_filles) loop
    begin
      v_doc := (f ->> 'document')::uuid;
    exception when others then
      raise exception 'Fille sans identifiant de document valable.' using errcode = '22023';
    end;
    v_chemin := f ->> 'chemin';
    v_sha := lower(coalesce(f ->> 'sha256', ''));
    select coalesce(array_agg(x::int order by x::int), '{}') into v_pages from jsonb_array_elements_text(coalesce(f -> 'pages', '[]'::jsonb)) x;
    v_plage := case when cardinality(v_pages) = 0 then '?' when cardinality(v_pages) = 1 then v_pages[1]::text
                    else v_pages[1]::text || ' à ' || v_pages[cardinality(v_pages)]::text end;

    select * into v_x from public.filed_documents where id = v_doc;
    if found then
      if v_x.client_id <> m.client_id then raise exception 'Document fille d''une autre organisation.' using errcode = '22023'; end if;
      v_rendu := v_rendu || jsonb_build_object('pages', to_jsonb(v_pages), 'piece', v_x.piece_id, 'document', v_x.id,
                                               'reference', v_x.reference, 'deja', true);
      continue;
    end if;
    if v_chemin is null or not starts_with(v_chemin, m.client_id::text || '/filed_document/' || v_doc::text || '/')
       or char_length(v_chemin) <= char_length(m.client_id::text || '/filed_document/' || v_doc::text || '/') then
      raise exception 'Le fichier d''une fille se range à %/filed_document/%/…', m.client_id, v_doc using errcode = '22023';
    end if;
    if v_sha !~ '^[0-9a-f]{64}$' then raise exception 'Empreinte SHA-256 de la fille invalide.' using errcode = '22023'; end if;

    v_annee := extract(year from now() at time zone coalesce(v_fuseau, 'Europe/Paris'))::smallint;
    v_numero := private.filed_prochain_numero(m.client_id, 'reception', v_annee);
    v_original := null;
    select d.* into v_original from public.filed_documents d
     where d.client_id = m.client_id and d.sha256 = v_sha and d.etat <> 'doublon' order by d.recu_le, d.numero_reception limit 1;
    insert into public.pieces (client_id, module, objet_type, objet_id, source, expediteur, depose_par, nom_fichier, mime, octets,
                               sha256, chemin, statut, piece_mere_id)
    values (m.client_id, 'filed', 'filed_document', v_doc::text, m.source, m.expediteur, m.depose_par,
            left(coalesce(nullif(btrim(f ->> 'nom_fichier'), ''), regexp_replace(v_chemin, '^.*/', '')), 200), 'application/pdf',
            greatest(coalesce((f ->> 'octets')::bigint, 0), 0), v_sha, v_chemin, 'recue', m.id)
    returning id into v_piece;
    insert into public.filed_documents (id, client_id, entite_id, annee_reception, numero_reception, piece_id, source, expediteur,
                                        depose_par, nom_fichier, sha256, etat, doublon_de, motif, traite_le, recu_le)
    values (v_doc, m.client_id, md.entite_id, v_annee, v_numero, v_piece, md.source, md.expediteur, md.depose_par,
            left(coalesce(nullif(btrim(f ->> 'nom_fichier'), ''), regexp_replace(v_chemin, '^.*/', '')), 200), v_sha,
            case when v_original.id is null then 'en_lecture' else 'doublon' end, v_original.id,
            case when v_original.id is null then null
                 else left(format('Même fichier que la pièce %s : écartée, elle reste consultable.', v_original.reference), 500) end,
            case when v_original.id is null then null else now() end, md.recu_le);
    select d.reference into v_ref from public.filed_documents d where d.id = v_doc;
    perform private.filed_historiser(m.client_id, v_doc, 'filed_document', v_doc::text, 'recu',
      format('Pièce tirée du fichier %s (pages %s), enregistrée sous le numéro %s.', md.reference, v_plage, v_ref),
      jsonb_build_object('reference', v_ref, 'mere', md.id, 'reference_mere', md.reference, 'pages', to_jsonb(v_pages),
                         'type_piece', f ->> 'type_piece'));
    v_nouvelles := v_nouvelles || v_ref;
    v_rendu := v_rendu || jsonb_build_object('pages', to_jsonb(v_pages), 'piece', v_piece, 'document', v_doc, 'reference', v_ref, 'deja', false);
  end loop;

  if cardinality(v_nouvelles) > 0 then
    perform private.filed_historiser(m.client_id, md.id, 'filed_document', md.id::text, 'decoupee',
      format('Le fichier contenait plusieurs documents : %s pièce(s) fille(s) créée(s) (%s) ; celle-ci garde le premier.',
             cardinality(v_nouvelles), array_to_string(v_nouvelles, ', ')),
      jsonb_build_object('filles', to_jsonb(v_nouvelles)));
  end if;
  return v_rendu;
end $$;
comment on function public.filed_creer_pieces_filles(uuid, jsonb) is
  'Lecteur (A1) : crée les pièces filles d''un fichier FILED à plusieurs documents ; chacune a son document FILED et sa lecture. Appel à vide = sonde. Rejouable. service_role.';
revoke all on function public.filed_creer_pieces_filles(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.filed_creer_pieces_filles(uuid, jsonb) to service_role;
