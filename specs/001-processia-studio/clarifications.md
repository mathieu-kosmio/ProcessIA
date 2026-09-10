# Clarifications

## 19 · Clarifications et hypothèses de travail

Ces choix sont ouverts. Les propositions permettent de relire une version cohérente ; elles ne valent pas approbation utilisateur. Le code dépendant d’un arbitrage sera précisé pendant la préparation du développement.

| ID | Décision | Proposition de départ | Effet sur le développement |
|---|---|---|---|
| DEC-01 | Invitations autonomes des collègues en V1 | Consultant conduit les entretiens complémentaires ; modèle de rôle ciblé prévu | Bloque la portée des invitations multi-acteurs, pas le parcours responsable |
| DEC-02 | Fournisseurs LLM, reconnaissance et synthèse vocale | Comparer sur corpus français ; aucune contrainte héritée de Bretelles | Bloque les intégrations réelles de T006/T007, pas les tests avec adaptateurs |
| DEC-03 | Identité et résidence des données | Comptes vérifiés, invitations bornées ; hébergement à choisir selon client | Bloque l’ouverture du pilote externe |
| DEC-04 | Conservation et audio | Audio non conservé par défaut ; transcription conservée selon durée explicite par dossier | Bloque l’activation de l’écoute sur données réelles |
| DEC-05 | Profondeur du profil BPMN et imports | Profil V1 borné décrit ici ; import avancé en consultation ou refus explicite | Bloque le contrat d’import/export définitif |
| DEC-06 | Formats et client MCP du pilote | Texte, PDF textuel, DOCX ; premier client à nommer ; OCR à décider | Bloque les adaptateurs correspondants |
| DEC-07 | Priorisation et format du rapport | Pondération proposée, rapport HTML imprimable et dossier de données autorisées | Bloque l’acceptation métier finale du diagnostic |

### Hypothèses transversales

- Le responsable de processus désigné confirme la référence métier ; le consultant documente et facilite l’arbitrage.
- Une tâche incomplète peut rester au brouillon. Une contradiction critique empêche sa présentation comme pratique confirmée.
- La langue initiale est le français. Le multilingue est une évolution.
- Une seule révision est acceptée comme base d’une modification ; les conflits sont explicites.
- Le responsable peut corriger une carte sans approuver séparément chaque déplacement de disposition.
- Les seuils de performance, la durée des invitations et les volumes sont des paramètres proposés.

### Registre de clarification

Les décisions issues de la conversation sont consolidées dans CONTEXT.md et les références U1 à U7. La dernière question sur les invitations des collègues était sans réponse lors du cadrage initial. Toute réponse reçue pendant la rédaction sera intégrée ici et propagée dans les tâches et critères concernés.

### Décisions d’exploitation complémentaires

| ID | Question | Hypothèse proposée | Point bloqué |
|---|---|---|---|
| DEC-08 | Qui valide et arbitre ? | Responsable de processus désigné ; consultant prépare et facilite ; délégation explicite | Permissions de confirmation avant données réelles |
| DEC-09 | Quels budgets et volumes retenir ? | Protocole P1 et budgets par dossier à calibrer, sans tarif présumé | Validation des performances et exploitation payante |
| DEC-10 | Que signifie supprimer une source ? | Retrait du fichier distinct de l’effacement de ses données ; revue ou purge des dérivés selon la demande | Politique de suppression et d’historique |
