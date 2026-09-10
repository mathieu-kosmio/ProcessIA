# Constitution ProcessIA

## 03 · Constitution proposée

Version constitutionnelle **0.1.0**. Statut **proposée, non ratifiée**. Une modification de principe doit expliquer l’effet sur les exigences, les contrats et les tests. Une décision utilisateur explicite prévaut sur une hypothèse de cette version.

| Principe | Règle vérifiable |
|---|---|
| C-01 · Valeur visible rapidement | Chaque incrément démontre un parcours métier utilisable ; le premier relie une demande à une carte persistée et modifiable. |
| C-02 · Une représentation cohérente | Voix, texte, édition et MCP produisent des modifications contrôlées du même modèle versionné. |
| C-03 · Fidélité et provenance | Chaque affirmation distingue origine, hypothèse et confirmation ; l’IA ne transforme pas une plausibilité en fait établi. |
| C-04 · Contrôle de l’utilisateur | Changements locaux annulables ; décisions ambiguës explicitées ; partage privé vers client soumis à un choix humain. |
| C-05 · Accès appliqués par le système | Chaque lecture, génération, export et modification respecte l’entreprise et la visibilité autorisées, même si un prompt demande le contraire. |
| C-06 · Interopérabilité honnête | Le sous-ensemble BPMN couvert est déclaré. Les pertes d’import/export sont visibles. Modéliser un processus ne prouve pas son exécutabilité. |
| C-07 · Test avant implémentation | Chaque comportement développé possède un cycle Red → Green → Refactor documenté, avec test via une interface publique. |
| C-08 · Simplicité et choix explicites | Un modèle partagé et quelques interfaces suffisent au pilote. Aucun fournisseur ni runtime de Bretelles n’est hérité automatiquement. |
| C-09 · Amélioration utile aux équipes | Les recommandations portent sur le travail, les échanges et la valeur ; les indicateurs sont agrégés et ne notent pas les personnes. |

**Contrôle constitutionnel avant code :** vérifier la traçabilité des exigences concernées, les décisions nécessaires, la stratégie de test et les limites de partage. À chaque livraison, vérifier à nouveau ces points sur le comportement réalisé.