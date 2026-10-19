-- a4_61 (FILED lot 53) : les documents de chantier vont à Daliro.
--
-- Décision de Teo (19/10/2026, 15 h Z). Demande écrite par B6 :
-- omega/modules/daliro/DEMANDE-SOCLE-documents-chantier.md, section 2
-- (worker-b6, 1f3b6e88). Côté Daliro : b6_37 (ouvrier btp_ouvrier, genre
-- daliro.document, private.btp_integrer_document).
--
--   1. filed_documents_nature_check accepte « document_chantier » (la
--      contrainte est retirée puis remise, élargie : seul DROP du lot).
--   2. private.filed_nature_de : chantier_pv_reserves, chantier_plan et
--      chantier_note_technique donnent document_chantier ;
--      private.filed_libelle_nature('document_chantier') donne « document de
--      chantier » ; private.filed_etat_de('document_chantier') donne « classe »
--      (rangé dans FILED, FILED n'a rien à en faire).
--   3. private.filed_integrer_piece : un document de chantier dépose le travail
--      daliro.document, seulement si Daliro est installé chez le client
--      (public.btp_reglages). La pièce reste celle de FILED.
--
-- Ces quatre fonctions du socle ne sont pas toutes extraites dans
-- omega/SOCLE-EXTRAITS-*.sql : rien n'est réécrit en entier. Chacune est posée
-- par repère sur sa définition servie (pg_get_functiondef) : une garde en tête
-- pour les trois petites, un « elsif » après la branche bon_livraison pour
-- filed_integrer_piece (définition de référence : SOCLE-EXTRAITS-COMMUN.sql,
-- photographie du 5/10). Si un repère manque, la pose s'arrête sans rien
-- changer. Rejouable : chaque étape se reconnaît à sa marque « a4_61 ».

-- ─── 1. La nature document_chantier ─────────────────────────────────────
do $$
declare
  v_def text;
  v_neuf text;
begin
  select pg_get_constraintdef(c.oid) into v_def
  from pg_constraint c
  where c.conrelid = 'public.filed_documents'::regclass and c.conname = 'filed_documents_nature_check';
  if v_def is null then
    raise exception 'a4_61 : contrainte filed_documents_nature_check introuvable';
  end if;
  if v_def like '%''document_chantier''%' then
    return;
  end if;
  if (length(v_def) - length(replace(v_def, '::text]', ''))) / length('::text]') <> 1 then
    raise exception 'a4_61 : forme inattendue de filed_documents_nature_check : %', v_def;
  end if;
  v_neuf := replace(v_def, '::text]', '::text, ''document_chantier''::text]');
  alter table public.filed_documents drop constraint filed_documents_nature_check;
  execute 'alter table public.filed_documents add constraint filed_documents_nature_check ' || v_neuf;
end $$;

-- ─── 2. Nature, libellé, état : une garde en tête de chaque fonction ──────
-- Outil de la pose, pour cette session seulement (pg_temp).
create or replace function pg_temp.a4_61_garde(p_fn text, p_cles text[], p_rend text)
returns void language plpgsql as $$
declare
  v_oid regprocedure;
  v_lang text;
  v_src text;
  v_atomique boolean;
  v_def text;
  v_corps text;
  v_n int;
begin
  v_oid := to_regprocedure(p_fn);
  if v_oid is null then
    raise exception 'a4_61 : fonction % introuvable', p_fn;
  end if;
  select l.lanname, p.prosrc, p.prosqlbody is not null into v_lang, v_src, v_atomique
  from pg_proc p join pg_language l on l.oid = p.prolang
  where p.oid = v_oid;
  if (select p.prorettype from pg_proc p where p.oid = v_oid) <> 'text'::regtype then
    raise exception 'a4_61 : % ne rend pas du texte', p_fn;
  end if;
  v_def := pg_get_functiondef(v_oid);
  if position('a4_61' in v_def) > 0 then
    return;
  end if;

  if v_lang = 'plpgsql' then
    -- La garde se place après le premier « begin » seul sur sa ligne : celui du bloc principal.
    v_n := (select count(*) from regexp_matches(v_def, E'\\n[ \\t]*begin[ \\t]*\\n', 'gi'));
    if v_n < 1 then
      raise exception 'a4_61 : repère « begin » introuvable dans %', p_fn;
    end if;
    v_def := regexp_replace(v_def, E'\\n([ \\t]*begin[ \\t]*)\\n',
      E'\n\\1\n' || format(E'  if $1 = any (%L::text[]) then return %L; end if;  /* a4_61 */\n', p_cles, p_rend), 'i');
  elsif v_lang = 'sql' and not v_atomique then
    -- Une seule requête : elle est reprise telle quelle sous la garde.
    v_corps := regexp_replace(v_src, E'[\\s;]+$', '');
    if position(';' in v_corps) > 0 then
      raise exception 'a4_61 : % a plusieurs requêtes, garde non posée', p_fn;
    end if;
    v_n := (length(v_def) - length(replace(v_def, v_src, ''))) / nullif(length(v_src), 0);
    if v_n is distinct from 1 then
      raise exception 'a4_61 : corps de % introuvable une seule fois (%)', p_fn, v_n;
    end if;
    v_def := replace(v_def, v_src,
      format(E'\n  /* a4_61 */ select case when $1 = any (%L::text[]) then %L::text else (%s\n  ) end\n', p_cles, p_rend, v_corps));
  else
    raise exception 'a4_61 : % est en langage % (corps atomique : %), garde non posée', p_fn, v_lang, v_atomique;
  end if;
  execute v_def;
end $$;

do $$
begin
  perform pg_temp.a4_61_garde('private.filed_nature_de(text)',
    array['chantier_pv_reserves', 'chantier_plan', 'chantier_note_technique'], 'document_chantier');
  perform pg_temp.a4_61_garde('private.filed_libelle_nature(text)', array['document_chantier'], 'document de chantier');
  perform pg_temp.a4_61_garde('private.filed_etat_de(text)', array['document_chantier'], 'classe');
end $$;

-- ─── 3. filed_integrer_piece : le travail daliro.document ──────────────────
do $$
declare
  v_def text;
  v_repere constant text := E'    return private.filed_integrer_reception(v_doc.id);\n  end if;';
  v_n int;
begin
  v_def := pg_get_functiondef('private.filed_integrer_piece(uuid)'::regprocedure);
  if position('a4_61' in v_def) > 0 then
    return;
  end if;
  v_n := (length(v_def) - length(replace(v_def, v_repere, ''))) / length(v_repere);
  if v_n <> 1 then
    raise exception 'a4_61 : repère de filed_integrer_piece trouvé % fois (1 attendu)', v_n;
  end if;
  v_def := replace(v_def, v_repere,
    E'    return private.filed_integrer_reception(v_doc.id);\n'
    || E'  elsif v_nature = ''document_chantier'' then  /* a4_61 : Daliro reçoit le document, s''il est installé */\n'
    || E'    if exists (select 1 from public.btp_reglages r where r.client_id = v_doc.client_id) then\n'
    || E'      perform private.deposer_travail(v_doc.client_id, ''daliro'', ''daliro.document'',\n'
    || E'        jsonb_build_object(''piece'', p_piece), ''document:'' || p_piece::text, 0::smallint);\n'
    || E'    end if;\n'
    || E'    return ''document_chantier'';\n'
    || E'  end if;');
  execute v_def;
end $$;
