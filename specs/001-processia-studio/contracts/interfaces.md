# Contrats ProcessIA proposés v1

## 15 · Contrats de modification et de connexion MCP

### Enveloppe de commande du modèle, proposition v1

Chaque commande contient `schema_version`, `command_id`, `dossier_id`, `model_id`, `base_revision`, `origin`, `operations` et, si nécessaire, `turn_id` et `selection_snapshot`. L’identité et les droits viennent de la session authentifiée, jamais d’un champ déclaré par l’IA. Les références de preuve sont facultatives pour une hypothèse et obligatoires pour une affirmation issue d’une source.

```json
{
  "schema_version": "1",
  "command_id": "cmd-example-001",
  "dossier_id": "demo-kosmio",
  "model_id": "process-diagnostic",
  "base_revision": 12,
  "origin": "conversation",
  "turn_id": "turn-example-07",
  "selection_snapshot": {"element_id": "task-restitution", "revision": 12},
  "operations": [
    {"type": "SET_TASK_TOOL", "task_id": "task-restitution", "tool_id": "tool-documents"}
  ]
}
```

La réponse contient `status`, `revision`, `applied_command_id`, `changes`, `warnings` et `correlation_id`. Les statuts sont `applied`, `duplicate`, `needs_clarification`, `rejected` ou `conflict`. Aucune opération d’un lot ne s’applique si une autre est invalide. Deux commandes concurrentes fondées sur la même révision produisent une application et un conflit explicite, sauf rebase sûr documenté ultérieurement.

L’annulation est une nouvelle commande liée à la précédente. Elle conserve l’historique et vérifie qu’elle n’écrase pas un changement plus récent. Une confirmation d’action porte sur une proposition et une révision précises. Une réponse IA reçue après annulation ou changement de cible est invalidée.

### Familles de commandes

| Commandes | Sens |
|---|---|
| `ADD_PROCESS`, `ADD_TASK`, `UPDATE_LABEL` | Créer ou décrire un élément avec identifiant stable |
| `CONNECT_ELEMENTS`, `REMOVE_CONNECTION` | Ajouter ou retirer un lien typé valide |
| `SET_TASK_ROLE`, `SET_TASK_TOOL`, `LINK_INFORMATION` | Affecter rôles, outils, données ou documents |
| `MOVE_ELEMENT`, `EXPAND_SUBPROCESS` | Modifier une disposition ou ouvrir un niveau |
| `PROPOSE_ASSERTION`, `CONFIRM_ASSERTION`, `DISPUTE_ASSERTION` | Gérer la connaissance sans mélanger structure et vérité métier |
| `SHARE_PROJECTION`, `CREATE_SNAPSHOT` | Publier une projection autorisée ou figer une version |

### Surface MCP proposée

Les noms ci-dessous décrivent la surface cible. T004 exécute un sous-ensemble local sur le SDK TypeScript MCP 2.0.0 et la [spécification MCP 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28). Pour une connexion distante HTTP, le mécanisme d’autorisation sera défini selon la spécification MCP d’autorisation, avec vérification de l’audience et du périmètre. Le premier client cible reste à confirmer.

| Outil | Entrée principale | Sortie | Droit requis |
|---|---|---|---|
| `processia_identity` | Aucune cible implicite | Identité, droits et dossiers accessibles paginés | Session authentifiée |
| `processia_get_dossier` | `dossier_id` | Contexte et résumé autorisés | Lecture dossier |
| `processia_add_source` | `dossier_id`, clé d’idempotence, titre, type, contenu texte ou référence d’upload interne | `source_id`, version, état de traitement, `job_id` | Écriture sources privées |
| `processia_update_source` | `dossier_id`, `source_id`, version de base, contenu, clé d’idempotence | Nouvelle version, état, `job_id` | Écriture de la source |
| `processia_retry_source` | `dossier_id`, `source_id`, clé d’idempotence | Identifiant du traitement repris | Écriture de la source |
| `processia_get_source_status` | `dossier_id`, `source_id` | État, limites et erreurs accessibles | Lecture source |
| `processia_list_sources` | `dossier_id`, curseur, limite | Sources autorisées, prochain curseur | Lecture sources |
| `processia_get_model` | `dossier_id`, modèle, révision optionnelle | Projection du modèle autorisée | Lecture modèle |
| `processia_list_questions` | `dossier_id`, processus optionnel, curseur | Questions et rôles à interroger | Lecture dossier |
| `processia_propose_changes` | Enveloppe, `dry_run` | Validation, diff et identifiant de proposition | Proposition de modification |

`dry_run=true` ne modifie aucun objet métier. `dry_run=false` enregistre une proposition privée ; il ne publie pas le dossier. Le premier MVP ne comporte pas d’outil MCP permettant de publier silencieusement une synthèse vers le client. Une source identique est reconnue dans le même dossier et le même périmètre de visibilité ; la déduplication ne révèle pas l’existence de documents d’un autre client.

Les listes sont paginées, avec limite proposée de 50 et maximum de 100. Les appels d’écriture utilisent une clé d’idempotence. La réutilisation de la clé avec un autre contenu échoue. Le statut asynchrone est consultable après reconnexion. Aucun outil n’accepte un chemin serveur arbitraire ni un téléchargement depuis une URL arbitraire dans le premier profil.

### Erreurs normalisées et comportement utilisateur

| Code | Conséquence |
|---|---|
| `ACCESS_DENIED` / `NOT_FOUND` | Message neutre ; aucune donnée privée ni existence d’un autre dossier révélée |
| `REVISION_CONFLICT` | Afficher la version actuelle et proposer de reformuler ou réappliquer après revue |
| `INVALID_OPERATION` | Aucun effet ; indiquer le lien ou champ à corriger |
| `IDEMPOTENCY_CONFLICT` | Aucun doublon ; demander une nouvelle commande si le contenu a changé |
| `SOURCE_UNSUPPORTED` / `SOURCE_PARTIAL` | Donner le format attendu ou les pages non traitées |
| `PROVIDER_UNAVAILABLE` | Garder le canevas utilisable, conserver le brouillon et proposer une reprise |
| `BUDGET_LIMIT` | Suspendre les nouveaux appels IA ; préserver lecture, édition et export autorisés |

Les erreurs MCP de transport suivent le protocole ; les erreurs métier sont des résultats structurés sans détail interne ni secret. Les contrats complets et leur version devront être convertis en schémas exécutables pendant la première tranche technique.

## Sous-ensemble local exécuté par T001

Le contrat proposé ci-dessus demeure la cible MVP. L'enveloppe et les opérations effectivement acceptées sont validées par Zod dans `src/contracts/model.ts`.

| Opération | Champs spécifiques | Effet local |
| --- | --- | --- |
| `ADD_TASK` | `task_id`, `label`, `before_id` facultatif | Ajoute une tâche proposée. Avec une cible, redirige ses liens entrants vers la nouvelle tâche puis crée le lien vers la cible, dans la même transaction. |
| `UPDATE_LABEL` | `element_id`, `label` | Conserve identité, liens, rôle et position. |
| `MOVE_ELEMENT` | `element_id`, `position: {x,y}` | Modifie uniquement la disposition. |
| `UNDO` | `target_command_id` | Annule uniquement la dernière commande, sur la révision courante, dans une nouvelle révision. |

T003 ajoute les opérations locales suivantes au même contrat versionné :

| Opération | Champs spécifiques | Effet local |
| --- | --- | --- |
| UPSERT_ROLE, UPSERT_TOOL | Identifiant stable et libellé | Crée ou renomme une référence métier du dossier. |
| UPSERT_INFORMATION | Identifiant stable, libellé et catégorie | Crée une donnée, un document, un modèle ou un livrable réutilisable. La catégorie d'un identifiant existant ne change pas silencieusement. |
| SET_TASK_ROLE, SET_TASK_TOOL | Tâche, identifiants et état de connaissance | Remplace les rattachements concernés dans la même révision. |
| LINK_INFORMATION | Tâche, sens input ou output, identifiants et état | Relie une ou plusieurs informations existantes à la tâche. |

Un rattachement vide porte l'état unset. Une valeur saisie dans le studio porte l'état to_confirm. Les états confirmés existent dans le modèle cible mais aucune opération locale ne les attribue dans T003, car l'habilitation de confirmation reste à décider.

`statement` conserve la demande synthétique et `turn_id` son identifiant. Ces champs ne constituent pas un entretien complet. Identifiants bornés à 120 caractères alphanumériques, tirets et underscores ; libellés de 1 à 160 caractères, lots de 1 à 50 opérations, corps HTTP de 32 Kio maximum. Ce sont des limites de mise en œuvre locale, pas des quotas validés pour le pilote.

Routes locales :

- `GET /api/health` : mode de démonstration et état du service.
- `GET /api/dossiers` : dossiers accessibles à l'identité résolue par le serveur.
- `POST /api/dossiers` : création d'un dossier privé par le consultant local.
- `GET /api/dossiers/:dossier` : dossier et liste de ses espaces autorisés.
- `GET /api/dossiers/:dossier/models/:model` : modèle courant autorisé.
- `GET /api/dossiers/:dossier/models/:model/history` : journal des révisions du dossier local.
- `POST /api/proposals` : demande écrite via l'adaptateur simulé ; aucun changement persistant.
- `POST /api/commands` : application atomique, contrôle de révision et idempotence.
- `GET /api/dossiers/:dossier/sources` et `GET /api/dossiers/:dossier/sources/:source/status` : sources et passages privés autorisés.
- `POST /api/dossiers/:dossier/sharing/previews` : prévisualisation privée d'une reformulation sélectionnée.
- `POST /api/dossiers/:dossier/sharing/publications` : confirmation idempotente du partage.
- `GET /api/dossiers/:dossier/shared-knowledge` : projection filtrée selon les droits relus au moment de la réponse.
- `POST /api/dossiers/:dossier/shared-knowledge/:publication/revoke` : retrait versionné d'une publication.

L'historique et la liste des dossiers ne sont pas encore paginés. HTTP local exige un Host `127.0.0.1:port` et une origine identique pour les POST. Codes HTTP : 403 accès, 409 concurrence, 422 commande invalide, 400 JSON invalide, 413 corps trop grand, 415 contenu autre que JSON. Les réponses de proposition utilisent leur statut métier.

T002 ajoute `dossiers` et `dossier_access` dans SQLite. Un accès associe l'utilisateur résolu côté serveur, le dossier, le rôle applicatif, l'espace `private` ou `shared`, le droit d'écriture et l'état actif ou révoqué. Le contrôle du modèle croise toujours cet accès persistant avec sa visibilité ; une capacité de session ne réactive donc pas un accès révoqué. La méthode d'identité et les invitations externes restent DEC-03.

T003 ajoute au modèle JSON versionné les registres roles, tools et information, ainsi que les références role, tools, inputs et outputs de chaque tâche. Les commandes valident l'existence et le type des références avant toute écriture ; un lot invalide reste sans effet.

## Sous-ensemble MCP local exécuté par T004

Le point d'entrée `npm run mcp` sert MCP sur stdin/stdout. Il expose quatre outils :

| Outil exécuté | Comportement local vérifié |
| --- | --- |
| `processia_identity` | Retourne l'identité synthétique, les dossiers, périmètres et capacités effectives, sans secret. |
| `processia_add_source` | Ajoute un texte ou une transcription privée de 64 Kio maximum avec dossier et clé d'idempotence explicites. |
| `processia_list_sources` | Liste uniquement les sources privées d'un dossier autorisé. |
| `processia_get_source_status` | Retourne version, traitement, couverture et passages positionnés de la source autorisée. |

La limite de 64 Kio est une borne de développement, pas un quota pilote validé. L'import enregistre séparément `source_date`, qui peut rester null, et `imported_at`. Une clé rejouée avec le même contenu retourne le résultat original ; un contenu différent retourne `IDEMPOTENCY_CONFLICT`. La segmentation locale par paragraphes termine de façon synchrone avec l'état `completed`. Elle prépare la provenance, sans produire encore de connaissance candidate. Les outils d'actualisation et de reprise de la surface cible ne sont pas exécutés par T004.

## Projection partagée locale exécutée par T005

Le contrat HTTP sépare prévisualisation, confirmation et retrait. La prévisualisation n'est jamais retournée par la lecture partagée. La confirmation porte sur son identifiant exact et échoue si la source courante ne correspond plus à la version prévisualisée. Un rejeu identique retourne la publication existante ; une même clé avec une autre prévisualisation échoue.

La réponse partagée contient l'identifiant et la version de publication, le texte approuvé, la date de publication et une provenance générique indiquant que les détails privés sont indisponibles. Si la session possède aussi le périmètre privé, le même service enrichit la provenance avec le titre et le passage. Le retrait exige la version courante, écrit un événement et exclut la publication des lectures suivantes.
