# ProcessIA : cadrage produit

Version 0.1 du 9 septembre 2026.

ProcessIA est un projet distinct de Bretelles, nommé explicitement par Mathieu le 9 septembre 2026. Cette note reprend le cadrage élaboré dans cette conversation avant cette séparation. Les contraintes techniques et les décisions de fournisseur de Bretelles ne sont pas héritées automatiquement.

Cette note consolide les échanges de conception avec Mathieu. Elle distingue les orientations confirmées, les propositions de conception et les décisions ouvertes. Elle constitue un cadrage de travail, pas une spécification technique validée ni une description de fonctionnalités déjà réalisées.

## 1. Intention et première valeur

### Orientations confirmées

ProcessIA permet à une entreprise de représenter son fonctionnement par un dialogue naturel avec une IA, puis d'affiner cette représentation directement dans un canevas interactif. La modélisation visible pendant l'entretien constitue l'expérience centrale du produit.

La représentation part de la chaîne de valeur et descend jusqu'aux tâches : qui fait quoi, avec quels outils, quelles données, quels documents et quels échanges entre personnes ou services.

Le premier résultat recherché est un diagnostic accompagné d'une feuille de route. Il conduit à des usages IA opérationnels prioritaires, puis à des outils ou prestations permettant aux équipes de devenir autonomes.

Le déploiement de ProcessIA comme harnais d'agents sur VPS, avec Docker et éventuellement Coolify, constitue une extension envisagée. Aucun moteur d'exécution alternatif n'est choisi à ce stade.

### Terrains pilotes confirmés

1. Kosmio : premier exercice de conception et d'utilisation.
2. SOCAMEX, dans le cadre de PerfIA : mise à l'épreuve du parcours dans une entreprise accompagnée.

Le métier détaillé, les processus et les outils de SOCAMEX restent à recueillir. Aucun modèle sectoriel propre à cette entreprise n'est considéré comme acquis.

## 2. Utilisateurs et modes d'accompagnement

### Orientations confirmées

Le parcours principal est celui d'un responsable qui échange avec l'IA en autonomie. Le consultant peut lui transmettre un lien d'entretien avant un atelier.

Un mode consultant accompagne les entretiens : trame, écoute de l'échange et suggestions de questions. Il doit aussi aider à identifier les personnes ou rôles clés à rencontrer pour compléter la connaissance du processus.

Plusieurs entretiens peuvent alimenter une même représentation. Le consultant doit pouvoir comprendre les responsabilités, passages de relais et pratiques à partir de plusieurs points de vue.

### Proposition de conception

Chaque entretien complémentaire recommandé précise le rôle à rencontrer, le sujet à éclaircir, les informations déjà disponibles et l'apport attendu. L'effort d'investigation se concentre d'abord sur un processus prioritaire.

Les divergences entre témoignages restent visibles. Elles peuvent correspondre à une contradiction, une évolution dans le temps ou une variante légitime du processus. Une information ne devient pas confirmée du seul fait qu'elle est répétée ou formulée avec assurance par l'IA.

## 3. Expérience de modélisation

### Orientations confirmées

- Voix par défaut, avec possibilité d'alterner avec l'écrit.
- Expérience proche d'un entretien en visioconférence avec partage d'écran du processus.
- Carte visible et modifiée au fil de l'échange.
- Proposition rapide d'un modèle type adapté à l'activité, que l'utilisateur peut challenger.
- Navigation du niveau macro jusqu'aux tâches.
- Éditeur direct : l'utilisateur peut modifier le modèle et l'IA interprète ses modifications pour en clarifier le sens métier lorsque nécessaire.
- Sélection d'une tâche pour consulter les personnes, services, outils, données et documents associés, notamment les modèles de documents.

### Proposition d'organisation de l'écran

Le canevas occupe l'espace principal. Un panneau décrit l'élément sélectionné. Des commandes permettent de parler, interrompre, mettre en pause, écrire ou consulter la transcription. Les questions ouvertes et hypothèses restent accessibles sans surcharger la carte.

La sélection, le processus ouvert et les dernières modifications constituent le contexte commun de l'utilisateur et de l'IA. Une phrase comme « ici, on utilise le modèle de restitution » doit être rattachée à la tâche sélectionnée si le contexte est suffisamment clair.

Les modifications sont locales et annulables. Une précision ne doit pas entraîner une réorganisation complète du diagramme. Un déplacement graphique doit être distingué d'un changement de responsable ou de séquence.

La chaîne de valeur fournit la vue globale. Les processus détaillés sont représentés en BPMN. Les informations métier complémentaires sont liées aux éléments du diagramme. Le sous-ensemble BPMN pris en charge reste à définir.

## 4. Informations rattachées au travail

### Besoins confirmés

La cartographie doit relier parties prenantes, produits et services, valeur produite, processus, tâches, responsabilités, outils, données et documents.

### Proposition de fiche de tâche

| Rubrique | Informations proposées |
|---|---|
| Finalité | Résultat attendu, bénéficiaire et contribution à la valeur |
| Responsabilités | Service, rôle responsable, personne affectée, contributeurs, validation |
| Déroulement | Déclencheur, prédécesseurs, successeurs, conditions et exceptions |
| Outils | Applications utilisées et opérations réalisées |
| Données | Entrées, sorties, sources, destinataires et modalités de partage |
| Documents | Documents reçus, modèles vierges, exemples et livrables attendus |
| Difficultés | Attentes, ressaisies, erreurs, informations manquantes |
| Connaissance | Sources, date, périmètre, statut de confirmation et divergences |
| Évolution | Améliorations proposées, usages IA et critères d'évaluation |

Le rôle et la personne sont distincts : une responsabilité métier peut être connue avant l'identification de son titulaire. Un modèle de document est également distinct d'un document rempli dans une mission réelle.

## 5. Préparation du consultant via MCP

### Orientations confirmées

Le consultant doit pouvoir se connecter à ProcessIA via MCP pour injecter les informations utiles déjà échangées avec le client : documents, transcriptions, emails et autres éléments de contexte.

Il dispose d'un espace de préparation privé et choisit ce qui devient visible au client. La visibilité d'une source et celle des informations métier qui en sont tirées doivent pouvoir être réglées séparément.

### Proposition de fonctionnement

1. Le consultant cible le dossier de l'entreprise et apporte des sources avec leur contexte.
2. L'IA extrait les connaissances candidates et conserve un lien vers leurs sources.
3. Elle propose une première carte, des compléments ou des corrections à une carte existante.
4. Le consultant prépare une version destinée à l'entretien, avec les hypothèses à discuter.
5. Le responsable ouvre le lien et échange avec l'IA sur cette représentation.

Une source supplémentaire propose des changements. Elle ne remplace pas silencieusement un élément déjà confirmé.

Les documents importés sont des matériaux à analyser. Les instructions qu'ils contiennent ne deviennent pas des autorisations d'agir, de modifier les accès ou de publier des informations.

### Capacités MCP proposées, à spécifier

- Identifier le dossier et le périmètre d'accès du consultant.
- Ajouter ou actualiser une source sans créer de doublons.
- Consulter le résultat de son traitement et sa provenance.
- Consulter la carte, les questions ouvertes et les rôles à interroger.
- Proposer des enrichissements structurés et en consulter les conséquences.

Les formats, limites, droits et commandes exactes restent à définir. La demande actuelle porte sur l'alimentation de ProcessIA ; elle ne vaut pas décision de connecter automatiquement toutes les boîtes mail ou tous les espaces documentaires.

## 6. Préparation privée et espace partagé

### Séparation confirmée

L'espace privé permet au consultant de préparer son intervention. L'espace partagé présente les informations choisies pour l'entreprise.

### Règles proposées

| Objet | Comportement proposé |
|---|---|
| Source importée dans la préparation | Privée par défaut |
| Note ou hypothèse du consultant | Privée jusqu'au choix explicite de partage |
| Élément métier proposé pour le client | Prévisualisable avant partage |
| Référence vers une source privée | Contenu et extrait inaccessibles au client tant que la source reste privée |
| Nouvelle synthèse produite par l'IA | Respecte les droits du contexte dans lequel elle est produite |

Le partage d'un élément métier ne partage pas automatiquement le document dont il provient. Les commentaires, extraits, noms de fichiers et réponses de l'IA doivent respecter cette séparation.

Les règles de visibilité entre collaborateurs d'une même entreprise, ainsi que les modalités d'invitation et de validation, restent ouvertes.

## 7. Diagnostic, recommandations et autonomie

### Orientations confirmées

Le diagnostic et la feuille de route constituent le premier livrable. Ils doivent permettre de proposer des usages IA opérationnels prioritaires, puis des outils ou prestations pour rendre l'équipe autonome.

### Proposition de contenu des recommandations

Chaque recommandation relie un problème à une tâche ou un processus et précise :

- le changement proposé et le bénéficiaire ;
- les données, outils et documents nécessaires ;
- la responsabilité humaine et les validations ;
- les skills ou capacités réutilisables ;
- les prérequis, dépendances et effort à estimer ;
- le test à réaliser et les critères de réussite ;
- les ressources ou prestations utiles pour l'appropriation.

Le fonctionnement actuel et la cible proposée restent distincts et comparables. Les gains restent des hypothèses avant mesure. Le diagnostic peut également faire apparaître une clarification organisationnelle ou une automatisation classique pertinente.

Le futur harnais partagé pourra être préparé à partir de ces descriptions. Une configuration portable et son exécution sur un moteur donné nécessiteront des spécifications et vérifications propres.

## 8. Premier périmètre proposé

Pour matérialiser l'expérience centrale, une première version pourrait couvrir un dossier d'entreprise, sa préparation par le consultant, un entretien vocal et écrit avec le responsable, un canevas modifiable, le détail d'un processus prioritaire et un diagnostic traçable.

Le niveau d'assistance aux entretiens multi-acteurs, l'exécution réelle des usages IA et le déploiement du harnais doivent être arbitrés séparément. Cette proposition de périmètre n'est pas encore validée.

### Scénarios d'évaluation proposés

1. Un responsable reconnaît son activité dans la première carte et peut la corriger sans connaître BPMN.
2. Une phrase portant sur une tâche sélectionnée met à jour le bon élément et peut être annulée.
3. Une modification manuelle reste cohérente avec la suite du dialogue.
4. Une nouvelle source contradictoire produit un point à clarifier avec provenance.
5. Une source privée reste inaccessible dans la vue et les réponses destinées au client.
6. Une recommandation IA peut être reliée au travail décrit et à un essai mesurable.

Les objectifs chiffrés de durée, latence et qualité seront fixés après définition du scénario pilote.

## 9. Décisions encore ouvertes

- Le responsable pourra-t-il inviter directement ses collègues à des entretiens IA ciblés dès la première version ?
- Qui confirme une description et qui arbitre une divergence entre acteurs ?
- Quels formats de sources et quel premier client MCP serviront au pilote ?
- Comment gérer l'enregistrement, la transcription et leur conservation ?
- Quel sous-ensemble BPMN et quelles modifications bidirectionnelles couvrir initialement ?
- Quel format de diagnostic et de feuille de route sera le plus utile dans les missions Kosmio ?
- Quel premier usage opérationnel permettra d'évaluer le passage du diagnostic à l'action ?
- Quand et sur quelle cible éprouver le déploiement du harnais ?

## 10. Origine du cadrage

Source principale : décisions exprimées par Mathieu dans la conversation du 9 septembre 2026.

Contexte examiné plus tôt dans la conversation : README et spécification du MVP du projet distinct Bretelles, capture présentant la cartographie pilotage/réalisation/support, capture présentant la chaîne de valeur de Kosmio. Ces références ont alimenté la réflexion ; les décisions exprimées pour ProcessIA dans cette conversation définissent son périmètre.

Les séquences métier et mécanismes identifiés comme propositions dans cette note sont des reformulations de conception. Ils doivent être éprouvés pendant l'exercice Kosmio. Les documents du projet Bretelles n'ont pas été modifiés.
