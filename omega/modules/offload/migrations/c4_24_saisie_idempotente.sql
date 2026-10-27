-- c4_24 — OFFLOAD : une saisie rejouée ne double rien (testeur T-OFFLOAD, TOFFLOAD-05, session C4, 21/10/2026)
--
-- Écart : rejouer à l'identique offload_saisir_achat (même compte, même date, même montant, même référence) créait un
-- second achat ; sur banc-test-offload, 170 achats en double, le chiffre d'affaires sur 12 mois et la valeur annuelle
-- doublés. Même chose pour offload_noter_contact (contacts 1 → 2).
--   · offload_saisir_achat est idempotente : un achat actif du même compte, à la même date, du même montant, de même
--     nature et de même référence (référence absente comprise) est rendu tel quel, rien n'est créé ;
--   · offload_noter_contact est idempotente sur (compte, date, canal, auteur, note) ;
--   · public.offload_dedoublonner_achats(p_client) (gérant ou admin) répare l'existant : parmi les achats SAISIS actifs
--     identiques, le premier reste, les suivants sont ANNULÉS (annule_le, motif), jamais effacés. Au journal.
-- Les achats importés ont déjà leur clé (jeu, clé) : rien ne change pour eux.
--
-- Règles de pose : create or replace. Aucun DROP, aucun DELETE.

-- La saisie d'un achat : idempotente.
create or replace function private.offload_saisir_achat(p_compte uuid, p_date date, p_montant numeric, p_reference text default null,
                                                        p_libelle text default null, p_nature text default 'facture')
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  v_id uuid;
  v_nature text := coalesce(p_nature, 'facture');
begin
  select * into c from public.offload_comptes where id = p_compte;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  perform private.offload_exiger(c.client_id, c.entite_id, array['gerant', 'admin', 'valideur', 'collaborateur'], 'saisir un achat');
  if p_date is null or p_date < date '1990-01-01' or p_date > current_date then
    raise exception 'La date d''un achat est connue et passée.' using errcode = '22023';
  end if;
  if p_montant is null or abs(p_montant) >= 10000000000 then
    raise exception 'Le montant hors taxes est obligatoire.' using errcode = '22023';
  end if;
  if v_nature not in ('facture', 'commande', 'avoir') then
    raise exception 'Une pièce est une facture, une commande ou un avoir.' using errcode = '22023';
  end if;
  -- Rejouer la même saisie ne crée rien (c4_24).
  perform pg_advisory_xact_lock(hashtextextended('offload.achat:' || c.id::text, 0));
  select a.id into v_id from public.offload_achats a
  where a.compte_id = c.id and a.annule_le is null and a.date_achat = p_date and a.nature = v_nature
    and a.montant_ht = round(case when v_nature = 'avoir' then -abs(p_montant) else p_montant end, 2)
    and a.reference is not distinct from private.offload_texte(p_reference, 120)
  order by a.cree_le limit 1;
  if v_id is not null then
    return v_id;
  end if;
  insert into public.offload_achats (client_id, entite_id, compte_id, date_achat, montant_ht, reference, libelle, nature, source, saisi_par)
  values (c.client_id, c.entite_id, c.id, p_date,
          round(case when v_nature = 'avoir' then -abs(p_montant) else p_montant end, 2),
          private.offload_texte(p_reference, 120), private.offload_texte(p_libelle, 500), v_nature, 'saisie', (select auth.uid()))
  returning id into v_id;
  perform private.journaliser_module(c.client_id, 'offload', 'offload.achat_saisi', 'offload_achats', v_id::text,
    jsonb_build_object('compte', c.id, 'date', p_date, 'montant_ht', p_montant, 'nature', v_nature), c.entite_id);
  return v_id;
end $function$;

-- Le contact noté : idempotent.
create or replace function private.offload_noter_contact(p_compte uuid, p_le date, p_canal text, p_par text default null, p_note text default null)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  v_id uuid;
begin
  select * into c from public.offload_comptes where id = p_compte;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  perform private.offload_exiger(c.client_id, c.entite_id, array['gerant', 'admin', 'valideur', 'collaborateur'], 'noter un contact');
  if p_le is null or p_le > (now() at time zone 'Europe/Paris')::date or p_le < date '1990-01-01' then
    raise exception 'Un contact est daté, et pas dans le futur.' using errcode = '22023';
  end if;
  if p_canal not in ('appel', 'visite', 'courriel', 'salon', 'autre') then
    raise exception 'Canal du contact : appel, visite, courriel, salon ou autre.' using errcode = '22023';
  end if;
  -- Rejouer le même contact ne crée rien (c4_24).
  select k.id into v_id from public.offload_contacts k
  where k.compte_id = c.id and k.le = p_le and k.canal = p_canal
    and k.par is not distinct from private.offload_texte(p_par, 120) and k.note is not distinct from private.offload_texte(p_note, 2000)
  order by k.cree_le limit 1;
  if v_id is not null then
    return v_id;
  end if;
  insert into public.offload_contacts (client_id, entite_id, compte_id, le, canal, par, note, saisi_par)
  values (c.client_id, c.entite_id, c.id, p_le, p_canal, private.offload_texte(p_par, 120), private.offload_texte(p_note, 2000), (select auth.uid()))
  returning id into v_id;
  update public.offload_comptes set dernier_contact = greatest(coalesce(dernier_contact, p_le), p_le), maj_le = now() where id = c.id;
  perform private.journaliser_module(c.client_id, 'offload', 'offload.contact_note', 'offload_comptes', c.id::text,
    jsonb_build_object('le', p_le, 'canal', p_canal, 'par', p_par), c.entite_id);
  return v_id;
end $function$;

-- Réparer l'existant : les achats saisis en double sont annulés (le premier reste). Rend le nombre d'annulations.
create or replace function private.offload_dedoublonner_achats(p_client uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  n integer := 0;
  r record;
begin
  perform private.offload_exiger(p_client, null, array['gerant', 'admin'], 'réparer les achats en double');
  for r in
    select x.id, x.entite_id, x.compte_id, x.date_achat, x.montant_ht from (
      select a.*, row_number() over (partition by a.compte_id, a.date_achat, a.nature, a.montant_ht, a.reference order by a.cree_le, a.id) as rang
      from public.offload_achats a
      where a.client_id = p_client and a.source = 'saisie' and a.annule_le is null) x
    where x.rang > 1
  loop
    update public.offload_achats
       set annule_le = now(), annule_par = (select auth.uid()), maj_le = now(),
           annule_motif = 'Doublon de saisie (même compte, date, montant, nature et référence) : annulé (c4_24).'
     where id = r.id and annule_le is null;
    n := n + 1;
  end loop;
  if n > 0 then
    perform private.journaliser_module(p_client, 'offload', 'offload.achats_dedoublonnes', 'offload_reglages', p_client::text,
      jsonb_build_object('annules', n), null);
  end if;
  return n;
end $function$;

create or replace function public.offload_dedoublonner_achats(p_client uuid)
 returns integer
 language sql
 set search_path to ''
as $function$ select private.offload_dedoublonner_achats(p_client) $function$;

revoke execute on function private.offload_saisir_achat(uuid, date, numeric, text, text, text) from public, anon;
grant execute on function private.offload_saisir_achat(uuid, date, numeric, text, text, text) to authenticated, service_role;
revoke execute on function private.offload_noter_contact(uuid, date, text, text, text) from public, anon;
grant execute on function private.offload_noter_contact(uuid, date, text, text, text) to authenticated, service_role;
revoke execute on function private.offload_dedoublonner_achats(uuid) from public, anon;
grant execute on function private.offload_dedoublonner_achats(uuid) to authenticated, service_role;
revoke execute on function public.offload_dedoublonner_achats(uuid) from public, anon;
grant execute on function public.offload_dedoublonner_achats(uuid) to authenticated, service_role;
