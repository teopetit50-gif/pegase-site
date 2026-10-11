-- recupere 20261005181500 filed_lot4f_decider_sans_separation
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Note : a4_07 (1500b1a), correctif.
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête 08bae2a7-2e4f-44bc-a181-54f6b5e0469a (mcp__Supabase__execute_sql, 2026-10-05T17:49:32.883Z, résultat : réussi)
-- a4_07 (commit 1500b1a) : filed_decider_facture sans redéposition ni issue 'separation' (la séparation est refusée par preparer_approbation).
create or replace function private.filed_decider_facture(p_d public.demandes_validation, p_decideur uuid, p_commentaire text)
returns text language plpgsql security definer set search_path to '' as $$
declare
  v_f public.filed_factures; v_v public.filed_validations; v_decideurs uuid[]; v_a public.filed_archives; r record;
begin
  select * into v_f from public.filed_factures where client_id = p_d.client_id and id::text = p_d.objet_id for update;
  if not found then return 'facture_effacee'; end if;
  select * into v_v from public.filed_validations where demande_id = p_d.id;

  if p_d.statut = 'approuvee' and p_d.politique_id is not null then
    update public.demandes_validation set statut = 'echec_execution', motif_echec = 'Une facture n''est jamais validée d''office par un accord permanent.' where id = p_d.id;
    update public.filed_validations set issue = 'refus_accord', decide_le = now() where demande_id = p_d.id;
    return 'refuse_accord';
  end if;

  if v_f.statut <> 'a_valider' or v_f.version <> coalesce((p_d.payload->>'version')::integer, v_f.version) then
    if p_d.statut = 'approuvee' then update public.demandes_validation set statut = 'executee' where id = p_d.id; end if;
    update public.filed_validations set issue = 'perimee', decide_le = now() where demande_id = p_d.id;
    perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'decision_perimee',
      format('Décision (%s) arrivée après un changement de la facture (statut %s, version %s) : sans effet.', p_d.statut, v_f.statut, v_f.version),
      jsonb_build_object('demande', p_d.id));
    return 'perimee';
  end if;

  if p_d.statut = 'approuvee' then
    -- Celui qui saisit et celui qui approuve ne sont pas la même personne : le socle le refuse à l'insertion
    -- de l'approbation (preparer_approbation lit payload->'saisi_par', posé par filed_deposer_validation).
    select coalesce(array_agg(distinct coalesce(a.au_nom_de, a.user_id)), '{}') into v_decideurs from public.approbations a where a.demande_id = p_d.id and a.decision = 'approuve';
    update public.filed_factures set statut = 'validee', maj_le = now() where id = v_f.id;
    v_f.statut := 'validee';
    for r in select a.user_id, a.au_nom_de, a.commentaire from public.approbations a where a.demande_id = p_d.id and nullif(btrim(a.commentaire), '') is not null loop
      insert into public.filed_factures_annexes (client_id, facture_id, document_id, nature, texte, auteur_id, demande_id)
      values (v_f.client_id, v_f.id, v_f.document_id, 'approbation', left(r.commentaire, 2000), r.user_id, p_d.id);
    end loop;
    v_a := private.filed_archiver(v_f.id);
    perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'validee',
      format('Validée par %s personne(s)%s : classée, empreinte au journal (ligne %s).', cardinality(v_decideurs),
             case when v_v.niveau = 2 then ' (direction)' else '' end, v_a.journal_id),
      jsonb_build_object('demande', p_d.id, 'decideurs', to_jsonb(v_decideurs), 'archive', v_a.id, 'journal', v_a.journal_id, 'version', v_f.version));
    perform private.filed_journaliser(v_f.client_id, 'filed.validation', 'filed_facture', v_f.id::text,
      jsonb_build_object('demande', p_d.id, 'decision', 'approuvee', 'niveau', v_v.niveau, 'decideurs', to_jsonb(v_decideurs), 'version', v_f.version, 'archive', v_a.id), v_f.entite_id);
    update public.filed_validations set issue = 'approuvee', decide_le = now() where demande_id = p_d.id;
    update public.demandes_validation set statut = 'executee' where id = p_d.id;
    if not exists (select 1 from public.filed_imputations i where i.facture_id = v_f.id and i.statut in ('proposee', 'validee')) then
      perform private.filed_proposer_imputation(v_f.id, 'apprise');
    end if;
    return 'facture_validee';

  elsif p_d.statut = 'rejetee' then
    update public.filed_factures set statut = 'refusee', maj_le = now() where id = v_f.id;
    insert into public.filed_factures_annexes (client_id, facture_id, document_id, nature, texte, auteur_id, demande_id)
    values (v_f.client_id, v_f.id, v_f.document_id, 'motif_refus', left(coalesce(nullif(btrim(p_commentaire), ''), 'Refusée sans motif écrit.'), 2000), p_decideur, p_d.id);
    perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'refusee',
      'Refusée par une personne' || coalesce(' : ' || left(btrim(p_commentaire), 300), '.'), jsonb_build_object('demande', p_d.id, 'par', p_decideur));
    perform private.filed_journaliser(v_f.client_id, 'filed.validation', 'filed_facture', v_f.id::text,
      jsonb_build_object('demande', p_d.id, 'decision', 'rejetee', 'version', v_f.version), v_f.entite_id);
    perform private.lever_alerte_module(v_f.client_id, 'filed', 'attention',
      left(format('Facture %s refusée%s', coalesce(v_f.numero, '?'), coalesce(' : ' || left(btrim(p_commentaire), 120), '.')), 200),
      jsonb_build_object('facture', v_f.id, 'demande', p_d.id), 'facture_refusee:' || v_f.id::text, true, null);
    update public.filed_validations set issue = 'rejetee', decide_le = now() where demande_id = p_d.id;
    update public.filed_charges_attendues set statut = 'attendue', facture_id = null, recue_le = null where facture_id = v_f.id and statut = 'recue';
    return 'facture_refusee';
  end if;

  update public.filed_validations set issue = 'expiree', decide_le = now() where demande_id = p_d.id;
  return 'expiree';
end $$;
comment on function private.filed_decider_facture(public.demandes_validation, uuid, text) is
  'Exécute la décision de la file sur une facture : validée (classée, archivée au journal) ou refusée (motif attaché).';
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20261005181500', 'filed_lot4f_decider_sans_separation', array['-- a4_07 rejoué (commit 1500b1a) : filed_decider_facture sans redéposition'])
on conflict do nothing;
select 'a4_07 rejoué' as r, position('separation' in pg_get_functiondef('private.filed_decider_facture'::regproc)) = 0 as sans_separation;
