-- banc_cloture_essais — Les chantiers « Essai B6 — hh:mm » du banc passent « annulé » (session B6, 06/10/2026).
-- Laissés par les passages du script d'écriture réelle (relecture-reelle-daliro.mjs). PAS un test.
-- La porte métier est celle de l'écran : le gérant change le statut du chantier (UPDATE sous RLS, contrôlé
-- par les déclencheurs de btp_chantiers ; préparation → annulé est un passage permis). Ciblé sur le banc, le
-- nom exact « Essai B6 — hh:mm » et le statut « preparation » : rejouable, ne touche à rien d'autre.
-- Rien n'est effacé : les chantiers restent, avec leurs marchés et lignes, au journal.

-- ═══ Avant
select c.id, c.nom, c.statut, c.cree_le from public.btp_chantiers c
where c.client_id = 'cccccccc-0000-4000-8000-00000000000c' and c.nom ~ '^Essai B6 — [0-9]{2}:[0-9]{2}$'
order by c.nom;

-- ═══ Le gérant les annule
do $$
declare
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_gerant uuid := (select id from auth.users where email = 'gerant@banc-varelo.test');
  v_n integer;
begin
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  update public.btp_chantiers set statut = 'annule'
  where client_id = v_client and nom ~ '^Essai B6 — [0-9]{2}:[0-9]{2}$' and statut = 'preparation';
  get diagnostics v_n = row_count;
  raise notice 'chantiers annulés : %', v_n;
  perform tests.redevenir_admin();
end $$;

-- ═══ Après (attendu : sept lignes « annule », aucune autre ligne du banc touchée)
select c.id, c.nom, c.statut from public.btp_chantiers c
where c.client_id = 'cccccccc-0000-4000-8000-00000000000c' and c.nom ~ '^Essai B6 — [0-9]{2}:[0-9]{2}$'
order by c.nom;
