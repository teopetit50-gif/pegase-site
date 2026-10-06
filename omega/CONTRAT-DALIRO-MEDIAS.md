# CONTRAT-DALIRO-MEDIAS — lire les photos et les vocaux du chantier (proposition de B6, 06/10/2026)

Pour : A1 (lecteur), A2 (réception), le coordinateur. Rien n'est posé de ce contrat : c'est la demande de Daliro.

## Où en est Daliro (b6_24, posé ou à poser)

- Chaque réception WhatsApp, SMS ou courriel d'un compagnon, d'un sous-traitant ou du maître d'ouvrage (connus de
  l'annuaire), ou arrivée sur la boîte de Daliro, devient une ligne `public.btp_messages`. Elle porte son texte et
  ses médias, tels qu'A2 les dépose dans `receptions.pieces` : `[{nom, mime, taille, chemin}]`, plus le marqueur vocal
  `detail.media.vocal`.
- Elle est rangée au chantier nommé dans le message, sinon à celui du passage en cours de l'expéditeur, sinon « à
  ranger ».
- Le bureau voit le fil du chantier : photos, vocaux à écouter, texte. Il peut ouvrir un avenant brouillon depuis un
  message (origine : le message).
- **Ce qui manque** : la lecture du contenu. La transcription du vocal, la description de la photo, et les travaux
  supplémentaires ou l'avancement que le message signale.

## Ce que l'analyse d'A1 attend aujourd'hui (19an)

`private.demander_analyse(client, module, objet_type, objet_id, type, pieces uuid[], …)` porte sur des lignes
`public.pieces` déjà lues : leurs pages sont rendues au lecteur par `commencer_analyse`. Les médias du fil ne sont pas
des pièces : ce sont des chemins du bucket `omega-clients`.

## Ce que Daliro demande

1. **Une pièce par média reçu.** Une porte serveur crée une ligne `public.pieces` (source « reception ») pour un chemin
   déjà déposé, sans recopier le fichier : nom, type MIME, taille, chemin, et `role` = `photo_chantier` ou `vocal`. Côté
   A2 (à la réception) ou côté Daliro (au rangement), au choix du coordinateur. Daliro garde l'id dans
   `btp_messages.pieces[].piece`.
2. **La lecture d'un média par le lecteur** (A1), comme une pièce ordinaire :
   - image : une description courte de ce qu'on voit (ouvrage, défaut, matériel, quantités lisibles), en pages
     comme une lecture visuelle. Le lecteur sait déjà lire une image ;
   - vocal (audio/ogg, opus) : **une transcription**. C'est le maillon absent. Pistes, au choix d'A1 :
     - Mistral (Voxtral, hébergé en Union européenne, un appel HTTP depuis Deno, même fournisseur que l'OCR envisagé) ;
     - Amazon Transcribe (asynchrone, passe par S3) ;
   - plafond de coût par client et par jour, comme pour les autres lectures. Un vocal de chantier dure 10 à 60 s.
3. **Une analyse `daliro.terrain`** sur les pièces d'un message (ou des messages d'un chantier sur une journée). Elle
   rend des constats sourcés au format de CONTRAT-ANALYSE :
   - `travail_supplementaire` : `donnees` = `{designation, quantite?, unite?, lot_code?}`, citation = extrait de la
     transcription ou de la description ;
   - `avancement` : `{lot_code?, ouvrage, pourcentage?}` ;
   - `probleme` : `{nature: 'defaut' | 'retard' | 'securite' | 'materiel_manquant', texte}` ;
   - `chantier_mentionne` : `{nom}`, pour aider le rangement quand le texte ne nomme rien.

## Ce que Daliro fera du résultat (à écrire par B6 une fois 1 à 3 tranchés)

- Le fil montre la transcription sous le vocal et la description sous la photo.
- Un `travail_supplementaire` vérifié propose « Ouvrir un avenant » avec désignation et quantité pré-remplies. Il ne
  crée rien tout seul : l'avenant reste à chiffrer et à faire signer par une personne.
- Un `avancement` alimente la proposition de situation de fin de mois (« Avancement lu dans les photos » de
  /secteurs/btp). Rien n'est validé sans la personne.
- Un `probleme` de sécurité lève une alerte au conducteur.

## Questions ouvertes

- Qui crée la pièce (A2 à la réception, ou Daliro au rangement) ? B6 propose A2, une fois pour tous les modules.
- Le fournisseur de transcription et son coût (A1, puis Teo pour la dépense).
- La durée de conservation des médias du chantier (RGPD : visages et voix des compagnons). Ils ont été informés que
  leurs messages sont lus (contrôle `intervenant_non_informe`, C. trav. L1222-4). B6 propose la durée du chantier
  plus la garantie de parfait achèvement (1 an), puis effacement.
