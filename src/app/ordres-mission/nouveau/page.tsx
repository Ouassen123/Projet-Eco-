"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Car,
  CheckCircle2,
  Info,
  MapPin,
  Route,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PageLoader, Spinner } from "@/components/ui/Spinner";
import { EmployeSearchSelect } from "@/components/om/EmployeSearchSelect";
import { TRANSPORT_LABEL } from "@/components/ui/Badge";
import { apiGet, apiPost, messageErreur } from "@/lib/apiClient";
import {
  combinerDateHeureEnIso,
  formaterDateHeureFr,
  formaterMontant,
  periodeValide,
} from "@/lib/dateUtils";
import { useToast } from "@/components/toast/ToastProvider";
import type { Employe, MoyenTransport, OrdreMission, Trajet } from "@/lib/types";

const PUISSANCES_FISCALES = [6, 7, 8, 9, 10, 11];

interface Previsualisation {
  bareme: { code: string; tauxJour1a15: number; tauxJour16Plus: number };
  echelleResolue: number | null;
  indiceUtilise: number | null;
  joursCumulesAvantMission: number;
  nbJoursMission: number;
  nbRepasMidi: number;
  nbRepasSoir: number;
  nbDecouchers: number;
  montantIndemniteMission: number;
  kilometrique: {
    trajetIntrouvable: boolean;
    vehiculeManquant: boolean;
    distanceKm: number | null;
    tauxDhKm: number | null;
    montant: number | null;
  };
  montantTotal: number;
  montantTotalEnLettres: string;
}

interface ConflitInfo {
  enConflit: boolean;
  conflits: { id: string; dateHeureDepart: string; dateHeureRetour: string; objetMission?: string }[];
}

interface FerieInfo {
  contientFerie: boolean;
  joursFeries: { date: string; libelle: string }[];
}

export default function NouvelOrdreMissionPage() {
  return (
    <Suspense fallback={<PageLoader label="Chargement du formulaire..." />}>
      <NouvelOrdreMissionForm />
    </Suspense>
  );
}

function NouvelOrdreMissionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { succes, erreur: toastErreur } = useToast();

  const [employe, setEmploye] = useState<Employe | null>(null);
  const [objetMission, setObjetMission] = useState("");
  const [villeDepart, setVilleDepart] = useState("");
  const [villeArrivee, setVilleArrivee] = useState("");
  const [dateDepart, setDateDepart] = useState("");
  const [heureDepart, setHeureDepart] = useState("08:00");
  const [dateRetour, setDateRetour] = useState("");
  const [heureRetour, setHeureRetour] = useState("18:00");
  const [moyenTransport, setMoyenTransport] = useState<MoyenTransport>("TRANSPORT_PUBLIC");
  const [vehiculeMatricule, setVehiculeMatricule] = useState("");
  const [vehiculePuissanceFiscale, setVehiculePuissanceFiscale] = useState<number | "">("");

  const [trajets, setTrajets] = useState<Trajet[]>([]);
  const [previsualisation, setPrevisualisation] = useState<Previsualisation | null>(null);
  const [chargementPreview, setChargementPreview] = useState(false);
  const [erreurPreview, setErreurPreview] = useState<string | null>(null);
  const [conflit, setConflit] = useState<ConflitInfo | null>(null);
  const [ferie, setFerie] = useState<FerieInfo | null>(null);

  const [recapOuvert, setRecapOuvert] = useState(false);
  const [soumission, setSoumission] = useState(false);
  const [omCree, setOmCree] = useState<OrdreMission | null>(null);
  const [erreursChamps, setErreursChamps] = useState<Record<string, string>>({});

  // Preselection depuis la fiche personnel (?employeId=...)
  useEffect(() => {
    const employeId = searchParams.get("employeId");
    if (employeId) {
      apiGet<Employe>(`/api/personnel/${employeId}`).then(setEmploye).catch(() => {});
    }
  }, [searchParams]);

  useEffect(() => {
    apiGet<Trajet[]>("/api/referentiels/trajets").then(setTrajets).catch(() => {});
  }, []);

  // Prefill vehicule personnel connu de l'employe
  useEffect(() => {
    if (moyenTransport === "VOITURE_PERSONNELLE" && employe) {
      if (employe.vehiculeMatricule) setVehiculeMatricule(employe.vehiculeMatricule);
      if (employe.vehiculePuissanceFiscale) setVehiculePuissanceFiscale(employe.vehiculePuissanceFiscale);
    }
  }, [moyenTransport, employe]);

  const dateHeureDepartIso = useMemo(
    () => (dateDepart ? combinerDateHeureEnIso(dateDepart, heureDepart) : ""),
    [dateDepart, heureDepart]
  );
  const dateHeureRetourIso = useMemo(
    () => (dateRetour ? combinerDateHeureEnIso(dateRetour, heureRetour) : ""),
    [dateRetour, heureRetour]
  );

  const trajetTrouve = useMemo(() => {
    if (!villeDepart.trim() || !villeArrivee.trim()) return undefined;
    return trajets.find(
      (t) =>
        (t.villeDepart.toLowerCase() === villeDepart.trim().toLowerCase() &&
          t.villeArrivee.toLowerCase() === villeArrivee.trim().toLowerCase()) ||
        (t.villeDepart.toLowerCase() === villeArrivee.trim().toLowerCase() &&
          t.villeArrivee.toLowerCase() === villeDepart.trim().toLowerCase())
    );
  }, [trajets, villeDepart, villeArrivee]);

  const villesConnues = useMemo(() => {
    const set = new Set<string>();
    trajets.forEach((t) => {
      set.add(t.villeDepart);
      set.add(t.villeArrivee);
    });
    return Array.from(set).sort();
  }, [trajets]);

  const periodeCoherente =
    !dateHeureDepartIso || !dateHeureRetourIso || periodeValide(dateHeureDepartIso, dateHeureRetourIso);

  const champsBaseRemplis =
    !!employe &&
    objetMission.trim().length > 0 &&
    villeDepart.trim().length > 0 &&
    villeArrivee.trim().length > 0 &&
    !!dateHeureDepartIso &&
    !!dateHeureRetourIso &&
    periodeCoherente;

  const vehiculeRequisRempli =
    moyenTransport !== "VOITURE_PERSONNELLE" ||
    (vehiculeMatricule.trim().length > 0 && !!vehiculePuissanceFiscale);

  // Validation temps reel : conflits + jours feries
  useEffect(() => {
    if (!employe || !dateHeureDepartIso || !dateHeureRetourIso || !periodeCoherente) {
      setConflit(null);
      setFerie(null);
      return;
    }
    const timer = setTimeout(() => {
      apiPost<ConflitInfo>("/api/ordres-mission/verifier-conflit", {
        employeId: employe.id,
        dateHeureDepart: dateHeureDepartIso,
        dateHeureRetour: dateHeureRetourIso,
      })
        .then(setConflit)
        .catch(() => setConflit(null));
      apiPost<FerieInfo>("/api/ordres-mission/verifier-ferie", {
        dateHeureDepart: dateHeureDepartIso,
        dateHeureRetour: dateHeureRetourIso,
      })
        .then(setFerie)
        .catch(() => setFerie(null));
    }, 350);
    return () => clearTimeout(timer);
  }, [employe, dateHeureDepartIso, dateHeureRetourIso, periodeCoherente]);

  // Previsualisation des indemnites
  useEffect(() => {
    if (!champsBaseRemplis || !vehiculeRequisRempli) {
      setPrevisualisation(null);
      setErreurPreview(null);
      return;
    }
    setChargementPreview(true);
    const timer = setTimeout(() => {
      apiPost<Previsualisation>("/api/ordres-mission/previsualiser", {
        employeId: employe!.id,
        villeDepart,
        villeArrivee,
        dateHeureDepart: dateHeureDepartIso,
        dateHeureRetour: dateHeureRetourIso,
        moyenTransport,
        vehiculePuissanceFiscale:
          moyenTransport === "VOITURE_PERSONNELLE" ? Number(vehiculePuissanceFiscale) : undefined,
      })
        .then((d) => {
          setPrevisualisation(d);
          setErreurPreview(null);
        })
        .catch((e) => {
          setPrevisualisation(null);
          setErreurPreview(messageErreur(e));
        })
        .finally(() => setChargementPreview(false));
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    champsBaseRemplis,
    vehiculeRequisRempli,
    employe,
    villeDepart,
    villeArrivee,
    dateHeureDepartIso,
    dateHeureRetourIso,
    moyenTransport,
    vehiculePuissanceFiscale,
  ]);

  function validerFormulaire(): boolean {
    const erreurs: Record<string, string> = {};
    if (!employe) erreurs.employe = "Veuillez sélectionner un agent.";
    if (!objetMission.trim()) erreurs.objetMission = "L'objet de la mission est requis.";
    if (!villeDepart.trim()) erreurs.villeDepart = "La ville de départ est requise.";
    if (!villeArrivee.trim()) erreurs.villeArrivee = "La ville d'arrivée est requise.";
    if (!dateDepart) erreurs.dateDepart = "La date de départ est requise.";
    if (!dateRetour) erreurs.dateRetour = "La date de retour est requise.";
    if (dateHeureDepartIso && dateHeureRetourIso && !periodeValide(dateHeureDepartIso, dateHeureRetourIso)) {
      erreurs.dateRetour = "La date de retour doit être postérieure à la date de départ.";
    }
    if (moyenTransport === "VOITURE_PERSONNELLE") {
      if (!vehiculeMatricule.trim()) erreurs.vehiculeMatricule = "Le matricule du véhicule est requis.";
      if (!vehiculePuissanceFiscale) erreurs.vehiculePuissanceFiscale = "La puissance fiscale est requise.";
    }
    setErreursChamps(erreurs);
    return Object.keys(erreurs).length === 0;
  }

  function ouvrirRecap() {
    if (!validerFormulaire()) return;
    setRecapOuvert(true);
  }

  async function confirmerCreation() {
    if (!employe) return;
    setSoumission(true);
    try {
      const om = await apiPost<OrdreMission>("/api/ordres-mission", {
        employeId: employe.id,
        objetMission: objetMission.trim(),
        villeDepart: villeDepart.trim(),
        villeArrivee: villeArrivee.trim(),
        dateHeureDepart: dateHeureDepartIso,
        dateHeureRetour: dateHeureRetourIso,
        moyenTransport,
        vehiculeMatricule: moyenTransport === "VOITURE_PERSONNELLE" ? vehiculeMatricule.trim() : undefined,
        vehiculePuissanceFiscale:
          moyenTransport === "VOITURE_PERSONNELLE" ? Number(vehiculePuissanceFiscale) : undefined,
      });
      setOmCree(om);
      setRecapOuvert(false);
      succes(`Ordre de Mission N° ${om.numeroSequence} créé avec succès.`);
    } catch (e) {
      toastErreur(messageErreur(e));
    } finally {
      setSoumission(false);
    }
  }

  if (omCree) {
    return <EcranSucces om={omCree} employe={employe!} />;
  }

  const boutonDesactive =
    !champsBaseRemplis ||
    !vehiculeRequisRempli ||
    (conflit?.enConflit ?? false) ||
    (ferie?.contientFerie ?? false) ||
    !!erreurPreview ||
    chargementPreview ||
    soumission;

  return (
    <div>
      <Link href="/ordres-mission" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600">
        <ArrowLeft size={15} />
        Retour aux Ordres de Mission
      </Link>

      <PageHeader titre="Nouvel Ordre de Mission" description="Renseignez les informations ci-dessous." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* SECTION 1 - AGENT */}
          <Card>
            <CardHeader>
              <CardTitle>Agent</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <EmployeSearchSelect
                employeSelectionne={employe}
                onSelectionner={setEmploye}
                erreur={erreursChamps.employe}
              />
              {employe && (
                <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-3">
                  <ChampLectureSeule label="Nom" valeur={employe.nomFr} />
                  <ChampLectureSeule label="Prénom" valeur={employe.prenomFr} />
                  <ChampLectureSeule label="Matricule" valeur={employe.matricule} />
                  <ChampLectureSeule label="Fonction" valeur={employe.cadre} />
                  <ChampLectureSeule label="Indice" valeur={employe.indice ?? "-"} />
                  <ChampLectureSeule
                    label="Échelle"
                    valeur={previsualisation?.echelleResolue ?? "En cours..."}
                  />
                </div>
              )}
            </CardBody>
          </Card>

          {/* SECTION 2 - MISSION */}
          <Card>
            <CardHeader>
              <CardTitle>Mission</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <Field label="Objet de la mission" requis erreur={erreursChamps.objetMission} enfant={
                <Input value={objetMission} onChange={(e) => setObjetMission(e.target.value)} placeholder="Ex : Réunion pédagogique, formation..." />
              } />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Ville de départ" requis erreur={erreursChamps.villeDepart} enfant={
                  <>
                    <Input
                      list="villes-connues"
                      value={villeDepart}
                      onChange={(e) => setVilleDepart(e.target.value)}
                      placeholder="Ex : Tanger"
                    />
                  </>
                } />
                <Field label="Ville d'arrivée" requis erreur={erreursChamps.villeArrivee} enfant={
                  <Input
                    list="villes-connues"
                    value={villeArrivee}
                    onChange={(e) => setVilleArrivee(e.target.value)}
                    placeholder="Ex : Rabat"
                  />
                } />
                <datalist id="villes-connues">
                  {villesConnues.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Date de départ" requis erreur={erreursChamps.dateDepart} enfant={
                  <Input type="date" value={dateDepart} onChange={(e) => setDateDepart(e.target.value)} />
                } />
                <Field label="Heure de départ" enfant={
                  <Input type="time" value={heureDepart} onChange={(e) => setHeureDepart(e.target.value)} />
                } />
                <Field label="Date de retour" requis erreur={erreursChamps.dateRetour} enfant={
                  <Input type="date" value={dateRetour} onChange={(e) => setDateRetour(e.target.value)} />
                } />
                <Field label="Heure de retour" enfant={
                  <Input type="time" value={heureRetour} onChange={(e) => setHeureRetour(e.target.value)} />
                } />
              </div>

              <Field label="Moyen de transport" requis enfant={
                <Select value={moyenTransport} onChange={(e) => setMoyenTransport(e.target.value as MoyenTransport)}>
                  <option value="TRANSPORT_PUBLIC">{TRANSPORT_LABEL.TRANSPORT_PUBLIC}</option>
                  <option value="VOITURE_PERSONNELLE">{TRANSPORT_LABEL.VOITURE_PERSONNELLE}</option>
                  <option value="VOITURE_SERVICE">{TRANSPORT_LABEL.VOITURE_SERVICE}</option>
                </Select>
              } />

              {/* SECTION 5 - TRAJET */}
              {villeDepart.trim() && villeArrivee.trim() && (
                <div className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${
                  trajetTrouve ? "border-sky-200 bg-sky-50 text-sky-800" : "border-amber-200 bg-amber-50 text-amber-800"
                }`}>
                  <Route size={16} className="shrink-0" />
                  {trajetTrouve ? (
                    <span>Distance aller-retour configurée : <strong>{trajetTrouve.distanceKm} km</strong></span>
                  ) : (
                    <span>Ce trajet n&apos;est pas configuré. Veuillez contacter l&apos;administrateur.</span>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          {/* SECTION 6 - VOITURE PERSONNELLE */}
          {moyenTransport === "VOITURE_PERSONNELLE" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5">
                  <Car size={15} /> Indemnité kilométrique
                </CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Matricule véhicule" requis erreur={erreursChamps.vehiculeMatricule} enfant={
                    <Input value={vehiculeMatricule} onChange={(e) => setVehiculeMatricule(e.target.value)} placeholder="Ex : 12345-A-6" />
                  } />
                  <Field label="Puissance fiscale" requis erreur={erreursChamps.vehiculePuissanceFiscale} enfant={
                    <Select
                      value={vehiculePuissanceFiscale}
                      onChange={(e) => setVehiculePuissanceFiscale(e.target.value ? Number(e.target.value) : "")}
                    >
                      <option value="">Sélectionner...</option>
                      {PUISSANCES_FISCALES.map((cv, idx) => (
                        <option key={cv} value={cv}>
                          {idx === 0 ? `${cv} CV et moins` : `${cv} CV`}
                        </option>
                      ))}
                    </Select>
                  } />
                </div>

                {previsualisation?.kilometrique.trajetIntrouvable && (
                  <p className="text-sm font-medium text-amber-700">
                    Ce trajet n&apos;est pas configuré. Veuillez contacter l&apos;administrateur.
                  </p>
                )}
                {previsualisation && !previsualisation.kilometrique.trajetIntrouvable && previsualisation.kilometrique.montant !== null && (
                  <div className="grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                    <ChampLectureSeule label="Distance" valeur={`${previsualisation.kilometrique.distanceKm} km`} />
                    <ChampLectureSeule label="Taux" valeur={`${previsualisation.kilometrique.tauxDhKm} DH/km`} />
                    <ChampLectureSeule label="Montant" valeur={formaterMontant(previsualisation.kilometrique.montant)} />
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* SECTION 8 - VALIDATION TEMPS REEL */}
          {(conflit?.enConflit || ferie?.contientFerie || !periodeCoherente) && (
            <div className="flex flex-col gap-2">
              {!periodeCoherente && (
                <Alerte type="erreur" message="La date de retour doit être postérieure à la date de départ." />
              )}
              {conflit?.enConflit && (
                <Alerte
                  type="erreur"
                  message={`Cet agent possède déjà une mission pendant cette période (${conflit.conflits.length} conflit(s)).`}
                />
              )}
              {ferie?.contientFerie && (
                <Alerte
                  type="avertissement"
                  message={`Cette période contient un jour férié : ${ferie.joursFeries.map((f) => f.libelle).join(", ")}.`}
                />
              )}
            </div>
          )}
        </div>

        {/* SECTION 7 - APERCU DES INDEMNITES */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Aperçu des indemnités</CardTitle>
            </CardHeader>
            <CardBody>
              {!champsBaseRemplis ? (
                <p className="text-sm text-slate-400">
                  Complétez l&apos;agent, l&apos;objet, les villes et les dates pour voir l&apos;aperçu.
                </p>
              ) : chargementPreview ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Spinner size={16} /> Calcul en cours...
                </div>
              ) : erreurPreview ? (
                <Alerte type="erreur" message={erreurPreview} />
              ) : previsualisation ? (
                <div className="space-y-3 text-sm">
                  <LigneApercu label="Repas midi" valeur={previsualisation.nbRepasMidi} />
                  <LigneApercu label="Repas soir" valeur={previsualisation.nbRepasSoir} />
                  <LigneApercu label="Découchers" valeur={previsualisation.nbDecouchers} />
                  <LigneApercu
                    label="Taux appliqué (1-15j)"
                    valeur={`${previsualisation.bareme.tauxJour1a15} DH`}
                  />
                  <div className="border-t border-slate-100 pt-3">
                    <LigneApercu
                      label="Total indemnités mission"
                      valeur={formaterMontant(previsualisation.montantIndemniteMission)}
                      accent
                    />
                  </div>
                  {moyenTransport === "VOITURE_PERSONNELLE" && previsualisation.kilometrique.montant !== null && (
                    <>
                      <LigneApercu label="Kilométrage" valeur={`${previsualisation.kilometrique.distanceKm} km`} />
                      <LigneApercu label="Taux km" valeur={`${previsualisation.kilometrique.tauxDhKm} DH/km`} />
                      <LigneApercu
                        label="Indemnité kilométrique"
                        valeur={formaterMontant(previsualisation.kilometrique.montant)}
                      />
                    </>
                  )}
                  <div className="border-t border-slate-200 pt-3">
                    <LigneApercu
                      label="Total général"
                      valeur={formaterMontant(previsualisation.montantTotal)}
                      accent
                      grand
                    />
                    <p className="mt-1 text-xs italic text-slate-500">
                      {previsualisation.montantTotalEnLettres}
                    </p>
                  </div>
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Button
            variant="primary"
            className="mt-4 w-full"
            disabled={boutonDesactive}
            onClick={ouvrirRecap}
          >
            Créer l&apos;Ordre de Mission
          </Button>
        </div>
      </div>

      {/* SECTION 9 - RECAPITULATIF AVANT CONFIRMATION */}
      <Modal ouvert={recapOuvert} onFermer={() => setRecapOuvert(false)} titre="Récapitulatif de l'Ordre de Mission" largeur="max-w-xl">
        {employe && (
          <div className="space-y-3 text-sm">
            <LigneApercu label="Agent" valeur={`${employe.nomFr} ${employe.prenomFr} (${employe.matricule})`} />
            <LigneApercu label="Objet" valeur={objetMission} />
            <LigneApercu label="Départ" valeur={`${villeDepart} — ${formaterDateHeureFr(dateHeureDepartIso)}`} />
            <LigneApercu label="Arrivée" valeur={`${villeArrivee} — ${formaterDateHeureFr(dateHeureRetourIso)}`} />
            <LigneApercu label="Transport" valeur={TRANSPORT_LABEL[moyenTransport]} />
            {previsualisation?.kilometrique.distanceKm && (
              <LigneApercu label="Distance" valeur={`${previsualisation.kilometrique.distanceKm} km`} />
            )}
            {previsualisation && (
              <LigneApercu label="Indemnités" valeur={formaterMontant(previsualisation.montantTotal)} accent />
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRecapOuvert(false)} disabled={soumission}>
                Annuler
              </Button>
              <Button variant="primary" onClick={confirmerCreation} chargement={soumission}>
                Confirmer la création
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ChampLectureSeule({ label, valeur }: { label: string; valeur: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="font-medium text-slate-800">{valeur}</p>
    </div>
  );
}

function LigneApercu({
  label,
  valeur,
  accent,
  grand,
}: {
  label: string;
  valeur: React.ReactNode;
  accent?: boolean;
  grand?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={`${accent ? "font-semibold text-slate-900" : "text-slate-700"} ${grand ? "text-lg" : ""}`}>
        {valeur}
      </span>
    </div>
  );
}

function Alerte({ type, message }: { type: "erreur" | "avertissement"; message: string }) {
  const styles =
    type === "erreur"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-amber-200 bg-amber-50 text-amber-700";
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${styles}`}>
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function EcranSucces({ om, employe }: { om: OrdreMission; employe: Employe }) {
  return (
    <div className="mx-auto max-w-lg py-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle2 size={32} className="text-emerald-600" />
      </div>
      <h1 className="text-xl font-semibold text-slate-900">
        Ordre de Mission N° {om.numeroSequence} créé avec succès.
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        {employe.nomFr} {employe.prenomFr} · {om.villeDepart} → {om.villeArrivee}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link href={`/ordres-mission/${om.id}`}>
          <Button variant="primary">Voir l&apos;OM</Button>
        </Link>
        <Button variant="outline" disabled title="Bientôt disponible">
          Imprimer
        </Button>
        <Button variant="outline" disabled title="Bientôt disponible">
          Télécharger
        </Button>
        <Link href="/ordres-mission">
          <Button variant="outline">Retour aux OM</Button>
        </Link>
      </div>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <Info size={13} /> La génération de documents (impression / téléchargement) sera bientôt disponible.
      </p>
    </div>
  );
}
