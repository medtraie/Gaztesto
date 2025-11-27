import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/contexts/AppContext";
import { FuelPurchase, FuelConsumption, FuelDrain } from "@/types";
import { format } from "date-fns";
import React from "react";
import OilManagement from "./OilManagement";

interface FuelTankProps {
  level: number; // Percentage from 0 to 100
}

// تعريف مكوّن FuelTank القديم يبقى كما هو إن رغبت باستخدامه لاحقًا
const FuelTank: React.FC<FuelTankProps> = ({ level }) => {
  const color = level < 30 ? "#ef4444" : level < 60 ? "#f59e0b" : "#22c55e";
  const fillHeight = Math.max(0, Math.min(100, level));

  return (
    <div className="relative w-32 h-48 mx-auto">
      <svg viewBox="0 0 100 140" className="w-full h-full">
        <defs>
          <clipPath id="fuelTankClip">
            <rect x="10" y="10" width="80" height="120" rx="10" />
          </clipPath>
        </defs>

        {/* Tank background */}
        <rect x="10" y="10" width="80" height="120" rx="10" fill="#e5e7eb" />

        {/* Fuel liquid */}
        <g clipPath="url(#fuelTankClip)">
          <rect
            x="10"
            y={10 + 120 * (1 - fillHeight / 100)}
            width="80"
            height={120 * (fillHeight / 100)}
            fill={color}
            style={{ transition: "y 0.7s ease-in-out, height 0.7s ease-in-out" }}
          />
        </g>

        {/* Tank outline */}
        <rect x="10" y="10" width="80" height="120" rx="10" fill="none" stroke="#9ca3af" strokeWidth="2" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold text-gray-700">{level.toFixed(1)}%</span>
      </div>
    </div>
  );
};

const FuelManagement = () => {
  const {
    drivers,
    trucks,
    fuelPurchases,
    addFuelPurchase,
    fuelConsumptions,
    addFuelConsumption,
    fuelDrains,
    addFuelDrain,
    addCashOperation,
  } = useApp();

  // Sous-composant local pour l’affichage du niveau (évite toute redéclaration globale)
  const CisternTank: React.FC<{ level: number }> = ({ level }) => {
    const pct = Math.max(0, Math.min(100, level));
    const fillHeight = 120 * (pct / 100);
    const color = pct < 25 ? "#ef4444" : pct < 75 ? "#f59e0b" : "#22c55e";

    return (
      <div className="relative w-44 md:w-60 lg:w-72 mx-auto">
        <svg viewBox="0 0 140 180" className="w-full h-auto">
          <defs>
            <clipPath id="batteryClip">
              <rect x="20" y="30" width="100" height="130" rx="10" />
            </clipPath>
          </defs>

        {/* رأس البطارية */}
          <rect x="58" y="16" width="24" height="10" rx="2" fill="#4b5563" />

        {/* جسم البطارية */}
          <rect x="20" y="30" width="100" height="130" rx="10" fill="#374151" />
          <rect
            x="22"
            y="32"
            width="96"
            height="126"
            rx="8"
            fill="#111827"
            stroke="#6b7280"
            strokeWidth="1.5"
          />

          {/* التعبئة */}
          <g clipPath="url(#batteryClip)">
            <rect
              x="20"
              y={160 - fillHeight}
              width="100"
              height={fillHeight}
              fill={color}
              style={{ transition: "y 0.5s ease, height 0.5s ease" }}
              opacity="0.9"
            />
          </g>

        {/* إطار خارجي */}
          <rect
            x="20"
            y="30"
            width="100"
            height="130"
            rx="10"
            fill="none"
            stroke="#9ca3af"
            strokeWidth="2"
          />
        </svg>

        {/* النسبة في الوسط */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xl md:text-2xl font-bold text-gray-100 drop-shadow">
            {pct.toFixed(0)}%
          </span>
        </div>
      </div>
    );
  };

  // Format MAD
  const formatMAD = (amount: number) =>
    new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD", minimumFractionDigits: 2 }).format(amount);

  // Propriétés du réservoir
  const capacity = 20000; // L
  const baseStockLiters = 0;

  // Totaux
  const totalPurchased = useMemo(
    () => fuelPurchases.reduce((s, p) => s + p.quantityLiters, 0),
    [fuelPurchases]
  );
  const totalConsumed = useMemo(
    () => fuelConsumptions.reduce((s, c) => s + c.liters, 0),
    [fuelConsumptions]
  );
  const totalDrained = useMemo(
    () => fuelDrains.reduce((s, d) => s + d.quantityLiters, 0),
    [fuelDrains]
  );

  // Stock et niveau
  const currentStockLiters = Math.max(0, baseStockLiters + totalPurchased - totalConsumed - totalDrained);
  const fuelLevelPct = Math.min(100, (currentStockLiters / capacity) * 100);

  // Dialogs + forms
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [consumptionDialogOpen, setConsumptionDialogOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState("");

  const [drainDialogOpen, setDrainDialogOpen] = useState(false);
    

  const [purchaseForm, setPurchaseForm] = useState<Omit<FuelPurchase, "id">>({
    date: new Date(),
    quantityLiters: 0,
    price: 0,
    paymentMethod: "Espèces",
  });
  const [consumptionForm, setConsumptionForm] = useState<Omit<FuelConsumption, "id">>({
    date: new Date(),
    liters: 0,
    driver: "",
    truck: "",
    mileageKm: 0,
  });
  const [drainForm, setDrainForm] = useState<Omit<FuelDrain, "id">>({
    date: new Date(),
    quantityLiters: 0,
    price: 0,
    paymentMethod: "Espèces",
  });

  // Seuils configurables
  const [perfLimits, setPerfLimits] = useState({ greenMax: 25, yellowMax: 35 });

  // Badge couleur selon L/100km
  const perfBadge = (lPer100?: number | null) => {
    if (lPer100 == null) return "bg-gray-200 text-gray-700";
    if (lPer100 > perfLimits.yellowMax) return "bg-red-100 text-red-800";
    if (lPer100 >= perfLimits.greenMax) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  // Performance par chauffeur
  const driverPerformance = useMemo(() => {
    const acc: Record<string, { liters: number; km: number }> = {};
    fuelConsumptions.forEach((c) => {
      const name = c.driver || "N/A";
      const km = c.mileageKm || 0;
      acc[name] = {
        liters: (acc[name]?.liters || 0) + (c.liters || 0),
        km: (acc[name]?.km || 0) + km,
      };
    });
    return Object.entries(acc)
      .map(([driver, { liters, km }]) => ({
        driver,
        liters,
        km,
        lPer100: km > 0 ? (liters / km) * 100 : null,
      }))
      .sort((a, b) => (b.lPer100 ?? -Infinity) - (a.lPer100 ?? -Infinity));
  }, [fuelConsumptions, perfLimits]);

  // Données pour graphique
  const driversList = useMemo(
    () => Array.from(new Set(fuelConsumptions.map((c) => c.driver).filter(Boolean))),
    [fuelConsumptions]
  );
  const [chartDriver, setChartDriver] = useState<string>("");
  const driverSeries = useMemo(() => {
    const rows = fuelConsumptions
      .filter((c) => (chartDriver ? c.driver === chartDriver : true))
      .map((c) => ({
        date: c.date,
        lPer100: c.mileageKm && c.mileageKm > 0 ? (c.liters / c.mileageKm) * 100 : null,
      }))
      .filter((pt) => pt.lPer100 !== null)
      .sort((a, b) => +new Date(a.date) - +new Date(b.date));
    return rows as Array<{ date: Date; lPer100: number }>;
  }, [fuelConsumptions, chartDriver]);

  const addPurchase = () => {
    const newPurchase: FuelPurchase = {
      id: Date.now(),
      ...purchaseForm,
    };
    addFuelPurchase(newPurchase);

    const accountAffected =
      purchaseForm.paymentMethod === "Espèces"
        ? "espece"
        : purchaseForm.paymentMethod === "Chèque"
        ? "cheque"
        : "banque";

    addCashOperation({
      id: Date.now(),
      date: newPurchase.date,
      description: `Achat carburant - ${newPurchase.quantityLiters}L`,
      amount: newPurchase.price,
      type: "retrait",
      category: "Achat",
      paymentMethod: purchaseForm.paymentMethod,
      status: "pending",
      accountAffected,
    });

    setPurchaseDialogOpen(false);
  };

  const addConsumption = () => {
    const newConsumption: FuelConsumption = {
      id: Date.now(),
      ...consumptionForm,
    };
    addFuelConsumption(newConsumption);
    setConsumptionDialogOpen(false);
  };

  const addDrain = () => {
    const newDrain: FuelDrain = {
      id: Date.now(),
      ...drainForm,
    };
    addFuelDrain(newDrain);

    const accountAffected =
      drainForm.paymentMethod === "Espèces"
        ? "espece"
        : drainForm.paymentMethod === "Chèque"
        ? "cheque"
        : "banque";

    addCashOperation({
      id: Date.now(),
      date: newDrain.date,
      description: `Vidange réservoir carburant - ${newDrain.quantityLiters}L`,
      amount: newDrain.price,
      type: "retrait",
      category: "Achat",
      paymentMethod: drainForm.paymentMethod,
      status: "pending",
      accountAffected,
    });

    setDrainDialogOpen(false);
  };

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-4">Gestion du Carburant</h1>

      {/* Stock status */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>État du Stock de Carburant</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-2">
          <CisternTank level={fuelLevelPct} />
          <div className="text-center">
            <p className="text-lg font-bold">
              {currentStockLiters.toFixed(2)} L / {capacity} L
            </p>
            <p className="text-sm text-gray-500">Niveau Actuel / Capacité</p>
          </div>
        </CardContent>
      </Card>

      {/* First row: purchases and consumptions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Purchases + Drains */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Ravitaillements</CardTitle>
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={() => setPurchaseDialogOpen(true)}>
                Ajouter
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setDrainDialogOpen(true)}
              >
                Vider
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Quantité (L)</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Paiement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fuelPurchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{format(p.date, "dd/MM/yyyy")}</TableCell>
                    <TableCell>{p.quantityLiters}</TableCell>
                    <TableCell>{formatMAD(p.price)}</TableCell>
                    <TableCell>{p.paymentMethod}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Consumptions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Consommations</CardTitle>
            <Button size="sm" onClick={() => setConsumptionDialogOpen(true)}>
              Ajouter
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Quantité (L)</TableHead>
                  <TableHead>Chauffeur</TableHead>
                  <TableHead>Camion</TableHead>
                  <TableHead>Kilométrage (km)</TableHead>
                  <TableHead>Conso (L/100km)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fuelConsumptions.map((c) => {
                  const lPer100 =
                    c.mileageKm && c.mileageKm > 0 ? (c.liters / c.mileageKm) * 100 : null;
                  return (
                    <TableRow key={c.id}>
                      <TableCell>{format(c.date, "dd/MM/yyyy")}</TableCell>
                      <TableCell>{c.liters}</TableCell>
                      <TableCell>{c.driver}</TableCell>
                      <TableCell>{c.truck}</TableCell>
                      <TableCell>{c.mileageKm ?? "-"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-sm ${perfBadge(lPer100 ?? undefined)}`}>
                          {lPer100 !== null ? lPer100.toFixed(2) : "-"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Seuils configurables */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Seuils de Performance</CardTitle>
          <CardDescription>Vert / Jaune (L/100km)</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Vert &lt;</Label>
            <Input
              type="number"
              className="col-span-3"
              value={perfLimits.greenMax}
              onChange={(e) =>
                setPerfLimits((prev) => ({
                  ...prev,
                  greenMax: Math.max(0, parseFloat(e.target.value) || 0),
                }))
              }
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Jaune &lt;</Label>
            <Input
              type="number"
              className="col-span-3"
              value={perfLimits.yellowMax}
              onChange={(e) =>
                setPerfLimits((prev) => ({
                  ...prev,
                  yellowMax: Math.max(prev.greenMax, parseFloat(e.target.value) || prev.yellowMax),
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Performance par Chauffeur */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Performance par Chauffeur</CardTitle>
          <CardDescription>Consommation moyenne (L/100km)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chauffeur</TableHead>
                <TableHead>Total L</TableHead>
                <TableHead>Total km</TableHead>
                <TableHead>L/100km</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {driverPerformance.map((d) => (
                <TableRow key={d.driver}>
                  <TableCell>{d.driver}</TableCell>
                  <TableCell>{d.liters.toFixed(2)}</TableCell>
                  <TableCell>{d.km.toFixed(0)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-sm ${perfBadge(d.lPer100 ?? undefined)}`}>
                      {d.lPer100 !== null ? d.lPer100.toFixed(2) : "-"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Graphique simple: évolution L/100km */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Évolution L/100km</CardTitle>
          <CardDescription>Par chauffeur sélectionné</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Chauffeur</Label>
            <Select onValueChange={(value) => setChartDriver(value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Choisir un chauffeur" />
              </SelectTrigger>
              <SelectContent>
                {driversList.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {driverSeries.length === 0 ? (
            <div className="text-sm text-gray-500">Aucune donnée disponible.</div>
          ) : (
            <svg viewBox="0 0 440 200" className="w-full h-auto">
              <line x1="30" y1="170" x2="420" y2="170" stroke="#9ca3af" />
              <line x1="30" y1="20" x2="30" y2="170" stroke="#9ca3af" />

              {(() => {
                const maxY = Math.max(
                  ...driverSeries.map((p) => p.lPer100),
                  perfLimits.yellowMax + 5
                );
                const scaleY = (v: number) => 170 - ((v / maxY) * 150);
                const yGreen = scaleY(perfLimits.greenMax);
                const yYellow = scaleY(perfLimits.yellowMax);
                return (
                  <>
                    <line x1="30" y1={yGreen} x2="420" y2={yGreen} stroke="#22c55e" strokeDasharray="4 4" />
                    <line x1="30" y1={yYellow} x2="420" y2={yYellow} stroke="#f59e0b" strokeDasharray="4 4" />
                  </>
                );
              })()}

              {(() => {
                const n = driverSeries.length;
                const maxY = Math.max(
                  ...driverSeries.map((p) => p.lPer100),
                  perfLimits.yellowMax + 5
                );
                const scaleX = (i: number) => 30 + (i * (390 / Math.max(1, n - 1)));
                const scaleY = (v: number) => 170 - ((v / maxY) * 150);
                const points = driverSeries
                  .map((p, i) => `${scaleX(i)},${scaleY(p.lPer100)}`)
                  .join(" ");
                return <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="2" />;
              })()}
            </svg>
          )}
        </CardContent>
      </Card>

      {/* قسم الزيت مدمج داخل نفس الصفحة */}
      <div className="mt-8">
        <OilManagement />
      </div>

      {/* Purchase Dialog */}
      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un Ravitaillement</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Quantité (L)
              </Label>
              <Input
                id="quantity"
                type="number"
                className="col-span-3"
                onChange={(e) =>
                  setPurchaseForm({
                    ...purchaseForm,
                    quantityLiters: parseFloat(e.target.value),
                  })
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Prix (MAD)
              </Label>
              <Input
                id="price"
                type="number"
                className="col-span-3"
                onChange={(e) =>
                  setPurchaseForm({
                    ...purchaseForm,
                    price: parseFloat(e.target.value),
                  })
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment" className="text-right">
                Paiement
              </Label>
              <Select
                onValueChange={(value) =>
                  setPurchaseForm({
                    ...purchaseForm,
                    paymentMethod: value as "Espèces" | "Chèque" | "Virement",
                  })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Méthode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Espèces">Espèces</SelectItem>
                  <SelectItem value="Chèque">Chèque</SelectItem>
                  <SelectItem value="Virement">Virement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={addPurchase}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Consumption Dialog */}
      <Dialog open={consumptionDialogOpen} onOpenChange={setConsumptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une Consommation</DialogTitle>
            <DialogDescription>
              Enregistrez le carburant utilisé par un camion.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="liters" className="text-right">
                Litres
              </Label>
              <Input
                id="liters"
                type="number"
                className="col-span-3"
                onChange={(e) =>
                  setConsumptionForm({
                    ...consumptionForm,
                    liters: parseFloat(e.target.value),
                  })
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="driver" className="text-right">
                Chauffeur
              </Label>
              <Select
                onValueChange={(value) => {
                  const selectedDriver = drivers.find((d) => d.id === value);
                  setConsumptionForm({
                    ...consumptionForm,
                    driver: selectedDriver ? selectedDriver.name : "",
                    truck: "", // Reset truck selection
                  });
                  setSelectedDriverId(value);
                }}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Sélectionner un chauffeur" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="truck" className="text-right">
                Camion
              </Label>
              <Select
                onValueChange={(value) =>
                  setConsumptionForm({ ...consumptionForm, truck: value })
                }
                value={consumptionForm.truck}
                disabled={!selectedDriverId}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Sélectionner un camion" />
                </SelectTrigger>
                <SelectContent>
                  {trucks
                    .filter((truck) => {
                      const driver = drivers.find(d => d.id === selectedDriverId);
                      const driverIndex = drivers.findIndex(d => d.id === selectedDriverId);
                      // This is a temporary workaround because truck.driverId is not available
                      // It assumes the first truck belongs to the first driver, second to second, etc.
                      if (driver && trucks[driverIndex]) {
                        return truck.id === trucks[driverIndex].id;
                      }
                      return false;
                    })
                    .map((truck) => (
                      <SelectItem key={truck.id} value={truck.matricule}>
                        {truck.matricule}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {/* Nouveau: Kilométrage */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mileage" className="text-right">
                Kilométrage (km)
              </Label>
              <Input
                id="mileage"
                type="number"
                className="col-span-3"
                onChange={(e) =>
                  setConsumptionForm({
                    ...consumptionForm,
                    mileageKm: parseFloat(e.target.value),
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={addConsumption}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drain Dialog */}
      <Dialog open={drainDialogOpen} onOpenChange={setDrainDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vider le réservoir</DialogTitle>
            <DialogDescription>
              Enregistrez une vidange du réservoir. Cela peut être utilisé pour enregistrer la vente de carburant ou corriger le stock.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="drain-quantity" className="text-right">
                Quantité (L)
              </Label>
              <Input
                id="drain-quantity"
                type="number"
                className="col-span-3"
                onChange={(e) =>
                  setDrainForm({
                    ...drainForm,
                    quantityLiters: parseFloat(e.target.value),
                  })
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="drain-price" className="text-right">
                Prix (MAD)
              </Label>
              <Input
                id="drain-price"
                type="number"
                className="col-span-3"
                onChange={(e) =>
                  setDrainForm({
                    ...drainForm,
                    price: parseFloat(e.target.value),
                  })
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="drain-payment" className="text-right">
                Paiement
              </Label>
              <Select
                onValueChange={(value) =>
                  setDrainForm({
                    ...drainForm,
                    paymentMethod: value as "Espèces" | "Chèque" | "Virement",
                  })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Méthode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Espèces">Espèces</SelectItem>
                  <SelectItem value="Chèque">Chèque</SelectItem>
                  <SelectItem value="Virement">Virement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={addDrain}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FuelManagement;