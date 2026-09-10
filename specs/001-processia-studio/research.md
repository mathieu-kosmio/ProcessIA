# Recherche et décisions techniques

## 02 · Méthode Spec Kit et articulation avec le TDD

La démarche suit les étapes et familles d’artefacts de [GitHub Spec Kit](https://github.com/github/spec-kit) : principes du projet, spécification des besoins, clarification, plan technique, tâches, vérification de cohérence, puis implémentation. Le [modèle officiel de spécification](https://github.com/github/spec-kit/blob/main/templates/spec-template.md) organise les parcours par priorité, avec scénarios d’acceptation, exigences, entités et critères de succès.

| Étape | Artefact ProcessIA | Situation à la livraison |
|---|---|---|
| Constitution | `.specify/memory/constitution.md` | Principes rédigés, à ratifier |
| Specify | `specs/001-processia-studio/spec.md` | Exigences détaillées et scénarios rédigés |
| Clarify | `clarifications.md` | Décisions et hypothèses explicites |
| Plan | `plan.md`, `research.md`, `data-model.md`, `contracts/` | Plan proposé ; fournisseurs et pile à confirmer |
| Tasks | `tasks.md` | Séquences verticales TDD préparées, non exécutées |
| Analyze / Checklist | `checklists/requirements.md`, `traceability.json` | Couverture documentaire contrôlée ; revue métier restante |
| Implement | Code applicatif | Étape ultérieure demandée par Mathieu |

La structure est produite selon la méthode et les modèles consultés. Le CLI Spec Kit n’a pas été installé ni exécuté dans cette session. Le document ne prétend pas que ses commandes ont été lancées. Les fichiers proposés pourront être repris dans une intégration Spec Kit pour Codex.

**Le TDD est une règle explicite du projet.** Chaque comportement prioritaire suit un cycle court : un test observable échoue pour la bonne raison, le minimum de code le fait passer, puis le code est amélioré en conservant les tests au vert. La rédaction de tous les tests puis de toute l’implémentation en deux blocs est exclue. Le [modèle officiel des tâches](https://github.com/github/spec-kit/blob/main/templates/tasks-template.md) est adapté ici à cette exigence utilisateur.

## 22 · Sources et limites

### Sources produit

Les demandes de Mathieu dans cette conversation constituent la source principale. Le document `docs/plans/2026-09-09-processia-cadrage-v0.1.md` et `CONTEXT.md` ont été relus. Les captures de cartographie organisationnelle et de chaîne de valeur de Kosmio ont servi à structurer les vues. Le projet Bretelles reste un antécédent de réflexion, distinct de ProcessIA.

### Références externes vérifiées le 9 septembre 2026

- [GitHub Spec Kit : démarche et artefacts](https://github.com/github/spec-kit).
- [Modèle de spécification](https://github.com/github/spec-kit/blob/main/templates/spec-template.md), [modèle de plan](https://github.com/github/spec-kit/blob/main/templates/plan-template.md), [modèle de tâches](https://github.com/github/spec-kit/blob/main/templates/tasks-template.md), [modèle de constitution](https://github.com/github/spec-kit/blob/main/templates/constitution-template.md).
- [OMG : BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/About-BPMN).
- [bpmn-js : intégration et modélisation](https://bpmn.io/toolkit/bpmn-js/walkthrough/).
- [MCP : outils, révision 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) et [autorisation](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization).

Les contrats ProcessIA, seuils, priorités et architectures décrits sont des propositions originales tirées du besoin, pas des garanties apportées par ces références. Les versions des logiciels et l’interopérabilité des moteurs seront vérifiées pendant le plan technique. Aucun achat, déploiement, transfert de documents client ou exécution d’agent métier n’a été réalisé pour cette spécification.

## Résultat de recherche

La méthode Spec Kit, les principes du format BPMN et les possibilités de bpmn-js ont été vérifiés sur les références officielles. Aucun benchmark de fournisseur vocal ou LLM n’a été réalisé. Les comparaisons, versions et décisions seront ajoutées avec date, alternatives et conséquences.


## Vérifications de démarrage T001

- Dépôt local sans commit initial ; `origin` correspond au dépôt fourni. `git ls-remote origin` a abouti sans référence distante le 9 septembre 2026.
- Node 22.14.0 fournit `node:sqlite` ; appel réel à `sqlite_version()` : 3.47.2. Un avertissement expérimental est émis par ce runtime et conservé dans les logs.
- Les nœuds personnalisés React Flow séparent le rendu et le modèle persisté : documentation consultée https://reactflow.dev/learn/customization/custom-nodes . L'usage ne valide aucun profil BPMN.
- Les tests en navigateur sur le serveur Vite ont rencontré un dépassement de leur budget de 30 secondes après rechargement. Le parcours a été contrôlé sur le build compilé avec un budget de test de 60 secondes. Aucun seuil de performance métier n'en est déduit.
