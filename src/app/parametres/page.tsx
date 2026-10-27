import { Settings2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";

export default function ParametresPage() {
  return (
    <div>
      <PageHeader titre="Paramètres" description="Informations générales de l'application." />
      <Card>
        <CardBody className="flex items-center gap-3 py-10 text-center">
          <div className="mx-auto flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <Settings2 size={22} className="text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Paramètres avancés — bientôt disponible</p>
            <p className="max-w-sm text-sm text-slate-500">
              La gestion des utilisateurs, des rôles et des préférences de l&apos;application sera ajoutée ici prochainement.
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
