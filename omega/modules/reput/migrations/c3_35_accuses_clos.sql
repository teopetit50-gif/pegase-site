-- c3_35 — REPUT, écart TREPUT-07 (preuve niveau 2) : un accusé de réception qui attend encore se clôt quand la demande
-- est répondue, refusée ou regroupée (session C3, 22/10/2026)
--
-- Constat : les accusés 3745fcb2 et 60eaee37 sont restés « à valider » après l'envoi de la réponse regroupée : valider
-- l'un d'eux aurait fait partir « nous avons bien reçu votre message » APRÈS la réponse.
--   · private.reput_clore_accuse(p_demande) : la validation de l'accusé (reput.accuser) encore en attente est annulée
--     par le serveur ; son envoi se clôt avec elle (socle) ; journal reput.accuse_clos ;
--   · déclencheur reput_clore_accuse sur public.reput_demandes : dès que la demande passe validée, envoyée, refusée ou
--     ignorée (regroupée) ;
--   · rattrapage des accusés déjà restés en attente (UPDATE par la même fonction).
-- Un accusé déjà validé ou parti ne change pas ; une demande « à traiter » ou « bloquée » garde le sien (elle attend).
--
-- Règles de pose : create or replace (fonctions, déclencheur) ; ni DROP ni DELETE.

create or replace function private.reput_clore_accuse(p_demande uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.reput_demandes;
  v_n integer;
begin
  select * into d from public.reput_demandes x where x.id = p_demande;
  if d.id is null or d.statut not in ('validee', 'envoyee', 'refusee', 'ignoree') then
    return 0;
  end if;
  update public.demandes_validation v set statut = 'annulee'
  where v.client_id = d.client_id and v.module = 'reput' and v.type_action = 'reput.accuser'
    and v.objet_type = 'reput_demandes' and v.objet_id = d.id::text and v.statut = 'en_attente';
  get diagnostics v_n = row_count;
  if v_n > 0 then
    perform private.journaliser_module(d.client_id, 'reput', 'reput.accuse_clos', 'reput_demandes', d.id::text,
      jsonb_build_object('statut', d.statut, 'regroupee_avec', d.regroupee_avec), d.entite_id);
  end if;
  return v_n;
end $function$;
revoke execute on function private.reput_clore_accuse(uuid) from public, anon, authenticated;
grant execute on function private.reput_clore_accuse(uuid) to service_role;

create or replace function private.reput_clore_accuse_declencheur()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  perform private.reput_clore_accuse(new.id);
  return null;
end $function$;
revoke execute on function private.reput_clore_accuse_declencheur() from public, anon, authenticated;

create or replace trigger reput_clore_accuse after update of statut on public.reput_demandes
  for each row when (new.statut is distinct from old.statut and new.statut in ('validee', 'envoyee', 'refusee', 'ignoree'))
  execute function private.reput_clore_accuse_declencheur();

-- Rattrapage : les accusés restés en attente derrière une demande déjà close.
select private.reput_clore_accuse(d.id)
from public.reput_demandes d
where d.statut in ('validee', 'envoyee', 'refusee', 'ignoree')
  and exists (select 1 from public.demandes_validation v
              where v.module = 'reput' and v.type_action = 'reput.accuser' and v.objet_type = 'reput_demandes'
                and v.objet_id = d.id::text and v.statut = 'en_attente');
