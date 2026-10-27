"use client";

import { RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { AdminPanel } from "@/components/admin/AdminPanel";

export default function AdminPage() {
  return (
    <div>
      <PageHeader
        titre="Administration"
        description="Gérez les comptes, les connexions en ligne et le journal d'activité du service."
        actions={
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw size={16} />
            Rafraîchir
          </Button>
        }
      />
      <AdminPanel />
    </div>
  );
}
