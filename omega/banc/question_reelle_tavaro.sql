-- Première question réelle aux Questions Tavaro (b2_20, ouvrier tavaro-questions v2), sur la recette — B2, 17/10/2026.
-- À jouer par le coordinateur, bloc par bloc. Comme analyse_reelle_claire.sql d'A1 : aucune suppression ; seul effet,
-- une ligne loc_questions et son travail tavaro.question. Prérequis : b2_20 posé, tavaro-questions déployé et son cron
-- actif, réglage plafond_ia_jour_client lisible. La question est posée au nom du gérant du banc Tavaro, comme
-- loc_poser_question le ferait (même insertion, même dépôt par la fonction du socle private.deposer_travail).

-- 1. Le loueur du banc Tavaro (le contrat BANC-2026-0001) et sa direction.
select c.client_id, c.numero, k.user_id as gerant, k.role
  from public.loc_contrats c join public.comptes k on k.client_id = c.client_id and k.role in ('gerant', 'admin')
 where c.numero like 'BANC-%'
 order by c.cree_le
 limit 3;

-- 2. Dépôt de la question, au nom de ce gérant.
with banc as (
  select c.client_id, (select k.user_id from public.comptes k where k.client_id = c.client_id and k.role in ('gerant', 'admin') order by k.role limit 1) as gerant
    from public.loc_contrats c where c.numero like 'BANC-%' order by c.cree_le limit 1
), q as (
  insert into public.loc_questions (client_id, question, posee_par)
  select b.client_id, 'Combien de retours ne sont pas encore facturés, et que faut-il faire en premier ?', b.gerant from banc b
  returning id, client_id
)
select q.id as question,
       private.deposer_travail(q.client_id, 'tavaro', 'tavaro.question', jsonb_build_object('question', q.id), 'tavaro:question:' || q.id::text, 2::smallint) as travail
  from q;

-- 3. Une à deux minutes plus tard : la preuve (statut, lectures faites, modèle, jetons, coût, réponse).
select q.id, q.statut, q.lectures, q.modele, q.tokens_entree, q.tokens_sortie, q.cout_eur, q.erreur,
       q.reponse ->> 'reponse' as reponse, q.reponse -> 'chiffres' as chiffres, q.reponse ->> 'cause' as cause, q.reponse ->> 'decision' as decision,
       q.posee_le, q.repondue_le
  from public.loc_questions q
 order by q.posee_le desc
 limit 1;

-- 4. Le travail tavaro.question et ce que l'ouvrier en a dit (identifiants, lectures, contrôles, jetons, coût ; aucun texte).
select t.id, t.etat, t.essais, t.resultat, t.erreur, t.fini_le
  from public.travaux t
 where t.genre = 'tavaro.question'
 order by t.id desc
 limit 3;

-- 5. Le plafond : le coût de la question entre dans la consommation du jour (cout_eur au premier niveau du travail fini,
--    compté par consommation_ia_jour, socle 19ar).
select t.client_id, sum((t.resultat ->> 'cout_eur')::numeric) as cout_questions_du_jour_eur, count(*) as questions_finies
  from public.travaux t
 where t.genre = 'tavaro.question' and t.etat = 'fait' and t.fini_le >= date_trunc('day', now())
   and (t.resultat ->> 'cout_eur') ~ '^[0-9.]+$'
 group by 1;

-- 6. Le battement de l'ouvrier.
select b.client_id, b.module, b.dernier_le, b.detail
  from public.battements b
 where b.module = 'tavaro'
 order by b.dernier_le desc
 limit 3;
