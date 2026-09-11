# Tâches proposées

## 17 · Stratégie de développement en TDD

### Ordre de travail

Un scénario métier → un test échouant → une implémentation minimale → refactorisation → contrôle de la spécification. Les tests décrivent des observations publiques : élément visible, accès refusé, version conservée, export fidèle. Ils évitent les détails internes comme les noms de méthodes privées ou la structure d’un composant.

### Premier parcours vertical recommandé

Sur un dossier synthétique autorisé, une demande écrite « ajoute une validation avant la restitution » produit une proposition structurée, applique une commande valide, affiche la nouvelle tâche et la retrouve après rechargement. Le langage est d’abord simulé à la frontière fournisseur pour tester le système de manière déterministe. Un second cycle vérifie qu’une réponse invalide ne modifie rien. La voix est ensuite branchée sur le même comportement ; elle n’est pas une seconde logique de modification.

### Niveaux de vérification

| Niveau | Ce qui est vérifié | Limite |
|---|---|---|
| Domaine | Types de liens, droits, révisions, transitions, scores | Ne prouve pas la qualité linguistique |
| Intégration | Commande publique, sauvegarde, reprise, projection client, export | Fournisseurs remplacés à leurs frontières |
| Contrat | Schémas MCP, contenu structuré, refus d’accès, limites et erreurs | Compatibilité à vérifier aussi contre un client réel |
| Navigateur | Sélection, voix simulée, édition, annulation, clavier, export | Essais vocaux réels complémentaires |
| Évaluation IA | Sens des commandes, citations, relances et hallucinations | Résultats statistiques, pas un substitut aux invariants déterministes |
| Pilote métier | Compréhension, valeur du diagnostic et autonomie | Effectifs et limites explicitement rapportés |

### Corpus de test proposé

Un dossier Kosmio synthétique avec 12 tâches, 4 rôles, 3 outils et 6 sources ; une deuxième entreprise factice pour les contrôles d’isolation ; une source privée contenant un marqueur unique détectable dans les fuites ; deux témoignages divergents ; une variante de processus ; des documents manquants ; 40 demandes françaises couvrant ajout, suppression, ordre, responsabilité, ambiguïté et annulation. Ces données servent aux tests et ne décrivent pas des faits validés chez Kosmio.

### Évaluations des fournisseurs

Les tests de régression ordinaires utilisent des réponses enregistrées ou simulées sans contenu client. Les évaluations réelles sont séparées, versionnent fournisseur, modèle, consigne et corpus, et mesurent coût, latence et qualité. Les invariants d’accès et de validation demeurent bloquants quelle que soit la qualité du modèle. Aucune assertion déterministe ne dépend d’une formulation exacte de l’IA.

### Définition de terminé par tranche

Le comportement est lié à une exigence ; l’échec initial du test a été observé ; les tests appropriés passent ; le comportement est montré dans l’interface ou le contrat public ; erreurs et droits sont couverts ; les documents et le suivi sont mis à jour ; les limites restent visibles. Un test non exécuté reste indiqué comme non exécuté.

## 18 · Plan de tâches et traçabilité TDD

**État au 11 septembre 2026 : T001 à T006 vérifiées localement ; socle T007 vérifié avec intégration vocale réelle ouverte ; noyau T008 vérifié avec import/export XML ouverts ; noyau obligatoire T009 vérifié avec compléments SHOULD ouverts ; noyaux diagnostic et comparaison actuel/cible T010 vérifiés, avec édition du diagnostic encore ouverte.** Les chemins sont proposés dans le plan et sont confirmés ou ajustés à chaque tranche. Chaque ligne représente une tranche métier ; à l’intérieur, traiter un seul comportement par cycle Red → Green → Refactor. Les invariants de qualité et de sécurité sont intégrés dès les tranches concernées, T012 vérifie leur tenue globale.

### T001 · Créer la tranche modèle et canevas persisté

- [x] **[US04] T001-R** : écrire le prochain test public pour le comportement : Un ajout valide est visible après rechargement ; une commande invalide ne modifie rien. Observer son échec pour la bonne raison.
- [x] **[US04] T001-G** : implémenter le minimum qui satisfait ce test ; exécuter les vérifications pertinentes.
- [x] **[US04] T001-F** : refactoriser avec tests au vert, mettre à jour la trace ; répéter R/G/F pour le comportement suivant.

**Références :** FR-024, FR-025.

**Cas prévus :** TC-024, TC-025.

**Chemins proposés :** src/domain/model/, src/application/model/, src/web/studio/, tests/integration/model-command.test.ts.

**Prérequis :** Aucune, après décisions de pile et constitution.

**Démonstration de sortie :** Un ajout valide est visible après rechargement ; une commande invalide ne modifie rien.

### T002 · Borner le dossier et les accès

- [x] **[US01] T002-R** : écrire le prochain test public pour le comportement : Deux comptes et deux dossiers démontrent la séparation à travers la même interface publique. Observer son échec pour la bonne raison.
- [x] **[US01] T002-G** : implémenter le minimum qui satisfait ce test ; exécuter les vérifications pertinentes.
- [x] **[US01] T002-F** : refactoriser avec tests au vert, mettre à jour la trace ; répéter R/G/F pour le comportement suivant.

**Références :** FR-001, FR-002.

**Cas prévus :** TC-001, TC-002.

**Chemins proposés :** src/domain/access/, src/application/dossiers/, tests/integration/dossier-access.test.ts.

**Prérequis :** T001 ; identité décidée.

**Démonstration de sortie :** Deux comptes et deux dossiers démontrent la séparation à travers la même interface publique.

### T003 · Documenter rôles, outils et informations

- [x] **[US04] T003-R** : écrire le prochain test public pour le comportement : Une tâche conserve rôle, outil, entrée et sortie ; les identifiants restent stables après renommage. Observer son échec pour la bonne raison.
- [x] **[US04] T003-G** : implémenter le minimum qui satisfait ce test ; exécuter les vérifications pertinentes.
- [x] **[US04] T003-F** : refactoriser avec tests au vert, mettre à jour la trace ; répéter R/G/F pour le comportement suivant.

**Références :** FR-027, FR-028, FR-029.

**Cas prévus :** TC-027, TC-028, TC-029.

**Chemins proposés :** src/domain/model/, src/web/task-inspector/, tests/e2e/task-details.spec.ts.

**Prérequis :** T001, T002.

**Démonstration de sortie :** Une tâche conserve rôle, outil, entrée et sortie ; les identifiants restent stables après renommage.

### T004 · Apporter une source par MCP

- [x] **[US02] T004-R** : écrire le prochain test public pour le comportement : Un appel idempotent crée une source privée et un traitement traçable ; le second appel ne crée pas de doublon. Observer son échec pour la bonne raison.
- [x] **[US02] T004-G** : implémenter le minimum qui satisfait ce test ; exécuter les vérifications pertinentes.
- [x] **[US02] T004-F** : refactoriser avec tests au vert, mettre à jour la trace ; répéter R/G/F pour le comportement suivant.

**Références :** FR-008, FR-009, FR-010, FR-011, FR-012, FR-013.

**Cas prévus :** TC-008, TC-009, TC-010, TC-011, TC-012, TC-013.

**Chemins proposés :** src/adapters/mcp/, src/application/sources/, tests/contract/mcp-source.test.ts.

**Prérequis :** T002 ; client MCP et formats décidés.

**Démonstration de sortie :** Un appel idempotent crée une source privée et un traitement traçable ; le second appel ne crée pas de doublon.

### T005 · Partager une projection maîtrisée

- [x] **[US01] T005-R** : écrire le prochain test public pour le comportement : Le client voit la synthèse partagée sans extrait, titre ni référence privée ; la révocation est appliquée. Observer son échec pour la bonne raison.
- [x] **[US01] T005-G** : implémenter le minimum qui satisfait ce test ; exécuter les vérifications pertinentes.
- [x] **[US01] T005-F** : refactoriser avec tests au vert, mettre à jour la trace ; répéter R/G/F pour le comportement suivant.

**Références :** FR-003, FR-004, FR-005, FR-006, FR-007.

**Cas prévus :** TC-003, TC-004, TC-005, TC-006, TC-007.

**Chemins proposés :** src/application/sharing/, src/web/sharing/, tests/integration/private-projection.test.ts.

**Prérequis :** T002, T004.

**Démonstration de sortie :** Le client voit la synthèse partagée sans extrait, titre ni référence privée ; la révocation est appliquée.

### T006 · Relier dialogue écrit, sélection et commandes

- [x] **[US03] T006-R** : écrire le prochain test public pour le comportement : Une demande contextualisée modifie la bonne tâche ; une proposition obsolète est clarifiée ; un enrichissement documentaire préserve les valeurs confirmées. Observer son échec pour la bonne raison.
- [x] **[US03] T006-G** : implémenter le minimum qui satisfait ce test ; exécuter les vérifications pertinentes.
- [x] **[US03] T006-F** : refactoriser avec tests au vert, mettre à jour la trace ; répéter R/G/F pour le comportement suivant.

**Références :** FR-014, FR-020, FR-024, FR-026.

**Cas prévus :** TC-014, TC-020, TC-024, TC-026.

**Chemins proposés :** src/application/interviews/, src/adapters/ai/, tests/integration/contextual-edit.test.ts.

**Prérequis :** T001, T003, T005.

**Démonstration de sortie :** Une demande contextualisée modifie la bonne tâche ; une proposition obsolète est clarifiée ; un enrichissement documentaire préserve les valeurs confirmées.

### T007 · Ajouter la voix et les reprises

- [ ] **[US03] T007-R** : écrire le prochain test public pour le comportement : Parole, interruption, passage au texte et refus micro conservent un même entretien. Observer son échec pour la bonne raison.
- [ ] **[US03] T007-G** : implémenter le minimum qui satisfait ce test ; exécuter les vérifications pertinentes.
- [ ] **[US03] T007-F** : refactoriser avec tests au vert, mettre à jour la trace ; répéter R/G/F pour le comportement suivant.

**Références :** FR-015, FR-016, FR-017, FR-018, FR-019.

**Cas prévus :** TC-015, TC-016, TC-017, TC-018, TC-019.

**Chemins proposés :** src/adapters/voice/, src/web/interview/, tests/e2e/voice-session.spec.ts.

**Prérequis :** T006 ; fournisseurs et conservation décidés.

**Démonstration de sortie :** Parole, interruption, passage au texte et refus micro conservent un même entretien.

Progression locale au 10 septembre 2026 : session persistante, consentement explicite, état d'écoute, bascule texte, idempotence, interruption et correction sont vérifiés avec un adaptateur vocal simulé. Les cases restent ouvertes jusqu'au choix d'un fournisseur et d'une politique de conservation pilote dans DEC-02 et DEC-04 ; aucune reconnaissance ni synthèse vocale réelle n'est déclarée.

### T008 · Compléter la navigation et le profil BPMN

- [x] **[US04] T008-R** : écrire le prochain test public pour le comportement : Sous-processus et flux sont valides ; une séquence entre participants est refusée ; une modification obsolète ne s’applique pas. Observer son échec pour la bonne raison.
- [x] **[US04] T008-G** : implémenter le minimum qui satisfait ce test ; exécuter les vérifications pertinentes.
- [x] **[US04] T008-F** : refactoriser avec tests au vert, mettre à jour la trace ; répéter R/G/F pour le comportement suivant.

**Références :** FR-021, FR-022, FR-023, FR-025.

**Cas prévus :** TC-021, TC-022, TC-023, TC-025.

**Chemins proposés :** src/domain/bpmn/, src/adapters/bpmn/, tests/domain/bpmn-profile.test.ts.

**Prérequis :** T001, T003 ; profil BPMN fixé.

**Démonstration de sortie :** Sous-processus et flux sont valides ; une séquence entre participants est refusée ; une modification obsolète ne s’applique pas.

Progression locale au 11 septembre 2026 : profil de domaine, persistance SQLite, contrôle des droits, commandes HTTP, anomalies localisées et navigation web dans un sous-processus sont vérifiés. La palette complète, la carte macro, la synchronisation générale avec le modèle de tâches et l'aller-retour XML restent hors de ce noyau ; DEC-05 et T011 restent ouverts pour le contrat d'import/export définitif.

### T009 · Assister et consolider les entretiens

- [x] **[US05] T009-R** : écrire le prochain test public pour le comportement : Deux témoignages créent une divergence contextualisée sans arbitrage inventé. La planification et les suggestions en direct sont un complément SHOULD, développé après ce noyau. Observer son échec pour la bonne raison.
- [x] **[US05] T009-G** : implémenter le minimum qui satisfait ce test ; exécuter les vérifications pertinentes.
- [x] **[US05] T009-F** : refactoriser avec tests au vert, mettre à jour la trace ; répéter R/G/F pour le comportement suivant.

**Références :** FR-030, FR-031, FR-032.

**Cas prévus :** TC-030, TC-031, TC-032.

**Chemins proposés :** src/application/interview-review/, src/web/consultant/, tests/integration/interview-conflict.test.ts.

**Prérequis :** T004, T006.

**Démonstration de sortie :** Deux témoignages créent une divergence contextualisée sans arbitrage inventé. La planification et les suggestions en direct sont un complément SHOULD, développé après ce noyau.

Progression locale au 11 septembre 2026 : assertions distinctes, provenances privées, absence de vote majoritaire, question de clarification par rôle, idempotence, API et panneau consultant sont vérifiés. T010 relie une divergence ouverte à un premier diagnostic privé. La résolution humaine, le plan d'entretiens partageable et les suggestions en direct restent ouverts.

### T010 · Produire un diagnostic et une feuille de route

- [x] **[US06] T010-R** : écrire le prochain test public pour le comportement : Une opportunité liée au constat possède prérequis, priorité expliquée, responsable et essai ; une valeur inconnue reste inconnue. Observer son échec pour la bonne raison.
- [x] **[US06] T010-G** : implémenter le minimum qui satisfait ce test ; exécuter les vérifications pertinentes.
- [x] **[US06] T010-F** : refactoriser avec tests au vert, mettre à jour la trace ; répéter R/G/F pour le comportement suivant.

**Références :** FR-033, FR-034, FR-035, FR-036, FR-037.

**Cas prévus :** TC-033, TC-034, TC-035, TC-036, TC-037.

**Chemins proposés :** src/domain/diagnostic/, src/application/diagnostic/, tests/integration/roadmap.test.ts.

**Prérequis :** T003, T005, T009 pour la consolidation MUST uniquement ; suggestions en direct non bloquantes.

**Démonstration de sortie :** Une opportunité liée au constat possède prérequis, priorité expliquée, responsable et essai ; une valeur inconnue reste inconnue.

Progression locale au 11 septembre 2026 : diagnostic privé lié à une révision, périmètre et couverture explicites, constat relié à la divergence T009, faisabilité inconnue, priorité proposée et justifiée, responsable humain, prérequis et essai ordonnés sont vérifiés. FR-033 est vérifiée pour une cible qui modifie le libellé d'une tâche : préparation IA, validation humaine, modèle réel inchangé et réconciliation explicite après une nouvelle révision. Les autres types de changements cibles, l'édition avec historique FR-035-3, les capacités mutualisées FR-036-1 et l'autonomie ou la mesure après essai FR-037-2 à FR-037-3 restent ouverts.

### T011 · Figer et exporter les résultats autorisés

- [ ] **[US07] T011-R** : écrire le prochain test public pour le comportement : Le rapport et le BPMN correspondent à la même révision ; les informations privées sont absentes ; import aller-retour vérifié. Observer son échec pour la bonne raison.
- [ ] **[US07] T011-G** : implémenter le minimum qui satisfait ce test ; exécuter les vérifications pertinentes.
- [ ] **[US07] T011-F** : refactoriser avec tests au vert, mettre à jour la trace ; répéter R/G/F pour le comportement suivant.

**Références :** FR-038, FR-039, FR-040.

**Cas prévus :** TC-038, TC-039, TC-040.

**Chemins proposés :** src/application/exports/, src/adapters/bpmn/, tests/integration/export-roundtrip.test.ts.

**Prérequis :** T005, T008, T010.

**Démonstration de sortie :** Le rapport et le BPMN correspondent à la même révision ; les informations privées sont absentes ; import aller-retour vérifié.

### T012 · Éprouver qualité et pilote

- [ ] **[US03] T012-R** : écrire le prochain test public pour le comportement : Mesurer le protocole de référence, tester reprise et restauration, corriger les écarts avec un nouveau cycle TDD. Observer son échec pour la bonne raison.
- [ ] **[US03] T012-G** : implémenter le minimum qui satisfait ce test ; exécuter les vérifications pertinentes.
- [ ] **[US03] T012-F** : refactoriser avec tests au vert, mettre à jour la trace ; répéter R/G/F pour le comportement suivant.

**Références :** NFR-001 à NFR-012.

**Cas prévus :** QC-001, QC-002, QC-003, QC-004, QC-005, QC-006, QC-007, QC-008, QC-009, QC-010, QC-011, QC-012.

**Chemins proposés :** tests/e2e/, tests/contract/, docs/validation/.

**Prérequis :** T007, T011 ; pas de validation fictive.

**Démonstration de sortie :** Mesurer le protocole de référence, tester reprise et restauration, corriger les écarts avec un nouveau cycle TDD.
