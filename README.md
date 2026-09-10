# ProcessIA

ProcessIA est un studio conversationnel de cartographie des processus métiers et de diagnostic des usages de l'IA.

Un responsable échange principalement par la voix avec l'IA et voit son organisation se modéliser dans un canevas interactif. Il peut alterner avec l'écrit, naviguer de la chaîne de valeur aux tâches et modifier directement la représentation. Les processus détaillés utilisent BPMN ; les fiches associées précisent responsabilités, outils, données et documents.

Le consultant prépare les dossiers via MCP à partir de documents, transcriptions et échanges existants. Un espace privé lui permet de choisir les éléments partagés avec l'entreprise. Le mode consultant doit aussi assister les entretiens et aider à identifier les rôles à interroger.

## Résultats visés

- Une cartographie métier compréhensible et progressivement confirmée.
- Un diagnostic et une feuille de route des usages IA prioritaires.
- Des recommandations opérationnelles : skills, outils, données, contrôles humains et critères de réussite.
- Des ressources et prestations pour accompagner l'autonomie des équipes.

Une extension vers un harnais déployable sur VPS avec Docker et éventuellement Coolify est envisagée. Son architecture et son moteur d'exécution restent à choisir.

## Statut

Tranches T001 à T005 implémentées localement : dossiers isolés, carte synthétique persistée, commandes contrôlées, dialogue simulé, édition, historique, fiches de tâches, ingestion textuelle privée via MCP et publication maîtrisée d'une reformulation. Le MVP complet reste à développer.

Premier cas pilote : Kosmio. Second terrain prévu : SOCAMEX, dans le cadre de PerfIA.

## Documentation

- [Contexte et règles de continuité](CONTEXT.md)
- [Cadrage produit v0.1](docs/plans/2026-09-09-processia-cadrage-v0.1.md)

## Identité du projet

ProcessIA est distinct de Bretelles. Les échanges initiaux et les documents de Bretelles constituent un contexte de réflexion ; ses décisions techniques ne s'appliquent pas automatiquement à ProcessIA.

Dépôt : https://github.com/mathieu-kosmio/ProcessIA


## Spécifications détaillées

- [Document HTML de revue v0.2](docs/specifications/processia-specifications-v0.2.html)
- [Dossier de spécification selon Spec Kit](specs/001-processia-studio/README.md)
- [Constitution proposée](.specify/memory/constitution.md)
- [Suivi des tranches TDD](IMPLEMENTATION_PLAN.md)

40 exigences fonctionnelles, 120 scénarios d’acceptation, 12 exigences de qualité et 12 tranches de développement proposées. La première tranche est documentée dans le suivi. Les exigences globales et les choix ouverts restent dans le registre de clarifications ; la livraison locale ne ratifie pas les règles encore proposées.

## Lancer le studio local

Node.js 22.14 ou supérieur dans la branche 22, ou Node.js 24+. Les versions npm sont verrouillées dans `package-lock.json`.

```sh
npm ci
npm run dev
```

Ouvrir **http://127.0.0.1:3100**. Le service écoute uniquement sur cette adresse. Les modifications sont conservées dans `.local/processia.sqlite` ; ce dossier est exclu de Git. Les changements de code serveur nécessitent de relancer la commande ; le client est rechargé par Vite.

Pour la version compilée :

```sh
npm run build
npm start
```

Paramètres facultatifs : `PORT`, `PROCESSIA_DB_PATH` (chemin de base ou `:memory:` pour un essai jetable).

## Connecter le serveur MCP local

Le client MCP doit lancer la commande suivante depuis le dépôt :

```sh
npm run mcp
```

Le transport utilise stdin et stdout. Les journaux éventuels vont uniquement sur stderr. Le serveur expose `processia_identity`, `processia_add_source`, `processia_list_sources` et `processia_get_source_status`. Chaque import indique `dossier_id`, une clé d'idempotence, le titre, le type `text` ou `transcript`, le contexte d'origine, la date de source connue ou `null`, et le contenu.

Le profil local accepte 64 Kio par texte. La source est privée, les droits persistants sont relus avant chaque opération et une URL contenue dans le contexte reste une provenance sans téléchargement automatique. Le même `PROCESSIA_DB_PATH` permet au studio et au serveur MCP de travailler sur les mêmes dossiers.

## Essayer les tranches locales

1. Ouvrir le dossier Kosmio synthétique et explorer les six tâches proposées.
2. Créer un autre dossier dans la barre latérale ; l'activité peut rester à préciser.
3. Écrire « Ajoute une validation avant la restitution » et demander une proposition.
4. Relire la cible et appliquer la proposition ; recharger la page pour retrouver la tâche.
5. Sélectionner une tâche, corriger son libellé et renseigner son rôle, son outil, son entrée et sa sortie.
6. Recharger la page pour vérifier la persistance de la fiche, ou déplacer le bloc sur la carte.
7. Annuler la dernière modification avec le bouton fléché ; ouvrir le journal pour retrouver les révisions.
8. Ouvrir « Sources & partage », choisir le passage synthétique privé et rédiger une formulation partageable.
9. Prévisualiser la vue responsable, confirmer le partage, puis vérifier son retrait dans la liste.

Le dialogue est un adaptateur déterministe : seules la phrase ci-dessus et « Ajoute une validation avant cette tâche » avec une sélection sont reconnues. Toute autre demande reçoit une clarification. Aucun appel LLM ni traitement vocal n'est activé.

## Vérifier

```sh
npm test
npm run typecheck
npx playwright install chromium
npm run test:e2e
```

Les tests navigateur compilent et démarrent une instance distincte sur le port 3101 avec une base en mémoire. Ils ne touchent pas à la démonstration locale. `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e` permet d'utiliser Chrome installé.

## Portée de cette livraison

Le mode local fournit une identité de consultant synthétique côté serveur. Il ne constitue pas une authentification de production. Identité réelle, partage client, formats documentaires, fournisseurs IA/voix, diagnostic et BPMN complet restent à développer. React Flow affiche un graphe de tâches ; aucun export BPMN conforme n'est revendiqué.

- [Décision d'architecture locale](docs/adr/0001-tranche-locale-modele.md)
- [Preuves et limites T001](docs/validation/T001.md)
- [Preuves et limites T002](docs/validation/T002.md)
- [Preuves et limites T003](docs/validation/T003.md)
- [Preuves et limites T004](docs/validation/T004.md)
- [Preuves et limites T005](docs/validation/T005.md)
