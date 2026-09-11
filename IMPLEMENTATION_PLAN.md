# ProcessIA · Suivi de développement

Version 0.13.0, 11 septembre 2026. Développement local en cours, par tranches verticales TDD.

| Tranche | Parcours principal | Résultat | État |
| --- | --- | --- | --- |
| T001 | US04 | Créer la tranche modèle et canevas persisté | Vérifié localement |
| T002 | US01 | Borner le dossier et les accès | Vérifié localement |
| T003 | US04 | Documenter rôles, outils et informations | Vérifié localement |
| T004 | US02 | Apporter une source par MCP | Vérifié localement |
| T005 | US01 | Partager une projection maîtrisée | Vérifié localement |
| T006 | US03 | Relier dialogue écrit, sélection et commandes | Vérifié localement |
| T007 | US03 | Ajouter la voix et les reprises | Socle local vérifié, intégration ouverte |
| T008 | US04 | Compléter la navigation et le profil BPMN | Noyau local vérifié |
| T009 | US05 | Assister et consolider les entretiens | Noyau obligatoire vérifié |
| T010 | US06 | Produire un diagnostic et une feuille de route | Noyaux diagnostic et cible vérifiés |
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

## T006 · Dialogue contextualisé et enrichissement documentaire

Statut : vérifié localement le 10 septembre 2026. Révision Git : jalon T006 documenté dans l'historique du dépôt.

Premier comportement visé : sélectionner une tâche, formuler une modification avec une référence contextuelle, conserver la cible et la vue du début du tour, puis appliquer ou suspendre la commande selon la révision. Une source contradictoire doit préserver toute valeur confirmée et produire une divergence avec ses provenances.

| Cycle | Exigences | Rouge observé | Résultat vérifié |
| --- | --- | --- | --- |
| Contexte du tour | FR-020, FR-026, TC-020, TC-026 | La phrase « Ici nous utilisons un modèle » produisait seulement une clarification générique et la vue active n'était pas conservée | Dossier, modèle, vue, sélection et révision sont figés ; l'information documentaire vise l'identifiant capturé |
| Cible visible | FR-020, FR-026 | La proposition affichait « Modifier la tâche sélectionnée » sans cible ni révision | Le dialogue nomme la cible et la révision ; la carte ou la liste conserve un repère doré si la sélection courante change |
| Commande atomique | FR-024, TC-024 | L'ajout contextuel après une tâche n'était pas reconnu | La tâche et ses deux liens sont créés dans une transaction, reliés à l'énoncé puis restaurés ensemble par annulation |
| Obsolescence | FR-020, TC-020 | Une proposition absente devenait une commande invalide | Une proposition préparée sur une ancienne révision est suspendue sans mutation et demande une nouvelle relecture |
| Divergence documentaire | FR-014, TC-014 | Le service d'enrichissement et son historique n'existaient pas | Un rôle contradictoire conserve le rôle confirmé et enregistre les provenances du modèle et du passage source |
| Aperçu et décision | FR-014, TC-014 | Aucun avant/après ni motif de refus ne pouvait être conservé | Une proposition compatible expose l'avant/après ; l'acceptation produit un état à confirmer ; le refus et son motif restent consultables |

Preuve : `docs/validation/T006.md`. Vérification consolidée : 31 tests d'intégration et de contrat, build TypeScript/Vite et 10 parcours Chromium réussis.

Limites : le fournisseur de langage reste déterministe et reconnaît un petit ensemble de formulations de démonstration. L'extraction automatique d'une connaissance candidate depuis le texte d'une source n'est pas réalisée ; l'API reçoit une proposition structurée avec une référence de passage validée. L'enrichissement couvre uniquement le rôle d'une tâche. La règle de conflit suspend encore toute proposition dès que la révision du modèle change, y compris lorsqu'une autre tâche a été modifiée. La qualification des variantes temporelles, la suggestion de navigation vers une cible hors écran et la clarification présentant plusieurs tâches homonymes restent à développer. Les règles détaillées de décision sur les divergences restent proposées et ne sont pas présentées comme ratifiées.

## T007 · Socle local de continuité voix-texte

Statut : socle vérifié localement le 10 septembre 2026. Intégration vocale réelle ouverte dans DEC-02 et DEC-04. Révision Git : jalon partiel T007 documenté dans l'historique du dépôt.

Premier comportement visé : obtenir un accord explicite avant l'accès au microphone, rattacher un tour vocal simulé puis un tour écrit au même entretien, conserver la sélection, interrompre une réponse sans commande partielle et corriger une transcription avec son historique.

| Cycle | Exigences | Rouge observé | Résultat vérifié |
| --- | --- | --- | --- |
| Session multimodale | FR-015, TC-015 | Le service d'entretien était absent | Une session persistante ordonne les tours voix et texte, conserve leur sélection et déduplique chaque clé de tour |
| Microphone facultatif | FR-016, TC-016 | Aucun consentement ni état d'écoute n'existait | Le micro est demandé après action explicite ; prêt, écoute, traitement et pause sont visibles ; un refus maintient le texte |
| Conservation distincte | FR-017, TC-017 | Aucun contrat ne distinguait flux vocal, transcription et audio | La politique de transcription est visible, `none` conserve le parcours manuel et aucun audio n'est écrit |
| Interruption | FR-018, TC-018 | Aucune réponse d'entretien ne pouvait être interrompue | La réponse passe à l'état interrompu et le service de modèle ne reçoit aucune commande |
| Correction | FR-019, TC-019 | Le segment original et ses corrections n'étaient pas modélisés | L'original, la correction, l'auteur et la date sont conservés ; une proposition non appliquée est recalculée depuis le texte corrigé |
| Studio web | FR-015, FR-016, FR-019 | Les contrôles vocaux et l'historique étaient absents | Activation, pause par passage au texte, refus simulé et correction sont vérifiés dans Chromium dans un même entretien |

Preuve : `docs/validation/T007.md`. Vérification consolidée : 37 tests d'intégration et de contrat, build TypeScript/Vite et 11 parcours Chromium réussis.

Limites : le navigateur accède au microphone uniquement pour vérifier l'autorisation et l'état local ; aucun adaptateur de reconnaissance ou de synthèse vocale n'est branché. Dans la démonstration, le texte transcrit est saisi dans le champ de relecture. Les accords de plusieurs participants, le retrait d'accord avec règles sur les données déjà conservées, la détection d'une coupure matérielle et l'interruption réseau pendant une génération réelle restent à développer. La durée `session` est liée au processus serveur local ; les durées et responsabilités du pilote exigent la décision DEC-04.

## T008 · Navigation et profil BPMN local

Statut : noyau vérifié localement le 11 septembre 2026. L'import et l'export XML restent ouverts dans DEC-05 et T011. Révision Git : jalon T008 documenté dans l'historique du dépôt.

Premier comportement visé : ouvrir la vue BPMN depuis le studio, naviguer dans un sous-processus sans perdre ses trois tâches, sa sélection ni son zoom, accepter une séquence entre couloirs d'un même participant et refuser atomiquement une séquence entre participants ou une commande obsolète.

| Cycle | Exigences | Rouge observé | Résultat vérifié |
| --- | --- | --- | --- |
| Profil de domaine | FR-022, FR-023, TC-022, TC-023 | Le test échouait sur l'absence du domaine BPMN | Types V1 bornés, serviceTask non exécutable, règles de flux et frontières de sous-processus validées |
| Brouillon et anomalies | FR-023, TC-023 | Aucune validation localisée n'existait | Le brouillon reste éditable ; les événements de début ou fin manquants sont rattachés au processus concerné |
| Persistance et concurrence | FR-025, TC-025 | Le service BPMN persistant était absent | Commandes atomiques et idempotentes, révision optimiste, droits relus avant lecture et écriture |
| Contrat HTTP | FR-022, FR-023, FR-025 | La lecture retournait 404 et aucune commande BPMN n'était exposée | Lecture, validation et commandes exposées ; refus métier en 422 et conflit en 409 |
| Studio web | FR-021, FR-022, TC-021, TC-022 | Le bouton et la vue BPMN étaient absents | Participants, couloirs, types, flux, anomalies, fil de navigation, zoom et sélection persistée vérifiés dans Chromium |

Preuve : `docs/validation/T008.md`. Vérification consolidée : 50 tests de domaine, d'intégration et de contrat ainsi que 13 parcours Chromium réussis.

Limites : la vue relie un document BPMN détaillé au modèle courant par `model_id`, mais elle ne synchronise pas encore toutes les éditions entre le graphe de tâches React Flow et le document BPMN. La palette visuelle d'ajout, le déplacement entre couloirs, la carte macro de chaîne de valeur, l'import XML, l'export et l'aller-retour de fidélité restent à développer. Le profil détaillé est une proposition de conception conforme à la spécification actuelle ; il ne déclenche aucune exécution de serviceTask.

## T009 · Consolidation des témoignages

Statut : noyau obligatoire FR-032 vérifié localement le 11 septembre 2026. La planification complète FR-030 et les recommandations avancées FR-031 restent des compléments SHOULD. Révision Git : jalon T009 documenté dans l'historique du dépôt.

Premier comportement visé : sélectionner des passages de transcriptions privées portant sur la même propriété, conserver chaque assertion et sa provenance, ouvrir une divergence sans vote majoritaire et proposer une question ciblée sur un rôle sans inventer de personne.

| Cycle | Exigences | Rouge observé | Résultat vérifié |
| --- | --- | --- | --- |
| Assertions et divergence | FR-032, TC-032 | Le service de consolidation était absent | Trois assertions issues de trois sources restent distinctes ; deux répétitions ne résolvent pas la contradiction |
| Provenance et accès | FR-032, C-03, C-05 | Aucun lien contrôlé ne reliait l'écart aux passages privés | Source, version, passage, titre et date sont conservés ; les droits privés sont vérifiés avant écriture et lecture |
| Idempotence | FR-032 | Aucun registre ne protégeait le rejeu | Un même ordre de consolidation retrouve la même investigation sans doublon |
| Contrat HTTP | FR-032 | La route retournait 404 | Création et liste des investigations exposées avec validation stricte et erreurs structurées |
| Studio consultant | US05, FR-031, FR-032 | Le bouton de consolidation était absent | Comparaison côte à côte, absence d'arbitrage, question proposée et rôle cible sont visibles dans Chromium |

Preuve : `docs/validation/T009.md`. Vérification consolidée : 54 tests de domaine, d'intégration et de contrat ainsi que 14 parcours Chromium réussis.

Limites : la détection locale compare des formulations normalisées sélectionnées explicitement ; elle ne déduit pas encore que deux phrases sémantiquement proches décrivent la même règle. L'utilisateur ne peut pas encore qualifier l'écart comme correction, variante conditionnelle, évolution temporelle ou désaccord non résolu. Le plan d'entretiens, sa version partageable et les relances en direct restent à développer. T010 réalise le premier lien de l'écart vers un diagnostic privé. Le rôle habilité à arbitrer doit encore être confirmé par la gouvernance du pilote.

## T010 · Diagnostic et feuille de route

Statut : noyaux FR-033 à FR-037 vérifiés localement le 11 septembre 2026. La comparaison actuel/cible couvre le libellé d'une tâche et signale toute révision ultérieure comme devant être réconciliée. La priorité proposée peut être révisée manuellement avec auteur, justification et historique. Les capacités mutualisées et le suivi des résultats restent à développer. DEC-07 bloque toujours la méthode de score et le format métier définitifs.

Premier comportement visé : produire depuis une révision précise un diagnostic privé au périmètre limité, relier une opportunité à un constat et à une divergence, conserver une faisabilité inconnue, expliquer la priorité et ordonner le prérequis avant un essai à validation humaine.

| Cycle | Exigences | Rouge observé | Résultat vérifié |
| --- | --- | --- | --- |
| Diagnostic circonscrit | FR-034, TC-034, C-03 | Le service de diagnostic était absent | Révision, tâches étudiées, limite de couverture, constat et divergence liée sont conservés |
| Priorité explicable | FR-035, TC-035 | Une valeur absente n'avait aucune représentation publique | Faisabilité `null`, libellé Inconnue, score indisponible, prérequis bloquant et justification restent distincts |
| Révision manuelle | FR-035, AC-035-3, TC-035 | Le diagnostic n'avait ni version propre ni historique de priorité | Une modification motivée crée une nouvelle version, conserve l'avant, l'après et l'auteur, et refuse une écriture obsolète |
| Usage IA testable | FR-036, TC-036 | Aucun contrat ne reliait responsable humain, hypothèse et critères | Responsable, bénéficiaire, protocole et critères de réussite sont présents ; l'exécution reste `not_started` |
| Feuille de route | FR-037, TC-037 | Aucun ordre d'action ne précédait l'essai | Le critère de sortie du prérequis est explicite et l'essai dépend de cette action |
| Scénario cible distinct | FR-033, TC-033 | Le service de scénario cible était absent | Une cible préparée par IA référence la révision et la valeur de départ, puis conserve une validation humaine sans modifier le modèle réel |
| Réconciliation | FR-033, TC-033 | Une nouvelle révision du modèle n'était pas comparée à la cible | La lecture signale la référence antérieure et exige une réconciliation explicite tout en préservant la cible validée |
| Contrat HTTP | FR-033 à FR-037 | Les routes retournaient 404 | Diagnostics et scénarios cibles privés sont créés, validés et relus avec schémas stricts, droits et idempotence |
| Studio consultant | US06, FR-033 à FR-037 | Le bouton diagnostic était absent | Diagnostic, feuille de route et comparaison actuel/cible avec validation et état de référence sont visibles dans Chromium |

Preuve : `docs/validation/T010.md`. Vérification consolidée : 60 tests de domaine, d'intégration et de contrat ainsi que 15 parcours Chromium réussis.

Limites : ce noyau traite une opportunité synthétique reliée à une divergence ouverte et une cible limitée au changement de libellé d'une tâche. Il ne génère pas encore plusieurs options organisationnelles, d'automatisation et d'IA. Toute nouvelle révision rend actuellement la cible obsolète, y compris si elle touche un autre élément. Aucun score pondéré n'est calculé tant que DEC-07 reste ouvert. Les actions d'autonomie, les capacités mutualisées, la distinction entre gain hypothétique et mesure observée, la publication et l'export restent ouverts.
