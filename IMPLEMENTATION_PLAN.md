# ProcessIA · Suivi de développement

Version 0.6.0, 10 septembre 2026. Développement local en cours, par tranches verticales TDD.

| Tranche | Parcours principal | Résultat | État |
| --- | --- | --- | --- |
| T001 | US04 | Créer la tranche modèle et canevas persisté | Vérifié localement |
| T002 | US01 | Borner le dossier et les accès | Vérifié localement |
| T003 | US04 | Documenter rôles, outils et informations | Vérifié localement |
| T004 | US02 | Apporter une source par MCP | Vérifié localement |
| T005 | US01 | Partager une projection maîtrisée | Vérifié localement |
| T006 | US03 | Relier dialogue écrit, sélection et commandes | Non commencé |
| T007 | US03 | Ajouter la voix et les reprises | Non commencé |
| T008 | US04 | Compléter la navigation et le profil BPMN | Non commencé |
| T009 | US05 | Assister et consolider les entretiens | Non commencé |
| T010 | US06 | Produire un diagnostic et une feuille de route | Non commencé |
| T011 | US07 | Figer et exporter les résultats autorisés | Non commencé |
| T012 | US03 | Éprouver qualité et pilote | Non commencé |

Le détail, les dépendances et les cycles TDD se trouvent dans `specs/001-processia-studio/tasks.md`. À chaque cycle, enregistrer test visé, échec observé, résultat au vert, limites et révision Git réelle.

## T001 · Modèle et canevas persisté

Statut : vérifié localement le 10 septembre 2026. Révision Git : incluse dans le jalon initial du dépôt.

| Cycle | Exigences | Rouge observé | Résultat vérifié |
| --- | --- | --- | --- |
| Ajout et rechargement | FR-024, TC-024 | Service factice retournant `rejected` | Ajout atomique, liens ajustés et modèle retrouvé après réouverture SQLite |
| Rejet atomique | FR-024 | Un lot avec une cible absente appliquait sa première opération | Lot entièrement rejeté, révision et graphe inchangés |
| Concurrence et contexte | FR-025, FR-026 | Une seconde commande sur la même révision écrasait le modèle | Conflit explicite ; sélection incohérente et résultat fournisseur tardif refusés |
| Idempotence et accès | FR-002, FR-024 | Rejeu interprété comme conflit ; lecture sans contrôle | Rejeu identique sans doublon, clé altérée refusée, droits vérifiés avant lecture, génération et mutation |
| Édition directe | FR-025 | Déplacement et renommage hors contrat | Position ou libellé persistés sans modifier les identifiants, liens et rôles |
| Annulation | FR-024 | `UNDO` rejeté et journal vide | Dernière transaction restaurée dans une nouvelle révision, historique conservé |
| Dialogue simulé | FR-024 | Proposition toujours rejetée puis réponse invalide levait une erreur | Proposition relue avant application, clarification hors scénario, réponse invalide sans effet |
| Studio web | FR-024, FR-025 | Parcours absents ou champs manquants | Carte et liste, fiche, proposition, édition, déplacement, conflit, journal et annulation vérifiés dans Chromium |

Preuves : `docs/validation/T001.md`, `docs/validation/t001-integration.log`, `docs/validation/t001-browser.log` et `docs/validation/processia-studio.png`.

Limites : données synthétiques, identité locale fixe, dialogue déterministe, un seul dossier préchargé. La carte React Flow ne constitue pas encore le profil BPMN. SQLite est expérimental dans Node 22.14. Les objectifs NFR de performance, d'accessibilité WCAG et de charge ne sont pas mesurés par ces essais.

## T002 · Dossier et accès

Statut : vérifié localement le 10 septembre 2026. Révision Git : incluse dans le jalon initial du dépôt.

Premier comportement visé : créer deux dossiers portant le même nom via l'interface publique, conserver deux identifiants distincts, puis démontrer qu'un responsable autorisé ne reçoit que l'espace partagé de son dossier et aucune information d'un autre dossier.

| Cycle | Exigences | Rouge observé | Résultat vérifié |
| --- | --- | --- | --- |
| Création et identité stable | FR-001, TC-001 | Route absente, réponse 404 | Deux dossiers homonymes créés avec des UUID distincts et deux espaces explicites |
| Isolation responsable | FR-001, FR-002, TC-002 | Affectation d'accès absente | Liste limitée au dossier autorisé, espace partagé uniquement, modèle privé refusé |
| Révocation | FR-002 | Méthode de révocation absente | Accès dossier et modèle refusé dès la requête suivante, même avec une capacité de session antérieure |
| Studio web | FR-001 | Création et choix du dossier absents | Formulaire de création, activité facultative, identifiant visible et sélection du dossier |

Preuve : `docs/validation/T002.md`. Vérification consolidée : 18 tests d'intégration et 7 parcours navigateur réussis.

Limites : les identités sont synthétiques et injectées côté serveur. Aucun mécanisme d'invitation, d'expiration, d'authentification externe ou d'administration des accès n'est exposé dans l'interface. La projection partagée reste T005. Ces limites maintiennent DEC-01 et DEC-03 ouverts pour le pilote réel.

## T003 · Rôles, outils et informations

Statut : vérifié localement le 10 septembre 2026. Révision Git : jalon T003 documenté dans l'historique du dépôt.

Premier comportement visé : ouvrir une fiche de tâche, renseigner un rôle, un outil, une information d'entrée et un livrable de sortie, puis retrouver ces rattachements après rechargement sans changer leurs identifiants lors d'un renommage.

| Cycle | Exigences | Rouge observé | Résultat vérifié |
| --- | --- | --- | --- |
| Références métier | FR-027, FR-029, TC-027, TC-029 | Les opérations de rattachement étaient rejetées par le contrat | Registres de rôles, outils et informations réutilisables ; rattachements atomiques par identifiant |
| Identité stable | FR-027, TC-027 | Les entités n'existaient pas dans le modèle versionné | Une tâche et quatre références renommées conservent leurs identifiants après réouverture SQLite |
| État de connaissance | FR-028, TC-028 | Le champ vide ne portait aucun statut explicite | Chaque rattachement distingue unset, proposed, to_confirm, confirmed, contested et confirmed_absent ; la saisie locale produit to_confirm |
| Studio web | FR-027, FR-028, FR-029 | Les champs de fiche étaient absents du parcours navigateur | Rôle, outil, entrée et sortie enregistrés ensemble et retrouvés après rechargement |

Preuve : docs/validation/T003.md. Vérification consolidée : 19 tests d'intégration, build TypeScript/Vite et 8 parcours Chromium réussis.

Limites : l'interface actuelle saisit une référence par catégorie. Les catégories documentaires détaillées, les contributeurs, le validateur, les personnes, les services, les échanges et la provenance restent à enrichir. La confirmation et l'absence confirmée ne sont pas encore déclenchables dans le studio car le rôle habilité à les décider reste ouvert.

## T004 · Source privée par MCP

Statut : vérifié localement le 10 septembre 2026. Révision Git : jalon T004 documenté dans l'historique du dépôt.

Premier comportement visé : depuis un client MCP, cibler explicitement un dossier autorisé, importer une transcription privée avec une clé d'idempotence, retrouver ses passages et son traitement, puis rejouer le même appel sans doublon.

| Cycle | Exigences | Rouge observé | Résultat vérifié |
| --- | --- | --- | --- |
| Contrat MCP et ingestion | FR-008, FR-009, TC-008, TC-009 | Le test échouait sur l'absence du service de sources et du serveur MCP | Quatre outils décrits par schémas Zod ; import texte ou transcription dans le dossier explicite |
| Idempotence | FR-010, TC-010 | Aucun registre d'import ne permettait un rejeu stable | Même clé et même contenu retournent source, version et traitement identiques ; contenu différent refusé |
| Traitement et passages | FR-011, FR-012, TC-011, TC-012 | L'import restait dans l'état received sans résultat consultable | Segmentation textuelle déterministe, état completed, couverture en octets et positions de caractères consultables avec les droits privés |
| Droits et contenu non fiable | FR-008, FR-013, TC-008, TC-013 | La frontière MCP et la révocation n'étaient pas exercées | Droits relus dans SQLite avant chaque opération ; une instruction présente dans le texte reste un passage sans effet externe |
| Transport stdio | FR-008, TC-008 | Aucun processus MCP exécutable | Un client du SDK officiel lance le serveur, négocie la connexion, liste les outils et lit l'identité synthétique |

Preuve : `docs/validation/T004.md`. Vérification consolidée : 23 tests d'intégration et de contrat, build TypeScript/Vite et 8 parcours Chromium réussis.

Limites : le serveur utilise une identité locale synthétique et le transport stdio. Le profil accepté est limité à `text` et `transcript`, avec 64 Kio par source comme limite locale de développement. PDF, DOCX, OCR et premier client pilote restent ouverts dans DEC-06. La segmentation sépare les paragraphes sans analyse sémantique ; elle ne produit encore ni connaissance candidate, ni état partiel, ni reprise. L'actualisation explicite d'une source vers une nouvelle version reste à implémenter. Ces absences correspondent aux critères AC-010-3, AC-011-2, AC-011-3 et aux associations de connaissances de FR-012, qui ne sont donc pas déclarés réalisés.

## T005 · Projection partagée maîtrisée

Statut : vérifié localement le 10 septembre 2026. Révision Git : jalon T005 documenté dans l'historique du dépôt.

Premier comportement visé : sélectionner un passage d'une source privée, prévisualiser une reformulation, la confirmer explicitement, la consulter avec une identité responsable sans métadonnée privée, puis retirer son partage.

| Cycle | Exigences | Rouge observé | Résultat vérifié |
| --- | --- | --- | --- |
| Prévisualisation | FR-003, FR-004, TC-003, TC-004 | Le test échouait sur l'absence du service de partage | Une prévisualisation versionnée reste privée et n'apparaît pas dans la projection responsable |
| Publication explicite | FR-004, FR-005, TC-004, TC-005 | Aucun état ne reliait une formulation approuvée à sa provenance | Confirmation idempotente avec auteur, date, version, source et passage privés |
| Projection filtrée | FR-005, FR-006, TC-005, TC-006 | Aucune vue partagée distincte de la préparation | Le responsable reçoit uniquement la formulation et une provenance générique ; le consultant retrouve le détail privé |
| Annulation et retrait | FR-004, FR-007, TC-004, TC-007 | Aucun cycle de vie de partage | Annuler une prévisualisation ne publie rien ; retirer une publication crée une nouvelle version et bloque la lecture suivante |
| Studio web | FR-004, FR-005 | Aucun contrôle visuel du partage | Panneau Sources & partage avec extrait privé, aperçu responsable, confirmation et retrait |

Preuve : `docs/validation/T005.md`. Vérification consolidée : 24 tests d'intégration et de contrat, build TypeScript/Vite et 9 parcours Chromium réussis.

Limites : l'identité responsable reste synthétique dans les tests et le studio local reste ouvert en mode consultant. La projection porte une connaissance textuelle autonome, sans carte partagée complète, moteur de recherche, génération IA ou export. Ces surfaces seront vérifiées dans leurs tranches respectives. La vérification juste avant remise est appliquée à chaque lecture HTTP ; aucun traitement différé de restitution n'existe encore.
