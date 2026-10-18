-- dce_daliro.sql — chantier 2 de B6 (Teo, 18/10/2026) : trois DCE publics réels (neuf, rénovation, VRD, téléchargés par
-- A1 dans omega/banc/dce-reels/) déposés comme devis Daliro sur le client du banc, lus par le lecteur v38. Pas un test :
-- rien n'est annulé. Rejouable. À jouer par le coordinateur, bloc par bloc, dans l'ordre.
--
-- Pourquoi un script entre le bloc 1 et le bloc 3 : un fichier SQL ne pose pas d'octets dans le stockage, et le dépôt
-- d'une pièce « recue » demande la lecture sur-le-champ (private.demander_lecture). Le fichier doit donc être dans
-- omega-clients AVANT la pièce : c'est omega/banc/dce_daliro.mjs (clé de service) qui téléverse puis appelle la porte
-- public.btp_deposer_devis (b6_33), comme l'écran « Importer le devis ».
--
-- Mode essai : le banc ne part vers personne (réglages d'envoi en essai) ; ici rien n'est envoyé, on lit seulement.
-- Coût : le plafond plafond_ia_jour_client du socle (5 € par défaut, tous genres, registre 19ar) arrête la lecture du
-- banc au-delà ; le script refuse en plus de déposer si la consommation du jour dépasse 2 €. Un DPGF se lit par
-- morceaux de 80 lignes : quelques centimes à quelques dizaines de centimes par devis.

-- ── 1. Préparation : un maître d'ouvrage public, trois chantiers, trois marchés à vérifier (vides) ──────────────────
do $do$
declare
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_entite uuid;
  v_mo uuid;
  v_ch uuid;
  k record;
begin
  if not exists (select 1 from public.btp_reglages where client_id = v_client) then
    raise exception 'Daliro n''est pas installé sur le banc (btp_installer).';
  end if;
  select id into v_entite from public.entites where client_id = v_client order by principale desc, cree_le limit 1;
  select id into v_mo from public.btp_tiers where client_id = v_client and nom = 'Maître d''ouvrage public (DCE réels)';
  if v_mo is null then
    insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'Maître d''ouvrage public (DCE réels)')
    returning id into v_mo;
  end if;
  for k in select * from (values ('DCE-NEUF', 'DCE réel — construction neuve'),
                                 ('DCE-RENO', 'DCE réel — rénovation'),
                                 ('DCE-VRD',  'DCE réel — VRD')) x(reference, nom) loop
    select id into v_ch from public.btp_chantiers where client_id = v_client and nom = k.nom;
    if v_ch is null then
      insert into public.btp_chantiers (client_id, entite_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
      values (v_client, v_entite, k.nom, '69100', 'Villeurbanne', 'acheteur_public', 'titulaire', v_mo, 'ouvert')
      returning id into v_ch;
    end if;
    if not exists (select 1 from public.btp_marches m where m.chantier_id = v_ch and m.reference = k.reference) then
      perform public.btp_ecrire_marche(null, v_ch, jsonb_build_object('reference', k.reference, 'mode_prix', 'unitaire', 'retenue_taux', 0));
    end if;
  end loop;
end $do$;

select m.reference, m.id as marche, m.statut, c.nom as chantier
  from public.btp_marches m join public.btp_chantiers c on c.id = m.chantier_id
 where m.client_id = 'cccccccc-0000-4000-8000-00000000000c' and m.reference in ('DCE-NEUF', 'DCE-RENO', 'DCE-VRD')
 order by m.reference;

-- ── 2. Hors SQL : téléverser et déposer ─────────────────────────────────────────────────────────────────────────
--   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node omega/banc/dce_daliro.mjs
--   (un DPGF ou devis PDF par DCE ; le script dit ce qu'il a déposé, puis attend les lectures 10 minutes au plus)

-- ── 3. Contrôle, après les lectures (un à trois passages du cron omega-lecteur) ──────────────────────────────────
select m.reference, p.nom_fichier, p.statut, p.type_piece, p.nb_pages,
       jsonb_array_length(case when jsonb_typeof(v.valeur) = 'array' then v.valeur else '[]'::jsonb end) as lignes_lues,
       v.verifiee as lignes_verifiees,
       (select t.valeur from public.pieces_valeurs t where t.piece_id = p.id and t.champ = 'montant_total_ht' limit 1) as total_ht_lu,
       (select sum((t.resultat ->> 'cout_eur')::numeric) from public.travaux t
         where t.genre like 'lecteur.%' and t.charge ->> 'piece' = p.id::text and (t.resultat ->> 'cout_eur') ~ '^[0-9.]+$') as cout_eur
  from public.btp_marches m
  join public.pieces p on p.module = 'daliro' and p.objet_type = 'btp_marche' and p.objet_id = m.id::text
  left join public.pieces_valeurs v on v.piece_id = p.id and v.champ = 'lignes'
 where m.client_id = 'cccccccc-0000-4000-8000-00000000000c' and m.reference in ('DCE-NEUF', 'DCE-RENO', 'DCE-VRD')
 order by m.reference, p.recue_le;

-- Ce que l'écran en ferait : la porte de lecture du devis (b6_33), par marché.
select m.reference, d ->> 'statut' as statut, jsonb_array_length(coalesce(d -> 'lignes', '[]'::jsonb)) as lignes,
       d ->> 'lignes_verifiees' as verifiees, d ->> 'montant_total_ht' as total_ht
  from public.btp_marches m cross join lateral public.btp_devis_lu(m.id) d
 where m.client_id = 'cccccccc-0000-4000-8000-00000000000c' and m.reference in ('DCE-NEUF', 'DCE-RENO', 'DCE-VRD')
 order by m.reference;

-- Coût total du chantier 2 (≤ 5 € demandé).
select coalesce(sum((t.resultat ->> 'cout_eur')::numeric), 0) as cout_total_eur, count(*) as travaux
  from public.travaux t
  join public.pieces p on t.charge ->> 'piece' = p.id::text
  join public.btp_marches m on p.objet_id = m.id::text and p.objet_type = 'btp_marche'
 where m.client_id = 'cccccccc-0000-4000-8000-00000000000c' and m.reference in ('DCE-NEUF', 'DCE-RENO', 'DCE-VRD')
   and t.genre like 'lecteur.%' and (t.resultat ->> 'cout_eur') ~ '^[0-9.]+$';
