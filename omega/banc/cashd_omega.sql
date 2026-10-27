-- RECETTE seulement — Omega devient son propre client CASHD (décision de Teo, 18/10/2026 ; organisation créée par A3).
-- Session C2. Joué par le coordinateur, jamais sur la prod. Rejouable : rien n'est supprimé, une facture ou un compte déjà
-- là est relu (même référence, même numéro), un règlement déjà noté (même référence) n'est pas noté deux fois.
--
-- Ce que fait le script :
--   1. installe CASHD pour l'organisation Omega, en mode essai ;
--   2. coupe le moteur d'envoi du module cashd (reglages_envois.mode = 'coupe') : les relances sont rédigées chaque matin
--      à 7 h et passent dans la file de validation, mais AUCUNE ne part ; Teo copie le texte validé et l'envoie lui-même ;
--   3. charge les factures clients d'Omega listées dans le bloc « LES FACTURES » ci-dessous.
--
-- Les factures : Teo envoie ses PDF au coordinateur (dans son fil, pas dans le dépôt git : ce sont de vraies données
-- de clients). Le coordinateur recopie chaque PDF en une ligne du bloc, dans une copie locale de ce fichier qu'il ne
-- commite pas, puis la joue. CASHD ne lit pas encore les PDF lui-même.
-- Par facture : la référence du client (courte, stable, ex. C-DUPONT), son nom, l'adresse e-mail de sa comptabilité
-- (souvent absente du PDF : la demander à Teo — sans elle, la relance est rédigée mais marquée « sans adresse »), le nom
-- du contact s'il est connu, le numéro, la date d'émission, l'échéance (vide = 30 jours, art. L441-10), le montant TTC,
-- et ce qui est déjà réglé (0 sinon).

do $$
declare
  v_slug text := 'omega';
  v_client uuid;
  v_n integer;
  v_compte uuid;
  v_facture uuid;
  f record;
begin
  -- L'organisation Omega de la recette : par config.slug, sinon par son nom.
  select count(*), min(c.id::text)::uuid into v_n, v_client from public.clients c
  where c.config ->> 'slug' = v_slug or lower(btrim(c.nom)) = v_slug;
  if v_n <> 1 then
    raise exception 'Organisation « % » : % trouvée(s). Renseigner v_client à la main (public.clients.id) et rejouer.', v_slug, v_n;
  end if;

  -- 1. CASHD, en essai.
  perform public.cashd_installer(v_client, 'essai');

  -- 2. Envoi coupé pour le module cashd : relances rédigées et validables, envoyées à la main uniquement.
  update public.reglages_envois set mode = 'coupe', maj_le = now()
  where client_id = v_client and module = 'cashd' and mode is distinct from 'coupe';
  insert into public.reglages_envois (client_id, module, mode, canaux)
  select v_client, 'cashd', 'coupe', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'cashd');

  -- 3. LES FACTURES — une ligne par PDF (copie locale, non commitée). Exemple de ligne, à remplacer :
  --   ('C-DUPONT', 'Dupont Rénovation SARL', 'compta@dupont-renovation.fr', 'Mme Dupont', 'FA-2026-0012', date '2026-09-15', date '2026-10-15', 1440.00, 0)
  for f in
    select * from (values
      (null::text, null::text, null::text, null::text, null::text, null::date, null::date, null::numeric, 0::numeric)
    ) x(reference, nom, email, contact, numero, date_emission, echeance, montant_ttc, deja_regle)
    where x.numero is not null
  loop
    select c.id into v_compte from public.cashd_comptes c where c.client_id = v_client and c.reference = f.reference;
    v_compte := public.cashd_ecrire_compte(v_compte, v_client, jsonb_strip_nulls(jsonb_build_object(
      'reference', f.reference, 'nom', f.nom, 'contact_facturation_email', f.email, 'contact_facturation_nom', f.contact)));
    select x.id into v_facture from public.cashd_factures x where x.client_id = v_client and x.numero = f.numero and x.nature = 'facture';
    if v_facture is null then
      perform public.cashd_ecrire_facture(null, v_client, jsonb_strip_nulls(jsonb_build_object(
        'compte_id', v_compte, 'numero', f.numero, 'date_emission', f.date_emission, 'echeance', f.echeance, 'montant_ttc', f.montant_ttc)));
    end if;
    if coalesce(f.deja_regle, 0) > 0
       and not exists (select 1 from public.cashd_reglements r where r.client_id = v_client and r.reference = 'Déjà réglé ' || f.numero) then
      perform public.cashd_noter_reglement(v_client, v_compte, f.deja_regle, coalesce(f.echeance, f.date_emission), 'Déjà réglé ' || f.numero, 'virement');
    end if;
    v_facture := null;
  end loop;

  -- Pour voir les relances tout de suite, sans attendre le passage de 7 h :
  -- perform private.cashd_preparer_relances(v_client, (now() at time zone 'Europe/Paris')::date, null);
end $$;

-- Contrôle : le réglage d'envoi, et ce qui est chargé.
select c.nom as organisation, g.mode as cashd_mode, r.mode as envoi_cashd,
       (select count(*) from public.cashd_comptes x where x.client_id = c.id) as comptes,
       (select count(*) from public.cashd_factures x where x.client_id = c.id and x.nature = 'facture') as factures,
       (select coalesce(sum(e.reste_du), 0) from public.cashd_factures_etat e where e.client_id = c.id and e.retard_jours > 0) as encours_echu
from public.clients c
join public.cashd_reglages g on g.client_id = c.id
left join public.reglages_envois r on r.client_id = c.id and r.module = 'cashd'
where c.config ->> 'slug' = 'omega' or lower(btrim(c.nom)) = 'omega';
