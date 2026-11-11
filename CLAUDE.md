@AGENTS.md

# Mise en ligne : automatique, jamais sur demande

Règle posée par Teo le 15/09/2026 — « tu dois déployer automatiquement sur
omegaai.fr ». **Une modification du site n'est pas finie tant qu'elle n'est
pas en ligne.** Ce dépôt EST la vitrine : `git push origin main` déclenche le
projet Vercel `pegase-site2`, qui sert `omegaai.fr` en ~45 secondes. Pas de
PR, pas de CLI Vercel, pas de « veux-tu que je déploie ? ».

La séquence complète, à chaque fois :

1. Écrire la modification.
2. Vérifier : `npx tsc --noEmit`, `npx eslint <les fichiers touchés>`,
   `npm run build`, puis la recette aux cinq largeurs (390 / 768 / 1024 /
   1440 / 1700) avec les scripts de `outils/`.
3. **Commiter CHEMIN PAR CHEMIN** les fichiers qu'on a soi-même écrits.
4. `git push origin main`.
5. **Vérifier la page servie par `omegaai.fr`** — une phrase qu'on vient
   d'écrire doit s'y trouver — puis donner l'URL.

## Ce qui casse si on l'oublie

- **`git add -A` et `git commit -a` sont interdits ici.** L'arbre porte en
  permanence dix à quinze fichiers modifiés par d'autres sessions ouvertes sur
  le même dossier. Un commit large met leur travail en cours en ligne, sans
  recette et sans qu'elles le sachent. Relire `git status` juste avant de
  commiter : un fichier peut avoir bougé pendant qu'on travaillait.
- **Un `npm run build` rouge ne se pousse pas.** S'il casse sur le travail
  d'une autre session, ne rien pousser et le dire.
- **Ne jamais pousser une modification qu'on n'a pas écrite** « au passage ».

## Les six sites dédiés ne se déploient plus à chaque push

Plafond Vercel gratuit : cent déploiements par vingt-quatre heures, atteint
deux fois le 11/11/2026 (15 h 50, 18 h 15). Sept projets reconstruits à
chaque push, une construction « ignorée » comptant quand même : quatorze
pushs par jour et plus rien ne se met en ligne. Depuis le 11/11 au soir :

- **omegaai.fr (pegase-site2) est le seul projet relié à GitHub.** Un push
  sur `main` = un déploiement. Il se reconstruit toujours.
- **Les six sites dédiés** (daliro, lorani, tamila, tiroma, tavaro,
  varelo) ne doivent plus être reliés à GitHub (Vercel › projet ›
  Settings › Git › Disconnect, six fois, par Teo ; tant que ce n'est pas
  fait, chaque push les déploie encore). C'est l'action GitHub
  `.github/workflows/sites-dedies.yml` qui les déploie, et seulement
  ceux qu'un commit du push touche (même règle que
  `outils/vercel-ignore.sh` : leur page, leur barre, `lib/`, `portail.ts`,
  `components/site-dedie/`, `app/layout.tsx`, `public/logos/`, les
  dépendances). Elle a besoin du secret GitHub `VERCEL_TOKEN`.
- **Après un push qui touche un site dédié**, vérifier dans l'onglet
  Actions de GitHub que le déploiement est parti ; s'il a échoué (secret
  absent, plafond), déployer ce site depuis Vercel (outil
  `create_deployment` avec le sha du commit, ou « Redeploy »), puis
  vérifier `<logiciel>.omegaai.fr`.
- **Un commit qui ne touche que `docs/`, `outils/` ou `.github/` ne met
  rien en ligne** : le grouper avec le commit de site qui suit, plutôt que
  de le pousser seul, économise un déploiement.
