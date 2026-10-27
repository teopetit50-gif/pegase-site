-- c4_21 — OFFLOAD : la réécriture du message par des règles et des formules écrites (session C4, 19/10/2026).
-- Après c4_00, c4_03 (aides) et les migrations c4_01 à c4_21. Données fictives. runtests() annule tout.

create or replace function tests.test_c4_21_reecriture() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_x uuid;
  i jsonb;
  m jsonb;
  e public.envois;
begin
  perform tests.c4_reprises_pretes();
  -- L'interprète comprend la réécriture et le ton, en formules écrites.
  i := private.offload_interpreter_regle('Remplace « commande » par « achat »');
  return next ok(i ->> 'famille' = 'interdit' and i -> 'parametres' ->> 'mot' = 'commande' and i -> 'parametres' ->> 'remplacement' = 'achat',
                 'Remplacer un mot par un autre est compris : ' || (i ->> 'reponse'));
  i := private.offload_interpreter_regle('Dis « équipe » plutôt que « service »');
  return next ok(i -> 'parametres' ->> 'mot' = 'service' and i -> 'parametres' ->> 'remplacement' = 'équipe',
                 'Et dans l''autre sens (« plutôt que »)');
  i := private.offload_interpreter_regle('Adopte un ton formel');
  return next ok(i ->> 'famille' = 'signature' and i -> 'parametres' ->> 'ton' = 'formel' and i -> 'parametres' ->> 'formule' like 'Je vous prie d''agréer%',
                 'Un ton se traduit par une formule de politesse écrite');

  -- Appliquées au message : réécrit, puis contrôlé.
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  perform public.offload_ecrire_regle(v_client, 'Remplace « commande » par « achat »');
  perform public.offload_ecrire_regle(v_client, 'Un ton sobre');
  perform public.offload_ecrire_regle(v_client, 'Signe « L''équipe Sogexal, service clients »');
  perform tests.redevenir_admin();
  m := private.offload_regles_appliquer(v_client, jsonb_build_object(
         'sujet', 'Votre commande du 9 août',
         'corps', E'Bonjour Martin,\n\nVotre dernière commande date du 9 août. Vos commandes comptent pour nous.\n\nBien cordialement,\nL''équipe Sogexal\n\nSi vous ne souhaitez plus recevoir nos messages, répondez « stop ».'));
  return next ok(m ->> 'retenu' is null and m ->> 'sujet' = 'Votre achat du 9 août'
                 and m ->> 'corps' like '%dernière achat date%' and m ->> 'corps' like '%Vos achats comptent%'
                 and position('commande' in lower(m ->> 'corps')) = 0,
                 'Le mot est réécrit dans l''objet et le corps, pluriel compris : ' || coalesce(m ->> 'sujet', '?'));
  return next ok(m ->> 'corps' like E'%\nCordialement,\nL''équipe Sogexal, service clients\n%' and position('Bien cordialement' in m ->> 'corps') = 0,
                 'Le ton sobre écrit « Cordialement, » ; la signature reste');
  return next is(jsonb_array_length(m -> 'reecritures'), 2, 'Le résultat dit quelles règles ont réécrit le message');

  -- Le contrôle : une interdiction qu'aucune réécriture ne lève retient toujours le message.
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  perform public.offload_ecrire_regle(v_client, 'N''utilise jamais le mot « achat »');
  perform tests.redevenir_admin();
  m := private.offload_regles_appliquer(v_client, jsonb_build_object('sujet', 'Votre commande', 'corps', E'Bonjour,\n\nVotre commande.\n\nBien cordialement,\nX'));
  return next ok(m ->> 'retenu' ilike '%achat%', 'Après réécriture, le contrôle retient un message qui enfreint encore une règle');

  -- Dans le cycle : le message préparé porte la réécriture.
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  perform public.offload_retirer_regle((select g.id from public.offload_regles g where g.client_id = v_client and g.texte like 'N''utilise jamais%'));
  perform tests.redevenir_admin();
  v_x := tests.c4_compte_courriel('RW1', 'Garage Petit', 'atelier@garage-petit.test', 70);
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);
  select * into e from public.envois where id = (tests.c4_reprise(v_x)).envoi1_id;
  return next ok(e.id is not null and position('commande' in lower(coalesce(e.sujet, '') || e.corps)) = 0 and e.corps like '%Cordialement,%',
                 'Le message préparé par le cycle sort réécrit (' || coalesce(e.sujet, 'aucun message') || ')');
end $f$;

select * from runtests('tests'::name, '^test_c4_21_');
