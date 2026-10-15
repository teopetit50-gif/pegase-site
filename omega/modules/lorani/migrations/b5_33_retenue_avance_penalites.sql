-- LORANI, lot B5-33 — retenue de garantie, avance et pénalités recalculées sur chaque situation (15/10/2026).
--
-- Pourquoi : la page des architectes promet « Retenue, avance et pénalités recalculées » et montre « La retenue de
-- garantie n'est pas déduite du cumul » (Fonctionnement.tsx:842 ; Dossier.tsx:350 ; chiffrage, ligne 33 : C). Seul le
-- plafond de la retenue (5 %, b5_13) était tenu ; rien ne recalculait ce que l'entreprise déduit.
--
-- Ce qui est posé :
--   · lorani_marches.avance_pct (0 à 30 % du montant initial ; 0 = pas d'avance) et penalite_jour_ht (la pénalité de
--     retard par jour prévue au marché ; vide : 1/3000 du montant du marché par jour en marché public, CCAG-Travaux
--     2021 art. 19.2.1 ; rien en marché privé).
--   · lorani_situations.retenue_deduite_ht, avance_remboursee_ht, penalites_ht : ce que la situation déduit (en cumul),
--     saisi à la réception ou lu sur la pièce (champs retenue_ht, avance_remboursee_ht, penalites_ht du lecteur,
--     CHAMPS-LECTURE-LORANI.md) ; montants jsonb : le recalcul.
--   · private.lorani_situation_montants(situation) : retenue attendue = taux × cumul ; avance à rembourser (cumul) :
--     0 jusqu'à 65 % d'exécution, la totalité à 80 %, linéaire entre les deux (code de la commande publique,
--     art. R2191-11) ; pénalités : jours entre la fin contractuelle (démarrage + délai d'exécution) et la réception de
--     la situation, tant que le marché n'est pas exécuté en totalité. Un écart de plus d'un euro sur la retenue ou sur
--     l'avance, ou des pénalités applicables et non déduites : alerte « attention » au chef de projet (une par
--     situation). Rien n'est déduit d'office : l'architecte vise ou rectifie.
--   · trigger : à la réception d'une situation, et quand son cumul ou ses déductions changent.
-- Idempotent ; rien n'est retiré.

ALTER TABLE public.lorani_marches ADD COLUMN IF NOT EXISTS avance_pct numeric(4,1) NOT NULL DEFAULT 0;
ALTER TABLE public.lorani_marches ADD COLUMN IF NOT EXISTS penalite_jour_ht numeric(12,2);
ALTER TABLE public.lorani_situations ADD COLUMN IF NOT EXISTS retenue_deduite_ht numeric(14,2);
ALTER TABLE public.lorani_situations ADD COLUMN IF NOT EXISTS avance_remboursee_ht numeric(14,2);
ALTER TABLE public.lorani_situations ADD COLUMN IF NOT EXISTS penalites_ht numeric(14,2);
ALTER TABLE public.lorani_situations ADD COLUMN IF NOT EXISTS montants jsonb NOT NULL DEFAULT '{}'::jsonb;
DO $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lorani_marches_avance_check') then
    alter table public.lorani_marches add constraint lorani_marches_avance_check CHECK (avance_pct >= 0 AND avance_pct <= 30);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'lorani_marches_penalite_check') then
    alter table public.lorani_marches add constraint lorani_marches_penalite_check CHECK (penalite_jour_ht IS NULL OR (penalite_jour_ht >= 0 AND penalite_jour_ht <= 1000000));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'lorani_situations_deductions_check') then
    alter table public.lorani_situations add constraint lorani_situations_deductions_check CHECK (
      (retenue_deduite_ht IS NULL OR retenue_deduite_ht BETWEEN 0 AND 1000000000)
      AND (avance_remboursee_ht IS NULL OR avance_remboursee_ht BETWEEN 0 AND 1000000000)
      AND (penalites_ht IS NULL OR penalites_ht BETWEEN 0 AND 1000000000));
  end if;
end $$;

CREATE OR REPLACE FUNCTION private.lorani_situation_montants(p_situation uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s public.lorani_situations;
  m public.lorani_marches;
  l public.lorani_lots;
  pr public.lorani_projets;
  v_total numeric;
  v_retenue numeric;
  v_avance numeric;
  v_remb numeric;
  v_fin date;
  v_jours integer := 0;
  v_jour numeric;
  v_penalites numeric;
  d_retenue numeric;
  d_avance numeric;
  d_penalites numeric;
  v_lu jsonb := '{}'::jsonb;
  v_ecarts jsonb := '[]'::jsonb;
  v jsonb;
begin
  select * into s from public.lorani_situations where id = p_situation;
  if not found then
    return null;
  end if;
  select * into m from public.lorani_marches where id = s.marche_id;
  select * into l from public.lorani_lots where id = m.lot_id;
  select * into pr from public.lorani_projets where id = s.projet_id;
  v_total := m.montant_ht + m.avenants_ht;

  -- ce que la situation déduit : saisi, sinon lu sur la pièce
  if s.piece_id is not null then
    select coalesce(jsonb_object_agg(pv.champ, private.lorani_montant_lu(pv.valeur #>> '{}')) filter (where private.lorani_montant_lu(pv.valeur #>> '{}') is not null), '{}'::jsonb)
      into v_lu
    from public.pieces_valeurs pv
    where pv.piece_id = s.piece_id and pv.chiffre is null and pv.champ in ('retenue_ht', 'avance_remboursee_ht', 'penalites_ht');
  end if;
  d_retenue := coalesce(s.retenue_deduite_ht, (v_lu ->> 'retenue_ht')::numeric);
  d_avance := coalesce(s.avance_remboursee_ht, (v_lu ->> 'avance_remboursee_ht')::numeric);
  d_penalites := coalesce(s.penalites_ht, (v_lu ->> 'penalites_ht')::numeric);

  v_retenue := round(s.cumul_ht * m.retenue_pct / 100, 2);
  v_avance := round(m.montant_ht * m.avance_pct / 100, 2);
  v_remb := case when v_avance = 0 or v_total <= 0 then 0
                 else round(v_avance * least(1, greatest(0, (s.cumul_ht / v_total - 0.65) / 0.15)), 2) end;
  if m.demarrage_le is not null and m.delai_execution_jours is not null then
    v_fin := m.demarrage_le + m.delai_execution_jours;
    if s.cumul_ht < v_total then
      v_jours := greatest(0, s.recue_le - v_fin);
    end if;
  end if;
  v_jour := coalesce(m.penalite_jour_ht, case when pr.marche_public then round(v_total / 3000, 2) end);
  v_penalites := case when v_jours > 0 and v_jour is not null then round(v_jours * v_jour, 2) else 0 end;

  if m.retenue_pct > 0 and d_retenue is not null and d_retenue < v_retenue - 1 then
    v_ecarts := v_ecarts || jsonb_build_object('nature', 'retenue', 'attendu', v_retenue, 'deduit', d_retenue,
      'texte', case when d_retenue = 0 then format('la retenue de garantie (%s %%) n''est pas déduite du cumul', replace(trim_scale(m.retenue_pct)::text, '.', ','))
                    else format('retenue de garantie déduite %s au lieu de %s', private.lorani_euros(d_retenue), private.lorani_euros(v_retenue)) end);
  end if;
  if v_remb > 0 and coalesce(d_avance, 0) < v_remb - 1 then
    v_ecarts := v_ecarts || jsonb_build_object('nature', 'avance', 'attendu', v_remb, 'deduit', d_avance,
      'texte', format('avance remboursée %s au lieu de %s (exécution à %s %%)', private.lorani_euros(coalesce(d_avance, 0)), private.lorani_euros(v_remb), round(100 * s.cumul_ht / v_total)));
  end if;
  if v_penalites > 0 and coalesce(d_penalites, 0) < v_penalites - 1 then
    v_ecarts := v_ecarts || jsonb_build_object('nature', 'penalites', 'attendu', v_penalites, 'deduit', d_penalites,
      'texte', format('%s jour%s de retard sur la fin contractuelle du %s : %s de pénalités applicables, %s déduits',
                      v_jours, case when v_jours > 1 then 's' else '' end, to_char(v_fin, 'DD/MM/YYYY'), private.lorani_euros(v_penalites), private.lorani_euros(coalesce(d_penalites, 0))));
  end if;

  v := jsonb_build_object('retenue_attendue', v_retenue, 'retenue_deduite', d_retenue,
                          'avance', v_avance, 'avance_a_rembourser', v_remb, 'avance_remboursee', d_avance,
                          'fin_contractuelle', v_fin, 'jours_retard', v_jours, 'penalite_jour', v_jour,
                          'penalites_applicables', v_penalites, 'penalites_deduites', d_penalites,
                          'net_attendu', round(s.cumul_ht - v_retenue - v_remb - v_penalites, 2),
                          'lu', v_lu, 'ecarts', v_ecarts);
  update public.lorani_situations set montants = v where id = s.id and montants is distinct from v;
  if s.statut = 'a_viser' and jsonb_array_length(v_ecarts) > 0 then
    perform private.lever_alerte_module(s.client_id, 'lorani', 'attention',
      left(format('« %s », lot %s, situation n° %s : %s.', left(pr.nom, 40), l.numero, s.numero,
                  (select string_agg(e ->> 'texte', ' ; ') from jsonb_array_elements(v_ecarts) e)), 200),
      jsonb_build_object('projet', s.projet_id, 'situation', s.id, 'montants', v, 'lien', private.lorani_lien_projet(s.projet_id)),
      format('situation:%s:montants', s.id), true, private.lorani_chef_de_projet(s.client_id, s.projet_id));
  end if;
  return v;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_situation_montants(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.lorani_situations_montants()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform private.lorani_situation_montants(new.id);
  return null;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_situations_montants() FROM PUBLIC;

DO $$
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_situations'::regclass and tgname = 'lorani_situations_montants') then
    create trigger lorani_situations_montants after insert or update of cumul_ht, recue_le, retenue_deduite_ht, avance_remboursee_ht, penalites_ht
      on public.lorani_situations for each row execute function private.lorani_situations_montants();
  end if;
end $$;
