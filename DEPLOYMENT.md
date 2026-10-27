# Déploiement Gratuit — Vercel + Neon PostgreSQL

Ce guide permet de déployer l’application gratuitement sur **Vercel** avec une base de données **PostgreSQL hébergée sur Neon**.

---

## 1. Préparer la base de données (Neon)

1. Va sur [https://neon.tech](https://neon.tech)
2. Crée un compte (GitHub possible)
3. Clique **Create Project**
4. Choisis :
   - **Project name** : `projet-eco`
   - **Region** : `EU Central (Frankfurt)` ou le plus proche
   - **Postgres version** : `16`
5. Clique **Create Project**
6. Neon affiche une **Connection string** :
   ```
   postgresql://neondb_owner:xxxxx@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
   **Copie cette URL.**

---

## 2. Déployer sur Vercel

1. Va sur [https://vercel.com](https://vercel.com)
2. Clique **Add New Project**
3. **Import Git Repository** : sélectionne `Ouassen123/Projet-Eco-`
4. Vercel détecte automatiquement **Next.js**. Ne change pas le framework.
5. Avant de déployer, ajoute les **variables d’environnement** :

   | Variable | Valeur |
   |----------|--------|
   | `DATABASE_URL` | `postgresql://neondb_owner:xxxxx@...` *(la chaîne Neon)* |
   | `AUTH_SECRET` | `une-chaine-secrete-longue-et-aleatoire-32-caracteres` |
   | `AUTH_SECURE_COOKIE` | `true` |

6. Clique **Deploy**.

---

## 3. Initialiser la base après le déploiement

Après le premier déploiement, la base est vide. Il faut :

### A. Pousser le schéma (depuis ton PC local)

```bash
# Définir la base de prod temporairement
$env:DATABASE_URL="postgresql://neondb_owner:xxxxx@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require"

# Pousser le schéma Prisma
npx prisma db push

# Seeder les données initiales (utilisateurs, barèmes, trajets, jours fériés)
npx prisma db seed
```

### B. Alternative : utiliser `prisma migrate deploy`

Si tu préfères les migrations (recommandé en production) :

```bash
# Depuis ton PC local avec DATABASE_URL pointant vers Neon
npx prisma migrate deploy
npx prisma db seed
```

---

## 4. Variables d’environnement sur Vercel

Dans Vercel → **Settings → Environment Variables**, ajoute :

```env
DATABASE_URL=postgresql://neondb_owner:xxxxx@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
AUTH_SECRET=ta-chaine-secrete-ici
AUTH_SECURE_COOKIE=true
```

**⚠ AUTH_SECRET** : génère une vraie clé, par exemple :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 5. Dépannage

### Erreur `Table 'public.Utilisateur' does not exist`
→ Tu as oublié `npx prisma db push` ou `migrate deploy` sur la base Neon.

### Erreur `PrismaClientInitializationError`
→ Vérifie `DATABASE_URL` dans Vercel et Neon (pas de guillemets, pas d’espace).

### Erreur `Invalid session cookie`
→ `AUTH_SECRET` n’est pas configuré ou trop court.

### Impossible de se connecter
→ Vérifie que `AUTH_SECURE_COOKIE` est `true` et que tu utilises **HTTPS**.

---

## 6. Accès après déploiement

- URL Vercel : `https://projet-eco-xxxxx.vercel.app`
- Comptes par défaut (après seed) :
  - `Loubna` / `Loubna@0102` (admin)
  - `Oumaima` / `Oumaima@0102` (gestionnaire)
  - `Ikhlasse` / `Ikhlasse@0102` (consultation)

---

## 7. Limitations gratuites

- **Neon** : 0.5 GB de stockage, 2 projects gratuits.
- **Vercel** : 100 GB de bande passante/mois, déploiement illimité.
- Pas de crons gratuits sur Vercel : l’archivage automatique des exercices se fait à la première requête après `01/01/2027`, pas par un cron.
