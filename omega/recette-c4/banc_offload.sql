-- banc_offload — OFFLOAD sur le banc (cccccccc-0000-4000-8000-00000000000c), session C4, 06/10/2026.
-- PAS un test : rien n'est annulé. Prérequis : c4_01 à c4_03 posés. À jouer en plusieurs appels, dans l'ordre.
-- MODE ESSAI seulement : la ligne reglages_envois offload reprend l'adresse d'essai déjà posée sur le banc (ligne
-- tavaro, à défaut daliro, à défaut la ligne organisation). En essai, le socle remet chaque message à cette adresse,
-- jamais au destinataire. Rejouable : chaque étape vérifie si elle est déjà faite. Rien n'est effacé.

-- ═══ A. Réglage d'envoi du module offload pour le banc : ESSAI, courriel seulement
do $$
declare
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_adresse text;
begin
  select coalesce(
           (select r.essai_adresse from public.reglages_envois r where r.client_id = v_client and r.module = 'tavaro'),
           (select r.essai_adresse from public.reglages_envois r where r.client_id = v_client and r.module = 'daliro'),
           (select r.essai_adresse from public.reglages_envois r where r.client_id = v_client and r.module is null))
    into v_adresse;
  if v_adresse is null then
    raise exception 'Aucune adresse d''essai sur le banc (lignes tavaro, daliro, organisation) : rien n''est posé.';
  end if;
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, plages, canaux)
  select v_client, 'offload', 'essai', v_adresse,
         (select r.plages from public.reglages_envois r where r.client_id = v_client and r.module = 'tavaro'),
         array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'offload');
  -- Une ligne déjà là qui ne serait pas en essai est remise en essai : jamais de réel depuis ce fichier.
  update public.reglages_envois set mode = 'essai', essai_adresse = coalesce(essai_adresse, v_adresse)
  where client_id = v_client and module = 'offload' and mode is distinct from 'essai';
end $$;
select r.module, r.mode, r.essai_adresse is not null as adresse_essai, r.canaux
from public.reglages_envois r where r.client_id = 'cccccccc-0000-4000-8000-00000000000c' and r.module = 'offload';

-- ═══ B. OFFLOAD installé sur le banc (rôle de service : Omega installe), mode essai
select public.offload_installer('cccccccc-0000-4000-8000-00000000000c'::uuid, null);

-- ═══ C. Contrôle : réglages, branchement, jeux
select g.mode, g.branchement_id is not null as branche,
       (select string_agg(j.code, ', ' order by j.code) from public.branchements_jeux j where j.branchement_id = g.branchement_id) as jeux
from public.offload_reglages g where g.client_id = 'cccccccc-0000-4000-8000-00000000000c';
