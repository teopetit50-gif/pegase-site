-- a4_87 (FILED lot 79) : TFILED-28 — une facture refusée se corrige en vue de sa reprise (a4_86), et seulement alors.
--
-- Avant : filed_corriger_facture passait par filed_exiger_facture, qui refuse toute facture « refusee » (« elle ne se
-- corrige plus ») ; filed_integrer_facture laissait aussi une facture refusée telle quelle (sauf relecture attendue,
-- a1_02). La reprise après refus (a4_86) attend pourtant une correction : toute reprise FILED finissait en
-- « reprise impossible » au bout de 24 h.
--
-- Maintenant, une facture refusée se corrige par filed_corriger_facture si, et seulement si :
--   · une reprise FILED de son refus est « à faire » (private.reprises, socle 19az) ;
--   · c'est une personne qui corrige (auth.uid() présent), avec l'un des rôles de la correction ordinaire, dans son
--     périmètre ;
--   · le refus n'est pas pour « Doublon » ni « Hors budget ou hors période » (une correction n'y répond pas) ;
--   · le refus date de 24 h au plus (le délai de filed_traiter_reprises).
-- Sinon, le refus d'avant reste (55000, « elle ne se corrige plus »), avec la raison quand une reprise existe.
-- La facture reste « refusee » après la correction : le cron (filed_traiter_reprises) voit le changement, recontrôle et
-- propose la reprise, qui repasse par une nouvelle validation humaine.
-- filed_integrer_facture accepte la facture refusée pour la correction en cours (réglage local à la transaction
-- omega.filed_correction_reprise, posé par la porte puis effacé) ; une autre lecture du moteur ne la change pas, hors la
-- relecture avec la consigne du valideur (a1_02, porte d'A1, inchangée).
-- Deux repères (filed_corriger_facture, filed_integrer_facture) ; la pose s'arrête si l'un n'est pas trouvé une fois.
-- Rejouable ; aucune suppression.

-- La reprise FILED « à faire » du dernier refus d'une facture (null s'il n'y en a pas).
create or replace function private.filed_reprise_ouverte(p_facture uuid)
returns private.reprises language sql stable security definer set search_path to '' as $$
  select r.* from private.reprises r
    join public.demandes_validation d on d.id = r.demande_id
   where r.module = 'filed' and r.statut = 'a_faire'
     and d.objet_type = 'filed_facture' and d.objet_id = p_facture::text
   order by r.cree_le desc
   limit 1
$$;

-- La garde de la correction : celle d'avant, sauf pour une facture refusée dont la reprise est ouverte.
create or replace function private.filed_exiger_facture_corrigeable(p_facture uuid, p_roles text[])
returns public.filed_factures language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; r private.reprises; v_motif text;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found or v_f.statut <> 'refusee' then
    return private.filed_exiger_facture(p_facture, p_roles);
  end if;
  perform private.filed_exiger_acteur(v_f.client_id, p_roles, v_f.entite_id);
  if (select auth.uid()) is not null
     and not private.voit_objet(v_f.client_id, 'filed_document', v_f.document_id::text) then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  r := private.filed_reprise_ouverte(v_f.id);
  if r.demande_id is null then
    raise exception 'Cette facture est décidée (refusee) : elle ne se corrige plus.' using errcode = '55000';
  end if;
  if (select auth.uid()) is null then
    raise exception 'Une facture refusée se corrige, pour sa reprise, par une personne.' using errcode = '42501';
  end if;
  v_motif := r.consigne ->> 'motif';
  if v_motif in ('Doublon', 'Hors budget ou hors période') then
    raise exception 'Refusée pour « % » : une correction de la pièce n''y répond pas, elle ne se corrige plus.', v_motif
      using errcode = '55000';
  end if;
  if r.cree_le <= now() - interval '24 hours' then
    raise exception 'Refusée il y a plus de 24 h : le délai de la reprise est passé, elle ne se corrige plus.'
      using errcode = '55000';
  end if;
  perform set_config('omega.filed_correction_reprise', v_f.id::text, true);
  return v_f;
end $$;

revoke all on function private.filed_reprise_ouverte(uuid) from public, anon, authenticated;
revoke all on function private.filed_exiger_facture_corrigeable(uuid, text[]) from public, anon, authenticated;
grant execute on function private.filed_reprise_ouverte(uuid) to service_role;

-- filed_corriger_facture : la nouvelle garde, et le réglage effacé après l'intégration.
do $$
declare
  v_def text := pg_get_functiondef('private.filed_corriger_facture(uuid,jsonb,text)'::regprocedure);
  v_garde constant text := 'v_f := private.filed_exiger_facture(p_facture, ';
  v_integ constant text := E'  v_statut := private.filed_integrer_facture(v_f.document_id);\n';
  v_n int; v_m int;
begin
  if position('filed_exiger_facture_corrigeable' in v_def) > 0 then return; end if;
  v_n := (length(v_def) - length(replace(v_def, v_garde, ''))) / length(v_garde);
  v_m := (length(v_def) - length(replace(v_def, v_integ, ''))) / length(v_integ);
  if v_n <> 1 or v_m <> 1 then
    raise exception 'a4_87 : repères de filed_corriger_facture trouvés % et % fois (1 attendu)', v_n, v_m;
  end if;
  execute replace(replace(v_def, v_garde, 'v_f := private.filed_exiger_facture_corrigeable(p_facture, '),
                  v_integ, v_integ || E'  perform set_config(''omega.filed_correction_reprise'', '''', true);  -- a4_87\n');
end $$;

-- filed_integrer_facture : une facture refusée s'intègre aussi pour la correction de sa reprise.
do $$
declare
  v_def text := pg_get_functiondef('private.filed_integrer_facture(uuid)'::regprocedure);
  v_rep constant text := 'and private.filed_relecture_attendue(v_doc.piece_id)) then  -- a1_02';
  v_n int;
begin
  if position('omega.filed_correction_reprise' in v_def) > 0 then return; end if;
  v_n := (length(v_def) - length(replace(v_def, v_rep, ''))) / length(v_rep);
  if v_n <> 1 then raise exception 'a4_87 : repère « a1_02 » de filed_integrer_facture trouvé % fois (1 attendu)', v_n; end if;
  execute replace(v_def, v_rep,
    'and (private.filed_relecture_attendue(v_doc.piece_id)'
    || ' or current_setting(''omega.filed_correction_reprise'', true) = v_f.id::text)) then  -- a1_02, a4_87');
end $$;
