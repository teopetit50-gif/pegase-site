@AGENTS.md

# Mise en ligne : automatique, jamais sur demande

Règle posée par Teo le 15/09/2026 — « tu dois déployer automatiquement sur
omegaai.fr ». **Une modification du site n'est pas finie tant qu'elle n'est
pas en ligne.** Ce dépôt EST la vitrine. Depuis le 11/11/2026 au soir,
`git push origin main` ne déclenche PLUS rien chez Vercel (vercel.json,
`git.deploymentEnabled.main = false`) : c'est la session qui a poussé qui
crée le déploiement par l'API, avec l'outil Vercel `create_deployment`
(voir la section « Mise en ligne par l'API » plus bas). Pas de PR, pas de
CLI Vercel, pas de « veux-tu que je déploie ? ».

La séquence complète, à chaque fois :

1. Écrire la modification.
2. Vérifier : `npx tsc --noEmit`, `npx eslint <les fichiers touchés>`,
   `npm run build`, puis la recette aux cinq largeurs (390 / 768 / 1024 /
   1440 / 1700) avec les scripts de `outils/`.
3. **Commiter CHEMIN PAR CHEMIN** les fichiers qu'on a soi-même écrits.
4. `git push origin main`, puis **créer les déploiements par l'API** :
   `bash outils/a-deployer.sh <sha servi par omegaai.fr>` liste les projets
   (toujours `pegase-site2`, plus les sites dédiés touchés) ; pour chacun,
   l'outil Vercel `create_deployment` avec le sha poussé (détail plus bas).
5. **Vérifier la page servie par `omegaai.fr`** — une phrase qu'on vient
   d'écrire doit s'y trouver — puis donner l'URL. Pour un site dédié touché,
   vérifier que son déploiement est `READY` (outil `get_deployment`).

## Ce qui casse si on l'oublie

- **`git add -A` et `git commit -a` sont interdits ici.** L'arbre porte en
  permanence dix à quinze fichiers modifiés par d'autres sessions ouvertes sur
  le même dossier. Un commit large met leur travail en cours en ligne, sans
  recette et sans qu'elles le sachent. Relire `git status` juste avant de
  commiter : un fichier peut avoir bougé pendant qu'on travaillait.
- **Un `npm run build` rouge ne se pousse pas.** S'il casse sur le travail
  d'une autre session, ne rien pousser et le dire.
- **Ne jamais pousser une modification qu'on n'a pas écrite** « au passage ».

## Mise en ligne par l'API : un déploiement par push, pas sept

Plafond Vercel gratuit : cent déploiements par vingt-quatre heures, atteint
deux fois le 11/11/2026 (15 h 50, 18 h 15). Sept projets (omegaai.fr et les
six sites dédiés) reliés au même dépôt se déployaient à chaque push de
chaque session, une construction « ignorée » comptant quand même : quatorze
pushs par jour et plus rien ne se mettait en ligne. Couper la source Git
projet par projet est réservé au plan Pro, et Teo ne veut aucun geste à la
main. Donc, depuis le 11/11 au soir :

- **Vercel n'écoute plus les pushs** : `vercel.json` porte
  `git.deploymentEnabled.main = false`. Aucun projet ne se déploie seul.
- **La session qui pousse crée les déploiements.** Après `git push` :
  1. relever le sha que sert omegaai.fr (outil Vercel `list_deployments`,
     projet `pegase-site2`, premier `READY` en production, champ
     `githubCommitSha`) ;
  2. `bash outils/a-deployer.sh <ce sha>` : une ligne par projet à
     déployer, `pegase-site2` toujours, un site dédié seulement si un commit
     poussé le touche (règle de `outils/vercel-ignore.sh`) ;
  3. pour chaque ligne, `create_deployment` avec
     `{ name, project, target: "production", gitSource: { type: "github",
     org: "teopetit50-gif", repo: "pegase-site", ref: "main", sha } }` et
     `forceNew: "1"` ; les builds passent un par un (plan gratuit), ~6 min
     chacun ;
  4. vérifier `READY` (outil `get_deployment`) puis la page servie.
- **Une tâche planifiée vérifie chaque heure** que le dernier commit de
  `main` est bien servi par les sept projets et déploie ce qui manque (même
  règle). Elle rattrape un push fait sans session. Elle s'appelle
  « Vercel : rattraper les déploiements en retard » (liste des tâches
  planifiées du compte).
- **L'action GitHub `.github/workflows/sites-dedies.yml`** fait la même
  chose sans session, si un jour le secret `VERCEL_TOKEN` est posé ; sans
  lui, elle ne fait rien et le dit.
- **Si Vercel répond `402 api-deployments-free-per-day`**, le plafond est
  atteint : ne pas insister, le dire, la tâche planifiée rattrapera quand il
  se lève (vingt-quatre heures glissantes).
- **Un commit qui ne touche que `docs/`, `outils/` ou `.github/`** ne vaut
  aucun déploiement : `a-deployer.sh` ne liste que `pegase-site2`, et on
  peut même s'en passer si rien de visible n'a changé.
