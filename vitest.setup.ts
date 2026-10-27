import path from "path";

// Base de donnees dediee aux tests (isolee de dev.db). Doit etre definie
// AVANT l'import de src/lib/prisma dans les fichiers de test.
process.env.DATABASE_URL = `file:${path.resolve(__dirname, "prisma/test.db")}`;
