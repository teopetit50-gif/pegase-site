-- c4_06 — OFFLOAD : le consentement d'un client existant, dans les sources du socle (session C4, 06/10/2026)
--
-- CE QUE ÇA CORRIGE. c4_03 notait le consentement sous les sources « interet_legitime_b2b » et « soft_opt_in »,
-- que la recette refuse (consentements_source_check : formulaire, ecrit, oral, contrat, message, import). Décision
-- du coordinateur (06/10, 16 h 55) : le socle n'est pas élargi ; la source est « contrat » (relation commerciale
-- existante) dans les deux cas, et la PREUVE dit la base légale exacte :
--   · personne morale : « intérêt légitime B2B, client existant, message en rapport avec son activité (CNIL) » ;
--   · particulier qui a déjà acheté : « soft opt-in, client existant, produits analogues (CPCE L34-5) ».
-- Les conditions ne changent pas : jamais sans achat, jamais pour une adresse qui s'est opposée (même levée), jamais
-- pour un compte retiré. La fonction rend toujours la base retenue (interet_legitime_b2b, soft_opt_in, deja) ou null.
--
-- Règles de pose : create or replace. Aucun DROP, aucun DELETE.

create or replace function private.offload_assurer_consentement(p_compte uuid)
 returns text
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  v_adresse text;
  v_source text;
begin
  select * into c from public.offload_comptes where id = p_compte;
  v_adresse := lower(btrim(c.email));
  if v_adresse is null or c.statut = 'arrete' then
    return null;
  end if;
  if not exists (select 1 from public.offload_achats a where a.compte_id = c.id and a.annule_le is null and a.nature <> 'avoir') then
    return null;
  end if;
  if exists (select 1 from public.oppositions o where o.client_id = c.client_id and o.adresse = v_adresse
             and o.type in ('desinscription', 'invalide')) then
    return null;
  end if;
  if exists (select 1 from public.consentements k where k.client_id = c.client_id and k.canal = 'email' and k.adresse = v_adresse
             and k.retire_le is null and k.portee = 'tout') then
    return 'deja';
  end if;
  v_source := case when private.offload_est_professionnel(c.id) then 'interet_legitime_b2b' else 'soft_opt_in' end;
  -- Le socle n'accepte que ses six sources : « contrat » (relation commerciale existante), la base légale exacte
  -- est écrite dans la preuve.
  perform private.noter_consentement(c.client_id, 'email', v_adresse, 'contrat', 'tout',
    case v_source when 'interet_legitime_b2b' then 'intérêt légitime B2B, client existant, message en rapport avec son activité (CNIL)'
                  else 'soft opt-in, client existant, produits analogues (CPCE L34-5)' end,
    null, 'offload');
  return v_source;
end $function$;


revoke execute on function private.offload_assurer_consentement(uuid) from public, anon, authenticated;
grant execute on function private.offload_assurer_consentement(uuid) to service_role;
