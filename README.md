# Application Service Économique — Gestion des Ordres de Mission

Application Next.js 16 pour la gestion des ordres de mission et indemnités du Service Économique (université).

## Fonctionnalités

- Gestion du personnel (import Excel, 198 employés)
- Création et cycle de vie des ordres de mission (BROUILLON → VALIDE → PAYE / ANNULE)
- Calcul automatique des indemnités (mission + kilométrique) avec snapshots immuables
- Gestion des référentiels (barèmes, trajets, jours fériés, cadre/échelle)
- Génération de documents (Ordre de Mission DOCX, État des Sommes Dues DOCX, État Kilométrique XLSX)
- Authentification avec rôles (ADMIN, GESTIONNAIRE, CONSULTATION)
- Audit trail complet (utilisateur, ancienne/nouvelle valeur)
- Tableau de bord avec agrégations

## Stack technique

- **Next.js 16** (App Router, Turbopack)
- **Prisma ORM** (SQLite en dev, PostgreSQL en production)
- **TypeScript** strict
- **Vitest** pour les tests
- **ExcelJS** pour la génération XLSX
- **PizZip** pour la génération DOCX
- **bcryptjs** pour le hachage des mots de passe

## Démarrage rapide (développement)

```bash
# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
# Éditer .env : DATABASE_URL et AUTH_SECRET

# Pousser le schéma en base
npx prisma db push

# Seeder les référentiels
npx prisma db seed

# Seeder les utilisateurs (admin/gestionnaire/consultation)
npx tsx scripts/seed_users.ts

# Lancer le serveur de développement
npm run dev
```

## Comptes par défaut (développement)

| Login | Mot de passe | Rôle |
|-------|-------------|------|
| admin | admin123 | ADMIN |
| gestionnaire | gest123 | GESTIONNAIRE |
| consultation | cons123 | CONSULTATION |

**⚠ Changer ces mots de passe en production.**

## Tests

```bash
# Tous les tests
npm test

# TypeScript
npx tsc --noEmit

# Build production
npm run build
```

## Scripts utilitaires

```bash
# Préparer les jours fériés récurrents pour une nouvelle année
npx tsx scripts/prepare_feries.ts 2027

# Seeder les utilisateurs
npx tsx scripts/seed_users.ts

# Vérifier les référentiels
npx tsx scripts/check_referentiels.ts
```

## Structure du projet

```
webapp/
├── prisma/
│   ├── schema.prisma          # Schéma SQLite (développement)
│   ├── schema-postgres.prisma  # Schéma PostgreSQL (production)
│   └── seed.ts                # Seed des référentiels
├── src/
│   ├── lib/                   # Moteur métier (pur, sans React)
│   ├── app/api/               # Routes API REST
│   ├── app/                   # Pages frontend
│   └── middleware.ts          # Authentification
├── templates/                 # Modèles DOCX/XLSX
├── scripts/                   # Scripts utilitaires
└── docs/                      # Documentation
```

## Rôles et permissions

| Action | ADMIN | GESTIONNAIRE | CONSULTATION |
|--------|-------|---------------|--------------|
| Consulter dashboard, OM, personnel | ✅ | ✅ | ✅ |
| Créer/modifier OM | ✅ | ✅ | ❌ |
| Valider/annuler/payer OM | ✅ | ✅ | ❌ |
| Modifier référentiels | ✅ | ❌ | ❌ |
| Importer personnel | ✅ | ❌ | ❌ |
| Générer documents | ✅ | ✅ | ✅ |

Voir `DEPLOYMENT.md` pour le déploiement en production.
