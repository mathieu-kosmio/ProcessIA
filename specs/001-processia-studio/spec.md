# ProcessIA · Studio de modélisation et diagnostic IA

Version 0.2.0 | 2026-09-09 | Prête pour revue | Propriétaire : Mathieu Pesin

Identifiant de capacité : 001-processia-studio. Aucune branche de fonctionnalité créée dans cette session.

## 01 · Intention et statut de la spécification

**ProcessIA transforme un entretien en une représentation vivante du fonctionnement de l’entreprise, puis en un diagnostic et une feuille de route IA.** Le canevas est le support central de compréhension. La conversation, les documents et l’édition directe l’enrichissent ensemble.

Version **0.2.0**, rédigée le **9 septembre 2026**. Responsable produit : **Mathieu Pesin**. Statut : **prête pour revue produit, non approuvée pour développement**. Ce document décrit le comportement attendu d’une application à construire. Aucun test produit ni aucune performance annoncée ici n’a été mesuré sur une application existante.

Les besoins exprimés sont considérés comme confirmés. Les règles détaillées, seuils de qualité, priorités de livraison et contrats constituent une proposition de spécification à relire. Les arbitrages sont regroupés en fin de document. Ils n’empêchent pas de disposer d’une spécification complète du comportement proposé.

### Source des exigences

- **U1** : cartographier de la chaîne de valeur aux tâches et identifier responsabilités, outils, données, documents et valeur produite.
- **U2** : proposer rapidement un modèle type que l’utilisateur challenge ; rendre la modélisation visible pendant l’échange.
- **U3** : responsable en autonomie, voix privilégiée, alternance texte et édition directe.
- **U4** : consultant accompagné pendant l’interview ; identification des acteurs à interroger et consolidation de plusieurs points de vue.
- **U5** : préparation via MCP à partir de documents, emails et transcriptions ; espace privé séparé de l’espace partagé.
- **U6** : diagnostic, feuille de route, usages IA prioritaires et autonomie des équipes ; harnais déployable envisagé ensuite.
- **U7** : projet distinct de Bretelles ; pilotes Kosmio puis SOCAMEX dans le cadre de PerfIA ; développement futur en TDD.

Ces références désignent les demandes de la conversation. Les modèles présentés dans les captures servent de support à la conception. Ils ne constituent pas une description confirmée de tous les processus de Kosmio. Aucune information métier sur SOCAMEX n’est inventée.

### Lecture et utilisation

Lire d’abord la vision, le périmètre et les parcours ; relire ensuite les règles et critères d’acceptation ; utiliser enfin le plan, les contrats et les tâches pour préparer le développement. Les sources Markdown du dossier Spec Kit restent modifiables dans le dépôt. Ce HTML est leur vue de revue consolidée.

## 04 · Périmètre et progression de valeur

### Résultat du MVP proposé

Un consultant prépare un dossier Kosmio avec des sources choisies. Un responsable ouvre un lien, parle à l’IA et voit une carte apparaître. Il approfondit un processus, modifie des tâches, confirme les informations utiles et identifie les zones à compléter. Le consultant peut enrichir le dossier par d’autres entretiens. Une version du diagnostic et de la feuille de route est produite avec ses hypothèses et ses preuves.

| Priorité | Inclus |
|---|---|
| MUST, socle démontrable | Dossier et droits ; canevas macro puis BPMN ; voix et texte ; édition bidirectionnelle ; fiches de tâche ; sources et provenance ; préparation MCP ; partage contrôlé ; diagnostic et feuille de route ; sauvegarde, export HTML/JSON et échange du profil BPMN borné. |
| SHOULD, pilote accompagné | Suggestions d’interview en direct ; plan d’entretiens complémentaires ; regroupement avancé des constats ; comparaison visuelle de versions. |
| COULD, enrichissement | Import BPMN tiers étendu, variantes de modèles sectoriels supplémentaires, vues de synthèse spécialisées. |
| Évolution distincte | Exécution d’agents dans les applications métier ; déploiement du harnais ; intégrations de boîtes mail en synchronisation continue ; invitations autonomes multi-acteurs selon arbitrage. |

Le diagnostic n’exige pas de connecter un CRM ou un ERP en écriture. La préparation d’une recommandation ne crée aucun agent actif et n’autorise aucune action externe. Les échanges avec les sources et l’analyse du travail suffisent à la première valeur.

### Limites explicites

Le MVP ne comprend pas de visioconférence complète avec vidéo, de process mining exhaustif, de moteur BPMN d’exécution, de surveillance individuelle, de certification automatique, de place de marché d’agents ni d’orchestration multi-runtime. L’expérience « visio » désigne ici l’entretien vocal centré sur le canevas. L’écoute d’un entretien collectif démarre sur un dispositif audio choisi, sous réserve du cadrage de conservation.

### Hypothèses de dimensionnement proposées

Interface en français ; usage principal sur ordinateur avec navigateur récent et connexion stable ; une séance de 45 minutes ; jusqu’à 50 nœuds sur la vue active ; carte complète jusqu’à 300 éléments ; 20 dossiers pilotes et 5 entretiens vocaux simultanés. Ces hypothèses servent aux essais, pas à une promesse commerciale.

## 05 · Parcours utilisateurs prioritaires

### US01 · Préparer et partager un dossier · P1

En tant que **consultant**, je veux **préparer un dossier privé et choisir la représentation transmise au responsable** afin de **commencer l’entretien avec un contexte adapté et maîtrisé**.

**Pourquoi cette priorité :** Commencer l’entretien avec un contexte adapté et maîtrisé.

**Test indépendant :** Un dossier synthétique privé, un compte responsable et une version partagée suffisent à montrer l’isolation sans activer la voix.

**Origine :** U5. Les prérequis peuvent être fournis par des données de référence ; l’indépendance de démonstration ne signifie pas absence de dépendances techniques. Les scénarios détaillés se trouvent dans les exigences rattachées à ce parcours.

### US02 · Apporter les sources via MCP · P1

En tant que **consultant utilisant son assistant**, je veux **ajouter des documents, transcriptions et extraits d’emails au bon dossier** afin de **capitaliser ce qui est déjà connu et réduire les questions répétitives**.

**Pourquoi cette priorité :** Capitaliser ce qui est déjà connu et réduire les questions répétitives.

**Test indépendant :** Avec un client MCP de test et deux textes synthétiques, l’ingestion retrouve les passages sources et refuse un autre dossier.

**Origine :** U5. Les prérequis peuvent être fournis par des données de référence ; l’indépendance de démonstration ne signifie pas absence de dépendances techniques. Les scénarios détaillés se trouvent dans les exigences rattachées à ce parcours.

### US03 · Dialoguer par la voix et par écrit · P1

En tant que **responsable**, je veux **décrire mon activité puis corriger le modèle par la voix ou le texte** afin de **comprendre et préciser mon organisation sans apprendre BPMN**.

**Pourquoi cette priorité :** Comprendre et préciser mon organisation sans apprendre bpmn.

**Test indépendant :** Une carte de départ et des adaptateurs vocaux de test permettent de démontrer parole, interruption, texte et reprise.

**Origine :** U2, U3. Les prérequis peuvent être fournis par des données de référence ; l’indépendance de démonstration ne signifie pas absence de dépendances techniques. Les scénarios détaillés se trouvent dans les exigences rattachées à ce parcours.

### US04 · Explorer et modifier le fonctionnement · P1

En tant que **responsable de processus**, je veux **zoomer jusqu’aux tâches et modifier la carte ou les fiches** afin de **décrire qui fait quoi, avec quels outils et quelles données**.

**Pourquoi cette priorité :** Décrire qui fait quoi, avec quels outils et quelles données.

**Test indépendant :** Un dossier préchargé permet de modifier rôles, liens et documents, puis de recharger la même version.

**Origine :** U1, U2, U3. Les prérequis peuvent être fournis par des données de référence ; l’indépendance de démonstration ne signifie pas absence de dépendances techniques. Les scénarios détaillés se trouvent dans les exigences rattachées à ce parcours.

### US05 · Consolider les entretiens · P2

En tant que **consultant**, je veux **disposer de relances ciblées et comparer plusieurs témoignages** afin de **choisir les personnes à rencontrer et clarifier les divergences**.

**Pourquoi cette priorité :** Choisir les personnes à rencontrer et clarifier les divergences.

**Test indépendant :** Deux transcriptions synthétiques contradictoires suffisent à produire une divergence et une recommandation d’entretien.

**Origine :** U4. Les prérequis peuvent être fournis par des données de référence ; l’indépendance de démonstration ne signifie pas absence de dépendances techniques. Les scénarios détaillés se trouvent dans les exigences rattachées à ce parcours.

### US06 · Produire diagnostic et feuille de route · P1

En tant que **responsable accompagné du consultant**, je veux **prioriser des améliorations et des usages IA explicables** afin de **passer d’une carte à un plan d’action et à des moyens d’autonomie**.

**Pourquoi cette priorité :** Passer d’une carte à un plan d’action et à des moyens d’autonomie.

**Test indépendant :** Une carte confirmée de référence et des constats permettent de générer, corriger et hiérarchiser des recommandations sans entretien en direct.

**Origine :** U6. Les prérequis peuvent être fournis par des données de référence ; l’indépendance de démonstration ne signifie pas absence de dépendances techniques. Les scénarios détaillés se trouvent dans les exigences rattachées à ce parcours.

### US07 · Conserver et transmettre les résultats · P1

En tant que **responsable ou consultant autorisé**, je veux **retrouver une version stable et exporter les résultats autorisés** afin de **partager un livrable réutilisable et poursuivre le travail**.

**Pourquoi cette priorité :** Partager un livrable réutilisable et poursuivre le travail.

**Test indépendant :** Une carte de référence, un diagnostic et deux profils d’accès permettent de vérifier exports et différences de visibilité.

**Origine :** U1, U5, U6. Les prérequis peuvent être fournis par des données de référence ; l’indépendance de démonstration ne signifie pas absence de dépendances techniques. Les scénarios détaillés se trouvent dans les exigences rattachées à ce parcours.

## 06 · Expérience de l’entretien et du canevas

### Parcours d’ouverture proposé

1. Le lien ouvre l’entretien du bon dossier après vérification d’identité et d’accès.
2. L’écran indique l’objectif, le mode d’écoute, les informations utilisées et le fonctionnement de la conservation.
3. La carte préparée apparaît. En l’absence de préparation, l’IA recueille activité, offre, bénéficiaires et mode de production, puis propose un modèle type.
4. L’IA fait confirmer le périmètre général et propose un seul processus à approfondir en expliquant son intérêt.
5. Une question structurelle est posée à la fois. Les réponses connues ne sont pas redemandées sauf contradiction ou besoin de confirmation.
6. La séance se termine par les points confirmés, les incertitudes, le prochain entretien utile et l’état sauvegardé.

### Composition de l’écran

Le canevas occupe au moins les deux tiers de la largeur utile sur ordinateur lorsque l’inspecteur est fermé. Un fil d’Ariane indique le niveau organisation / chaîne de valeur / processus / sous-processus. L’inspecteur s’ouvre sur sélection, avec onglets Finalité, Responsabilités, Outils et informations, Sources et Évolutions. Le bandeau de conversation comporte microphone, pause, interruption, saisie écrite et transcription.

Une vue en liste offre une alternative au diagramme pour naviguer au clavier et renseigner les fiches. La taille de l’inspecteur et les raccourcis seront éprouvés avec le pilote. Aucune information essentielle ne dépend exclusivement de la couleur.

### Gestes et interprétation

| Action | Effet attendu |
|---|---|
| Sélectionner une tâche puis dire « ici » | Utiliser l’identifiant de la sélection capturé au début de la prise de parole. Si la sélection change, vérifier la cible avant modification. |
| Déplacer un bloc sur le fond | Changer la disposition, conserver son sens métier. |
| Déplacer une tâche dans un autre couloir | Prévisualiser le changement de rôle ; clarifier si le couloir ne correspond pas sans ambiguïté à une responsabilité. |
| Relier deux étapes | Proposer le type de lien selon le contexte ; refuser une séquence entre deux participants BPMN distincts. |
| Dire « en fait c’est avant » | Montrer le déplacement proposé et les liens affectés ; demander quelle étape sert de repère si elle manque. |
| Corriger une phrase transcrite | Relier la correction au tour initial et proposer de réviser les changements qui en dépendent. |
| Interrompre l’IA | Arrêter sa restitution vocale ; conserver les modifications déjà confirmées par le serveur ; marquer les propositions non appliquées comme telles. |

### Règles de fluidité

L’IA ne recentre pas automatiquement la vue pendant une manipulation. Une suggestion hors écran peut être ouverte explicitement. Les réponses vocales privilégient une explication courte et une question utile. Le texte intégral et les justifications restent consultables. L’affichage distingue « en cours de sauvegarde », « enregistré », « proposition à revoir » et « synchronisation interrompue ».

### Maquette de principe

La représentation graphique insérée dans cette section décrit l’organisation de l’écran. Elle n’est pas un prototype fonctionnel de ProcessIA.

### Modèles types et question suivante

Proposition initiale : un modèle de mission de services inspiré du cas Kosmio et un modèle générique d’activité opérationnelle. Chaque modèle porte identifiant, version, contexte d’application, vocabulaire, blocs, rôles types, variantes, questions structurelles et origine de ses hypothèses. Les exemples de production ne décrivent pas SOCAMEX.

La sélection du modèle utilise l’offre, ses bénéficiaires et le mode de réalisation. Si ces éléments manquent ou se contredisent, l’IA demande une précision avant de choisir. L’utilisateur peut supprimer une étape, ajouter une variante et déclarer plusieurs chaînes de valeur. Le rejet d’une étape ne confirme pas les autres.

La question suivante doit viser un manque ou une ambiguïté identifiée : responsabilité, condition, entrée/sortie, passage de relais ou exception. La préférence va aux réponses susceptibles de changer la structure ou la priorité d’un usage. L’IA explique le motif à la demande ; elle n’attribue pas un score de connaissance aux personnes.


## 07 · Sémantique de la cartographie et du BPMN

**Proposition de profil BPMN V1 à valider.** Le standard de référence est [BPMN 2.0.2, publié par l’OMG](https://www.omg.org/spec/BPMN/2.0.2/About-BPMN). ProcessIA expose un profil borné pour rester lisible et vérifiable.

| Niveau | Objets | Règle |
|---|---|---|
| Organisation | Parties prenantes, offres, valeur produite | La valeur est décrite par bénéficiaire, avec indicateur et source lorsqu’ils existent. |
| Macro | Pilotage, réalisation, support ; chaînes de valeur | Une relation de contribution ou de dépendance n’est pas automatiquement une séquence temporelle. |
| Processus | Déclencheur, étapes, participants, résultats | Un processus possède un périmètre et un propriétaire métier ; il peut rester incomplet au stade brouillon. |
| Tâches | Travail, rôles, outils, entrées et sorties | Une tâche peut être physique, cognitive ou administrative ; elle n’est pas nécessairement automatisable. |

### Éléments V1

- Événements de début et de fin simples.
- Tâches génériques, manuelles, utilisateur et service ; le type décrit la nature du travail, sans activer d’exécution.
- Passerelles exclusives et parallèles, avec conditions lisibles et branche par défaut lorsqu’utile.
- Sous-processus imbriqués ; participants et couloirs de responsabilité.
- Flux de séquence internes au processus d’un participant ; flux de message entre participants distincts.
- Objets de données, magasins de données, associations de données et annotations.

Temporisations avancées, événements de bordure, compensation, transactions, chorégraphies et tâches multi-instances sont hors création V1. Un import contenant ces éléments est soit ouvert dans une vue de consultation fidèle, soit refusé avec la liste des éléments non pris en charge. Il ne produit jamais une carte amputée présentée comme complète.

### Validation graduée

Le brouillon peut comporter des champs inconnus ou des extrémités non documentées, signalés visuellement. Une revue métier exige un périmètre, un responsable ou rôle attendu, un déclencheur et un résultat, ainsi que la résolution des contradictions critiques. L’export BPMN éditable exige un document XML valide et le respect du profil déclaré. La validité XML ne prouve pas l’absence de blocage logique ; les branches et synchronisations sont contrôlées séparément.

Un sous-processus conserve des liens entre ses entrées/sorties et celles du parent. Le renommer ne change pas ses identifiants. La suppression d’un élément référencé affiche les liens et recommandations concernés avant confirmation.

### Portabilité

L’export comporte le BPMN et, si nécessaire, un manifeste ProcessIA avec les métadonnées métier autorisées. Le test aller-retour vérifie identifiants, participants, liens, conditions, disposition et propriétés couvertes. Les métadonnées propres à ProcessIA ne sont pas supposées comprises par tous les éditeurs. Un export Camunda ou CIB seven exécutable nécessitera ultérieurement un contrat de compilation et des tests propres au moteur.

## 08 · Acteurs, permissions et séparation des espaces

**Modèle d’accès proposé.** Une organisation cliente possède des dossiers. Les intervenants disposent d’une affectation explicite par dossier. L’administrateur technique ne reçoit pas par défaut le contenu métier. Le consultant peut travailler pour plusieurs clients sans mélanger leurs contextes.

| Action | Consultant affecté | Responsable client | Intervenant ciblé | Administrateur technique |
|---|---|---|---|---|
| Lire la préparation privée | Oui, selon affectation | Non | Non | Non par défaut |
| Ajouter une source privée par MCP | Oui, avec droit d’écriture | Non par défaut | Non | Non par défaut |
| Partager une synthèse issue du privé | Oui, par choix explicite | Non | Non | Non |
| Lire et modifier la carte partagée | Oui | Oui | Périmètre accordé si activé | Non par défaut |
| Confirmer une pratique métier | Préparer / proposer | Oui sur son périmètre | Témoigner ; validation selon délégation | Non |
| Arbitrer une contradiction | Faciliter et documenter | Propriétaire du processus désigné | Contribuer | Non |
| Exporter une version | Selon droits de lecture et export | Selon droits de lecture et export | Non par défaut | Non par défaut |
| Configurer l’infrastructure | Selon mandat | Non par défaut | Non | Oui |

Le rôle d’intervenant ciblé décrit la cible du modèle ; sa mise à disposition dans le premier MVP dépend de DEC-01. Un rôle technique n’accorde pas automatiquement une responsabilité métier.

### Source privée et fait partagé

Une source, un extrait, une affirmation et un élément de carte possèdent chacun une visibilité explicite. La mise en partage d’une affirmation issue du privé crée une formulation partagée relue, tout en conservant une provenance privée pour le consultant. Le client ne reçoit ni nom de fichier privé, ni extrait, ni URL, ni métadonnée permettant d’en déduire le contenu.

Le contexte de génération client est constitué des seuls éléments partagés autorisés. Le contexte de génération consultant peut inclure ses sources privées. Le passage du second au premier demande une prévisualisation et un choix explicite ; un filtrage d’affichage en fin de réponse ne suffit pas.

La révocation d’un accès s’applique aux nouvelles lectures, sessions actives et liens de téléchargement contrôlés. Un fichier déjà téléchargé ne peut pas être rappelé : cette limite est visible dans les paramètres de partage. Les index, caches, extraits et exports régénérés respectent la suppression ou la révocation.

### Liens d’entretien

Un lien est limité au dossier, au destinataire, au rôle et à une expiration. Proposition initiale : validité de 7 jours, usage unique à l’acceptation, révocation vérifiée à chaque requête et vérification de l’adresse avant ouverture ; DEC-03 fixe la méthode d’identité. Une URL seule n’accorde pas la lecture de la préparation privée. Les valeurs des jetons ne figurent pas dans les journaux.

## 09 · Sources, connaissances et transitions

### Traitement documentaire proposé

Importer → contrôler le format et les accès → extraire le texte → créer des passages repérables → proposer des affirmations et relations → comparer au modèle existant → présenter les modifications. Une extraction partielle reste partielle dans le résultat affiché.

Formats proposés au premier pilote : texte UTF-8, Markdown, PDF textuel et DOCX ; transcriptions structurées avec locuteur et horodatage ; extraits d’emails transmis volontairement. Un PDF image est signalé comme nécessitant OCR ; le fournisseur OCR et la prise en charge initiale sont une décision du plan. Les archives et la collecte automatique de boîtes mail restent hors V1.

Limites proposées : 20 Mo par document, 200 pages, 50 sources par dossier pilote ; au-delà, message explicite et import par lots. Une URL est conservée comme référence ; aucune exploration automatique d’URL arbitraire n’est déclenchée par le MCP V1.

### États distincts

| Objet | Cycle proposé | Invariant |
|---|---|---|
| Source | reçue → en traitement → terminée / partielle / échec → retirée | Terminée signifie lisible, pas vraie ni validée métier. |
| Affirmation | proposée → déclarée / confirmée / contestée → remplacée | La confirmation enregistre acteur, date et périmètre. Un score IA ne la remplace pas. |
| Proposition de changement | préparée → valide → appliquée / rejetée / obsolète | Une proposition validée structurellement n’est pas nécessairement confirmée métier. |
| Carte | brouillon → en revue → référence partagée → archivée | La version de référence est immuable ; le travail continue dans une nouvelle révision. |
| Entretien | préparé → actif ↔ en pause → terminé / interrompu | Une reprise retrouve l’état persistant et les points ouverts. |
| Diagnostic | brouillon → relu → publié → remplacé | Il référence une version précise de carte et les sources autorisées. |

### Complétude

La couverture indique les champs renseignés et les rôles consultés pour le périmètre choisi. Par exemple : 8 tâches sur 12 possèdent une sortie documentée ; 2 rôles sur 4 ont contribué. La formule et le dénominateur restent visibles. « Complet » n’est jamais déduit du nombre de documents ou de la durée d’entretien.

Les affirmations conservent leur champ d’application : site, équipe, période, type de commande ou variante. Deux pratiques différentes peuvent coexister si leur périmètre l’explique. Une contradiction bloquante reste une question ouverte et ne se résout pas par moyenne des témoignages.

## 10 · Diagnostic, priorisation et préparation des usages IA

### Structure du livrable métier

1. Périmètre, participants, sources et limites de couverture.
2. Carte globale et processus approfondis, avec leur version.
3. Constats : frictions, passages de relais, dépendances, données manquantes, pratiques utiles.
4. Opportunités comparées : simplification, clarification, automatisation classique, assistance IA.
5. Usages IA prioritaires avec conditions de réussite et essais proposés.
6. Feuille de route : actions, responsable, dépendances, effort à estimer, échéance choisie et indicateur.
7. Plan d’appropriation : guides par rôle, exercices, skills et prestations utiles.

### Priorisation proposée, à valider pendant le pilote

L’utilisateur renseigne valeur attendue V et faisabilité F sur une échelle de 1 à 5, avec justification et niveau de confiance. Un indicateur simple **P = 0,6 × V + 0,4 × F** aide à ordonner les opportunités renseignées. Il ne constitue pas une mesure de ROI. Une dimension inconnue rend le score indisponible et déclenche une question, plutôt qu’une valeur zéro.

La valeur prend en compte fréquence, temps, qualité, service rendu et contribution aux bénéficiaires. La faisabilité prend en compte accès aux données, stabilité du processus, intégrations et capacité de vérification. Les risques sont traités séparément : sensible ou non maîtrisé implique un essai encadré ou un prérequis bloquant, même si P est élevé. Les pondérations sont identiques au sein d’un diagnostic et versionnées.

Exemple **illustratif, non mesuré chez Kosmio** : préparer une comparaison sourcée des entretiens reçoit V=4, F=3, soit P=3,6. Le temps gagné est « à mesurer ». Un essai sur trois dossiers synthétiques ou autorisés vérifie qualité des citations, omissions, corrections humaines et temps de relecture. L’utilisateur peut changer l’ordre en documentant sa raison.

### Fiche d’usage opérationnel

Chaque usage précise le problème, la tâche concernée, le bénéficiaire, le déclencheur, les entrées, le résultat attendu, les capacités d’outils nécessaires, les accès, les skills, le responsable humain, les validations, les limites, les exemples d’usage et les tests d’acceptation. Les besoins en données ou connecteurs indisponibles apparaissent dans la feuille de route.

Une capacité partagée peut servir plusieurs tâches. ProcessIA ne crée pas mécaniquement un agent par tâche. La recommandation décrit trois niveaux : règles communes de l’organisation, skills/capacités mutualisés, guide d’usage par rôle. Une version future pourra traduire ce dossier en configuration de harnais, après vérification de sa cible.

### Autonomie des équipes

La proposition d’accompagnement distingue formation, mise à disposition d’un outil, configuration, assistance initiale et amélioration continue. L’autonomie s’évalue par une tâche réalisée avec un résultat jugé acceptable, une vérification comprise et une capacité à demander de l’aide. Elle ne se déduit pas de la seule présence à une formation.

## 11 · Critères de succès du pilote

**Tous les seuils ci-dessous sont proposés et restent à valider.** Kosmio sert à ajuster le parcours ; SOCAMEX sert ensuite à tester son transfert. Les résultats seront rapportés avec effectifs, conditions, échecs et limites, sans extrapoler deux cas à un marché.

| ID | Résultat recherché | Protocole et seuil proposé |
|---|---|---|
| SC-01 | Première valeur visible | Dans 4 séances sur 5, première carte discutable en moins de 3 minutes après la première réponse contextualisée ; chronométrage vidéo autorisé ou journal horodaté. |
| SC-02 | Processus utile rapidement | En 30 minutes, 1 processus de 8 à 15 tâches revu, avec rôle, entrée et sortie connus ou explicitement manquants pour chaque tâche. |
| SC-03 | Compréhension sans expertise BPMN | 4 utilisateurs sur 5 identifient responsable, outil et sortie d’une tâche, puis corrigent une étape sans aide technique. |
| SC-04 | Fiabilité des changements | Sur 40 commandes françaises de référence, au moins 90 % produisent la modification attendue ou une clarification adéquate ; 0 mauvaise cible appliquée silencieusement. |
| SC-05 | Valeur du diagnostic | 3 opportunités au maximum proposées comme premières priorités, chacune liée à un constat, un responsable, des prérequis et un essai mesurable. |
| SC-06 | Confidentialité | Aucun contenu privé, identifiant révélateur ou citation privée dans les parcours client et exports du corpus de contrôle. |
| SC-07 | Transfert du modèle | Le pilote SOCAMEX produit son propre modèle et son vocabulaire sans modifier le noyau des responsabilités, sources et versions ; écarts documentés. |

Le nombre d’utilisateurs, la durée et la taille des cartes sont un protocole d’évaluation, pas un résultat déjà obtenu. La qualité sémantique est évaluée par revue métier, indépendamment de la validité du graphe.

## 12 · Exigences fonctionnelles et acceptation

Les règles détaillées ci-dessous constituent le comportement proposé pour revue. Chaque exigence possède trois scénarios et un cas de test de référence.

### FR-001 · Dossier d’entreprise et modes de travail

**Priorité : MUST** · Parcours **US01** · Origine : Besoin confirmé ; règles détaillées proposées.

Le système permet de créer et retrouver un dossier d’entreprise identifié de façon unique, avec une préparation privée du consultant et une vue partagée destinée au responsable.

- **AC-001-1** : Étant donné un consultant autorisé, quand il crée un dossier avec un nom et une activité, alors le dossier possède un identifiant stable et ses deux espaces sont disponibles.
- **AC-001-2** : Étant donné deux dossiers de même nom, quand le consultant les consulte, alors leurs identifiants et contextes permettent de les distinguer sans fusion automatique.
- **AC-001-3** : Étant donné un responsable invité, quand il ouvre son dossier, alors la vue partagée lui est présentée sans accès à la préparation privée.

**Cas limite :** L’activité inconnue reste à préciser et ne déclenche pas l’attribution automatique d’un modèle sectoriel considéré comme confirmé.

**Cas de test prévu :** TC-001. Aucun test produit exécuté à ce stade.

### FR-002 · Autorisation appliquée côté serveur

**Priorité : MUST** · Parcours **US01** · Origine : Proposition de conception.

Le système vérifie côté serveur l’identité, le dossier et la permission de chaque lecture ou mutation effectuée par l’interface, le MCP, une génération IA ou un export.

- **AC-002-1** : Étant donné un responsable autorisé sur le dossier A, quand il remplace l’identifiant par celui du dossier B dans une requête, alors l’accès est refusé sans contenu du dossier B.
- **AC-002-2** : Étant donné un lien d’entretien expiré ou révoqué, quand il est réutilisé, alors aucune lecture ni modification du dossier n’est possible.
- **AC-002-3** : Étant donné un consultant disposant uniquement d’un droit de lecture, quand il appelle une mutation directement, alors le serveur la refuse et le modèle reste inchangé.

**Cas limite :** La possession d’un identifiant de source, de tâche ou d’export ne vaut jamais autorisation ; une erreur ne révèle pas l’existence d’un dossier inaccessible.

**Cas de test prévu :** TC-002. Aucun test produit exécuté à ce stade.

### FR-003 · Préparation privée par défaut

**Priorité : MUST** · Parcours **US01** · Origine : Besoin confirmé ; règles détaillées proposées.

Le système conserve dans la préparation privée toute source, note et connaissance candidate ajoutée par le consultant tant qu’aucun partage explicite n’a été effectué.

- **AC-003-1** : Étant donné une source ajoutée via MCP, quand son traitement se termine, alors la source et ses connaissances candidates restent privées.
- **AC-003-2** : Étant donné une note créée dans la préparation, quand le responsable ouvre la carte partagée, alors la note ne figure dans aucun panneau ni résultat de recherche.
- **AC-003-3** : Étant donné une carte partagée existante, quand une source privée génère un enrichissement, alors l’enrichissement apparaît au consultant comme proposition privée.

**Cas limite :** Une génération lancée dans un contexte privé conserve ce contexte même si elle utilise également des éléments déjà partagés.

**Cas de test prévu :** TC-003. Aucun test produit exécuté à ce stade.

### FR-004 · Prévisualisation et partage explicite

**Priorité : MUST** · Parcours **US01** · Origine : Besoin confirmé ; règles détaillées proposées.

Le consultant peut prévisualiser les éléments sélectionnés tels que le responsable les verra puis confirmer leur partage avec une trace de l’auteur, de la date et de la version publiée.

- **AC-004-1** : Étant donné trois propositions privées, quand le consultant en sélectionne une pour partage, alors la prévisualisation ne contient que cette proposition et ses dépendances accessibles.
- **AC-004-2** : Étant donné une prévisualisation ouverte, quand le consultant annule, alors aucune visibilité ne change.
- **AC-004-3** : Étant donné une prévisualisation confirmée, quand le responsable actualise la carte, alors la version confirmée est visible et le consultant retrouve la trace du partage.

**Cas limite :** Si un élément sélectionné change avant confirmation, la publication exige une nouvelle prévisualisation de sa version courante.

**Cas de test prévu :** TC-004. Aucun test produit exécuté à ce stade.

### FR-005 · Visibilité distincte des connaissances et des sources

**Priorité : MUST** · Parcours **US01** · Origine : Besoin confirmé ; règles détaillées proposées.

Le système permet de partager une connaissance métier sans partager sa source en conservant la provenance complète uniquement pour les utilisateurs autorisés à consulter cette source.

- **AC-005-1** : Étant donné une tâche issue d’une transcription privée, quand le consultant partage uniquement la description métier de la tâche, alors le responsable consulte cette description sans accès à la transcription.
- **AC-005-2** : Étant donné une connaissance partagée dont la source est privée, quand le responsable affiche sa provenance, alors aucun titre, nom de fichier, auteur, extrait ni adresse de la source n’est révélé.
- **AC-005-3** : Étant donné la même connaissance, quand un consultant autorisé affiche sa provenance, alors il retrouve le passage source et la version utilisés.

**Cas limite :** La connaissance partagée constitue elle-même une publication : son contenu doit être visible dans la prévisualisation même si son origine reste privée.

**Cas de test prévu :** TC-005. Aucun test produit exécuté à ce stade.

### FR-006 · Confidentialité dans les réponses et les exports

**Priorité : MUST** · Parcours **US01** · Origine : Besoin confirmé ; règles détaillées proposées.

Le système exclut les contenus privés non partagés du contexte IA du responsable et de toutes ses restitutions, y compris résumés, citations, recherches, noms de fichiers, exports et messages d’erreur.

- **AC-006-1** : Étant donné une source privée contenant une expression témoin absente de la vue partagée, quand le responsable demande une synthèse exhaustive ou la liste des documents, alors ni l’expression ni les métadonnées privées ne sont retournées.
- **AC-006-2** : Étant donné un dossier mêlant sources privées et connaissances partagées, quand le responsable exporte la carte ou le diagnostic, alors seules les informations auxquelles il a accès sont incluses.
- **AC-006-3** : Étant donné une réponse préparée pendant qu’un accès est retiré, quand la réponse doit être délivrée, alors les autorisations sont revérifiées et tout contenu devenu inaccessible est retenu.

**Cas limite :** Le filtrage intervient avant récupération et génération ainsi qu’avant restitution ; masquer les références dans l’interface seule ne satisfait pas cette exigence.

**Cas de test prévu :** TC-006. Aucun test produit exécuté à ce stade.

### FR-007 · Retrait de partage et accès dérivés

**Priorité : MUST** · Parcours **US01** · Origine : Proposition de conception.

Le consultant peut retirer le partage d’un élément et le système bloque ses accès futurs tout en indiquant explicitement les connaissances dérivées publiées séparément qui restent partagées.

- **AC-007-1** : Étant donné une source partagée, quand son partage est retiré, alors sa lecture directe, sa récupération IA et la génération d’un nouvel export la contenant sont refusées au responsable.
- **AC-007-2** : Étant donné une connaissance publiée séparément depuis cette source, quand le consultant prépare le retrait, alors cette connaissance est listée avec son état de visibilité et reste partagée sauf sélection explicite.
- **AC-007-3** : Étant donné un onglet ouvert avant retrait, quand il tente une nouvelle opération sur la source, alors le serveur refuse et l’interface actualise son état.

**Cas limite :** Les copies déjà téléchargées ou lues ne peuvent pas être rappelées ; l’interface précise cette limite au moment du retrait.

**Cas de test prévu :** TC-007. Aucun test produit exécuté à ce stade.

### FR-008 · Connexion MCP et périmètre explicite

**Priorité : MUST** · Parcours **US02** · Origine : Besoin confirmé ; règles détaillées proposées.

Le serveur MCP expose l’identité et les droits courants et exige pour chaque opération un dossier explicitement ciblé compatible avec ces droits.

- **AC-008-1** : Étant donné un consultant authentifié, quand son client MCP consulte son contexte, alors il obtient son identité applicative, les dossiers autorisés et les capacités disponibles sans secret d’authentification.
- **AC-008-2** : Étant donné un appel d’ajout sans identifiant de dossier, quand le serveur le reçoit, alors il le refuse sans choisir automatiquement le dernier dossier utilisé.
- **AC-008-3** : Étant donné un accès MCP révoqué, quand une nouvelle opération est appelée, alors elle est refusée et aucun traitement de source n’est démarré.

**Cas limite :** Un nom d’entreprise fourni dans le document ne remplace jamais le dossier ciblé par l’appel ; un dossier inexistant n’est pas créé implicitement.

**Cas de test prévu :** TC-008. Aucun test produit exécuté à ce stade.

### FR-009 · Import contextualisé des sources

**Priorité : MUST** · Parcours **US02** · Origine : Besoin confirmé ; règles détaillées proposées.

Le MCP permet d’ajouter une source documentaire ou textuelle accompagnée de son type, de son contexte d’origine et de ses dates connues, avec validation du format et de la taille avant traitement.

- **AC-009-1** : Étant donné une transcription textuelle valide et un dossier autorisé, quand elle est importée avec son contexte, alors un identifiant de source et un état de traitement sont retournés.
- **AC-009-2** : Étant donné une source dont la date d’origine est inconnue, quand elle est importée, alors cette date reste inconnue tandis que la date d’import est enregistrée séparément.
- **AC-009-3** : Étant donné un fichier dépassant une limite publiée ou de format non pris en charge, quand l’import est demandé, alors un refus explicite indique la limite ou le format attendu sans ingestion partielle.

**Cas limite :** Une URL fournie comme provenance n’autorise pas l’exploration automatique de la boîte mail ou de l’espace documentaire auquel elle renvoie.

**Cas de test prévu :** TC-009. Aucun test produit exécuté à ce stade.

### FR-010 · Idempotence et versions des sources

**Priorité : MUST** · Parcours **US02** · Origine : Proposition de conception.

Le système déduplique les tentatives d’import rejouées dans un même dossier et conserve une nouvelle version lorsqu’une source identifiée est actualisée avec un contenu différent.

- **AC-010-1** : Étant donné un import terminé, quand le même appel est rejoué avec la même clé d’idempotence et le même contenu, alors le même résultat est retourné sans seconde source ni seconde extraction.
- **AC-010-2** : Étant donné une clé déjà utilisée, quand elle est réutilisée avec un contenu différent, alors l’appel est refusé comme conflit.
- **AC-010-3** : Étant donné une source existante, quand une actualisation explicite apporte un contenu différent, alors une nouvelle version est créée et les connaissances antérieures gardent leur référence à l’ancienne version.

**Cas limite :** Un contenu identique dans deux dossiers reste isolé ; la détection de doublon ne révèle aucune source d’un autre dossier.

**Cas de test prévu :** TC-010. Aucun test produit exécuté à ce stade.

### FR-011 · Suivi observable du traitement

**Priorité : MUST** · Parcours **US02** · Origine : Proposition de conception.

Le consultant peut consulter pour chaque source l’état de traitement, les erreurs utiles et les résultats disponibles sans qu’un traitement incomplet soit présenté comme une analyse exhaustive.

- **AC-011-1** : Étant donné une source acceptée, quand son état est consulté via MCP ou interface, alors un même état parmi reçue, en traitement, terminée, partielle ou échec est retourné.
- **AC-011-2** : Étant donné un document partiellement lisible, quand son analyse se termine, alors les portions non traitées et la couverture disponible sont signalées avec l’état partiel.
- **AC-011-3** : Étant donné un échec récupérable, quand le consultant demande une reprise, alors la reprise conserve l’identité de la source et ne duplique pas les résultats déjà validés.

**Cas limite :** Le journal d’erreur ne contient ni secret, ni texte privé sans nécessité, et reste soumis aux droits de la source.

**Cas de test prévu :** TC-011. Aucun test produit exécuté à ce stade.

### FR-012 · Connaissances candidates et provenance précise

**Priorité : MUST** · Parcours **US02** · Origine : Besoin confirmé ; règles détaillées proposées.

Chaque connaissance extraite conserve la source et sa version, un repère du passage justificatif et un statut distinguant déclaration sourcée, interprétation proposée et information manquante.

- **AC-012-1** : Étant donné une tâche extraite d’un document paginé, quand le consultant ouvre sa justification, alors la version du document et la page ou le passage correspondant sont disponibles.
- **AC-012-2** : Étant donné une déduction sans déclaration explicite dans la source, quand elle est proposée, alors son statut d’interprétation est visible et aucune citation n’est inventée.
- **AC-012-3** : Étant donné une responsabilité absente de la source, quand une tâche est extraite, alors le responsable reste à préciser plutôt que d’être attribué automatiquement à une personne.

**Cas limite :** Plusieurs sources peuvent soutenir une connaissance ; la répétition ne la transforme pas automatiquement en information confirmée.

**Cas de test prévu :** TC-012. Aucun test produit exécuté à ce stade.

### FR-013 · Instructions contenues dans les sources

**Priorité : MUST** · Parcours **US02** · Origine : Besoin confirmé ; règles détaillées proposées.

Le système traite les instructions présentes dans les documents, emails et transcriptions importés comme du contenu documentaire et ne les utilise jamais comme autorisation de publication, d’accès ou d’action externe.

- **AC-013-1** : Étant donné un document contenant une instruction de partager tout le dossier, quand il est analysé, alors les droits et visibilités restent inchangés.
- **AC-013-2** : Étant donné une transcription demandant d’envoyer une synthèse à une adresse, quand elle est importée, alors aucun message n’est envoyé et aucun destinataire n’est ajouté.
- **AC-013-3** : Étant donné une source décrivant une procédure métier à l’impératif, quand elle est analysée, alors cette procédure peut devenir une connaissance candidate sans être exécutée.

**Cas limite :** Une source peut citer une instruction légitime dans son contexte métier ; le système distingue la représentation de cette instruction de son exécution.

**Cas de test prévu :** TC-013. Aucun test produit exécuté à ce stade.

### FR-014 · Enrichissement sans écrasement silencieux

**Priorité : MUST** · Parcours **US02** · Origine : Besoin confirmé ; règles détaillées proposées.

Une nouvelle source produit des propositions de modification et des divergences sourcées sans remplacer automatiquement une description métier déjà confirmée.

- **AC-014-1** : Étant donné une tâche confirmée attribuée au rôle A, quand une source l’attribue au rôle B, alors la tâche reste inchangée et une divergence portant les deux provenances est créée.
- **AC-014-2** : Étant donné une proposition d’enrichissement compatible, quand le consultant la consulte, alors il voit les champs ajoutés ou modifiés avant de l’accepter.
- **AC-014-3** : Étant donné une proposition refusée, quand une nouvelle source est traitée, alors le refus et son motif éventuel sont conservés dans l’historique.

**Cas limite :** Une divergence peut représenter une variante ou une évolution temporelle ; l’application propose de la qualifier sans imposer qu’une version soit fausse.

**Cas de test prévu :** TC-014. Aucun test produit exécuté à ce stade.

### FR-015 · Continuité entre voix et texte

**Priorité : MUST** · Parcours **US03** · Origine : Besoin confirmé ; règles détaillées proposées.

Le responsable peut alterner voix et texte dans un entretien unique en conservant l’historique, la sélection visuelle et les propositions en cours, avec la voix présentée comme mode privilégié.

- **AC-015-1** : Étant donné un entretien commencé à la voix, quand le responsable envoie un message écrit, alors la réponse exploite les échanges précédents et la même carte.
- **AC-015-2** : Étant donné une tâche sélectionnée avant le passage au texte, quand le responsable décrit cette tâche, alors la sélection reste visible et inchangée.
- **AC-015-3** : Étant donné une réponse en cours, quand le mode de saisie change, alors aucun doublon de message ni redémarrage de l’entretien n’est créé.

**Cas limite :** Le choix de privilégier la voix n’autorise ni l’activation silencieuse du microphone ni l’obligation de parler pour accéder au canevas.

**Cas de test prévu :** TC-015. Aucun test produit exécuté à ce stade.

### FR-016 · Microphone facultatif et état d’écoute visible

**Priorité : MUST** · Parcours **US03** · Origine : Besoin confirmé ; règles détaillées proposées.

L’interface demande l’activation du microphone avant l’écoute, affiche son état courant et conserve un parcours textuel complet en cas de refus, d’indisponibilité ou de coupure.

- **AC-016-1** : Étant donné une première session, quand la permission microphone est refusée, alors le champ texte et le canevas restent utilisables sans boucle de demande de permission.
- **AC-016-2** : Étant donné un microphone actif, quand l’utilisateur met l’écoute en pause, alors aucune nouvelle capture audio n’est envoyée et l’état pause est visible.
- **AC-016-3** : Étant donné une coupure de microphone pendant l’entretien, quand elle est détectée, alors un message compréhensible propose le texte et les données déjà confirmées sont conservées.

**Cas limite :** L’état affiché distingue prêt à parler, écoute, traitement, réponse et pause afin de ne pas laisser croire que l’application écoute lorsqu’elle est interrompue.

**Cas de test prévu :** TC-016. Aucun test produit exécuté à ce stade.

### FR-017 · Choix distincts pour voix et conservation

**Priorité : MUST** · Parcours **US03** · Origine : Proposition de conception.

Avant l’entretien, le système distingue l’usage transitoire du flux vocal et la conservation de la transcription, avec une information séparée sur leurs accès et leur conservation. La proposition V1 exclut l’enregistrement audio durable ; une permission navigateur ne vaut pas accord sur la conservation.

- **AC-017-1** : Étant donné un utilisateur acceptant le traitement vocal, quand il parle, alors l’entretien fonctionne sans création d’un fichier audio durable et la politique de transcription choisie reste visible.
- **AC-017-2** : Étant donné un entretien avec plusieurs participants, quand l’écoute doit démarrer, alors l’information et les accords prévus par le dossier sont vérifiés ; un accord manquant maintient la capture en pause.
- **AC-017-3** : Étant donné une capture active, quand l’utilisateur retire son accord pour la suite, alors aucun nouveau flux n’est transmis, le texte reste disponible et les modalités concernant les données déjà conservées sont accessibles.

**Cas limite :** Si la conservation de transcription requise pour la session est refusée, expliquer ce besoin et proposer l’édition manuelle sans entretien transcrit. Une évolution vers l’enregistrement audio durable exigera une spécification et des choix séparés.

**Cas de test prévu :** TC-017. Aucun test produit exécuté à ce stade.

### FR-018 · Interruption d’une réponse vocale

**Priorité : MUST** · Parcours **US03** · Origine : Besoin confirmé ; règles détaillées proposées.

L’utilisateur peut interrompre une réponse de l’IA par la commande dédiée ou par une nouvelle prise de parole reconnue, sans provoquer l’application d’une proposition inachevée.

- **AC-018-1** : Étant donné une réponse audio en lecture, quand l’utilisateur active interrompre, alors la lecture cesse et l’interface lui rend la parole.
- **AC-018-2** : Étant donné une proposition encore en préparation, quand la réponse est interrompue, alors aucun fragment de modification n’est appliqué au modèle.
- **AC-018-3** : Étant donné une nouvelle prise de parole reconnue pendant une réponse, quand le tour utilisateur débute, alors l’ancienne réponse n’est pas rejouée et les demandes successives restent ordonnées.

**Cas limite :** Une modification déjà appliquée avant interruption reste visible et annulable ; interrompre la voix ne la retire pas silencieusement.

**Cas de test prévu :** TC-018. Aucun test produit exécuté à ce stade.

### FR-019 · Correction de la transcription

**Priorité : MUST** · Parcours **US03** · Origine : Besoin confirmé ; règles détaillées proposées.

L’utilisateur peut corriger un segment transcrit et le système relie la correction à son segment d’origine tout en signalant les propositions ou modifications du modèle qui en dépendent.

- **AC-019-1** : Étant donné une transcription mentionnant un mauvais outil, quand l’utilisateur corrige son nom avant application, alors les propositions non appliquées sont recalculées depuis le texte corrigé.
- **AC-019-2** : Étant donné une modification déjà confirmée issue de ce segment, quand le segment est corrigé, alors une proposition de révision est présentée sans écraser la modification confirmée.
- **AC-019-3** : Étant donné un segment corrigé, quand un utilisateur autorisé consulte son historique, alors le segment original, la correction et leur auteur sont distingués.

**Cas limite :** Une transcription incertaine qui change le responsable, une condition ou une séquence déclenche une clarification ciblée avant modification métier.

**Cas de test prévu :** TC-019. Aucun test produit exécuté à ce stade.

### FR-020 · Contexte visuel et propositions devenues obsolètes

**Priorité : MUST** · Parcours **US03** · Origine : Besoin confirmé ; règles détaillées proposées.

Chaque demande contextualisée conserve l’élément sélectionné et la version du modèle au début du tour afin qu’un changement ultérieur de sélection ou de modèle ne redirige pas silencieusement la modification proposée.

- **AC-020-1** : Étant donné la tâche A sélectionnée au début de la phrase ici on utilise un modèle, quand l’utilisateur sélectionne B pendant le traitement, alors la proposition reste explicitement attachée à A.
- **AC-020-2** : Étant donné une proposition préparée pour une version du modèle, quand sa cible a été supprimée ou modifiée entre-temps, alors son application est suspendue et une nouvelle interprétation ou clarification est demandée.
- **AC-020-3** : Étant donné une phrase ambiguë sans sélection exploitable, quand l’IA ne peut identifier une cible unique, alors elle demande la tâche concernée sans modifier le canevas.

**Cas limite :** Un simple déplacement de sélection ne rend pas le contenu de la proposition invalide ; un changement du sens métier de sa cible impose un nouveau contrôle de version.

**Cas de test prévu :** TC-020. Aucun test produit exécuté à ce stade.

### FR-021 · Naviguer de la chaîne de valeur aux tâches

**Priorité : MUST** · Parcours **US04** · Origine : Besoin confirmé ; règles détaillées proposées.

À partir du contexte disponible et de quelques réponses sur l’activité, proposer une première carte adaptée issue d’un modèle type versionné. Présenter pilotage, réalisation et support reliés aux offres, bénéficiaires et valeur produite. Chaque bloc ouvre ses processus puis sous-processus et tâches. Les éléments de modèle type restent proposés. La vue macro est distincte d’un diagramme BPMN.

- **AC-021-1** : Étant donné une activité et une offre renseignées sans carte existante, quand la première proposition est demandée, alors une carte de 5 à 12 blocs apparaît avec référence au modèle type, hypothèses visibles et possibilité de corriger ; aucune étape n’est marquée confirmée automatiquement.
- **AC-021-2** : Étant donné un bloc Réaliser une mission lié à un processus, quand l’utilisateur l’ouvre, sélectionne une tâche puis revient au parent et rouvre le processus, alors le détail, le chemin de navigation, le zoom et la sélection sont retrouvés.
- **AC-021-3** : Étant donné un bloc macro sans détail, quand l'utilisateur l'ouvre, alors l'application affiche que le processus reste à décrire et propose de le détailler sans inventer des tâches confirmées.

**Cas limite :** Un même processus peut contribuer à plusieurs chaînes de valeur : utiliser des références stables plutôt que dupliquer silencieusement ses tâches.

**Cas de test prévu :** TC-021. Aucun test produit exécuté à ce stade.

### FR-022 · Définir le sous-ensemble BPMN de la première version

**Priorité : MUST** · Parcours **US04** · Origine : Proposition de conception.

Prendre en charge les événements de début et fin simples, tâches génériques, userTask, manualTask et serviceTask, passerelles exclusives et parallèles, sous-processus incorporés repliables, participants/pools, couloirs, flux de séquence, flux de message, annotations, objets et magasins de données avec associations. Le type serviceTask décrit une intention ; il ne déclenche aucune exécution dans la V1. Les événements complexes, transactions et chorégraphies sont hors du sous-ensemble proposé.

- **AC-022-1** : Étant donné un processus vide, quand l'utilisateur ajoute début, tâche, passerelle, sous-processus et fin depuis la palette, alors ces éléments sont enregistrés avec des identifiants stables et des types BPMN explicites.
- **AC-022-2** : Étant donné un sous-processus contenant trois tâches, quand l'utilisateur le replie puis le déplie, alors ses éléments, liens et propriétés sont conservés.
- **AC-022-3** : Étant donné une tâche de type serviceTask, quand elle est enregistrée, alors aucun outil externe ni agent n'est exécuté et la fiche indique que l'exécution n'est pas activée.

**Cas limite :** Les composants BPMN hors périmètre ne doivent pas être assimilés à des tâches ordinaires pour contourner une limite de prise en charge.

**Cas de test prévu :** TC-022. Aucun test produit exécuté à ce stade.

### FR-023 · Valider les liens BPMN sans bloquer les brouillons

**Priorité : MUST** · Parcours **US04** · Origine : Proposition de conception.

Autoriser un sequenceFlow entre nœuds de flux d'un même processus, y compris entre couloirs du même pool, et un messageFlow entre participants distincts. Interdire un sequenceFlow traversant deux pools et un messageFlow interne à un participant. Un lien traversant la frontière d'un sous-processus doit passer par le nœud sous-processus dans son parent. Conserver les brouillons incomplets avec une liste d'anomalies localisées ; distinguer validité BPMN, confirmation métier et exécutabilité.

- **AC-023-1** : Étant donné deux tâches dans des couloirs distincts du même pool, quand l'utilisateur les relie en séquence, alors le lien est accepté et ne devient pas un flux de message.
- **AC-023-2** : Étant donné deux tâches dans des pools différents, quand un sequenceFlow est proposé, alors la modification est refusée avec explication et une proposition de messageFlow nécessitant validation.
- **AC-023-3** : Étant donné un brouillon sans événement de fin, quand l'utilisateur l'enregistre puis demande un export conforme au profil ProcessIA, alors le brouillon est conservé mais l'export au profil ProcessIA est bloqué avec l'identifiant du processus et l'anomalie à corriger.

**Cas limite :** Une passerelle exclusive sans conditions explicites reste une information métier à compléter, même si le schéma XML est techniquement valide.

**Cas de test prévu :** TC-023. Aucun test produit exécuté à ce stade.

### FR-024 · Appliquer les modifications issues du dialogue

**Priorité : MUST** · Parcours **US04** · Origine : Besoin confirmé ; règles détaillées proposées.

Transformer une intention conversationnelle en proposition de changements structurés sur le modèle partagé. Appliquer une modification simple et non ambiguë comme une transaction annulable ; présenter les changements ambigus ou destructifs pour clarification avant application. Afficher les éléments créés, modifiés ou supprimés et préserver la disposition des éléments non concernés.

- **AC-024-1** : Étant donné une tâche sélectionnée et une instruction Ajouter une validation après cette tâche, quand l'intention et la cible sont non ambiguës, alors la nouvelle tâche et ses liens apparaissent et le journal relie la transaction à l'énoncé utilisateur.
- **AC-024-2** : Étant donné deux tâches nommées Validation dans le contexte ouvert, quand l'utilisateur demande Supprime la validation sans sélection, alors aucune tâche n'est supprimée et les deux candidates sont proposées pour clarification.
- **AC-024-3** : Étant donné une modification conversationnelle appliquée, quand l'utilisateur choisit Annuler, alors la transaction complète est annulée et la conversation suivante s'appuie sur le modèle restauré.

**Cas limite :** Une réponse IA invalide ou interrompue ne peut pas appliquer une moitié de transaction.

**Cas de test prévu :** TC-024. Aucun test produit exécuté à ce stade.

### FR-025 · Interpréter l'édition directe et gérer les conflits

**Priorité : MUST** · Parcours **US04** · Origine : Besoin confirmé ; règles détaillées proposées.

Répercuter toute modification autorisée de l'éditeur dans le modèle métier utilisé par l'IA. Distinguer changement de position, changement de couloir et changement de séquence. Toute proposition IA référence la révision de départ ; si une édition directe a modifié les mêmes objets, présenter le conflit avant application. Cette règle n'implique pas une coédition simultanée multi-utilisateurs en V1.

- **AC-025-1** : Étant donné une tâche déplacée dans son couloir sans changement de liens, quand le déplacement est enregistré, alors seules ses coordonnées changent et son responsable reste identique.
- **AC-025-2** : Étant donné une tâche déplacée vers un autre couloir associé à un rôle, quand le rôle responsable serait modifié, alors le nouveau sens métier est présenté pour confirmation avant modification de la responsabilité.
- **AC-025-3** : Étant donné une proposition IA basée sur la révision 12 et une édition utilisateur du même lien en révision 13, quand l'IA soumet sa proposition, alors le lien de révision 13 est conservé et un conflit explicite doit être résolu.

**Cas limite :** La suppression d'une tâche référencée par une recommandation doit afficher les dépendances et conserver une référence historique après confirmation.

**Cas de test prévu :** TC-025. Aucun test produit exécuté à ce stade.

### FR-026 · Partager le contexte de sélection avec l'IA

**Priorité : MUST** · Parcours **US04** · Origine : Besoin confirmé ; règles détaillées proposées.

Associer chaque énoncé au dossier, à la vue, au processus, à la sélection et à la révision actifs au début de l'énoncé. Permettre à l'IA de surligner sa cible et de proposer une navigation. Une sélection changeant pendant le traitement ne doit pas rediriger silencieusement une modification déjà préparée.

- **AC-026-1** : Étant donné la tâche Préparer la restitution sélectionnée, quand l'utilisateur dit Ici nous utilisons un modèle, alors la proposition vise l'identifiant de cette tâche et rend ce rattachement visible.
- **AC-026-2** : Étant donné un énoncé commencé sur la tâche A puis une sélection de B avant son traitement, quand la modification est prête, alors l'interface montre qu'elle concerne A et n'affecte pas B.
- **AC-026-3** : Étant donné un diagramme manipulé par l'utilisateur, quand l'IA explique une tâche hors écran, alors elle propose de la montrer sans déplacer automatiquement le canevas.

**Cas limite :** Sans sélection et avec une référence orale ambiguë, demander la cible avant toute mutation.

**Cas de test prévu :** TC-026. Aucun test produit exécuté à ce stade.

### FR-027 · Décrire qui fait quoi dans une fiche de tâche

**Priorité : MUST** · Parcours **US04** · Origine : Besoin confirmé ; règles détaillées proposées.

Afficher et éditer pour chaque tâche la finalité, le résultat attendu, les bénéficiaires, le déclencheur, les responsables par rôle, services et personnes éventuelles, les contributeurs, le rôle validateur, les outils et opérations, les entrées et sorties, les documents, les difficultés, les exceptions et la provenance. Distinguer rôle et personne ; le nom d'une personne n'est pas nécessaire pour documenter une responsabilité.

- **AC-027-1** : Étant donné une tâche dont seul le rôle Achats est connu, quand sa fiche est ouverte, alors ce rôle est visible et l'absence de personne nominative ne bloque pas l'enregistrement.
- **AC-027-2** : Étant donné une modification du rôle validateur dans la fiche, quand elle est confirmée, alors le modèle et le contexte de dialogue reflètent la même valeur après réouverture.
- **AC-027-3** : Étant donné un rôle impliqué dans trois tâches, quand son libellé est modifié dans le référentiel du dossier, alors les trois fiches présentent le libellé actualisé tout en conservant l'identifiant et l'historique.

**Cas limite :** Plusieurs responsables déclarés restent visibles avec une question de clarification ; l'IA ne désigne pas un responsable unique par déduction.

**Cas de test prévu :** TC-027. Aucun test produit exécuté à ce stade.

### FR-028 · Distinguer absence d'information et absence confirmée

**Priorité : MUST** · Parcours **US04** · Origine : Proposition de conception.

Chaque propriété métier porte un état de connaissance explicite : non renseigné, proposé, à confirmer, confirmé ou contesté. Une absence confirmée de document, outil ou validation est une valeur métier distincte d'un champ vide. La confirmation enregistre auteur habilité, date et périmètre ; ni extraction automatique ni répétition d'un témoignage ne suffisent à confirmer.

- **AC-028-1** : Étant donné un champ Outil vide, quand l'IA prépare une synthèse, alors elle indique Outil non renseigné et ne conclut pas qu'aucun outil n'est utilisé.
- **AC-028-2** : Étant donné une réponse Nous n'utilisons aucun modèle pour cette tâche, quand un acteur habilité la confirme, alors la fiche affiche Aucun modèle, confirmé avec auteur et date.
- **AC-028-3** : Étant donné une propriété confirmée et une nouvelle source incompatible, quand cette source est traitée, alors la valeur confirmée n'est pas remplacée et une contestation liée aux deux éléments apparaît.

**Cas limite :** Le rôle exact autorisé à confirmer ou arbitrer reste une décision de gouvernance à valider ; le système doit permettre de configurer cette habilitation.

**Cas de test prévu :** TC-028. Aucun test produit exécuté à ce stade.

### FR-029 · Relier outils, données, documents et passages de relais

**Priorité : MUST** · Parcours **US04** · Origine : Besoin confirmé ; règles détaillées proposées.

Maintenir des entités réutilisables pour les outils, données et documents, avec références depuis les tâches. Qualifier chaque document comme entrée, modèle vierge, exemple rempli ou livrable. Décrire chaque échange par producteur, destinataire, contenu, support/outillage et condition de transmission. La présence d'un outil décrit ne vaut pas autorisation de connexion.

- **AC-029-1** : Étant donné un modèle de restitution et un rapport rempli, quand ils sont rattachés à une tâche, alors leurs catégories distinctes sont affichées et conservées dans l'export métier.
- **AC-029-2** : Étant donné une donnée Plan de production utilisée par achats et fabrication, quand son producteur est renseigné, alors les deux tâches renvoient à la même entité et permettent de retrouver ses destinataires.
- **AC-029-3** : Étant donné un lien vers un document privé rattaché à une tâche partagée, quand un client ouvre la tâche, alors ni contenu, extrait, nom privé ni URL d'accès du document ne sont exposés.

**Cas limite :** Une référence documentaire inaccessible doit conserver une indication générique autorisée sans révéler les métadonnées privées.

**Cas de test prévu :** TC-029. Aucun test produit exécuté à ce stade.

### FR-030 · Préparer des entretiens complémentaires par rôle

**Priorité : SHOULD** · Parcours **US05** · Origine : Besoin confirmé ; règles détaillées proposées.

Dans le mode consultant, créer un plan d'entretiens rattaché au dossier avec rôle ou personne ciblée, processus concernés, objectifs, trame, statut prévu/réalisé/abandonné et synthèse. La baseline proposée pour la V1 fait conduire ces entretiens par le consultant. L'invitation autonome des collègues reste une décision ouverte et n'est pas présumée disponible.

- **AC-030-1** : Étant donné une tâche achats insuffisamment décrite, quand le consultant prépare un entretien avec le rôle Achats, alors la trame reprend les informations accessibles déjà connues et les questions ouvertes de cette tâche.
- **AC-030-2** : Étant donné un entretien réalisé, quand sa synthèse est enregistrée, alors les constats proposés conservent un lien vers cet entretien et ne deviennent pas automatiquement confirmés.
- **AC-030-3** : Étant donné une trame contenant des notes privées, quand une version destinée à l'interlocuteur est prévisualisée, alors seules les questions et informations explicitement partageables apparaissent.

**Cas limite :** Aucun email ni invitation ne doit être envoyé automatiquement à partir d'un nom de personne extrait d'une source.

**Cas de test prévu :** TC-030. Aucun test produit exécuté à ce stade.

### FR-031 · Recommander les rôles et questions à forte valeur d'information

**Priorité : SHOULD** · Parcours **US05** · Origine : Besoin confirmé ; règles détaillées proposées.

Proposer les entretiens complémentaires à partir des responsabilités inconnues, passages de relais peu documentés, exceptions, tâches critiques et contradictions. Chaque recommandation précise le rôle, la personne seulement si connue, le processus, l'information attendue, les sources autorisées, les questions proposées et la justification de priorité. Pendant l'entretien, proposer des relances discrètes sans interrompre automatiquement l'interlocuteur.

- **AC-031-1** : Étant donné un flux de production décrit uniquement par la direction et un approvisionnement non documenté, quand les prochains entretiens sont proposés, alors le rôle Achats apparaît avec une justification liée aux déclencheurs ou exceptions manquants.
- **AC-031-2** : Étant donné aucun titulaire connu pour un rôle recommandé, quand la recommandation est affichée, alors elle nomme le rôle et ne fabrique pas de personne.
- **AC-031-3** : Étant donné une contradiction relevée pendant un entretien, quand une relance est suggérée, alors elle apparaît dans l'espace consultant avec la tâche concernée et reste une suggestion modifiable.

**Cas limite :** Une couverture déclarée comme suffisante doit indiquer son périmètre et les inconnues restantes, sans prétendre à une exhaustivité organisationnelle.

**Cas de test prévu :** TC-031. Aucun test produit exécuté à ce stade.

### FR-032 · Consolider les témoignages sans effacer les divergences

**Priorité : MUST** · Parcours **US05** · Origine : Besoin confirmé ; règles détaillées proposées.

Conserver les assertions distinctes provenant des entretiens et documents. Lorsqu'elles divergent, présenter un dossier de clarification lié à la propriété ou au flux concerné. Autoriser un acteur habilité à conclure à une correction, une variante conditionnelle, une évolution temporelle ou un désaccord non résolu, avec justification et historique.

- **AC-032-1** : Étant donné un entretien déclarant une validation systématique et un autre une validation au-delà d'un seuil, quand les deux sont consolidés, alors les deux assertions restent consultables selon les droits et la règle commune reste à clarifier.
- **AC-032-2** : Étant donné un arbitrage concluant à deux variantes selon le montant, quand il est confirmé, alors la règle et les branches proposées conservent les sources et la justification de l'arbitrage.
- **AC-032-3** : Étant donné une contradiction non résolue, quand le diagnostic est produit, alors son existence et son impact sont signalés dans le périmètre autorisé.

**Cas limite :** Le nombre de témoignages similaires ne détermine pas automatiquement la version vraie ; préserver dates et contextes de validité.

**Cas de test prévu :** TC-032. Aucun test produit exécuté à ce stade.

### FR-033 · Comparer le fonctionnement actuel et une cible proposée

**Priorité : MUST** · Parcours **US06** · Origine : Besoin confirmé ; règles détaillées proposées.

Créer un scénario cible à partir d'une version identifiée de l'état actuel. Conserver les correspondances entre éléments et afficher tâches ajoutées, retirées, modifiées, responsabilités transférées, outils et données concernés. Une cible conserve son statut proposé jusqu'à validation ; elle ne remplace pas la description actuelle.

- **AC-033-1** : Étant donné un processus actuel confirmé, quand une cible incluant une assistance IA est créée, alors l'état actuel demeure inchangé et la cible référence sa version de départ.
- **AC-033-2** : Étant donné une tâche cible préparée par une IA puis validée humainement, quand la comparaison est ouverte, alors le changement de travail et le responsable de validation sont explicitement visibles.
- **AC-033-3** : Étant donné une modification ultérieure de l'état actuel, quand la cible est consultée, alors l'application signale que sa version de référence est antérieure et propose une réconciliation explicite.

**Cas limite :** Valider une cible comme souhaitée ne constitue ni son déploiement ni la preuve qu'elle est devenue le fonctionnement réel.

**Cas de test prévu :** TC-033. Aucun test produit exécuté à ce stade.

### FR-034 · Produire un diagnostic traçable et circonscrit

**Priorité : MUST** · Parcours **US06** · Origine : Besoin confirmé ; règles détaillées proposées.

Générer un diagnostic à partir d'un instantané autorisé du dossier : périmètre, processus étudiés, rôles entendus, couverture, irritants, dépendances, risques, points ouverts, constats sourcés et pistes d'amélioration. Distinguer fait déclaré, fait confirmé, interprétation, hypothèse et information manquante. Inclure simplification organisationnelle et automatisation classique parmi les options pertinentes.

- **AC-034-1** : Étant donné un seul processus approfondi, quand le diagnostic est généré, alors ce périmètre et les limites de couverture sont affichés sans conclure sur l'ensemble de l'entreprise.
- **AC-034-2** : Étant donné un constat de ressaisie rattaché à deux tâches et à un entretien, quand il apparaît dans le diagnostic, alors il renvoie aux éléments et à une provenance accessible ou à une mention générique compatible avec les droits.
- **AC-034-3** : Étant donné aucune mesure de temps collectée, quand les gains sont présentés, alors aucun volume d'heures économisées n'est donné comme résultat observé.

**Cas limite :** Un diagnostic généré depuis l'espace client ne peut exploiter une connaissance privée non partagée, même pour en produire une synthèse sans citation.

**Cas de test prévu :** TC-034. Aucun test produit exécuté à ce stade.

### FR-035 · Prioriser les usages avec des critères explicables

**Priorité : MUST** · Parcours **US06** · Origine : Besoin confirmé ; règles détaillées proposées.

Comparer les opportunités selon valeur attendue pour les parties prenantes, fréquence/volume si connus, faisabilité, disponibilité des données, effort, risques, validations humaines et prérequis. Chaque appréciation porte une justification et un niveau d'incertitude. Autoriser une priorité manuelle motivée ; aucune formule de scoring ni estimation de retour financier n'est considérée validée par défaut.

- **AC-035-1** : Étant donné deux opportunités dont l'une dépend de données indisponibles, quand leur priorité est proposée, alors cette dépendance et son effet sur la faisabilité sont visibles.
- **AC-035-2** : Étant donné un critère non renseigné, quand une opportunité est comparée, alors la valeur est Inconnue et n'est assimilée ni à zéro ni à un avis favorable.
- **AC-035-3** : Étant donné une priorité proposée par l'IA, quand le consultant la modifie, alors la nouvelle priorité, son auteur et sa justification sont enregistrés dans l'historique.

**Cas limite :** Un bénéfice élevé ne doit pas masquer un prérequis bloquant ; afficher séparément priorité souhaitée et possibilité de démarrer.

**Cas de test prévu :** TC-035. Aucun test produit exécuté à ce stade.

### FR-036 · Décrire des usages opérationnels et des capacités mutualisables

**Priorité : MUST** · Parcours **US06** · Origine : Besoin confirmé ; règles détaillées proposées.

Chaque usage prioritaire décrit problème, tâches concernées, bénéficiaires, résultat, entrées/sorties, outils requis, documents, skills/capacités, limites d'action, validation humaine, responsable, prérequis, essai et critères de réussite. Identifier les capacités réutilisables entre plusieurs usages, sans imposer un agent par tâche. Produire une recommandation de harnais conceptuelle indépendante d'un fournisseur ; l'exécution et le déploiement du harnais sont hors V1.

- **AC-036-1** : Étant donné deux usages nécessitant l'extraction de devis, quand leur architecture de capacités est proposée, alors une capacité mutualisée peut être reliée aux deux usages avec leurs contextes et droits respectifs.
- **AC-036-2** : Étant donné un usage prioritaire sans validateur humain ou critère de réussite renseigné, quand il est préparé pour la feuille de route, alors les champs manquants sont signalés comme prérequis à compléter.
- **AC-036-3** : Étant donné une recommandation enregistrée, quand l'utilisateur la consulte ou l'exporte, alors aucun agent, outil métier ou conteneur n'est exécuté.

**Cas limite :** Mutualiser une capacité ne mutualise pas les accès aux données ; chaque usage conserve son périmètre d'autorisation.

**Cas de test prévu :** TC-036. Aucun test produit exécuté à ce stade.

### FR-037 · Construire une feuille de route vers l'autonomie

**Priorité : MUST** · Parcours **US06** · Origine : Besoin confirmé ; règles détaillées proposées.

Transformer les priorités en actions ordonnées avec objectif, responsable par rôle, dépendances, livrable, effort à estimer, horizon indicatif, état et critères de sortie. Prévoir des essais mesurables, guides par rôle, exercices, ressources et prestations proposées pour l'appropriation. Distinguer gain hypothétique, référence mesurée et résultat d'essai observé.

- **AC-037-1** : Étant donné un usage dépendant d'un modèle documentaire à préparer, quand la feuille de route est générée, alors la préparation apparaît comme action antérieure à l'essai.
- **AC-037-2** : Étant donné un objectif d'autonomie pour un rôle, quand l'action d'accompagnement est détaillée, alors elle précise une ressource ou un exercice et un critère observable de réalisation autonome.
- **AC-037-3** : Étant donné un gain estimé avant essai puis une mesure après essai, quand la feuille de route est actualisée, alors l'hypothèse initiale et la mesure restent distinctes avec date et méthode.

**Cas limite :** Une prestation suggérée reste une option sans engagement commercial, commande ni attribution automatique à un prestataire.

**Cas de test prévu :** TC-037. Aucun test produit exécuté à ce stade.

### FR-038 · Versionner les cartes et leur validation

**Priorité : MUST** · Parcours **US07** · Origine : Proposition de conception.

Enregistrer chaque transaction avec auteur, origine dialogue/éditeur/MCP, révision de base, horodatage et objets concernés. Permettre de nommer un instantané, comparer deux versions et restaurer un instantané comme nouvelle version, sans supprimer l'historique. Les diagnostics et exports référencent leur instantané ; une validation porte sur une version et un périmètre explicites.

- **AC-038-1** : Étant donné deux versions d'un processus, quand leur comparaison est demandée, alors les changements de tâches, liens et propriétés sont listés avec leurs auteurs.
- **AC-038-2** : Étant donné un instantané antérieur sélectionné, quand sa restauration est confirmée, alors une nouvelle révision est créée et les révisions intermédiaires restent consultables par les utilisateurs habilités.
- **AC-038-3** : Étant donné une carte validée puis modifiée, quand son état est affiché, alors la nouvelle révision n'hérite pas silencieusement de la validation des éléments modifiés.

**Cas limite :** Restaurer une version ne doit pas restaurer des droits révoqués ni réexposer une source devenue inaccessible.

**Cas de test prévu :** TC-038. Aucun test produit exécuté à ce stade.

### FR-039 · Exporter un dossier utile et respectueux des accès

**Priorité : MUST** · Parcours **US07** · Origine : Proposition de conception.

Exporter un dossier HTML lisible hors ligne comprenant carte, fiches, diagnostic, recommandations, feuille de route et limites de couverture, ainsi qu'un JSON métier versionné pour reprise. L'export précise entreprise, scénario actuel/cible, version et date. Contrôler les droits au moment de la préparation puis à la remise du fichier et exclure toute source ou métadonnée privée non autorisée, y compris liens, annexes, infobulles et commentaires.

- **AC-039-1** : Étant donné une version partagée contenant une source privée non partageable, quand un client exporte le dossier, alors le HTML et le JSON ne contiennent ni son nom, son extrait, son URL ni ses métadonnées privées.
- **AC-039-2** : Étant donné un export achevé, quand il est ouvert hors ligne, alors son périmètre, sa version, les cartes et le texte restent lisibles sans dépendre de ressources privées distantes.
- **AC-039-3** : Étant donné un droit d'accès révoqué entre la préparation et la remise de l'export, quand le fichier est demandé, alors sa remise est refusée et aucun lien de téléchargement valide n'est délivré.

**Cas limite :** Un fichier déjà téléchargé échappe à la révocation technique du serveur ; informer de cette limite au partage sans prétendre pouvoir effacer les copies locales.

**Cas de test prévu :** TC-039. Aucun test produit exécuté à ce stade.

### FR-040 · Assurer un échange BPMN explicite et sans perte silencieuse

**Priorité : MUST** · Parcours **US07** · Origine : Proposition de conception.

Importer et exporter BPMN 2.0 XML avec BPMN DI pour le sous-ensemble supporté, en préservant identifiants, types, libellés, liens, conditions et géométrie dans un aller-retour sémantique. Les métadonnées ProcessIA transitent dans un JSON associé avec références stables. Inspecter un import avant mutation : si des éléments ou extensions non pris en charge sont détectés, en fournir la liste et bloquer l'import éditable en V1 ; conserver l'original comme source si autorisé. Ne promettre ni identité octet par octet, ni fidélité hors sous-ensemble, ni exécutabilité Camunda ou autre moteur.

- **AC-040-1** : Étant donné un fichier ne contenant que des éléments supportés, quand il est importé, exporté puis réimporté, alors les identifiants, types, liens, conditions et coordonnées sont équivalents selon le contrat d'aller-retour.
- **AC-040-2** : Étant donné un fichier contenant un événement ou une extension non supporté, quand son import est préparé, alors la liste des incompatibilités apparaît avant modification du dossier et aucun élément n'est supprimé ou converti silencieusement.
- **AC-040-3** : Étant donné une tâche comprenant des métadonnées ProcessIA autorisées, quand le paquet XML et JSON associé est exporté puis réimporté, alors la fiche est reliée au même identifiant ; le XML seul indique que ces métadonnées associées ne sont pas incluses.

**Cas limite :** Désactiver les entités XML externes et refuser les références externes ou fichiers dépassant les limites configurées avant analyse du modèle.

**Cas de test prévu :** TC-040. Aucun test produit exécuté à ce stade.

## 13 · Qualité, performance et exploitation

Les seuils proposés sont regroupés ici. Le protocole P1 définit les conditions de mesure ; les résultats réels seront ajoutés au suivi du pilote.

### NFR-001 · Canevas immédiatement manipulable

**Priorité : MUST** · Objectif proposé, non validé et non mesuré. À calibrer pendant le pilote Kosmio.

**Cible :** Sous le protocole P1 : ouverture dossier p95 ≤ 3 s ; sélection de tâche et ouverture de sa fiche p95 ≤ 150 ms ; déplacement visuel p95 ≤ 100 ms. Aucun déplacement automatique des éléments non concernés par une modification locale.

**Mesure :** Mesures navigateur sur la surface publique. P1 commun à NFR-001 à NFR-004 : 20 dossiers isolés, 20 sessions actives dont 5 vocales, 300 éléments et 450 liens par dossier dont au plus 50 éléments visibles, 50 sources textuelles de 20 pages, 2 requêtes concurrentes sur un même processus ; ordinateur 4 cœurs/8 Go, navigateur stable courant, réseau 20 Mbit/s et RTT 80 ms. Trois exécutions de 30 minutes après 5 minutes de chauffe ; au moins 200 observations par opération mesurée, horodatages synchronisés et erreurs incluses dans le rapport. Documenter matériel, région et fournisseur effectivement utilisés. Ces capacités ne sont pas des limites commerciales promises.

**Vérification prévue :** QC-001. À implémenter et exécuter pendant le développement.

### NFR-002 · Fluidité de la voix et du texte

**Priorité : MUST** · Objectif proposé, non validé et non mesuré. À calibrer pendant le pilote Kosmio.

**Cible :** Fin de parole détectée → premier retour audible p95 ≤ 2,5 s ; envoi texte → premier contenu utile p95 ≤ 2 s ; interruption utilisateur → arrêt de la lecture p95 ≤ 300 ms. Un indicateur de traitement seul ne compte pas comme contenu utile.

**Mesure :** P1 avec corpus français de 100 tours de 5 à 30 s répété deux fois, pauses, hésitations et corrections. Mesurer séparément acquisition, transcription, premier jet et synthèse vocale ; inclure la latence réelle des services. La transcription partielle demeure provisoire et ne déclenche pas seule une modification confirmée.

**Vérification prévue :** QC-002. À implémenter et exécuter pendant le développement.

### NFR-003 · Application des commandes et génération

**Priorité : MUST** · Objectif proposé, non validé et non mesuré. À calibrer pendant le pilote Kosmio.

**Cible :** Commande déterministe manuelle validée → révision persistée et visible p95 ≤ 1 s ; fin de transcription stabilisée → proposition de modification de 1 à 5 éléments p95 ≤ 5 s ; génération première carte de 5 à 12 blocs p95 ≤ 15 s après contexte minimum fourni.

**Mesure :** P1, 200 commandes déterministes et 200 commandes IA dont 20 % ambiguës. Le chronomètre de proposition IA s’arrête à la proposition affichée ou à une clarification utile, celui de persistance à l’accusé d’enregistrement. Le premier jet vocal de NFR-002 ne signifie jamais que la carte est déjà modifiée. Rapporter séparément ambiguïtés, rejets et réussites.

**Vérification prévue :** QC-003. À implémenter et exécuter pendant le développement.

### NFR-004 · Reprise après incident et idempotence

**Priorité : MUST** · Objectif proposé, non validé et non mesuré. À calibrer pendant le pilote Kosmio.

**Cible :** Zéro commande accusée enregistrée perdue ; zéro duplication après rejeu ; retour à une session éditable ≤ 10 s après rétablissement du réseau. Brouillons non accusés visibles comme non enregistrés. Toute opération IA dépassement 30 s affiche reprise, annulation ou passage écrit.

**Mesure :** Injecter 50 interruptions réseau avant et après accusé, une fermeture navigateur et une indisponibilité du service IA. Rejouer les mêmes identifiants de commande ; vérifier une seule révision par commande. Le résultat tardif annulé ne doit pas modifier la carte. Restaurer dernière révision confirmée, sélection et brouillon récupérable sans inventer les paroles perdues.

**Vérification prévue :** QC-004. À implémenter et exécuter pendant le développement.

### NFR-005 · Isolation et partage de connaissance

**Priorité : MUST** · Objectif proposé, non validé et non mesuré. À calibrer pendant le pilote Kosmio.

**Cible :** Zéro fuite dans la matrice de contrôle entre dossiers et entre préparation privée et espace partagé, y compris contenu, titre, extrait, nom de fichier, index de recherche, réponses IA, erreurs, logs et exports accessibles. Toute requête serveur et MCP vérifie son autorisation effective.

**Mesure :** Tests paramétrés avec deux entreprises, deux consultants et trois permissions, accès directs par identifiant deviné et 30 sources contenant des marqueurs secrets. Publier un fait reformulé approuvé issu d’une source privée : le fait devient lisible, la référence privée reste masquée. Tester questions indirectes, recherche et export ; le contexte IA partagé contient uniquement faits explicitement partagés et sources autorisées.

**Vérification prévue :** QC-005. À implémenter et exécuter pendant le développement.

### NFR-006 · Invitations et révocation des accès

**Priorité : MUST** · Objectif proposé, non validé et non mesuré. À calibrer pendant le pilote Kosmio.

**Cible :** Invitation proposée à usage unique, expiration 7 jours ; révocation effective au prochain contrôle serveur et en ≤ 60 s sur une connexion active. Zéro nouvel accès serveur en lecture ou écriture après révocation ; les octets déjà reçus ne sont pas rappelables. Contrôler à nouveau les droits avant application d’un résultat différé.

**Mesure :** Horloge contrôlée : lien expiré, rejoué, révoqué avant acceptation et accès révoqué pendant entretien, export ou traitement. Le parcours de réinvitation crée un nouvel accès explicite. La suppression d’un accès ne supprime pas automatiquement ses contributions validées. Ces garanties valent aussi si les invitations de collaborateurs sont reportées ; le lien initial du dirigeant est concerné.

**Vérification prévue :** QC-006. À implémenter et exécuter pendant le développement.

### NFR-007 · Accessibilité et alternative à la voix

**Priorité : MUST** · Objectif proposé, non validé et non mesuré. À calibrer pendant le pilote Kosmio.

**Cible :** Objectif WCAG 2.2 niveau AA sur les parcours du pilote ; 100 % des actions métier critiques réalisables au clavier et par vue structurée équivalente ; zéro information transmise uniquement par couleur ou audio.

**Mesure :** Audit automatique complété par essais clavier et lecteur d’écran : ouvrir dossier, démarrer ou couper micro, lire transcript, sélectionner et modifier tâche, naviguer hiérarchie, accepter/rejeter/annuler proposition, consulter provenance, générer diagnostic. Tester zoom texte 200 %, focus conservé après modification et annonces limitées pour ne pas lire chaque fragment de transcription.

**Vérification prévue :** QC-007. À implémenter et exécuter pendant le développement.

### NFR-008 · Fidélité et cohérence du modèle

**Priorité : MUST** · Objectif proposé, non validé et non mesuré. À calibrer pendant le pilote Kosmio.

**Cible :** 100 % des révisions acceptées respectent les invariants du domaine et du sous-ensemble BPMN supporté ; zéro écrasement silencieux de modification concurrente ; zéro promotion automatique d’une hypothèse en fait confirmé.

**Mesure :** Corpus de 60 scénarios métier, dont 15 ambigus, 10 éditions concurrentes et 10 variantes/contradictions ; validation déterministe avant chaque application. Une commande fondée sur une ancienne révision devient conflit à résoudre, même si son texte paraît plausible. Évaluer les formulations IA avec grille métier séparée ; une validité BPMN syntaxique ne prouve pas la vérité du processus.

**Vérification prévue :** QC-008. À implémenter et exécuter pendant le développement.

### NFR-009 · Traçabilité des décisions et reproductibilité

**Priorité : MUST** · Objectif proposé, non validé et non mesuré. À calibrer pendant le pilote Kosmio.

**Cible :** 100 % des changements acceptés disposent de l’acteur, l’origine, la révision de base, la décision et la date ; 100 % des diagnostics identifient la révision analysée et les hypothèses non confirmées.

**Mesure :** Parcours public puis lecture autorisée du journal ; relier chaque recommandation aux éléments et connaissances consultés. Vérifier export d’une révision antérieure et marquage obsolète après changement. Les logs techniques excluent les corps de sources, tokens et transcriptions par défaut ; la traçabilité métier protège ses propres droits d’accès.

**Vérification prévue :** QC-009. À implémenter et exécuter pendant le développement.

### NFR-010 · Conservation et suppression contrôlées

**Priorité : MUST** · Objectif proposé, non validé et non mesuré. À calibrer pendant le pilote Kosmio.

**Cible :** Proposition pilote : aucun audio brut conservé ; buffer technique volatil ≤ 60 s, détruit après traitement. Sources et transcriptions conservées 90 jours après clôture du dossier. Suppression logique et exclusion des réponses/recherches immédiates, purge des systèmes actifs et dérivés ≤ 24 h, expiration copies de sauvegarde ≤ 30 jours.

**Mesure :** Horloge contrôlée et inventaire de stockage incluant sources, extraits, index, caches, diagnostics et exports hébergés. Après demande, vérifier exclusion immédiate du contexte IA et purge. La suppression simple d’une source marque les faits approuvés associés à réexaminer ; une suppression portant sur une donnée personnelle retire ou masque aussi ses copies dérivées. Lors d’une restauration, réappliquer le registre de suppressions avant réouverture. Un export déjà téléchargé ne peut être rappelé ; le mentionner au téléchargement et fournir au responsable la liste des livrables concernés. Rétention fournisseur à vérifier avant toute mise en service réelle.

**Vérification prévue :** QC-010. À implémenter et exécuter pendant le développement.

### NFR-011 · Coût pilotable et explicable

**Priorité : SHOULD** · Objectif proposé, non validé et non mesuré. À calibrer pendant le pilote Kosmio.

**Cible :** 100 % des opérations IA associées à un dossier et une session ; alerte à 80 % du budget configuré ; aucune nouvelle opération payante admise lorsque consommation connue + engagements estimés atteint 100 %. Aucun tarif fournisseur supposé acquis.

**Mesure :** Adaptateur de coût simulé avec tarifs paramétrés et horloge stable. Essayer concurrence de 5 opérations, estimation absente, doublon et dépassement en cours de requête. Réserver un montant estimé avant admission ; si aucun plafond fiable n’est calculable, refuser l’opération ou demander un budget explicite. Exposer consommation estimée et constatée séparément. Une opération déjà engagée peut coûter plus que son estimation ; le plafond comptable final dépend des garanties du fournisseur.

**Vérification prévue :** QC-011. À implémenter et exécuter pendant le développement.

### NFR-012 · Validation TDD et portabilité du diagnostic

**Priorité : MUST** · Objectif proposé, non validé et non mesuré. À calibrer pendant le pilote Kosmio.

**Cible :** Chaque tranche verticale livrée possède un scénario d’acceptation public écrit avant implémentation, un passage rouge constaté puis vert, et ses cas critiques de droits et de reprise. 100 % des 20 fixtures du sous-ensemble BPMN retenu passent export puis réimport sans perte sémantique.

**Mesure :** Tester depuis interfaces publiques UI, API ou MCP avec fournisseurs simulés déterministes pour les règles, puis quelques essais réels pour voix/latence et qualité métier. Ne pas figer les formulations probabilistes par égalité de texte. Vérifier identifiants, responsabilités et relations après aller-retour ; éléments hors sous-ensemble explicitement refusés ou signalés, jamais perdus silencieusement. Les métadonnées spécifiques requièrent un export compagnon versionné ; aucune compatibilité avec un moteur d’exécution n’est déduite du seul XML BPMN.

**Vérification prévue :** QC-012. À implémenter et exécuter pendant le développement.