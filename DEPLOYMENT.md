# Déploiement en Production

## Prérequis

- Node.js 20+ 
- PostgreSQL 14+
- npm 10+

## 1. Configuration de l'environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer .env pour la production
# DATABASE_URL="postgresql://user:password@localhost:5432/ordres_mission?schema=public"
# AUTH_SECRET="générer avec: openssl rand -hex 32"
```

**⚠ IMPORTANT :** Le `AUTH_SECRET` doit être une chaîne aléatoire d'au moins 32 caractères.

## 2. Migration SQLite → PostgreSQL

### 2.1 Créer la base PostgreSQL

```sql
CREATE DATABASE ordres_mission;
CREATE USER om_app WITH ENCRYPTED PASSWORD 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON DATABASE ordres_mission TO om_app;
```

### 2.2 Pousser le schéma PostgreSQL

```bash
# Utiliser le schéma PostgreSQL
npx prisma db push --schema=prisma/schema-postgres.prisma
```

### 2.3 Migrer les données depuis SQLite (si nécessaire)

```bash
# 1. Exporter les données SQLite
sqlite3 dev.db .dump > backup_sqlite.sql

# 2. Importer dans PostgreSQL (adaptation manuelle du SQL peut être nécessaire)
# Ou utiliser un outil de migration comme pgloader
```

### 2.4 Seeder les données de production

```bash
# Référentiels (barèmes, trajets, jours fériés, cadre/échelle)
npx prisma db seed --schema=prisma/schema-postgres.prisma

# Utilisateurs (CHANGER LES MOTS DE PASSE)
# Éditer scripts/seed_users.ts avec de vrais mots de passe avant d'exécuter
npx tsx scripts/seed_users.ts

# Importer le personnel
# Via l'interface web : Paramètres > Importer personnel (fichier Excel)
```

## 3. Build et démarrage

```bash
# Build production
npm run build

# Démarrer le serveur
npm start
# ou avec un gestionnaire de processus :
pm2 start npm --name "om-app" -- start
```

## 4. Configuration du serveur web (recommandé)

### Nginx reverse proxy

```nginx
server {
    listen 80;
    server_name om-service.univ.ma;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### HTTPS avec Let's Encrypt

```bash
sudo certbot --nginx -d om-service.univ.ma
```

## 5. Sauvegardes

Voir `docs/BACKUP_STRATEGY.md` pour le script de sauvegarde complète.

```bash
# Sauvegarde quotidienne automatique (cron)
0 2 * * * /opt/scripts/backup_db.sh >> /var/log/om_backup.log 2>&1
```

## 6. Jours fériés — Préparation année suivante

```bash
# Générer les jours fériés récurrents pour la nouvelle année
npx tsx scripts/prepare_feries.ts 2027
```

Les jours fériés lunaires (Aïd, Mawlid, etc.) doivent être saisis manuellement
par l'administrateur via Paramètres > Jours fériés.

## 7. Templates de documents

Les templates sont dans `templates/` :
- `ordre-mission.docx` — Modèle Ordre de Mission
- `etat-sommes-dues.docx` — Modèle État des Sommes Dues
- `etat-kilometrique.xlsx` — Modèle État Kilométrique

Le chemin est résolu via `path.join(process.cwd(), "templates", ...)` qui fonctionne
correctement en production (le répertoire `templates/` est inclus dans le build).

## 8. Sécurité

- **Mots de passe :** Hachés avec bcrypt (jamais en clair)
- **Sessions :** Signées avec HMAC SHA-256 via `AUTH_SECRET`
- **Cookies :** `httpOnly`, `secure` en production, `sameSite: lax`
- **Middleware :** Toutes les routes API sont protégées (sauf `/api/auth/login`)
- **Rôles :** Vérifiés côté serveur sur chaque route API

## 9. Vérifications post-déploiement

- [ ] Connexion avec chaque rôle (admin, gestionnaire, consultation)
- [ ] Création d'un OM de test
- [ ] Validation et paiement d'un OM
- [ ] Génération des 3 documents (OM, ESD, kilométrique)
- [ ] Consultation du tableau de bord
- [ ] Vérifier que CONSULTATION ne peut pas créer/modifier
- [ ] Vérifier que GESTIONNAIRE ne peut pas modifier les référentiels
