-- a1_02_filed_relecture_reprise.sql — la reprise après refus de FILED relit la facture avec la consigne du refus
-- (A1, 25/10/2026). À poser APRÈS 19az (socle), a4_86 (reprise FILED, version réduite) et a1_01 (porte du lecteur).
--
-- a4_86 attend une correction de la facture refusée (24 h au plus) ; il prévoyait « la relecture, quand le lecteur
-- saura relire avec la consigne ». Ce lot la branche :
--   · private.filed_relire_pour_reprise(refusee, document, consigne) : une fois par reprise, la pièce de la facture
--     est relue par private.lecteur_relire, avec « Motif du refus : … Commentaire du valideur : … » ;
--   · filed_traiter_reprises l'appelle quand rien n'a changé et que le délai court encore (repère « elle attend ») ;
--   · filed_integrer_facture laisse passer la relecture d'une facture « refusee » dont la reprise est à faire
--     (repère « déjà décidée ») : la facture change de version, le recontrôle garde « refusee », et le cron suivant de
--     a4_86 voit les corrections et propose la reprise, au nom du moteur, à une nouvelle validation humaine.
-- Une relecture qui ne change rien laisse la reprise attendre une correction humaine, puis « reprise impossible » au
-- bout du délai, comme avant. Repères trouvés une fois chacun, sinon la pose s'arrête. Rejouable ; rien n'est supprimé.

create or replace function private.filed_relire_pour_reprise(p_refusee uuid, p_document uuid, p_consigne jsonb)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_piece uuid;
  v_origine text := 'reprise:' || p_refusee::text;
  r private.relectures;
  v_consigne text;
begin
  select d.piece_id into v_piece from public.filed_documents d where d.id = p_document;
  if v_piece is null then return false; end if;
  select * into r from private.relectures x where x.origine = v_origine order by x.essai desc limit 1;
  if r.piece_id is not null then
    -- Déjà demandée : elle attend tant que la lecture n'est pas rendue.
    return exists (select 1 from public.travaux t where t.id = r.travail_id and t.etat in ('a_faire', 'en_cours'))
        or exists (select 1 from public.pieces p where p.id = v_piece and p.statut in ('recue', 'en_lecture'));
  end if;
  v_consigne := concat_ws(' ',
    'Motif du refus : ' || nullif(btrim(p_consigne ->> 'motif'), '') || '.',
    'Commentaire du valideur : ' || nullif(btrim(p_consigne ->> 'commentaire'), ''));
  if v_consigne = '' then return false; end if;
  begin
    perform private.lecteur_relire(v_piece, v_consigne, v_origine);
  exception when others then
    raise warning 'FILED : relecture de la reprise % non demandée (%)', p_refusee, sqlerrm;
    return false;
  end;
  return true;
end $$;

-- La relecture d'une facture refusée n'entre que si sa reprise attend encore.
create or replace function private.filed_relecture_attendue(p_piece uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.relectures rl
                   join private.reprises rp on rl.origine = 'reprise:' || rp.demande_id::text
                  where rl.piece_id = p_piece and rp.statut = 'a_faire')
$$;

revoke all on function private.filed_relire_pour_reprise(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function private.filed_relecture_attendue(uuid) from public, anon, authenticated;
grant execute on function private.filed_relire_pour_reprise(uuid, uuid, jsonb) to service_role;
grant execute on function private.filed_relecture_attendue(uuid) to service_role;

-- Le cron des reprises demande la relecture quand rien n'a changé et que le délai court.
do $$
declare
  v_def text := pg_get_functiondef('private.filed_traiter_reprises(interval)'::regprocedure);
  v_rep constant text := E'        continue;   -- elle attend une correction (ou la relecture avec la consigne)\n';
  v_n int;
begin
  if position('filed_relire_pour_reprise' in v_def) > 0 then return; end if;
  v_n := (length(v_def) - length(replace(v_def, v_rep, ''))) / length(v_rep);
  if v_n <> 1 then raise exception 'a1_02 : repère « elle attend » de filed_traiter_reprises trouvé % fois (1 attendu)', v_n; end if;
  execute replace(v_def, v_rep,
       E'        -- a1_02 : une fois par reprise, la pièce est relue avec la consigne du refus.\n'
    || E'        if r.cree_le > now() - p_delai then\n'
    || E'          perform private.filed_relire_pour_reprise(d.id, f.document_id, r.consigne);\n'
    || E'        end if;\n'
    || v_rep);
end $$;

-- L'intégration laisse passer la relecture d'une facture refusée dont la reprise est à faire.
do $$
declare
  v_def text := pg_get_functiondef('private.filed_integrer_facture(uuid)'::regprocedure);
  v_rep constant text := E'  if found and v_f.statut not in (''a_completer'', ''bloquee'', ''a_valider'', ''ecartee'') then\n';
  v_n int;
begin
  if position('filed_relecture_attendue' in v_def) > 0 then return; end if;
  v_n := (length(v_def) - length(replace(v_def, v_rep, ''))) / length(v_rep);
  if v_n <> 1 then raise exception 'a1_02 : repère « déjà décidée » de filed_integrer_facture trouvé % fois (1 attendu)', v_n; end if;
  execute replace(v_def, v_rep,
       E'  if found and v_f.statut not in (''a_completer'', ''bloquee'', ''a_valider'', ''ecartee'')\n'
    || E'     and not (v_f.statut = ''refusee'' and private.filed_relecture_attendue(v_doc.piece_id)) then  -- a1_02\n');
end $$;
