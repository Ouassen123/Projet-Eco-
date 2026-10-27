# Checklist de Mise en Production

## Base de données

- [ ] PostgreSQL installé et accessible
- [ ] Base `ordres_mission` créée
- [ ] Utilisateur `om_app` créé avec mot de passe fort
- [ ] `DATABASE_URL` configuré dans `.env` (PostgreSQL)
- [ ] Schéma poussé : `npx prisma db push --schema=prisma/schema-postgres.prisma`
- [ ] Référentiels seedés : `npx prisma db seed`
- [ ] Utilisateurs créés : `npx tsx scripts/seed_users.ts` (avec vrais mots de passe)
- [ ] Personnel importé (via interface ou script)
- [ ] Jours fériés de l'année en cours + suivante configurés
- [ ] Sauvegarde automatique (cron) configurée

## Sécurité

- [ ] `AUTH_SECRET` défini (32+ caractères aléatoires)
- [ ] Mots de passe des comptes par défaut CHANGÉS
- [ ] `.env` non commité dans Git (vérifier `.gitignore`)
- [ ] HTTPS configuré (Nginx + Let's Encrypt ou équivalent)
- [ ] Firewall configuré (port 3000 accessible uniquement en local)
- [ ] Middleware d'authentification actif (test: accès API sans session → 401)

## Authentification & Rôles

- [ ] Page de login accessible
- [ ] Connexion ADMIN fonctionne
- [ ] Connexion GESTIONNAIRE fonctionne
- [ ] Connexion CONSULTATION fonctionne
- [ ] CONSULTATION ne peut pas créer/modifier OM (test → 403)
- [ ] GESTIONNAIRE ne peut pas modifier référentiels (test → 403)
- [ ] Déconnexion fonctionne (session supprimée)
- [ ] Session expire après 8h

## Fonctionnalités

- [ ] Tableau de bord affiche les statistiques
- [ ] Liste du personnel affiche les employés
- [ ] Création d'un OM de test (BROUILLON)
- [ ] Validation d'un OM (BROUILLON → VALIDE)
- [ ] Paiement d'un OM (VALIDE → PAYE)
- [ ] Annulation d'un OM (VALIDE → ANNULE)
- [ ] Vérification des conflits de dates
- [ ] Vérification des jours fériés
- [ ] Prévisualisation des indemnités avant création

## Documents

- [ ] Génération Ordre de Mission DOCX
- [ ] Génération État des Sommes Dues DOCX
- [ ] Génération État Kilométrique XLSX
- [ ] Templates présents dans `templates/`
- [ ] Noms de fichiers corrects

## Audit & Traçabilité

- [ ] Historique des actions visible sur chaque OM
- [ ] Utilisateur identifié dans l'historique
- [ ] Ancienne/nouvelle valeur enregistrée pour les modifications
- [ ] Modifications de référentiels tracées

## Qualité

- [ ] `npm test` — 40 tests passent (0 échec)
- [ ] `npx tsc --noEmit` — 0 erreur
- [ ] `npm run build` — build réussi
- [ ] `npm start` — serveur démarre sans erreur
- [ ] Aucune erreur dans les logs au démarrage

## Performance

- [ ] Tableau de bord < 2s
- [ ] Liste personnel < 2s
- [ ] Création OM < 1s
- [ ] Génération document < 3s

## Documentation

- [ ] `README.md` à jour
- [ ] `DEPLOYMENT.md` à jour
- [ ] `docs/BACKUP_STRATEGY.md` à jour
- [ ] `.env.example` à jour
