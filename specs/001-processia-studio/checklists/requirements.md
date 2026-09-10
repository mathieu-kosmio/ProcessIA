# Checklist de revue

## 21 · Contrôle de cohérence et risques

### Revue documentaire

- [x] Exigences et scénarios identifiés de façon unique.
- [x] Chaque exigence fonctionnelle est reliée à un parcours et à une tranche de développement.
- [x] Les tests prévus sont distingués des tests exécutés.
- [x] Voix, canevas, préparation MCP, confidentialité, diagnostic et autonomie couverts.
- [x] Profil BPMN, actuel/cible et limites d’exécution distingués.
- [x] Cas de concurrence, interruption, contradictions, suppression et révocation décrits.
- [x] Seuils non fonctionnels présentés comme objectifs proposés.
- [x] Choix de fournisseur et décisions de gouvernance laissés explicites.
- [ ] Revue métier de la carte et du parcours avec Mathieu.
- [ ] Arbitrages de clarification et constitution ratifiée.
- [ ] Pile, contrats exécutables et versions confirmés dans le plan.
- [ ] Tests applicatifs implémentés, exécutés et preuves ajoutées.

Cette revue établit une couverture documentaire ; elle ne valide pas le fonctionnement d’une application. L’analyse de cohérence a harmonisé les identifiants de tâches, les formats exportés, la non-conservation audio par défaut et les hypothèses de charge.

### Risques et scénarios de contrôle

| Risque | Mesure proposée | Scénario de contrôle |
| --- | --- | --- |
| Confusion entre modèle type et réalité de l’entreprise. | Marquer provenance et statut sur les propositions ; demander validation métier aux points décisifs. | Le modèle initial comporte une étape absente du métier pilote ; son rejet retire l’étape sans confirmer les autres. |
| Fuite par synthèse IA depuis la préparation consultant. | Contexte IA filtré par droits en amont et contenu partagé explicitement approuvé ; provenance privée masquée sur toutes les vues. | Source privée avec marqueur secret et fait partagé reformulé ; aucune réponse, recherche ou export client ne restitue le marqueur ou le titre. |
| Perte d’une modification manuelle après une commande vocale lente. | Révision de base et transaction atomique ; conflit visible et nouvelle proposition après lecture des modifications. | Une réponse IA fondée sur r12 arrive après édition manuelle r13 ; r13 demeure intacte et le résultat passe en conflit. |
| Source importée contenant des instructions hostiles ou hors sujet. | Contenu traité comme donnée, aucune autorisation issue du document ; décisions et opérations valides côté système. | Document demandant de publier les sources ou d’appeler un outil externe : refus des actions et extraction limitée aux faits pertinents. |
| Diagnostic apparemment précis malgré couverture partielle. | Montrer processus analysé, rôles entendus, incertitudes et limites ; entretiens recommandés motivés. | Achats jamais interrogés : le diagnostic conserve ce manque et ne prétend pas exhaustivité. |
| Transcription erronée appliquée à la mauvaise tâche. | Contexte sélection/révision conservé, segments stabilisés, clarification en cas d’ambiguïté et annulation. | Changement de sélection pendant une phrase contenant ici ; aucune mutation silencieuse de la nouvelle sélection. |
| Coût IA non maîtrisé par sessions vocales longues et reprises. | Budget par dossier, suivi estimé/constaté et réserve avant traitement ; transition écrite lorsque limite atteinte. | 5 commandes simultanées au budget quasi épuisé : admission limitée, arrêt expliqué et carte accessible. |
| Suppression incomplète dans les dérivés ou restauration. | Inventaire dépendances, tombstones et purge ; relecture des suppressions avant remise en service restaurée. | Supprimer une transcription contenant un identifiant personnel puis restaurer une sauvegarde ; identifiant absent des surfaces accessibles, dérivés et exports hébergés. |
| Lien révoqué mais traitement asynchrone encore actif. | Droits recontrôlés à chaque accès et avant application, révocation sessions actives. | Révoquer pendant génération diagnostic : aucun nouveau téléchargement ou écriture par l’ancien bénéficiaire. |
| BPMN valide mais non exécutable dans un moteur choisi plus tard. | Distinguer modèle descriptif, sous-ensemble exportable et contrat d’exécution futur. | Export et réimport fidèles des fixtures ; aucune commande de déploiement exposée dans ce périmètre. |

### Matrice de traçabilité

| Exigence | Parcours | Priorité | Scénarios | Test prévu | Tranche |
| --- | --- | --- | --- | --- | --- |
| FR-001 | US01 | MUST | AC-001-1 à -3 | TC-001 | T002, T012 |
| FR-002 | US01 | MUST | AC-002-1 à -3 | TC-002 | T002 |
| FR-003 | US01 | MUST | AC-003-1 à -3 | TC-003 | T005 |
| FR-004 | US01 | MUST | AC-004-1 à -3 | TC-004 | T005 |
| FR-005 | US01 | MUST | AC-005-1 à -3 | TC-005 | T005 |
| FR-006 | US01 | MUST | AC-006-1 à -3 | TC-006 | T005 |
| FR-007 | US01 | MUST | AC-007-1 à -3 | TC-007 | T005 |
| FR-008 | US02 | MUST | AC-008-1 à -3 | TC-008 | T004 |
| FR-009 | US02 | MUST | AC-009-1 à -3 | TC-009 | T004 |
| FR-010 | US02 | MUST | AC-010-1 à -3 | TC-010 | T004 |
| FR-011 | US02 | MUST | AC-011-1 à -3 | TC-011 | T004 |
| FR-012 | US02 | MUST | AC-012-1 à -3 | TC-012 | T004, T012 |
| FR-013 | US02 | MUST | AC-013-1 à -3 | TC-013 | T004 |
| FR-014 | US02 | MUST | AC-014-1 à -3 | TC-014 | T006 |
| FR-015 | US03 | MUST | AC-015-1 à -3 | TC-015 | T007 |
| FR-016 | US03 | MUST | AC-016-1 à -3 | TC-016 | T007 |
| FR-017 | US03 | MUST | AC-017-1 à -3 | TC-017 | T007 |
| FR-018 | US03 | MUST | AC-018-1 à -3 | TC-018 | T007 |
| FR-019 | US03 | MUST | AC-019-1 à -3 | TC-019 | T007 |
| FR-020 | US03 | MUST | AC-020-1 à -3 | TC-020 | T006 |
| FR-021 | US04 | MUST | AC-021-1 à -3 | TC-021 | T008 |
| FR-022 | US04 | MUST | AC-022-1 à -3 | TC-022 | T008 |
| FR-023 | US04 | MUST | AC-023-1 à -3 | TC-023 | T008 |
| FR-024 | US04 | MUST | AC-024-1 à -3 | TC-024 | T001, T006 |
| FR-025 | US04 | MUST | AC-025-1 à -3 | TC-025 | T001, T008 |
| FR-026 | US04 | MUST | AC-026-1 à -3 | TC-026 | T006 |
| FR-027 | US04 | MUST | AC-027-1 à -3 | TC-027 | T003 |
| FR-028 | US04 | MUST | AC-028-1 à -3 | TC-028 | T003 |
| FR-029 | US04 | MUST | AC-029-1 à -3 | TC-029 | T003 |
| FR-030 | US05 | SHOULD | AC-030-1 à -3 | TC-030 | T009 |
| FR-031 | US05 | SHOULD | AC-031-1 à -3 | TC-031 | T009 |
| FR-032 | US05 | MUST | AC-032-1 à -3 | TC-032 | T009 |
| FR-033 | US06 | MUST | AC-033-1 à -3 | TC-033 | T010 |
| FR-034 | US06 | MUST | AC-034-1 à -3 | TC-034 | T010 |
| FR-035 | US06 | MUST | AC-035-1 à -3 | TC-035 | T010 |
| FR-036 | US06 | MUST | AC-036-1 à -3 | TC-036 | T010 |
| FR-037 | US06 | MUST | AC-037-1 à -3 | TC-037 | T010 |
| FR-038 | US07 | MUST | AC-038-1 à -3 | TC-038 | T011 |
| FR-039 | US07 | MUST | AC-039-1 à -3 | TC-039 | T011 |
| FR-040 | US07 | MUST | AC-040-1 à -3 | TC-040 | T011 |