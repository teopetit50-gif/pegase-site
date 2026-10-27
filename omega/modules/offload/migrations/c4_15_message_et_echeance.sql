-- c4_15 — OFFLOAD : le message de reprise s'ancre aussi sur l'échéance qui revient (session C4, 15/10/2026)
--
-- CE QUE ÇA POSE (chiffrage omega/CHIFFRAGE/offload.md, n° 25 ; carte « Chaque client reçoit son propre message ») :
--   « Bonjour Martin, je retrouve votre passage du 14 mars 2025, réf. 4821, 615 € : l'entretien annuel qui va avec est à
--   refaire. Je vous garde un créneau ? » — le premier message d'une reprise reprend la dernière ligne de facturation
--   (déjà fait) ET, si le compte a un équipement dont l'entretien revient dans les deux mois ou est tombé sans
--   intervention connue, ce motif daté, avec la proposition d'un créneau. Aucun créneau n'est fixé à la place du
--   client : il répond, le commercial reprend la main. Une échéance de la semaine a déjà son propre message (c4_07) :
--   elle n'est pas reprise ici, pour ne jamais écrire deux fois la même chose.
--
-- Règles de pose : create or replace. Aucun DROP, aucun DELETE.

-- Le message de reprise : dernière facture, et l'échéance qui revient s'il y en a une.
create or replace function private.offload_message(p_compte uuid, p_rang integer, p_premier_le timestamptz default null,
                                                   p_jour date default null)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  g public.offload_reglages;
  a public.offload_achats;
  v_jour date := coalesce(p_jour, (now() at time zone 'Europe/Paris')::date);
  v_org text;
  v_bonjour text;
  v_commande text;
  v_signature text;
  v_sujet text;
  v_corps text;
  v_echeance text;
  v_stop constant text := 'Si vous ne souhaitez plus recevoir nos messages, répondez simplement « stop » : nous ne vous écrirons plus.';
begin
  select * into c from public.offload_comptes where id = p_compte;
  select * into g from public.offload_reglages where client_id = c.client_id;
  select x.nom into v_org from public.clients x where x.id = c.client_id;
  select * into a from public.offload_achats x
  where x.compte_id = c.id and x.annule_le is null and x.nature <> 'avoir'
  order by x.date_achat desc, x.montant_ht desc limit 1;

  -- Le motif daté : l'entretien qui revient dans les deux mois (hors semaine qui vient), ou tombé sans intervention.
  select case when h.statut = 'depassee'
              then format('L''entretien de votre %s%s était à refaire le %s : souhaitez-vous que nous convenions d''un créneau ?',
                          q.designation, coalesce(' (' || q.site || ')', ''),
                          private.offload_date_longue(h.due_le))
              else format('L''entretien de votre %s%s est à refaire d''ici le %s : souhaitez-vous que nous convenions d''un créneau ?',
                          q.designation, coalesce(' (' || q.site || ')', ''),
                          private.offload_date_longue(h.due_le)) end
    into v_echeance
  from public.offload_echeances h join public.offload_equipements q on q.id = h.equipement_id
  where h.compte_id = c.id and h.type = 'entretien'
    and ((h.statut = 'a_venir' and h.due_le between v_jour + 8 and v_jour + 60) or h.statut = 'depassee')
  order by (h.statut = 'depassee') desc, h.due_le limit 1;

  v_bonjour := 'Bonjour' || coalesce(' ' || c.contact, '') || ',';
  v_signature := coalesce(nullif(btrim(g.signature), ''), v_org);
  if a.id is not null then
    v_commande := format('votre dernière commande chez %s date du %s (%s%s), il y a %s',
      v_org, private.offload_date_longue(a.date_achat),
      concat_ws(', ', 'réf. ' || a.reference, '« ' || a.libelle || ' »', private.offload_euros(a.montant_ht) || ' HT'), '',
      private.offload_duree(a.date_achat, v_jour));
  end if;

  if p_rang = 1 then
    v_sujet := left(v_org || case when a.id is not null then ' — votre commande du ' || private.offload_date_longue(a.date_achat)
                                  else ' — reprendre contact' end, 300);
    v_corps := v_bonjour || E'\n\n'
      || case when a.id is not null then 'Je reprends votre dossier : ' || v_commande || '.' || E'\n\n'
              else 'Nous n''avons pas eu l''occasion de travailler ensemble depuis un moment.' || E'\n\n' end
      || coalesce(v_echeance || E'\n\n', '')
      || 'Avez-vous de nouveaux besoins pour lesquels nous pourrions vous être utiles ? Un simple retour à ce message suffit : '
      || 'nous vous rappelons au moment qui vous convient.' || E'\n\n'
      || 'Bien cordialement,' || E'\n' || v_signature || E'\n\n' || v_stop;
  else
    v_sujet := left('Re : ' || v_org || case when a.id is not null then ' — votre commande du ' || private.offload_date_longue(a.date_achat)
                                             else ' — reprendre contact' end, 300);
    v_corps := v_bonjour || E'\n\n'
      || 'Je me permets de revenir vers vous après mon message du '
      || coalesce(private.offload_date_longue((p_premier_le at time zone 'Europe/Paris')::date), 'dernier')
      || case when a.id is not null then ', au sujet de ' || replace(v_commande, 'votre dernière commande chez ' || v_org || ' date du', 'votre commande du') else '' end
      || '.' || E'\n\n'
      || 'Si le moment n''est pas le bon, dites-le-nous simplement : nous ne vous relancerons pas.' || E'\n\n'
      || 'Bien cordialement,' || E'\n' || v_signature || E'\n\n' || v_stop;
  end if;
  return jsonb_build_object('sujet', v_sujet, 'corps', v_corps);
end $function$;

revoke execute on function private.offload_message(uuid, integer, timestamptz, date) from public, anon, authenticated;
grant execute on function private.offload_message(uuid, integer, timestamptz, date) to service_role;
