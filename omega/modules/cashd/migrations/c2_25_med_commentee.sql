-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_25 : une mise en demeure approuvée sans commentaire ne part pas (21/10/2026, session C2 — TCASHD-07)
-- ═══════════════════════════════════════════════════════════════════════════
-- La demande d'une mise en demeure porte exige_commentaire, mais le socle a accepté une approbation sans commentaire
-- (recette T-CASHD, approbation fe3fe337, MED A-C13). Le défaut du socle est signalé à part ; CASHD tient sa promesse
-- de son côté (« la mise en demeure exige une validation explicite, commentée ») :
--   · dès qu'une demande cashd.mise_en_demeure passe « approuvee » sans qu'aucune approbation favorable ne porte de
--     commentaire, son envoi est annulé, la relance est coupée avec le motif « approuvée sans commentaire… », ses paliers
--     sont rendus (une nouvelle mise en demeure sera proposée au passage suivant, à valider avec un commentaire),
--     une alerte et le journal le disent ;
--   · la reprise fait de même, une fois, pour les mises en demeure déjà approuvées ainsi et pas encore parties.
--
-- Règles de pose : rejouable (create or replace, trigger compris) ; jamais de DROP ni de DELETE ; revoke execute de public.

-- Couper une mise en demeure approuvée sans commentaire. Rend le nombre de relances coupées (0 ou 1).
create or replace function private.cashd_couper_med_sans_commentaire(p_demande uuid)
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare
  r public.cashd_relances;
  v_motif text := 'mise en demeure approuvée sans commentaire : elle ne part pas. Une mise en demeure exige une validation commentée ; elle sera proposée de nouveau au prochain passage.';
begin
  if to_regclass('public.approbations') is null then
    return 0;   -- banc sans socle complet : rien à lire
  end if;
  select x.* into r from public.cashd_relances x join public.demandes_validation d on d.id = x.demande_id
  where x.demande_id = p_demande and d.module = 'cashd' and d.type_action = 'cashd.mise_en_demeure' and d.statut = 'approuvee'
    and x.statut in ('a_valider', 'non_reglee', 'preparee');
  if r.id is null then
    return 0;
  end if;
  -- partie, elle ne se rattrape plus
  if exists (select 1 from public.cashd_envois_main m where m.relance_id = r.id)
     or exists (select 1 from public.envois e where e.id = r.envoi_id and (e.statut = 'envoye' or e.envoye_le is not null)) then
    return 0;
  end if;
  if exists (select 1 from public.approbations a where a.demande_id = p_demande and a.decision = 'approuve' and nullif(btrim(a.commentaire), '') is not null) then
    return 0;
  end if;
  if r.envoi_id is not null then
    begin
      perform private.annuler_envoi(r.envoi_id, v_motif);
    exception when others then
      begin
        perform private.clore_envoi(r.envoi_id, 'annule', 'ANNULE', v_motif);
      exception when others then
        perform private.lever_alerte_module(r.client_id, 'cashd', 'critique',
          'Une mise en demeure approuvée sans commentaire n''a pas pu être retirée de l''envoi : annulez-la à la main.',
          jsonb_build_object('relance', r.id, 'envoi', r.envoi_id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'relance:med_sans_commentaire_envoi:' || r.id::text, true, null);
      end;
    end;
  end if;
  update public.cashd_relances set statut = 'coupee', motif = v_motif, maj_le = now() where id = r.id;
  update public.cashd_relances_pieces set annulee = true where relance_id = r.id;
  perform private.journaliser_module(r.client_id, 'cashd', 'cashd.relance_coupee', 'cashd_relances', r.id::text,
    jsonb_build_object('motif', v_motif, 'compte', r.compte_id, 'palier', r.palier, 'demande', p_demande), r.entite_id);
  perform private.lever_alerte_module(r.client_id, 'cashd', 'attention',
    format('Une mise en demeure (%s) a été approuvée sans commentaire : elle ne part pas. Elle sera proposée de nouveau, à valider avec un commentaire.',
           (select c.nom from public.cashd_comptes c where c.id = r.compte_id)),
    jsonb_build_object('relance', r.id, 'demande', p_demande), 'relance:med_sans_commentaire:' || r.id::text, true, null);
  return 1;
end $function$;

create or replace function private.cashd_garder_med_commentee()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  perform private.cashd_couper_med_sans_commentaire(new.id);
  return null;
end $function$;

-- Après les déclencheurs du socle (ordre alphabétique : « zz » passe après demandes_validation_envois).
create or replace trigger demandes_validation_zz_cashd_med_commentee
  after update of statut on public.demandes_validation
  for each row when (new.module = 'cashd' and new.type_action = 'cashd.mise_en_demeure' and new.statut = 'approuvee' and old.statut is distinct from new.statut)
  execute function private.cashd_garder_med_commentee();

revoke execute on function private.cashd_couper_med_sans_commentaire(uuid) from public, anon, authenticated;
revoke execute on function private.cashd_garder_med_commentee() from public, anon, authenticated;

-- La reprise : les mises en demeure déjà approuvées sans commentaire, pas encore parties.
select count(*) filter (where private.cashd_couper_med_sans_commentaire(d.id) = 1) as med_coupees
from public.demandes_validation d where d.module = 'cashd' and d.type_action = 'cashd.mise_en_demeure' and d.statut = 'approuvee';
