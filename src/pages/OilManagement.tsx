import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
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
import { OilPurchase, OilConsumption, OilDrain } from "@/types";
import { format } from "date-fns";
import React from "react";
import { Plus, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OilBarrelProps {
  level: number; // Percentage from 0 to 100
}

const OilBarrel: React.FC<OilBarrelProps> = ({ level }) => {
  const color = level < 30 ? "#ef4444" : level < 60 ? "#f59e0b" : "#22c55e";
  const fillHeight = Math.max(0, Math.min(100, level));

  return (
    <div className="relative w-32 h-40 mx-auto">
      <svg viewBox="0 0 100 120" className="w-full h-full">
        <defs>
          <clipPath id="barrelClip">
            <path d="M 20 10 C 10 20, 10 100, 20 110 H 80 C 90 100, 90 20, 80 10 Z" />
          </clipPath>
        </defs>

        {/* Barrel background */}
        <path d="M 20 10 C 10 20, 10 100, 20 110 H 80 C 90 100, 90 20, 80 10 Z" fill="#e5e7eb" />

        {/* Oil liquid */}
        <g clipPath="url(#barrelClip)">
          <rect
            x="10"
            y={10 + 100 * (1 - fillHeight / 100)}
            width="80"
            height={100 * (fillHeight / 100)}
            fill={color}
            style={{ transition: "y 0.7s ease-in-out, height 0.7s ease-in-out" }}
          />
        </g>

        {/* Barrel outline and details */}
        <path d="M 20 10 C 10 20, 10 100, 20 110 H 80 C 90 100, 90 20, 80 10 Z" fill="none" stroke="#9ca3af" strokeWidth="2" />
        <path d="M 12 40 C 5 45, 5 75, 12 80" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
        <path d="M 88 40 C 95 45, 95 75, 88 80" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold text-gray-700">{level.toFixed(1)}%</span>
      </div>
    </div>
  );
};

function OilManagement() {
  const {
    oilPurchases,
    addOilPurchase,
    oilConsumptions,
    addOilConsumption,
    oilDrains,
    addOilDrain,
    addCashOperation,
  } = useApp();

  // Barils: تعريف وحيد
  const [barrelCount, setBarrelCount] = useState<number>(() => {
    const raw = localStorage.getItem("oilManagement.barrelCount");
    return raw ? parseInt(raw) : 2;
  });
  useEffect(() => {
    localStorage.setItem("oilManagement.barrelCount", barrelCount.toString());
  }, [barrelCount]);
  const adjustBarrelCount = (delta: number) => {
    setBarrelCount((prev) => Math.max(1, Math.min(20, prev + delta)));
  };
  const barrels = Array.from({ length: Math.max(1, barrelCount) }, (_, i) => i);

  // تكوين البراميل: الاسم والسعة (يستخدم نفس barrelCount بدون إعادة تعريف)
  const [barrelsConfig, setBarrelsConfig] = useState<Array<{ name: string; capacityLiters: number }>>(() => {
    const raw = localStorage.getItem("oilManagement.barrelsConfig");
    const initial = raw
      ? JSON.parse(raw)
      : Array.from({ length: barrelCount }, (_, i) => ({ name: `Baril ${i + 1}`, capacityLiters: 220 }));
    return initial.slice(0, barrelCount);
  });
  useEffect(() => {
    setBarrelsConfig((prev) => {
      const next = Array.from({ length: barrelCount }, (_, i) => prev[i] || { name: `Baril ${i + 1}`, capacityLiters: 220 });
      localStorage.setItem("oilManagement.barrelsConfig", JSON.stringify(next));
      return next;
    });
  }, [barrelCount]);

  // Initialize localStorage structures used by dashboard widget
  useEffect(() => {
    if (!localStorage.getItem("oilManagement.purchases")) {
      const lsPurchases = (oilPurchases || []).map((p) => ({ date: p.date, quantityLiters: (p.quantity || 0) * 220 }));
      localStorage.setItem("oilManagement.purchases", JSON.stringify(lsPurchases));
    }
    if (!localStorage.getItem("oilManagement.consumptions")) {
      const lsConsumptions = (oilConsumptions || []).map((c) => ({ date: c.date, quantityLiters: (c.quantity || 0) * 220 }));
      localStorage.setItem("oilManagement.consumptions", JSON.stringify(lsConsumptions));
    }
    if (!localStorage.getItem("oilManagement.baseStockLiters")) {
      localStorage.setItem("oilManagement.baseStockLiters", "0");
    }
  }, []);
  const baseStock = 0; // Starting stock in barrels


  const formatMAD = (amount: number) =>
    new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD", minimumFractionDigits: 2 }).format(amount);

  // NEW: سعة لكل عملية (يُستخدم لحساب عمود Litres)
  const [purchaseCapacityLiters, setPurchaseCapacityLiters] = useState<number>(220);
  const [consumptionCapacityLiters, setConsumptionCapacityLiters] = useState<number>(220);
  const [drainCapacityLiters, setDrainCapacityLiters] = useState<number>(220);

  // خرائط السعات لكل صف (id -> سعة اللتر للبرميل)
  const purchaseCapacities = useMemo<Record<string | number, number>>(() => {
    try { return JSON.parse(localStorage.getItem("oilManagement.purchaseCapacities") || "{}"); }
    catch { return {}; }
  }, [oilPurchases]);
  const consumptionCapacities = useMemo<Record<string | number, number>>(() => {
    try { return JSON.parse(localStorage.getItem("oilManagement.consumptionCapacities") || "{}"); }
    catch { return {}; }
  }, [oilConsumptions]);

  // Calculate total purchased, consumed, and drained in Liters
  const totalPurchasedLiters = useMemo(
    () => oilPurchases.reduce((s, p) => s + p.quantity * (purchaseCapacities[p.id] || 220), 0),
    [oilPurchases, purchaseCapacities]
  );
  const totalConsumedLiters = useMemo(
    () => oilConsumptions.reduce((s, c) => s + c.quantity * (consumptionCapacities[c.id] || 220), 0),
    [oilConsumptions, consumptionCapacities]
  );
  const totalDrainedLiters = useMemo(() => oilDrains.reduce((s, d) => s + d.quantity * 220, 0), [oilDrains]); // Assuming 220L for drains

  const totalCapacityLiters = useMemo(
    () => barrelsConfig.reduce((sum, b) => sum + b.capacityLiters, 0),
    [barrelsConfig]
  );

  const baseStockLiters = 0; // Or read from localStorage if you have a base
  const currentStockLiters = baseStockLiters + totalPurchasedLiters - totalConsumedLiters - totalDrainedLiters;

  // حسابات شريط المستوى داخل الدالة
  const oilLevelPct = totalCapacityLiters > 0 ? Math.min(100, Math.max(0, (currentStockLiters / totalCapacityLiters) * 100)) : 0;
  const oilLevelColor =
    oilLevelPct < 30 ? "bg-red-500" : oilLevelPct < 60 ? "bg-yellow-500" : "bg-green-500";

  // Initialize localStorage structures used by dashboard widget
  useEffect(() => {
    if (!localStorage.getItem("oilManagement.purchases")) {
      const lsPurchases = (oilPurchases || []).map((p) => ({ date: p.date, quantityLiters: (p.quantity || 0) * 220 }));
      localStorage.setItem("oilManagement.purchases", JSON.stringify(lsPurchases));
    }
    if (!localStorage.getItem("oilManagement.consumptions")) {
      const lsConsumptions = (oilConsumptions || []).map((c) => ({ date: c.date, quantityLiters: (c.quantity || 0) * 220 }));
      localStorage.setItem("oilManagement.consumptions", JSON.stringify(lsConsumptions));
    }
    if (!localStorage.getItem("oilManagement.baseStockLiters")) {
      localStorage.setItem("oilManagement.baseStockLiters", "0");
    }
  }, []);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [consumptionDialogOpen, setConsumptionDialogOpen] = useState(false);
  const [drainDialogOpen, setDrainDialogOpen] = useState(false);

  const [purchaseForm, setPurchaseForm] = useState<Omit<OilPurchase, "id">>({
    date: new Date(),
    quantity: 0,
    price: 0,
    paymentMethod: "cash",
  });
  const [consumptionForm, setConsumptionForm] = useState<
    Omit<OilConsumption, "id">
  >({
    date: new Date(),
    quantity: 0,
    driver: "",
    truck: "",
  });
  const [drainForm, setDrainForm] = useState<Omit<OilDrain, "id">>({
    date: new Date(),
    quantity: 0,
    price: 0,
    paymentMethod: "cash",
  });

  const addPurchase = () => {
    const newPurchase: OilPurchase = { id: Date.now(), ...purchaseForm };
    addOilPurchase(newPurchase);

    // Persist capacity for this row
    const caps = JSON.parse(localStorage.getItem("oilManagement.purchaseCapacities") || "{}");
    caps[newPurchase.id] = purchaseCapacityLiters;
    localStorage.setItem("oilManagement.purchaseCapacities", JSON.stringify(caps));

    // Mirror purchase in liters for dashboard widget
    const purchasesLS = JSON.parse(localStorage.getItem("oilManagement.purchases") || "[]");
    purchasesLS.push({
      date: newPurchase.date,
      quantityLiters: (purchaseForm.quantity || 0) * purchaseCapacityLiters,
    });
    localStorage.setItem("oilManagement.purchases", JSON.stringify(purchasesLS));

    const accountAffected =
      purchaseForm.paymentMethod === "cash"
        ? "espece"
        : purchaseForm.paymentMethod === "check"
        ? "cheque"
        : "autre";

    addCashOperation({
      id: Date.now(),
      date: newPurchase.date,
      description: `Achat d'huile - ${newPurchase.quantity} barils`,
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
    const newConsumption: OilConsumption = { id: Date.now(), ...consumptionForm };
    addOilConsumption(newConsumption);

    // Persist capacity for this row
    const caps = JSON.parse(localStorage.getItem("oilManagement.consumptionCapacities") || "{}");
    caps[newConsumption.id] = consumptionCapacityLiters;
    localStorage.setItem("oilManagement.consumptionCapacities", JSON.stringify(caps));

    setConsumptionDialogOpen(false);
  };

  const addDrain = () => {
    const newDrain: OilDrain = { id: Date.now(), ...drainForm };
    addOilDrain(newDrain);

    // Treat drain as consumption in liters for dashboard
    const consumptionsLS = JSON.parse(localStorage.getItem("oilManagement.consumptions") || "[]");
    consumptionsLS.push({
      date: newDrain.date,
      quantityLiters: (drainForm.quantity || 0) * drainCapacityLiters,
    });
    localStorage.setItem("oilManagement.consumptions", JSON.stringify(consumptionsLS));

    const accountAffected =
      drainForm.paymentMethod === "cash"
        ? "espece"
        : drainForm.paymentMethod === "check"
        ? "cheque"
        : "autre";

    addCashOperation({
      id: Date.now(),
      date: newDrain.date,
      description: `Vidange barils d'huile - ${newDrain.quantity} barils`,
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
      <h1 className="text-2xl font-bold mb-4">Gestion de l'Huile</h1>

      {/* Stock status */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>État du Stock d'Huile</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-3">
          <OilBarrel level={oilLevelPct} />

          {/* نسبة المستوى + الشارة */}
          <div className="text-center space-y-1">
            <div className="text-lg font-bold">{oilLevelPct.toFixed(1)}%</div>
            <Badge
              variant={oilLevelPct > 70 ? "default" : oilLevelPct > 30 ? "secondary" : "destructive"}
              className="text-xs"
            >
              {oilLevelPct > 70 ? "Niveau optimal" : oilLevelPct > 30 ? "Niveau moyen" : "Niveau bas"}
            </Badge>
          </div>

          {/* Totals in liters */}
          <div className="text-center">
            <p className="text-lg font-bold">
              {Math.round(currentStockLiters)} L / {Math.round(totalCapacityLiters)} L
            </p>
            <p className="text-sm text-gray-500">Stock Actuel / Capacité totale (litres)</p>
          </div>

          {/* Barrels count + mini barrels (like dashboard) */}
          <div className="w-full flex items-center justify-between pt-2">
            <Label className="text-sm text-muted-foreground">Barils:</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => adjustBarrelCount(-1)} disabled={barrelCount <= 1}>
                <Minus className="w-4 h-4" />
              </Button>
              <span className="text-base font-medium w-10 text-center">{barrelCount}</span>
              <Button variant="outline" size="sm" onClick={() => adjustBarrelCount(1)} disabled={barrelCount >= 20}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {barrels.slice(0, 8).map((i) => (
              <div key={i} className="relative w-8 h-10">
                <div className="absolute inset-0 bg-gradient-to-b from-gray-300 to-gray-500 rounded border border-gray-400 shadow-sm">
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-600 transform -translate-y-1/2"></div>
                </div>
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-b transition-all duration-700 ease-out overflow-hidden"
                  style={{
                    height: `${oilLevelPct}%`,
                    background:
                      `linear-gradient(180deg, ${oilLevelPct > 70 ? "#3B82F6" : oilLevelPct > 30 ? "#EAB308" : "#F59E0B"} 0%, ${oilLevelPct > 70 ? "#1E40AF" : oilLevelPct > 30 ? "#CA8A04" : "#D97706"} 100%)`,
                  }}
                />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[6px] font-bold text-gray-700 z-10">
                  OIL
                </div>
              </div>
            ))}
            {barrelCount > 8 && (
              <div className="flex items-center justify-center w-8 h-10 text-xs text-muted-foreground">
                +{barrelCount - 8}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* باقي الصفحة بدون تغيير */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Purchases */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Achats d'huile</CardTitle>
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
                  <TableHead>Quantité (barils)</TableHead>
                  <TableHead>Litres</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Paiement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {oilPurchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{format(p.date, "dd/MM/yyyy")}</TableCell>
                    <TableCell>{p.quantity}</TableCell>
                    <TableCell>{(p.quantity || 0) * (purchaseCapacities[p.id] ?? 220)} L</TableCell>
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
                  <TableHead>Quantité (barils)</TableHead>
                  <TableHead>Litres</TableHead>
                  <TableHead>Chauffeur</TableHead>
                  <TableHead>Camion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {oilConsumptions.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{format(c.date, "dd/MM/yyyy")}</TableCell>
                    <TableCell>{c.quantity}</TableCell>
                    <TableCell>{(c.quantity || 0) * (consumptionCapacities[c.id] ?? 220)} L</TableCell>
                    <TableCell>{c.driver}</TableCell>
                    <TableCell>{c.truck}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Dialog */}
      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un Achat d'Huile</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Quantité (barils)
              </Label>
              <Input
                id="quantity"
                type="number"
                className="col-span-3"
                onChange={(e) =>
                  setPurchaseForm({
                    ...purchaseForm,
                    quantity: parseInt(e.target.value),
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
                    paymentMethod: value as "cash" | "credit" | "check",
                  })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Méthode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
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
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="c-quantity" className="text-right">
                Quantité (barils)
              </Label>
              <Input
                id="c-quantity"
                type="number"
                className="col-span-3"
                onChange={(e) =>
                  setConsumptionForm({
                    ...consumptionForm,
                    quantity: parseInt(e.target.value),
                  })
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="driver" className="text-right">
                Chauffeur
              </Label>
              <Input
                id="driver"
                className="col-span-3"
                onChange={(e) =>
                  setConsumptionForm({ ...consumptionForm, driver: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="truck" className="text-right">
                Camion
              </Label>
              <Input
                id="truck"
                className="col-span-3"
                onChange={(e) =>
                  setConsumptionForm({ ...consumptionForm, truck: e.target.value })
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
            <DialogTitle>Vider barils d'huile</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="d-quantity" className="text-right">
                Quantité (barils)
              </Label>
              <Input
                id="d-quantity"
                type="number"
                className="col-span-3"
                onChange={(e) =>
                  setDrainForm({
                    ...drainForm,
                    quantity: parseInt(e.target.value),
                  })
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="d-price" className="text-right">
                Prix (MAD)
              </Label>
              <Input
                id="d-price"
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
              <Label className="text-right">Capacité par baril (L)</Label>
              <Select onValueChange={(v) => setDrainCapacityLiters(parseInt(v))}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="60">60</SelectItem>
                  <SelectItem value="220">220</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={addDrain}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barrels configuration card: names + capacities */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Configuration des Barils</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {barrelsConfig.map((b, idx) => (
            <div key={idx} className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Nom du baril #{idx + 1}</Label>
              <Input
                className="col-span-1"
                value={b.name}
                onChange={(e) => {
                  const next = [...barrelsConfig];
                  next[idx] = { ...next[idx], name: e.target.value };
                  setBarrelsConfig(next);
                  localStorage.setItem("oilManagement.barrelsConfig", JSON.stringify(next));
                }}
              />
              <Label className="text-right">Capacité (L)</Label>
              <Select
                value={String(b.capacityLiters)}
                onValueChange={(v) => {
                  const next = [...barrelsConfig];
                  next[idx] = { ...next[idx], capacityLiters: parseInt(v) };
                  setBarrelsConfig(next);
                  localStorage.setItem("oilManagement.barrelsConfig", JSON.stringify(next));
                }}
              >
                <SelectTrigger className="col-span-1">
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="60">60</SelectItem>
                  <SelectItem value="220">220</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default OilManagement;