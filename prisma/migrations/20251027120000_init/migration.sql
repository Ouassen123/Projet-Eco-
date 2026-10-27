-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TypePersonnel" AS ENUM ('ADMINISTRATIF', 'ENSEIGNANT');

-- CreateEnum
CREATE TYPE "RoleUtilisateur" AS ENUM ('ADMIN', 'GESTIONNAIRE', 'CONSULTATION');

-- CreateEnum
CREATE TYPE "MoyenTransport" AS ENUM ('TRANSPORT_PUBLIC', 'VOITURE_PERSONNELLE', 'VOITURE_SERVICE');

-- CreateEnum
CREATE TYPE "StatutOM" AS ENUM ('BROUILLON', 'VALIDE', 'ANNULE', 'PAYE');

-- CreateEnum
CREATE TYPE "TypeAction" AS ENUM ('CREATION', 'MODIFICATION', 'VALIDATION', 'ANNULATION', 'PAIEMENT', 'IMPRESSION', 'EXPORT', 'MODIFICATION_REFERENTIEL', 'MODIFICATION_PERSONNEL', 'MODIFICATION_VEHICULE');

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "motDePasse" TEXT NOT NULL,
    "nomComplet" TEXT NOT NULL,
    "role" "RoleUtilisateur" NOT NULL DEFAULT 'GESTIONNAIRE',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employe" (
    "id" TEXT NOT NULL,
    "matricule" TEXT NOT NULL,
    "nomFr" TEXT NOT NULL,
    "prenomFr" TEXT NOT NULL,
    "nomAr" TEXT,
    "prenomAr" TEXT,
    "type" "TypePersonnel" NOT NULL,
    "cadre" TEXT NOT NULL,
    "grade" TEXT,
    "echelon" INTEGER,
    "indice" INTEGER,
    "echelonExceptionnel" BOOLEAN NOT NULL DEFAULT false,
    "vehiculeMatricule" TEXT,
    "vehiculePuissanceFiscale" INTEGER,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadreEchelleMapping" (
    "id" TEXT NOT NULL,
    "cadre" TEXT NOT NULL,
    "grade" TEXT NOT NULL DEFAULT '',
    "type" "TypePersonnel" NOT NULL,
    "echelle" INTEGER NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadreEchelleMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaremeMission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "priorite" INTEGER NOT NULL,
    "indiceMin" INTEGER,
    "echelleMin" INTEGER,
    "echelleMax" INTEGER,
    "tauxJour1a15" DOUBLE PRECISION NOT NULL,
    "tauxJour16Plus" DOUBLE PRECISION NOT NULL,
    "referenceJuridique" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaremeMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaremeKilometrique" (
    "id" TEXT NOT NULL,
    "puissanceFiscale" INTEGER NOT NULL,
    "tauxDhKm" DOUBLE PRECISION NOT NULL,
    "referenceJuridique" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaremeKilometrique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trajet" (
    "id" TEXT NOT NULL,
    "villeDepart" TEXT NOT NULL,
    "villeArrivee" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trajet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourFerie" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "libelle" TEXT NOT NULL,
    "recurrentAnnuel" BOOLEAN NOT NULL DEFAULT false,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JourFerie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceJuridique" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceJuridique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sequence" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "valeur" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdreMission" (
    "id" TEXT NOT NULL,
    "numero" TEXT,
    "numeroSequence" INTEGER NOT NULL,
    "employeId" TEXT NOT NULL,
    "objetMission" TEXT NOT NULL,
    "villeDepart" TEXT NOT NULL,
    "villeArrivee" TEXT NOT NULL,
    "trajetId" TEXT,
    "dateHeureDepart" TIMESTAMP(3) NOT NULL,
    "dateHeureRetour" TIMESTAMP(3) NOT NULL,
    "moyenTransport" "MoyenTransport" NOT NULL,
    "vehiculeMatriculeSnapshot" TEXT,
    "vehiculePuissanceFiscaleSnapshot" INTEGER,
    "tauxKmSnapshot" DOUBLE PRECISION,
    "kilometrageSnapshot" DOUBLE PRECISION,
    "montantKilometriqueSnapshot" DOUBLE PRECISION,
    "echelleSnapshot" INTEGER,
    "indiceSnapshot" INTEGER,
    "categorieTauxSnapshot" TEXT,
    "tauxJour1a15Snapshot" DOUBLE PRECISION,
    "tauxJour16PlusSnapshot" DOUBLE PRECISION,
    "nbJoursCumulesAvantMission" INTEGER,
    "nbRepasMidi" INTEGER,
    "nbRepasSoir" INTEGER,
    "nbDecouchers" INTEGER,
    "montantIndemniteMissionSnapshot" DOUBLE PRECISION,
    "montantTotalSnapshot" DOUBLE PRECISION,
    "anneeEconomique" INTEGER,
    "statut" "StatutOM" NOT NULL DEFAULT 'BROUILLON',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "validatedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "OrdreMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciceEconomique" (
    "id" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT false,
    "archive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExerciceEconomique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoriqueAction" (
    "id" TEXT NOT NULL,
    "ordreMissionId" TEXT,
    "action" "TypeAction" NOT NULL,
    "auteur" TEXT,
    "utilisateurId" TEXT,
    "detail" TEXT,
    "ancienneValeur" TEXT,
    "nouvelleValeur" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoriqueAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_login_key" ON "Utilisateur"("login");

-- CreateIndex
CREATE UNIQUE INDEX "Employe_matricule_key" ON "Employe"("matricule");

-- CreateIndex
CREATE INDEX "Employe_type_idx" ON "Employe"("type");

-- CreateIndex
CREATE INDEX "Employe_cadre_idx" ON "Employe"("cadre");

-- CreateIndex
CREATE UNIQUE INDEX "CadreEchelleMapping_cadre_grade_type_key" ON "CadreEchelleMapping"("cadre", "grade", "type");

-- CreateIndex
CREATE UNIQUE INDEX "BaremeMission_code_key" ON "BaremeMission"("code");

-- CreateIndex
CREATE UNIQUE INDEX "BaremeKilometrique_puissanceFiscale_key" ON "BaremeKilometrique"("puissanceFiscale");

-- CreateIndex
CREATE UNIQUE INDEX "Trajet_villeDepart_villeArrivee_key" ON "Trajet"("villeDepart", "villeArrivee");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceJuridique_code_key" ON "ReferenceJuridique"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Sequence_scope_key" ON "Sequence"("scope");

-- CreateIndex
CREATE UNIQUE INDEX "OrdreMission_numero_key" ON "OrdreMission"("numero");

-- CreateIndex
CREATE INDEX "OrdreMission_employeId_idx" ON "OrdreMission"("employeId");

-- CreateIndex
CREATE INDEX "OrdreMission_statut_idx" ON "OrdreMission"("statut");

-- CreateIndex
CREATE INDEX "OrdreMission_dateHeureDepart_dateHeureRetour_idx" ON "OrdreMission"("dateHeureDepart", "dateHeureRetour");

-- CreateIndex
CREATE INDEX "OrdreMission_anneeEconomique_idx" ON "OrdreMission"("anneeEconomique");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciceEconomique_annee_key" ON "ExerciceEconomique"("annee");

-- CreateIndex
CREATE INDEX "ExerciceEconomique_actif_idx" ON "ExerciceEconomique"("actif");

-- CreateIndex
CREATE INDEX "ExerciceEconomique_archive_idx" ON "ExerciceEconomique"("archive");

-- CreateIndex
CREATE INDEX "HistoriqueAction_ordreMissionId_idx" ON "HistoriqueAction"("ordreMissionId");

-- CreateIndex
CREATE INDEX "HistoriqueAction_utilisateurId_idx" ON "HistoriqueAction"("utilisateurId");

-- CreateIndex
CREATE INDEX "HistoriqueAction_createdAt_idx" ON "HistoriqueAction"("createdAt");

-- AddForeignKey
ALTER TABLE "OrdreMission" ADD CONSTRAINT "OrdreMission_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "Employe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdreMission" ADD CONSTRAINT "OrdreMission_trajetId_fkey" FOREIGN KEY ("trajetId") REFERENCES "Trajet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriqueAction" ADD CONSTRAINT "HistoriqueAction_ordreMissionId_fkey" FOREIGN KEY ("ordreMissionId") REFERENCES "OrdreMission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriqueAction" ADD CONSTRAINT "HistoriqueAction_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

