-- dce_daliro.sql — chantiers 2 et 3 de B6 (Teo, 18/10/2026) : des DCE publics réels (sources publiques légales, jusqu'à
-- 30 ; neuf, rénovation, VRD, déposés par A1 sous omega/banc/dce-reels/<categorie>/<dossier>/) lus comme devis Daliro
-- sur le client du banc par le lecteur v38. Pas un test : rien n'est annulé. Rejouable.
--
-- Bloc 1 (coordinateur) : un maître d'ouvrage public et trois chantiers, un par catégorie. Ensuite c'est
-- omega/banc/dce_daliro.mjs, connecté comme le gérant du banc (clé publique, sous RLS), qui crée un marché « à vérifier »
-- par DCE (btp_ecrire_marche), téléverse ses DPGF/devis PDF dans omega-clients puis appelle btp_deposer_devis (b6_33) :
-- la pièce reçue lance la lecture. Bloc 3 (coordinateur) : lignes lues, totaux, coût exact (le gérant ne lit pas les
-- coûts ; le script les estime à la page et s'arrête à 2 € estimés ou à 19 h 30 Z). Plafond du socle : 5 € par jour.
-- Mode essai : rien n'est envoyé à personne, on lit seulement.

-- ── 1. Préparation : un maître d'ouvrage public, trois chantiers (un par catégorie) ─────────────────────────────
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
  for k in select * from (values ('DCE réels — construction neuve'), ('DCE réels — rénovation'), ('DCE réels — VRD')) x(nom) loop
    select id into v_ch from public.btp_chantiers where client_id = v_client and nom = k.nom;
    if v_ch is null then
      insert into public.btp_chantiers (client_id, entite_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
      values (v_client, v_entite, k.nom, '69100', 'Villeurbanne', 'acheteur_public', 'titulaire', v_mo, 'ouvert')
      returning id into v_ch;
    end if;
  end loop;
end $do$;

select c.id as chantier, c.nom, c.statut
  from public.btp_chantiers c
 where c.client_id = 'cccccccc-0000-4000-8000-00000000000c' and c.nom like 'DCE réels — %'
 order by c.nom;

-- ── 2. Hors SQL : téléverser et déposer ─────────────────────────────────────────────────────────────────────────
--   node omega/banc/dce_daliro.mjs [--voir]   (B6 le lance, connecté comme le gérant du banc)

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
 where m.client_id = 'cccccccc-0000-4000-8000-00000000000c' and m.reference like 'DCE-%'
 order by m.reference, p.recue_le;

-- Ce que l'écran en ferait : la porte de lecture du devis (b6_33), par marché.
select m.reference, d ->> 'statut' as statut, jsonb_array_length(coalesce(d -> 'lignes', '[]'::jsonb)) as lignes,
       d ->> 'lignes_verifiees' as verifiees, d ->> 'montant_total_ht' as total_ht
  from public.btp_marches m cross join lateral public.btp_devis_lu(m.id) d
 where m.client_id = 'cccccccc-0000-4000-8000-00000000000c' and m.reference like 'DCE-%'
 order by m.reference;

-- Coût exact des lectures Daliro des DCE (arrêt demandé à 2 €).
select coalesce(sum((t.resultat ->> 'cout_eur')::numeric), 0) as cout_total_eur, count(*) as travaux
  from public.travaux t
  join public.pieces p on t.charge ->> 'piece' = p.id::text
  join public.btp_marches m on p.objet_id = m.id::text and p.objet_type = 'btp_marche'
 where m.client_id = 'cccccccc-0000-4000-8000-00000000000c' and m.reference like 'DCE-%'
   and t.genre like 'lecteur.%' and (t.resultat ->> 'cout_eur') ~ '^[0-9.]+$';
