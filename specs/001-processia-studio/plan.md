# Plan technique proposé

Statut : à compléter après clarification des fournisseurs et de la pile.

## 14 · Plan technique proposé et décisions à instruire

Cette partie correspond à **Plan**, séparée de la spécification du besoin. Elle définit les responsabilités techniques et les vérifications à conduire ; elle ne verrouille pas de fournisseur.

### Architecture minimale proposée

Une application web, un service applicatif commun aux échanges UI et MCP, une base relationnelle, un stockage privé des fichiers et un traitement asynchrone pour les extractions. Un même service peut héberger les interfaces web et MCP au pilote. Une file dédiée n’est ajoutée que si la reprise et la charge le justifient.

Le modèle de processus constitue la référence persistée. Le canevas et le BPMN XML sont des représentations de ce modèle. L’IA propose des commandes structurées ; elle n’écrit pas directement dans la base ni dans une version partagée. Les règles de structure, droits et révision sont exécutées côté serveur.

### Composants et responsabilités

| Composant | Responsabilité | Frontière de test |
|---|---|---|
| Studio web | Vue macro, BPMN, sélection, fiches, commandes voix/texte | Parcours navigateur et accessibilité |
| Service de modèle | Révisions, commandes atomiques, règles BPMN, annulation | API publique de commandes et propriétés du graphe |
| Service de connaissance | Sources, passages, affirmations, contradictions, extraction | Contrats d’ingestion et recherche filtrée |
| Service d’entretien | Tours de parole, contexte visuel, propositions, reprise | Session publique avec adaptateurs simulés |
| Service de diagnostic | Constats, priorisation, roadmap et publication | Calculs déterministes et génération sourcée |
| Passerelle MCP | Identité, droits dossier, ingestion et consultation | Client MCP de test, droits et schémas |
| Adaptateurs IA | Reconnaissance, génération, synthèse vocale, OCR éventuel | Tests de contrat externes et évaluations séparées |

### Options techniques à instruire

| Choix | Proposition de travail | Vérification avant adoption |
|---|---|---|
| Langage | TypeScript côté web et service pour partager les contrats | Valider le cadre web, le service asynchrone et les compétences de maintien |
| Éditeur BPMN | Évaluer bpmn-js intégré au studio | Prototype limité : création, aller-retour XML, événements d’édition, accessibilité et licence |
| Persistance | Base relationnelle et stockage objet privé | Transactions, migrations, contrôle des accès et restauration |
| Voix | Comparer pipeline transcription → LLM → synthèse et session vocale temps réel | Français métier, interruptions, liaison des tours aux commandes, latence, coût et conservation |
| IA documentaire | Interface fournisseur distincte de l’éditeur | Extraction structurée, citations, contexte autorisé et qualité sur corpus |
| Hébergement | Local pour développement ; service conteneurisable pour pilote | Identité, volumes persistants, sauvegardes, secrets et résidence des données |

La [documentation bpmn-js](https://bpmn.io/toolkit/bpmn-js/walkthrough/) confirme les possibilités d’intégration d’un éditeur et de lecture/écriture BPMN XML. L’adéquation au profil ProcessIA reste à éprouver. Les versions des bibliothèques et les fournisseurs seront fixés dans un fichier de dépendances et une décision d’architecture au démarrage du développement.

### Structure de code proposée pour préparer les tâches

```text
src/domain/          règles de modèle, droits, diagnostic
src/application/     cas d’usage et transactions
src/contracts/       commandes, résultats et schémas
src/adapters/        persistance, MCP, IA et voix
src/web/             canevas, fiches et entretien
tests/domain/        règles déterministes
tests/integration/   interfaces et transactions
tests/contract/      MCP et fournisseurs
tests/e2e/           parcours navigateur
tests/fixtures/      dossiers et réponses synthétiques
```

Cette structure est une cible de plan, pas une arborescence applicative déjà créée. Les parcours V1 utilisent une seule autorité de révision et un contrôle de concurrence optimiste. L’édition simultanée avancée par CRDT n’est pas nécessaire au premier pilote.

## Constitution check

C-01 à C-09 : couverts dans le plan proposé. Ratification et vérification sur implémentation restent ouvertes. Complexité retenue : un service applicatif, traitements asynchrones bornés ; aucune infrastructure agentique supplémentaire pour le diagnostic.


## Mise en œuvre locale T001 à T010, 9 au 11 septembre 2026

La demande de lancement autorise une première tranche synthétique. Voir `docs/adr/0001-tranche-locale-modele.md` pour le choix local réversible. Versions réellement installées : React 19.3.0, React Flow 12.11.6, Vite 8.2.2, TypeScript 7.0.2, Zod 4.5.4, Playwright 1.63.0, tsx 4.23.13 ; Node testé : 22.14.0, SQLite embarqué : 3.47.2. Le fichier de verrouillage npm fait autorité pour les dépendances transitives.

SQLite stocke le modèle courant, les commandes idempotentes et les révisions immuables. Une transaction `BEGIN IMMEDIATE` englobe la lecture de révision, la validation et toutes les écritures. Un serveur HTTP commun sert l'API et le studio. Les schémas sont exécutables dans `src/contracts/model.ts`.

Le mode synthétique ouvre uniquement la préparation locale. Les accès de session sont contrôlés avant lecture, génération et mutation ; l'interface ne choisit aucune identité. T002 vérifie localement les dossiers, les espaces, l'isolation et la révocation avec des identités injectées. DEC-03 reste ouvert pour l'identité pilote. La carte React Flow demeure la vue métier générale ; T008 ajoute un document BPMN détaillé relié par `model_id`, avec sa propre révision. Le CLI Spec Kit n'a pas été installé ni exécuté : les artefacts Spec Kit existants sont maintenus directement.

T003 conserve rôles, outils et informations dans des registres du modèle de dossier. Les tâches les référencent par identifiant stable et qualifient séparément l'état de connaissance de chaque rattachement. Le studio enregistre rôle, outil, entrée et sortie dans une seule commande atomique. La gouvernance de confirmation et les catégories détaillées de documents restent ouvertes.

T004 ajoute une passerelle MCP locale fondée sur `@modelcontextprotocol/server` et `@modelcontextprotocol/client` 2.0.0, exposée en stdio. Le service de sources partage la base SQLite avec les accès du studio : identité, dossier, périmètre privé, droit d'écriture et état actif sont relus avant chaque mutation. Les textes et transcriptions sont versionnés, empreintés, segmentés par paragraphes et associés à un traitement persistant. Les schémas exécutables sont dans `src/contracts/source.ts`.

Le transport stdio est un choix local réversible compatible avec les clients capables de lancer un sous-processus. Le premier client du pilote reste à nommer. Les formats PDF/DOCX, l'OCR, l'actualisation explicite, les traitements partiels et la reprise restent derrière des adaptateurs futurs conformément à DEC-06.

T005 ajoute un service de partage sur la même base relationnelle. Une prévisualisation référence une version précise de source et un passage privé, mais expose uniquement la reformulation candidate dans l'aperçu. La confirmation crée une publication versionnée et un événement d'audit. La projection responsable est reconstruite côté serveur à partir des seules publications actives et vérifie l'accès partagé à chaque lecture. Le retrait produit une nouvelle version révoquée sans supprimer la provenance privée.

Le studio local expose ce cycle dans un panneau dédié. Une note synthétique privée est ajoutée de façon idempotente au dossier de démonstration afin que le parcours reste essayable sans client MCP externe. Cette donnée porte un marqueur explicite utilisé pour vérifier l'absence de fuite dans la projection publiée.

T006 fige le dossier, le modèle, la vue, la sélection et la révision au début d'un tour écrit. L'adaptateur déterministe transforme les formulations démontrées en commandes relues avant application. Le service d'enrichissement conserve séparément l'avant/après, la provenance de la révision et celle du passage privé ; une divergence ne remplace jamais un rôle confirmé.

T007 ajoute un service d'entretien local et un contrat indépendant du fournisseur vocal. Une session ordonne les tours voix et texte, les clés d'idempotence, le contexte de sélection, les interruptions et les corrections de transcription. L'interface demande le microphone uniquement après une action explicite, affiche son état et maintient le champ texte en cas de refus. Aucun octet audio n'est écrit. La politique `session` est nettoyée à la fermeture du service ; `dossier` reste persistante et `none` refuse la conservation d'un tour vocal tout en autorisant la saisie manuelle. Cette mise en œuvre simule la transcription : DEC-02 et DEC-04 restent nécessaires avant tout essai vocal réel.

T008 ajoute le profil BPMN local dans `src/contracts/bpmn.ts` et `src/domain/bpmn/profile.ts`. Le document prend en charge les types V1 décrits par FR-022, conserve les sous-processus et borne les sequenceFlow, messageFlow et frontières de sous-processus. Une serviceTask reste une intention avec exécution désactivée. Les commandes sont atomiques, idempotentes et protégées par révision et droits persistants. Le studio expose participants, couloirs, fil de navigation, zoom, sélection et anomalies de brouillon. L'ajout visuel complet, la carte macro, la synchronisation générale des deux représentations et l'aller-retour XML restent ouverts ; DEC-05 continue de bloquer le contrat d'import/export définitif.

T009 ajoute une investigation privée qui conserve plusieurs assertions portant sur la même propriété métier. Chaque assertion référence une transcription, sa version, son passage, son titre et sa date. Des formulations distinctes ouvrent une divergence avec résolution nulle ; leur fréquence ne choisit aucune version. Une question de clarification vise un rôle et conserve la personne à null. Le panneau consultant expose cette comparaison. La détection sémantique, la qualification humaine, le plan d'entretiens et les relances en direct restent ouverts. T010 réalise le premier lien d'une divergence vers un diagnostic privé.

T010 ajoute un diagnostic privé rattaché à la révision courante du modèle et à une divergence T009. Son périmètre nomme les tâches étudiées et sa limite de couverture. Une opportunité conserve séparément valeur attendue, faisabilité, prérequis, priorité proposée, responsable humain et protocole d'essai. Une dimension absente reste nulle et Inconnue ; aucun score n'est calculé tant que DEC-07 reste ouvert. La feuille de route place les prérequis avant l'essai et n'exécute aucun agent. Un scénario cible séparé référence la révision et le libellé de départ d'une tâche. Sa validation humaine ne modifie pas le modèle actuel ; toute révision ultérieure déclenche un état de réconciliation. Le studio expose le diagnostic et cette comparaison. Les autres types de changements cibles, l'édition de priorité avec historique, les capacités mutualisées, l'accompagnement vers l'autonomie et les mesures après essai restent ouverts.
