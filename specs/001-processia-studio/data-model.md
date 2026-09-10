# Modèle de données conceptuel

## 16 · Modèle de données et invariants

Ces entités sont conceptuelles. Elles ne prescrivent ni un nombre de tables ni un service par objet. Les identifiants sont stables ; chaque objet métier appartient à un dossier. Les références croisées entre dossiers sont refusées. Les états de connaissance au niveau d’un champ et le statut de revue d’une carte sont distincts.

### ENT-01 · Dossier organisation

Frontière métier et de confidentialité du diagnostic.

**Attributs :** id, nom, activité, objectifs, état, dateClôture, politiqueConservation.

**Relations :** Accès, sources, graphes, entretiens et livrables appartiennent à un seul dossier.

**Invariants :**
- Un identifiant de dossier est obligatoire pour toute opération.
- Aucun lien métier implicite entre dossiers.

### ENT-02 · Accès au dossier

Autoriser un utilisateur à agir dans un périmètre.

**Attributs :** id, utilisateurId, dossierId, rôleApplicatif, périmètrePrivéOuPartagé, état, révoquéLe.

**Relations :** Invitation acceptée ; acteur métier lié facultativement.

**Invariants :**
- Rôle applicatif distinct du rôle métier.
- Les droits sont contrôlés à la lecture, à l’écriture et à l’application différée ; ils ne sont pas portés par le prompt.

### ENT-03 · Invitation

Ouvrir un entretien dans un périmètre et pour une durée explicites.

**Attributs :** id, dossierId, émetteur, destinataire, périmètre, expiration, état.

**Relations :** Donne accès au dossier après acceptation.

**Invariants :**
- Jeton secret jamais présent dans les logs.
- Expiration, usage et révocation contrôlés côté serveur ; inviter un collègue reste une décision de périmètre ouverte.

### ENT-04 · Acteur métier

Décrire personnes, rôles, services et parties prenantes sans exiger un compte utilisateur.

**Attributs :** id, type:personne|rôle|service|organisationExterne, libellé, description, statutConnaissance.

**Relations :** Une personne peut tenir plusieurs rôles ; un rôle peut être tenu par plusieurs personnes ; responsabilités reliées aux éléments.

**Invariants :**
- Une responsabilité peut rester portée par un rôle sans personne identifiée.
- Nom réel facultatif ; un compte utilisateur ne devient pas automatiquement responsable métier.

### ENT-05 · Valeur et offre

Relier activités à un produit/service et à une valeur pour des bénéficiaires.

**Attributs :** id, offre, résultatAttendu, bénéficiaires, indicateurProposé, étatPreuve.

**Relations :** Reliée aux acteurs bénéficiaires, chaîne de valeur et processus.

**Invariants :**
- Un gain chiffré reste hypothèse tant que sa mesure et son contexte ne sont pas enregistrés.

### ENT-06 · Outil métier

Décrire une application ou un moyen utilisé dans le travail.

**Attributs :** id, nom, catégorie, usage, accèsRequis, contraintes.

**Relations :** Utilisé par des tâches et des acteurs ; manipule des ressources.

**Invariants :**
- Décrire un outil ne crée ni connexion, ni droit d’accès, ni capacité d’exécution.
- Aucun secret d’accès stocké dans la fiche métier.

### ENT-07 · Ressource métier

Décrire données, documents, modèles vierges et livrables.

**Attributs :** id, type:donnée|document|modèle|livrable, nom, format, sensibilité, propriétaireMétier, localisationDéclarée.

**Relations :** Entrée ou sortie de tâche ; source documentaire associée facultative.

**Invariants :**
- Un modèle vierge est distinct de son instance remplie.
- Une localisation déclarée ne donne pas le droit de récupérer le fichier.

### ENT-08 · Source versionnée

Conserver matériau transmis et provenance de son import.

**Attributs :** id, dossierId, version, type, titre, empreinte, origine, importateur, visibilité, étatTraitement, dateSuppression.

**Relations :** Connaissances extraites ; segments d’entretien ; publications autorisées éventuelles.

**Invariants :**
- Privée par défaut lors d’un import consultant.
- Une nouvelle version ne remplace pas la provenance historique.
- Le contenu est une donnée non fiable : ses instructions ne peuvent modifier droits, système ou outils.

**Mise en œuvre locale T004 :** les tables `sources`, `source_versions`, `source_jobs`, `source_passages` et `source_imports` matérialisent ce socle dans SQLite. Chaque clé inclut le dossier. Une version conserve contenu, empreinte, importateur et date d'import. Le traitement courant référence la version et les passages conservent ordre et positions de caractères. Seule la version initiale est créée dans cette tranche ; l'actualisation explicite reste à développer.

### ENT-09 · Connaissance

Séparer ce qui est déclaré, proposé, confirmé ou contesté.

**Attributs :** id, énoncé, type:faitDéclaré|hypothèse|interprétation, statut:proposé|confirmé|contesté|retiré, sourcesEtPositions, auteur, validateur, date, visibilité.

**Relations :** Justifie éléments, relations, recommandations et investigations.

**Invariants :**
- Confirmation explicitement attribuée à un acteur autorisé.
- La répétition ne confirme pas une hypothèse ; une contradiction conserve les deux versions.
- Une connaissance publiée issue d’une source privée ne rend pas ses références lisibles.

### ENT-10 · Décision de partage

Publier une représentation explicitement revue pour l’entreprise.

**Attributs :** id, objetId, versionObjet, contenuApprouvé, auteur, date, audience, sourcesAutorisées.

**Relations :** Lie connaissances/éléments de préparation à leur version partagée.

**Invariants :**
- Le contenu approuvé est une version précise, pas un partage automatique de toutes les mises à jour.
- Référence source privée, titre et extrait restent masqués ; le client voit seulement une provenance générique autorisée.

**Mise en œuvre locale T005 :** `sharing_previews` conserve la sélection privée et la formulation à relire. `sharing_publications` porte le contenu approuvé et son état versionné. `sharing_events` trace publication et retrait ; `sharing_idempotency` empêche un double partage au rejeu. La projection responsable est construite sans titre, identifiant, URL ni extrait de source. Le consultant disposant encore de l'accès privé peut retrouver ces détails.

### ENT-11 · Graphe de processus

Modèle métier faisant autorité pour une version actuelle ou cible.

**Attributs :** id, dossierId, type:actuel|cible, révisionCourante, visibilité, périmètre.

**Relations :** Contient éléments, relations et révisions ; comparaisons actuel/cible explicites.

**Invariants :**
- Le canevas, la conversation et les exports sont des vues du même graphe.
- Le fonctionnement cible ne remplace jamais silencieusement l’actuel.

### ENT-12 · Élément du graphe

Représenter chaîne de valeur, processus, tâche ou élément BPMN du sous-ensemble retenu.

**Attributs :** idStable, type, libellé, parentId, finalité, responsabilités, outils, ressources, étatConnaissance.

**Relations :** Appartient à un graphe ; tâches liées aux acteurs, outils, ressources et connaissances.

**Invariants :**
- Identifiant stable entre révisions ; suppression invalide proprement les références.
- Hiérarchie sans cycle ; règles BPMN dépendantes du type.
- Le détail d’un processus est relié à son parent et conserve le sens des entrées/sorties.

### ENT-13 · Relation du graphe

Exprimer séquence, message, collaboration ou association métier avec une sémantique explicite.

**Attributs :** id, type, sourceId, cibleId, condition, donnéesÉchangées, connaissances.

**Relations :** Relie éléments et/ou ressources suivant son type.

**Invariants :**
- Aucun lien pendant vers un élément absent.
- Flux de séquence et flux de message sont distincts ; une simple proximité graphique ne crée pas une relation.

### ENT-14 · Révision du graphe

Figer l’état métier appliqué et permettre comparaison ou retour maîtrisé.

**Attributs :** id, numéro, grapheId, parentRévision, commandeId, auteur, date, diffMétier.

**Relations :** Produite par une proposition appliquée ; utilisée par livrables et contexte conversationnel.

**Invariants :**
- Révision appliquée immuable ; numéro croissant.
- Annuler crée une nouvelle révision compensatrice et ne réécrit pas l’historique.
- Une ancienne révision consultable respecte toujours les droits et suppressions actuels.

### ENT-15 · Proposition de modification

Unifier commande manuelle, conversationnelle et documentaire.

**Attributs :** id, origine, baseRévision, opérations, justification, source, état:proposée|àClarifier|appliquée|rejetée|conflit|annulée, idempotencyKey.

**Relations :** Cible un graphe et produit au plus une révision acceptée.

**Invariants :**
- Validation métier/BPMN avant application atomique.
- Révision de base obsolète produit un conflit explicite ; zéro écrasement silencieux.
- Les résultats tardifs d’une commande annulée restent sans effet.

### ENT-16 · Disposition visuelle

Conserver positions et vue de travail sans leur donner une signification métier implicite.

**Attributs :** grapheId, versionDisposition, positions, dimensions, zoom, élémentSélectionné.

**Relations :** Référence les identifiants stables des éléments.

**Invariants :**
- Déplacer sur le canevas ne change ni responsable ni ordre métier.
- Glisser vers un couloir propose une mutation de responsabilité explicite.
- Une édition locale préserve les éléments non concernés.

### ENT-17 · Entretien

Porter une conversation autonome ou accompagnée et son contexte visuel.

**Attributs :** id, mode, participants, objectif, état, grapheId, révisionContexte, sélection, modalitéActive.

**Relations :** Consentements, segments, propositions et investigations.

**Invariants :**
- La voix et l’écrit partagent le même contexte autorisé.
- Une référence ambiguë comme ici demande clarification si sélection ou révision a changé.

### ENT-18 · Accord de participation et traitement vocal

Mémoriser l’information et le choix sur transcription et écoute.

**Attributs :** id, entretienId, participant, versionInformation, transcriptionAutorisée, dateAccord, dateRetrait.

**Relations :** Conditionne traitement vocal de l’entretien.

**Invariants :**
- Micro et état d’écoute visibles ; retrait stoppe capture et nouveaux traitements concernés.
- Conservation audio éventuelle demanderait un choix séparé ; aucune conservation audio brute proposée par défaut.

### ENT-19 · Segment de conversation

Associer texte, auteur, temporalité et statut de stabilisation.

**Attributs :** id, entretienId, auteur, modalité, texte, début, fin, état:partiel|stabilisé|corrigé, version.

**Relations :** Source de connaissances et propositions.

**Invariants :**
- Un segment partiel ne devient pas un fait confirmé.
- Une correction du transcript est traçable ; ses conséquences sur la carte sont proposées.
- Le transcript ne constitue pas un enregistrement audio.

### ENT-20 · Investigation

Représenter question ouverte, divergence ou entretien recommandé.

**Attributs :** id, type, sujet, rôlesCibles, motif, apportAttendu, prioritéProposée, état, résolution.

**Relations :** Lie connaissances contradictoires, tâches, acteurs et entretiens.

**Invariants :**
- Expliquer pourquoi une personne ou un rôle est recommandé.
- Clôture par réponse sourcée, variante documentée ou décision explicite ; aucune résolution automatique par majorité.

### ENT-21 · Recommandation

Relier un problème à une amélioration testable.

**Attributs :** id, type:organisation|automatisation|IA, problème, périmètre, bénéficiaire, capacitéOuSkill, outils, données, contrôleHumain, hypothèsesGain, essai, critèresRéussite, prérequis, état.

**Relations :** Référence révision, tâches, connaissances et actions de feuille de route.

**Invariants :**
- Gain estimé distinct de gain mesuré.
- Au moins un responsable humain et un essai pour un usage IA proposé.
- Une fiche de harnais ne déploie aucun agent.

### ENT-22 · Feuille de route

Ordonner les actions et moyens d’autonomie issus du diagnostic.

**Attributs :** id, révisionAnalysée, actions, responsables, dépendances, priorités, estimations, ressourcesAccompagnement, étatValidation.

**Relations :** Actions liées à recommandations et livrables.

**Invariants :**
- Dépendances sans cycle ; responsable ou rôle à désigner explicite.
- Une modification du processus signale la feuille de route potentiellement obsolète.

### ENT-23 · Livrable et export

Figer diagnostic, feuille de route ou paquet de modèle pour un destinataire.

**Attributs :** id, type, révision, audience, date, auteur, format, schémaVersion, état, référencesSourcesFiltrées.

**Relations :** Produit depuis graphes, connaissances et recommandations autorisés.

**Invariants :**
- Contrôle des droits à la génération et au téléchargement.
- Aucun contenu privé non approuvé dans le livrable partagé.
- Suppression d’une copie hébergée ne rappelle pas les copies déjà téléchargées.

### ENT-24 · Événement de traçabilité

Rendre inspectables actions, validations et changements d’accès.

**Attributs :** id, dossierId, acteur, typeAction, objetId, révision, date, résultat, visibilité.

**Relations :** Suit partages, modifications, imports, révocations et suppressions.

**Invariants :**
- Événement ne contient pas les secrets ou corps documentaires par défaut.
- Journal lisible uniquement dans un périmètre autorisé ; contenu sensible expurgé selon politique de conservation.
