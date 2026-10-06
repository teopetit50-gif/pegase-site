-- b4_09 — Tamila : l'en-tête de facture du cabinet (session B4, 06/10/2026, vague 3, suite du n° 1).
--
-- POURQUOI. b4_06 numérote et chiffre les factures, mais un cabinet doit envoyer une facture qui porte ses mentions
-- obligatoires (CGI art. 242 nonies A ; Code de commerce L.441-9 : identité et adresse du prestataire, SIREN, numéro de
-- TVA intracommunautaire, date, numéro, désignation, HT, taux et montant de TVA, TTC, date d'échéance, pénalités de
-- retard et indemnité forfaitaire de recouvrement pour un client professionnel). La facture se compose DANS LE
-- NAVIGATEUR (le nom du client et le détail du temps sont chiffrés) ; il manque l'identité du cabinet, la même pour
-- toutes ses factures : elle se garde ici, en clair (ce sont les mentions publiques du cabinet, pas un secret).
--
-- CE QUE ÇA POSE.
--   · tamila_reglages.facture_entete jsonb (colonne ajoutée si absente ; rien n'est retiré).
--   · tamila_poser_entete_facture(p_client, p_entete) : le gérant seul ; clés connues seulement, longueurs bornées,
--     SIREN de 9 chiffres, TVA intracommunautaire FR, IBAN plausible, délai de paiement de 0 à 60 jours (L.441-10).
--     La lecture passe par la politique existante de tamila_reglages (« membres lisent les réglages »).
--
-- Rien n'est effacé. Fonction private : revoke from public, grant authenticated.

alter table public.tamila_reglages add column if not exists facture_entete jsonb not null default '{}'::jsonb;

comment on column public.tamila_reglages.facture_entete is
  'Tamila (B4, b4_09) : l''en-tête des factures du cabinet (nom, adresse, SIREN, TVA, barreau, toque, IBAN, délai de paiement, mention de TVA) ; posé par le gérant via tamila_poser_entete_facture.';

create or replace function private.tamila_poser_entete_facture(p_client uuid, p_entete jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_cles text[];
  k text;
  v text;
  v_max integer;
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant']) then
    raise exception 'L''en-tête des factures du cabinet est posé par son gérant.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.tamila_reglages r where r.client_id = p_client) then
    raise exception 'Tamila n''est pas installé pour ce cabinet.' using errcode = '55000';
  end if;
  if p_entete is null or jsonb_typeof(p_entete) <> 'object' then
    raise exception 'L''en-tête est un objet.' using errcode = '22023';
  end if;
  select coalesce(array_agg(x), '{}') into v_cles from jsonb_object_keys(p_entete) x
   where x not in ('nom', 'adresse', 'code_postal_ville', 'siren', 'tva_intracom', 'barreau', 'toque', 'telephone', 'courriel',
                   'iban', 'bic', 'delai_paiement_jours', 'mention_tva', 'forme');
  if cardinality(v_cles) > 0 then
    raise exception 'Clés inconnues dans l''en-tête : %.', array_to_string(v_cles, ', ') using errcode = '22023';
  end if;
  for k in select jsonb_object_keys(p_entete) loop
    if k = 'delai_paiement_jours' then
      if jsonb_typeof(p_entete -> k) <> 'number' or (p_entete ->> k)::numeric not between 0 and 60
         or (p_entete ->> k)::numeric <> trunc((p_entete ->> k)::numeric) then
        raise exception 'Délai de paiement : un nombre entier de jours, de 0 à 60 (C. com. L.441-10).' using errcode = '22023';
      end if;
      continue;
    end if;
    if jsonb_typeof(p_entete -> k) <> 'string' then
      raise exception 'La valeur de « % » est un texte.', k using errcode = '22023';
    end if;
    v := p_entete ->> k;
    v_max := case k when 'adresse' then 300 when 'mention_tva' then 200 else 120 end;
    if char_length(v) > v_max then
      raise exception 'La valeur de « % » est trop longue.', k using errcode = '22023';
    end if;
    if k = 'siren' and v !~ '^[0-9]{9}$' then
      raise exception 'Un SIREN fait 9 chiffres.' using errcode = '22023';
    end if;
    if k = 'tva_intracom' and v <> '' and v !~ '^FR[0-9A-HJ-NP-Z]{2}[0-9]{9}$' then
      raise exception 'Un numéro de TVA intracommunautaire français : FR, deux caractères, le SIREN.' using errcode = '22023';
    end if;
    if k = 'iban' and v <> '' and replace(v, ' ', '') !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$' then
      raise exception 'IBAN illisible.' using errcode = '22023';
    end if;
    if k = 'courriel' and v <> '' and v !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      raise exception 'Courriel illisible.' using errcode = '22023';
    end if;
  end loop;
  update public.tamila_reglages set facture_entete = p_entete, maj_le = now() where client_id = p_client;
  perform private.journaliser_module(p_client, 'tamila', 'tamila.facture.entete', 'tamila_cabinet', p_client::text,
    jsonb_build_object('cles', (select jsonb_agg(x) from jsonb_object_keys(p_entete) x), 'par', v_uid));
  return p_entete;
end $function$;

create or replace function public.tamila_poser_entete_facture(p_client uuid, p_entete jsonb) returns jsonb
language sql set search_path to '' as $function$ select private.tamila_poser_entete_facture(p_client, p_entete) $function$;

revoke execute on function private.tamila_poser_entete_facture(uuid, jsonb) from public;
revoke execute on function public.tamila_poser_entete_facture(uuid, jsonb) from public, anon;
grant execute on function private.tamila_poser_entete_facture(uuid, jsonb) to authenticated;
grant execute on function public.tamila_poser_entete_facture(uuid, jsonb) to authenticated;
