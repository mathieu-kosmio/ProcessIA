# ProcessIA · Suivi de développement

Version 0.4.0, 10 septembre 2026. Développement local en cours, par tranches verticales TDD.

| Tranche | Parcours principal | Résultat | État |
| --- | --- | --- | --- |
| T001 | US04 | Créer la tranche modèle et canevas persisté | Vérifié localement |
| T002 | US01 | Borner le dossier et les accès | Vérifié localement |
| T003 | US04 | Documenter rôles, outils et informations | Vérifié localement |
| T004 | US02 | Apporter une source par MCP | Non commencé |
| T005 | US01 | Partager une projection maîtrisée | Non commencé |
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
