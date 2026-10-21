-- c4_30 — OFFLOAD : la date d'un achat se juge à l'heure de Paris (session C4, 21/10/2026)
--
-- Relevé sur la recette (test c4_29, rejoué à 23 h Z) : la base compte en UTC ; entre 22 h et minuit UTC, la date de
-- Paris a déjà changé. offload_saisir_achat refusait alors comme « future » un achat daté du jour à Paris (comparaison
-- à current_date, en UTC). La reprise, elle, se date à Paris : la commande du jour doit pouvoir la clore.
-- La borne « pas dans le futur » se juge désormais à la date de Paris.
--
-- Règles de pose : create or replace. Aucun DROP, aucun DELETE.

-- La saisie d'un achat : « pas dans le futur » à l'heure de Paris.
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
  if c.efface_le is not null then
    raise exception 'Ce compte a été effacé à la demande de la personne : aucun achat ne s''y rattache plus.' using errcode = '55000';
  end if;
  if p_date is null or p_date < date '1990-01-01' or p_date > (now() at time zone 'Europe/Paris')::date then
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
  -- Une commande pendant une reprise la clôt aussitôt (c4_25).
  if v_nature <> 'avoir' then
    perform private.offload_clore_commandes(c.client_id, c.id);
  end if;
  return v_id;
end $function$;

revoke execute on function private.offload_saisir_achat(uuid, date, numeric, text, text, text) from public, anon;
grant execute on function private.offload_saisir_achat(uuid, date, numeric, text, text, text) to authenticated, service_role;
