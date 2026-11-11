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

## Les six sites dédiés ne se reconstruisent que si on les touche

Depuis le 11/11/2026 (plafond Vercel gratuit atteint : cent déploiements
par vingt-quatre heures, sept projets reconstruits à chaque push), chaque
projet Vercel de site dédié (daliro, lorani, tamila, tiroma, tavaro,
varelo) passe par `outils/vercel-ignore.sh <cle>` avant de construire :
la construction est ignorée quand les commits poussés ne touchent que
les pages des autres métiers ou la vitrine Omega. Sa propre page, sa
barre, `lib/`, `components/site-dedie/communs.tsx`, `portail.ts`,
`app/layout.tsx`, `public/logos/` ou les dépendances le reconstruisent.
`omegaai.fr` (pegase-site2) se reconstruit toujours. Si un site dédié
doit repartir sans qu'un fichier à lui ait bougé, le relancer depuis
Vercel (outil `create_deployment`, ou « Redeploy » dans le tableau de
bord).
