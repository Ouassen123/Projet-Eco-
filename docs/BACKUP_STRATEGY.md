# Stratégie de Sauvegarde — PostgreSQL

## 1. Sauvegarde complète (pg_dump)

### Script de sauvegarde quotidienne
```bash
#!/bin/bash
# backup_db.sh — à exécuter via cron tous les jours à 02h00
BACKUP_DIR="/var/backups/ordres_mission"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="ordres_mission"
DB_USER="om_app"

mkdir -p "$BACKUP_DIR"

# Dump complet (schéma + données) compressé
pg_dump -U "$DB_USER" -Fc -f "$BACKUP_DIR/om_${DATE}.dump" "$DB_NAME"

# Conservation : 7 jours glissants
find "$BACKUP_DIR" -name "om_*.dump" -mtime +7 -delete

echo "Sauvegarde terminée: om_${DATE}.dump"
```

### Crontab
```cron
0 2 * * * /opt/scripts/backup_db.sh >> /var/log/om_backup.log 2>&1
```

## 2. Périmètre couvert

| Élément | Couvert par pg_dump | Fréquence |
|---------|---------------------|----------|
| Base de données complète | ✅ | Quotidienne 02h00 |
| Référentiels (barèmes, trajets) | ✅ | Inclus dans pg_dump |
| Personnel (employés) | ✅ | Inclus dans pg_dump |
| Ordres de mission + snapshots | ✅ | Inclus dans pg_dump |
| Historique/Audit (HistoriqueAction) | ✅ | Inclus dans pg_dump |
| Utilisateurs + rôles | ✅ | Inclus dans pg_dump |
| Configuration (séquences) | ✅ | Inclus dans pg_dump |

## 3. Templates de documents

Les templates DOCX/XLSX (`templates/`) ne sont pas en base mais sur le système de fichiers.

```bash
# backup_templates.sh
BACKUP_DIR="/var/backups/ordres_mission/templates"
SOURCE_DIR="/opt/app/webapp/templates"

rsync -a "$SOURCE_DIR/" "$BACKUP_DIR/"
```

## 4. Restauration

```bash
# Restaurer la base depuis un dump
pg_restore -U om_app -d ordres_mission -c om_20260101_020000.dump
```

## 5. Sauvegarde avant migration SQLite → PostgreSQL

```bash
# Export SQLite vers SQL
sqlite3 dev.db .dump > backup_sqlite_$(date +%Y%m%d).sql

# Puis importer dans PostgreSQL après création du schéma
psql -U om_app -d ordres_mission -f schema_migration.sql
```

## 6. Plan de reprise

- **RPO** (perte de données max) : 24h (sauvegarde quotidienne)
- **RTO** (temps de reprise) : < 1h (restauration pg_restore)
- **Rétention** : 7 sauvegardes quotidiennes + 4 sauvegardes hebdomadaires
