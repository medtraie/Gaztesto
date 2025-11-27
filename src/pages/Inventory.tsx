import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';
import { Package, Edit, TrendingDown, TrendingUp, Eye, EyeOff, Archive, Truck, PackageCheck, AlertTriangle, Plus, Package2, ChevronDown, ChevronUp } from 'lucide-react';
import { AddBottleTypeDialog } from '@/components/dialogs/AddBottleTypeDialog';
import { EditBottleTypeDialog } from '@/components/dialogs/EditBottleTypeDialog';
import { BottleHistoryDialog } from '@/components/dialogs/BottleHistoryDialog';
import { BottleType } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddEmptyStockDialog } from '@/components/dialogs/AddEmptyStockDialog';
import { AddDefectiveStockDialog } from '@/components/dialogs/AddDefectiveStockDialog';
import { format } from 'date-fns';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { safeDate } from '@/lib/utils';

const Inventory = () => {
  const { bottleTypes, emptyBottlesStock = [], defectiveBottles = [], transactions = [], returnOrders = [], foreignBottles = [], trucks = [], drivers = [], supplyOrders = [] } = useApp();
  const [selectedBottle, setSelectedBottle] = useState<BottleType | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [showTotalValue, setShowTotalValue] = useState(false);
  const [selectedEmptyBottleType, setSelectedEmptyBottleType] = useState<BottleType | null>(null);
  const [selectedDefectiveBottleType, setSelectedDefectiveBottleType] = useState<BottleType | null>(null);
  const [emptyStockDialogOpen, setEmptyStockDialogOpen] = useState(false);
  const [defectiveStockDialogOpen, setDefectiveStockDialogOpen] = useState(false);
  const [impactPanelVisible, setImpactPanelVisible] = useState(true);
  const [impactView, setImpactView] = useState<'today' | 'last7days'>('today');
  const [showEmpty, setShowEmpty] = useState(true);
  const [showDefective, setShowDefective] = useState(true);

  const getStockStatus = (remaining: number, total: number) => {
    const percentage = (remaining / total) * 100;
    if (percentage < 20) return { status: 'Critique', variant: 'destructive' as const, icon: TrendingDown };
    if (percentage < 50) return { status: 'Faible', variant: 'secondary' as const, icon: TrendingDown };
    return { status: 'Normal', variant: 'default' as const, icon: TrendingUp };
  };

  const availableBottleTypes = bottleTypes.filter(bt => !bt.name.includes('Détendeur'));
  
  const getEmptyQuantity = (id: string) =>
    emptyBottlesStock.find(s => s.bottleTypeId === id)?.quantity || 0;
  
  const getDefectiveQuantity = (id: string) =>
    defectiveBottles.filter(b => b.bottleTypeId === id).reduce((sum, b) => sum + b.quantity, 0);
  
  const simpleStatus = (qty: number) => {
    if (qty === 0) return { status: 'Vide', variant: 'destructive' as const, icon: TrendingDown };
    if (qty < 50) return { status: 'Faible', variant: 'secondary' as const, icon: TrendingDown };
    return { status: 'Normal', variant: 'default' as const, icon: TrendingUp };
  };

  interface InventoryImpactEvent {
    id: string;
    date: string;
    source: 'supply' | 'return' | 'foreign_add';
    label: string;
    driverName?: string;
    bottleTypeName: string;
    emptyDelta: number;
    fullDelta: number;
    defectiveDelta: number;
    foreignDelta: number;
  }

  const getDriverNameByTruckId = (truckId?: string) => {
    if (!truckId) return undefined;
    const truck = trucks.find(t => t.id === truckId);
    const driver = drivers.find(d => String(d.id) === String(truck?.driverId));
    return driver?.name;
  };

  const getDriverNameForReturn = (ro: any) => {
    if (ro?.driverName) return ro.driverName;
    const so = supplyOrders.find((s: any) => String(s.id) === String(ro?.supplyOrderId));
    if (so?.driverName) return so.driverName;
    const driver = drivers.find(d => String(d.id) === String(ro?.driverId));
    return driver?.name;
  };

  const impactEvents = React.useMemo<InventoryImpactEvent[]>(() => {
    const events: InventoryImpactEvent[] = [];

    // تغذية الشاحنة — تقلّل Pleins
    transactions
      .filter(t => t.type === 'supply')
      .forEach(tx => {
        (tx.bottleTypes || []).forEach((bt: any) => {
          const bottleName = bottleTypes.find(b => b.id === bt.bottleTypeId)?.name || 'Inconnu';
          events.push({
            id: `supply-${tx.id || `${tx.date}-${bt.bottleTypeId}`}`,
            date: tx.date,
            source: 'supply',
            label: 'تغذية الشاحنة',
            driverName: getDriverNameByTruckId(tx.truckId),
            bottleTypeName: bottleName,
            emptyDelta: 0,
            fullDelta: -Number(bt.quantity || 0),
            defectiveDelta: 0,
            foreignDelta: 0,
          });
        });
      });

    // B.D Retour — تأثير مفصّل
    (returnOrders || []).forEach((ro: any) => {
      (ro.items || []).forEach((item: any) => {
        const emptyDelta =
          (Number(item.returnedEmptyQuantity || 0)) -
          (Number(item.consigneQuantity || 0)) -
          (Number(item.lostQuantity || 0)) -
          (Number(item.foreignQuantity || 0));

        events.push({
          id: `return-${ro.id}-${item.bottleTypeId}`,
          date: ro.date,
          source: 'return',
          label: `B.D - Retour B.S ${ro.supplyOrderNumber || ''}`,
          driverName: getDriverNameForReturn(ro),
          bottleTypeName: item.bottleTypeName,
          emptyDelta,
          fullDelta: Number(item.returnedFullQuantity || 0),
          defectiveDelta: Number(item.defectiveQuantity || 0),
          foreignDelta: Number(item.foreignQuantity || 0),
        });
      });
    });

    // إضافات أجنبي مباشرة فقط (غير المرتبطة بـ B.D)
    (foreignBottles || [])
      .filter((fb: any) => !fb.returnOrderId || fb.returnOrderId === 'direct')
      .forEach((fb: any) => {
        events.push({
          id: `foreign-${fb.id}`,
          date: fb.date,
          source: 'foreign_add',
          label: `إضافة أجنبي (${fb.companyName})`,
          driverName: undefined,
          bottleTypeName: fb.bottleType,
          emptyDelta: -Number(fb.quantity || 0),
          fullDelta: 0,
          defectiveDelta: 0,
          foreignDelta: Number(fb.quantity || 0),
        });
      });

    return events.sort((a, b) => safeDate(b.date).getTime() - safeDate(a.date).getTime());
  }, [transactions, returnOrders, foreignBottles, bottleTypes, trucks, drivers, supplyOrders]);

  const { filteredImpactEvents, summaryTotals, summaryTitle } = React.useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const filtered = impactEvents.filter(event => {
      const eventDate = safeDate(event.date);
      if (impactView === 'today') {
        return eventDate >= today;
      }
      if (impactView === 'last7days') {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);
        return eventDate >= sevenDaysAgo;
      }
      return false;
    });

    const totals = filtered.reduce(
      (acc, event) => {
        acc.empty += event.emptyDelta;
        acc.full += event.fullDelta;
        acc.defective += event.defectiveDelta;
        acc.foreign += event.foreignDelta;
        return acc;
      },
      { empty: 0, full: 0, defective: 0, foreign: 0 }
    );

    const title = impactView === 'today' ? "Résumé du jour" : "Résumé des 7 derniers jours";

    return { filteredImpactEvents: filtered, summaryTotals: totals, summaryTitle: title };
  }, [impactEvents, impactView]);

  const last7DaysEvents = React.useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return impactEvents.filter(e => safeDate(e.date) >= cutoff);
  }, [impactEvents]);

  const totalsLast7 = React.useMemo(() => {
    return last7DaysEvents.reduce(
      (acc, e) => {
        acc.empty += e.emptyDelta;
        acc.full += e.fullDelta;
        acc.defective += e.defectiveDelta;
        acc.foreign += e.foreignDelta;
        return acc;
      },
      { empty: 0, full: 0, defective: 0, foreign: 0 }
    );
  }, [last7DaysEvents]);

  const eventsToday = React.useMemo(() => {
    const today = new Date();
    return impactEvents.filter((e) => {
      const d = safeDate(e.date);
      return (
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      );
    });
  }, [impactEvents]);

  const totalsToday = React.useMemo(() => {
    return eventsToday.reduce(
      (acc, e) => {
        acc.empty += e.emptyDelta;
        acc.full += e.fullDelta;
        acc.defective += e.defectiveDelta;
        acc.foreign += e.foreignDelta;
        return acc;
      },
      { empty: 0, full: 0, defective: 0, foreign: 0 }
    );
  }, [eventsToday]);

  const fmtDelta = (n: number) => (n > 0 ? `+${n}` : `${n}`);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventaire</h1>
          <p className="text-muted-foreground mt-1">
            Gestion des stocks de bouteilles et accessoires
          </p>
        </div>
        <AddBottleTypeDialog />
      </div>

      {/* Inventory Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {bottleTypes.map((bottle) => {
          const stockInfo = getStockStatus(bottle.remainingQuantity, bottle.totalQuantity);
          const distributionRate = (bottle.distributedQuantity / bottle.totalQuantity) * 100;
          
          return (
            <Card key={bottle.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{bottle.name}</CardTitle>
                  <Badge variant={stockInfo.variant} className="flex items-center gap-1">
                    <stockInfo.icon className="w-3 h-3" />
                    {stockInfo.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{bottle.capacity}</p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Stock Overview */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Stock restant</span>
                    <span className="font-medium">{bottle.remainingQuantity}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all" 
                      style={{ 
                        width: `${Math.min((bottle.remainingQuantity / bottle.totalQuantity) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>

                {/* Stock Details */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-semibold">{bottle.totalQuantity}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Distribuée</p>
                    <p className="font-semibold">{bottle.distributedQuantity}</p>
                  </div>
                </div>

                {/* Distribution Rate */}
                <div className="border-t pt-3">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Taux de distribution</span>
                    <span className="font-medium">{distributionRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-1.5">
                    <div 
                      className="bg-success h-1.5 rounded-full transition-all" 
                      style={{ width: `${Math.min(distributionRate, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      setSelectedBottle(bottle);
                      setEditDialogOpen(true);
                    }}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Modifier
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      setSelectedBottle(bottle);
                      setHistoryDialogOpen(true);
                    }}
                  >
                    Historique
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Résumé de l'inventaire</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
            <div className="text-center">
              <Archive className="w-8 h-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-primary">
                {bottleTypes.reduce((sum, bt) => sum + bt.totalQuantity, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total général</div>
            </div>
            <div className="text-center">
              <Truck className="w-8 h-8 text-success mx-auto mb-2" />
              <div className="text-2xl font-bold text-success">
                {bottleTypes.reduce((sum, bt) => sum + bt.distributedQuantity, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Distribuées</div>
            </div>
            <div className="text-center">
              <PackageCheck className="w-8 h-8 mx-auto mb-2" />
              <div className="text-2xl font-bold">
                {bottleTypes.reduce((sum, bt) => sum + bt.remainingQuantity, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Restantes</div>
            </div>
            <div className="text-center">
              <Button variant="ghost" size="icon" onClick={() => setShowTotalValue(!showTotalValue)} className="mx-auto mb-2">
                {showTotalValue ? <EyeOff className="w-8 h-8" /> : <Eye className="w-8 h-8" />}
              </Button>
              {showTotalValue ? (
                <div className="text-2xl font-bold text-primary">
                  {bottleTypes.reduce((sum, bt) => sum + (bt.remainingQuantity * bt.unitPrice), 0).toLocaleString()} DH
                </div>
              ) : (
                <div className="text-2xl font-bold text-primary">...</div>
              )}
              <div className="text-sm text-muted-foreground">Valeur totale</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle>Suivi d'impact du stock</CardTitle>
            <p className="text-sm text-muted-foreground">Résumé et dernières modifications</p>
          </div>
      
          <div className="flex items-center gap-2">
            <ToggleGroup
              type="single"
              value={impactView}
              onValueChange={(v) => v && setImpactView(v as 'today' | 'last7days')}
            >
              <ToggleGroupItem value="today" aria-label="Résumé du jour">
                Résumé du jour
              </ToggleGroupItem>
              <ToggleGroupItem value="last7days" aria-label="Résumé des 7 derniers jours">
                7 derniers jours
              </ToggleGroupItem>
            </ToggleGroup>
      
            <Button variant="outline" size="sm" onClick={() => setImpactPanelVisible((p) => !p)}>
              {impactPanelVisible ? 'Masquer' : 'Afficher'}
            </Button>
          </div>
        </CardHeader>
      
        {impactPanelVisible && (
          <CardContent className="space-y-6">
            {/* Résumé */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">{summaryTitle} — Δ Vides</div>
                <div className="text-2xl font-bold">{fmtDelta(summaryTotals.empty)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">{summaryTitle} — Δ Pleins</div>
                <div className="text-2xl font-bold">{fmtDelta(summaryTotals.full)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">{summaryTitle} — Δ Défectueuses</div>
                <div className="text-2xl font-bold">{fmtDelta(summaryTotals.defective)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">{summaryTitle} — Δ Étrangères</div>
                <div className="text-2xl font-bold">{fmtDelta(summaryTotals.foreign)}</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">Transactions récentes</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Opération</TableHead>
                    <TableHead>Chauffeur</TableHead>
                    <TableHead>Inventaire</TableHead>
                    <TableHead className="text-right">Quantité</TableHead>
                  </TableRow>
                </TableHeader>
              
                <TableBody>
                  {filteredImpactEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Aucune transaction
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredImpactEvents.map((e) => {
                      const primary =
                        e.emptyDelta !== 0
                          ? { kind: 'Vides', qty: e.emptyDelta }
                          : e.fullDelta !== 0
                          ? { kind: 'Pleins', qty: e.fullDelta }
                          : e.defectiveDelta !== 0
                          ? { kind: 'Défectueuses', qty: e.defectiveDelta }
                          : e.foreignDelta !== 0
                          ? { kind: 'Étrangères', qty: e.foreignDelta }
                          : { kind: '-', qty: 0 };
              
                      return (
                        <TableRow key={e.id}>
                          <TableCell>{format(safeDate(e.date), 'dd/MM/yyyy HH:mm')}</TableCell>
                          <TableCell>{e.label}</TableCell>
                          <TableCell>{e.driverName || '-'}</TableCell>
                          <TableCell>{e.bottleTypeName} — {primary.kind}</TableCell>
                          <TableCell className="text-right">{fmtDelta(primary.qty)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Empty & Defective Stock inside Inventory */}
      <div className="space-y-8">
        {/* Empty bottles section */}
        <div>
          <h2 className="text-xl font-semibold">Stock Vides</h2>
          <p className="text-muted-foreground mb-4">Gestion des stocks de bouteilles vides</p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {availableBottleTypes.map((bottle) => {
              const qty = getEmptyQuantity(bottle.id);
              const info = simpleStatus(qty);
              return (
                <Card key={bottle.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{bottle.name}</CardTitle>
                      <Badge variant={info.variant} className="flex items-center gap-1">
                        <info.icon className="w-3 h-3" />
                        {info.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{bottle.capacity}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Bouteilles vides</span>
                      <span className="font-medium text-2xl">{qty}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => { setSelectedEmptyBottleType(bottle); setEmptyStockDialogOpen(true); }}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Ajouter Stock
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Defective bottles section */}
        <div>
          <h2 className="text-xl font-semibold">Stock de Bouteilles Défectueuses</h2>
          <p className="text-muted-foreground mb-4">Gestion des stocks de bouteilles défectueuses</p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {availableBottleTypes.map((bottle) => {
              const qty = getDefectiveQuantity(bottle.id);
              const info = simpleStatus(qty);
              return (
                <Card key={bottle.id} className="hover:shadow-lg transition-shadow border-destructive/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{bottle.name}</CardTitle>
                      <Badge variant={info.variant} className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {info.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{bottle.capacity}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Bouteilles défectueuses</span>
                      <span className="font-medium text-2xl text-destructive">{qty}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-destructive/40 hover:bg-destructive/10"
                      onClick={() => { setSelectedDefectiveBottleType(bottle); setDefectiveStockDialogOpen(true); }}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Ajouter Stock
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Empty bottles table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package2 className="h-5 w-5" />
                Total des Bouteilles Vides: {emptyBottlesStock.reduce((sum, s) => sum + s.quantity, 0)}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowEmpty(!showEmpty)}>
                {showEmpty ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CardTitle>
          </CardHeader>
          {showEmpty && (
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Quantité</TableHead>
                    <TableHead>Dernière Mise à Jour</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emptyBottlesStock.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Aucune bouteille vide en stock
                      </TableCell>
                    </TableRow>
                  ) : (
                    emptyBottlesStock.map((stock) => (
                      <TableRow key={stock.id}>
                        <TableCell className="font-medium">{stock.bottleTypeName}</TableCell>
                        <TableCell className="text-right">{stock.quantity}</TableCell>
                        <TableCell>{format(safeDate(stock.lastUpdated), 'dd/MM/yyyy HH:mm')}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>

        {/* Defective bottles table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Total des Bouteilles Défectueuses: {defectiveBottles.reduce((sum, d) => sum + (d.quantity || 0), 0)}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowDefective(!showDefective)}>
                {showDefective ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CardTitle>
          </CardHeader>
          {showDefective && (
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Quantité</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {defectiveBottles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Aucune bouteille défectueuse en stock
                      </TableCell>
                    </TableRow>
                  ) : (
                    defectiveBottles.map((defective) => (
                      <TableRow key={defective.id}>
                        <TableCell className="font-medium">{defective.bottleTypeName}</TableCell>
                        <TableCell className="text-right text-destructive">{defective.quantity}</TableCell>
                        <TableCell>{format(safeDate(defective.date), 'dd/MM/yyyy HH:mm')}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Dialogs */}
      {selectedBottle && (
        <>
          <EditBottleTypeDialog
            bottle={selectedBottle}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
          />
          <BottleHistoryDialog
            bottle={selectedBottle}
            open={historyDialogOpen}
            onOpenChange={setHistoryDialogOpen}
          />
        </>
      )}
      {selectedEmptyBottleType && (
        <AddEmptyStockDialog
          bottleType={selectedEmptyBottleType}
          open={emptyStockDialogOpen}
          onOpenChange={setEmptyStockDialogOpen}
        />
      )}
      {selectedDefectiveBottleType && (
        <AddDefectiveStockDialog
          bottleType={selectedDefectiveBottleType}
          open={defectiveStockDialogOpen}
          onOpenChange={setDefectiveStockDialogOpen}
        />
      )}
    </div>
  );
};

export default Inventory;