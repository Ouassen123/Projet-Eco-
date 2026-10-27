import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gererErreurApi } from "@/lib/apiUtils";
import { BusinessError, ErrorCodes } from "@/lib/errors";
import {
  chargerDonneesOM,
  genererOrdreMissionDocx,
  genererNomFichierOM,
} from "@/lib/generationDocx";
import { verifierRole } from "@/lib/authApi";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifierRole(request, "ADMIN", "GESTIONNAIRE", "CONSULTATION");
    if ("erreur" in auth) return auth.erreur;
    const { id } = await params;

    const om = await prisma.ordreMission.findUnique({
      where: { id },
      include: { employe: true },
    });
    if (!om) {
      throw new BusinessError(
        ErrorCodes.EMPLOYE_INTROUVABLE,
        `Ordre de mission ${id} introuvable.`
      );
    }

    const donnees = await chargerDonneesOM(id);
    const buffer = genererOrdreMissionDocx(donnees);
    const nomFichier = genererNomFichierOM(donnees.om, donnees.employe, "OM");
    const uint8 = new Uint8Array(buffer);

    await prisma.historiqueAction.create({
      data: {
        ordreMissionId: om.id,
        action: "IMPRESSION",
        utilisateurId: auth.utilisateur.utilisateurId,
        auteur: auth.utilisateur.login,
        detail: "Génération Ordre de Mission DOCX",
      },
    });

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${nomFichier}"`,
      },
    });
  } catch (e) {
    return gererErreurApi(e);
  }
}
