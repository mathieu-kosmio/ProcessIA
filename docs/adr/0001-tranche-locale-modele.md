# ADR-0001 · Première tranche locale

Date : 9 septembre 2026. Statut : choix d'implémentation local, réversible.

La demande de lancement autorise le démarrage du développement. Elle ne ratifie pas implicitement les seuils, fournisseurs et règles de gouvernance proposés dans la constitution.

## Périmètre

T001 : dossier synthétique, demande écrite simulée, proposition structurée, application atomique, carte persistée, édition directe, conflit explicite et annulation de la dernière commande. Couvrir le contrat public avant de développer le comportement suivant. Les droits sont fournis par une session de démonstration côté serveur, limitée au dossier synthétique.

## Choix

- TypeScript, React et Vite, service HTTP Node unique.
- React Flow pour le canevas de tâches. Cette vue ne constitue pas un éditeur BPMN conforme ; le profil BPMN reste T008.
- SQLite via le module natif Node, transactions et révisions immuables. Module expérimental avec Node 22.14 ; ce choix ne fixe pas la base du pilote externe.
- Validation exécutable des commandes avec Zod. L'identité ne provient jamais d'une commande.
- Tests d'intégration avec le runner Node et tests navigateur Playwright.
- Fournisseur de langage déterministe à la frontière de l'application, explicitement signalé comme simulation.

Un serveur Node avec React permet de conserver une API publique indépendante du canevas. Un framework full-stack ajouterait ici des conventions sans besoin démontré ; une maquette stockée uniquement dans le navigateur ne permettrait pas d'éprouver les transactions serveur.

## Restrictions et prochaines décisions

Écoute désactivée, pas de source réelle, pas de partage client, pas d'authentification de production. Service lié à 127.0.0.1, contrôle d'origine sur les mutations. DEC-01 à DEC-10 demeurent ouverts. T002 devra remplacer la session locale par une identité décidée et éprouver les droits multi-acteurs.

## Vérifications prévues

Ajout puis réouverture de la base ; rejet atomique ; conflit concurrent ; idempotence ; refus d'accès ; disposition sans effet métier ; annulation compensatrice ; réponse fournisseur invalide ; parcours navigateur jusqu'au rechargement.
