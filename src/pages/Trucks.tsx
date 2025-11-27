import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { AddTruckDialog } from '@/components/dialogs/AddTruckDialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Truck, Users, PauseCircle, History, Download, Printer, Play, UserX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

const Trucks = () => {
  const { trucks, drivers, updateTruck, bulkSetRepos, bulkReactivate, bulkDissociateDriver, driverHasActiveTruck, truckAssignments } = useApp();
  const { toast } = useToast();

  // تأكيد تغيير سائق لصف واحد
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingChange, setPendingChange] = useState<{ truckId: string; newDriverId: string } | null>(null);

  // بحث وفلاتر وفرز
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<{ active: boolean; inactive: boolean; noDriver: boolean }>(() => {
    const saved = localStorage.getItem('truckFilters');
    return saved ? JSON.parse(saved) : { active: true, inactive: true, noDriver: false };
  });
  const [sortBy, setSortBy] = useState<'status' | 'name' | 'updatedAt'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // تحديد جماعي
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleSelected = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const clearSelection = () => setSelected(new Set());

  // تصفية وفرز الشاحنات
  const filteredTrucks = useMemo(() => {
    return trucks
      .filter(t => {
        const driver = drivers.find(d => d.id === t.driverId);
        const matchesSearch =
          t.matricule.toLowerCase().includes(search.toLowerCase()) ||
          (driver?.name || '').toLowerCase().includes(search.toLowerCase());
        const includeByStatus =
          (filters.active && t.isActive) ||
          (filters.inactive && !t.isActive);
        const includeNoDriver = filters.noDriver ? !t.driverId : true;
        return matchesSearch && includeByStatus && includeNoDriver;
      })
      .sort((a, b) => {
        if (sortBy === 'status') {
          const cmp = a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1;
          return cmp * (sortOrder === 'asc' ? 1 : -1);
        }
        if (sortBy === 'name') {
          const an = (drivers.find(d => d.id === a.driverId)?.name || '').toLowerCase();
          const bn = (drivers.find(d => d.id === b.driverId)?.name || '').toLowerCase();
          const cmp = an.localeCompare(bn);
          return cmp * (sortOrder === 'asc' ? 1 : -1);
        }
        const ad = a.updatedAt ? Date.parse(a.updatedAt) : 0;
        const bd = b.updatedAt ? Date.parse(b.updatedAt) : 0;
        const cmp = ad - bd;
        return cmp * (sortOrder === 'asc' ? 1 : -1);
      });
  }, [trucks, drivers, search, filters, sortBy, sortOrder]);

  // يجب أن يُحسب بعد filteredTrucks
  const allSelected = selected.size > 0 && selected.size === filteredTrucks.length;

  // إحصائيات
  const totalTrucks = trucks.length;
  const totalDrivers = drivers.length;
  const inactiveTrucks = trucks.filter(t => !t.isActive).length;

  // حفظ الفلاتر
  const saveFilters = (next: typeof filters) => {
    setFilters(next);
    localStorage.setItem('truckFilters', JSON.stringify(next));
  };

  // تصدير CSV
  const exportCSV = () => {
    const rows = [
      ['Matricule', 'Chauffeur', 'Statut', 'Dernière activité', 'Repos (raison)', 'Retour prévu'],
      ...filteredTrucks.map(t => {
        const driver = drivers.find(d => d.id === t.driverId)?.name || '';
        return [
          t.matricule,
          driver,
          t.isActive ? 'Actif' : 'Inactif',
          t.updatedAt ? new Date(t.updatedAt).toLocaleString() : '',
          t.reposReason || '',
          t.nextReturnDate || ''
        ];
      })
    ];
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'camions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Camions</h1>
          <p className="text-muted-foreground mt-1">
            Tableau des camions et chauffeurs
          </p>
        </div>
        <AddTruckDialog />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Camions</p>
            <div className="text-2xl font-bold">{totalTrucks}</div>
          </div>
          <Truck className="h-8 w-8 text-primary" aria-label="Camions" />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Chauffeurs</p>
            <div className="text-2xl font-bold">{totalDrivers}</div>
          </div>
          <Users className="h-8 w-8 text-primary" aria-label="Chauffeurs" />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">En repos (Inactif)</p>
            <div className="text-2xl font-bold">{inactiveTrucks}</div>
          </div>
          <PauseCircle className="h-8 w-8 text-primary" aria-label="En repos" />
        </Card>
      </div>

      {/* Controls: search, filters, sort, export/print */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Recherche par matricule ou chauffeur..."
            className="max-w-sm"
          />
          <div className="flex items-center gap-2">
            <Checkbox checked={filters.active} onCheckedChange={(v) => saveFilters({ ...filters, active: Boolean(v) })} />
            <span>Actif</span>
            <Checkbox checked={filters.inactive} onCheckedChange={(v) => saveFilters({ ...filters, inactive: Boolean(v) })} />
            <span>Inactif</span>
            <Checkbox checked={filters.noDriver} onCheckedChange={(v) => saveFilters({ ...filters, noDriver: Boolean(v) })} />
            <span>Sans chauffeur</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" onClick={() => setSortBy('status')}>Trier: Statut</Button>
            <Button variant="outline" onClick={() => setSortBy('name')}>Trier: Chauffeur</Button>
            <Button variant="outline" onClick={() => setSortBy('updatedAt')}>Trier: Dernière activité</Button>
            <Button variant="ghost" onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}>
              {sortOrder === 'asc' ? 'Asc' : 'Desc'}
            </Button>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" /> Imprimer
            </Button>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => {
              const ids = Array.from(selected);
              bulkSetRepos(ids);
              clearSelection();
              toast({ title: 'Mis en repos', description: `${ids.length} camion(s) mis en repos` });
            }}>
              Mettre en repos
            </Button>
            <Button variant="secondary" onClick={() => {
              const ids = Array.from(selected);
              bulkReactivate(ids);
              clearSelection();
              toast({ title: 'Réactivés', description: `${ids.length} camion(s) réactivé(s)` });
            }}>
              Réactiver
            </Button>
            <Button variant="secondary" onClick={() => {
              const ids = Array.from(selected);
              bulkDissociateDriver(ids);
              clearSelection();
              toast({ title: 'Chauffeurs dissociés', description: `${ids.length} camion(s)` });
            }}>
              Dissocier chauffeur
            </Button>
            <Button variant="ghost" onClick={clearSelection}>Effacer la sélection</Button>
          </div>
        )}
      </Card>

      {/* Trucks Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Checkbox
                  checked={selected.size > 0 && allSelected}
                  onCheckedChange={(v) => {
                    if (v) setSelected(new Set(filteredTrucks.map(t => t.id)));
                    else clearSelection();
                  }}
                />
              </TableHead>
              <TableHead>Matricule</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Chauffeur</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Dernière activité</TableHead>
              <TableHead>Actions</TableHead>
              <TableHead>Changer le chauffeur</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTrucks.map((truck) => {
              const currentDriver = drivers.find(d => d.id === truck.driverId);
              const statusLabel = truck.isActive ? 'Actif' : 'Inactif';
              const statusVariant: 'default' | 'secondary' = truck.isActive ? 'default' : 'secondary';

              return (
                <TableRow key={truck.id}>
                  <TableCell>
                    <Checkbox checked={selected.has(truck.id)} onCheckedChange={() => toggleSelected(truck.id)} aria-label={`Select ${truck.matricule}`} />
                  </TableCell>
                  <TableCell>{truck.matricule}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {truck.truckType === 'camion' ? 'Camion' : 
                       truck.truckType === 'remorque' ? 'Remorque' : 
                       'Allogaz'}
                    </Badge>
                  </TableCell>
                  <TableCell>{currentDriver?.name || 'N/A'}</TableCell>
                  <TableCell className="space-y-1">
                    <Badge variant={statusVariant} aria-label={`Statut: ${statusLabel}`}>{statusLabel}</Badge>
                    {!truck.isActive && (truck.nextReturnDate || truck.reposReason) && (
                      <div className="text-xs text-muted-foreground">
                        {truck.nextReturnDate ? `Reprise: ${truck.nextReturnDate}` : null}
                        {truck.reposReason ? ` • Raison: ${truck.reposReason}` : null}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{truck.updatedAt ? new Date(truck.updatedAt).toLocaleString() : '-'}</TableCell>
                  <TableCell className="space-x-1">
                    {truck.isActive ? (
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateTruck(truck.id, { isActive: false })}
                        title="Mettre en repos"
                      >
                        <PauseCircle className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateTruck(truck.id, { isActive: true, reposReason: undefined, nextReturnDate: undefined })}
                        title="Réactiver"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateTruck(truck.id, { driverId: '' })}
                      title="Dissocier chauffeur"
                    >
                      <UserX className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="h-8 w-8"
                          title="Historique"
                        >
                          <History className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Historique des chauffeurs</AlertDialogTitle>
                          <AlertDialogDescription>
                            Journal des changements pour {truck.matricule}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-3 max-h-[50vh] overflow-auto">
                          {truckAssignments.filter(a => a.truckId === truck.id).map(a => (
                            <div key={a.id} className="text-sm">
                              <div className="font-medium">{new Date(a.date).toLocaleString()}</div>
                              <div>{(drivers.find(d => d.id === a.prevDriverId)?.name || '') ? `${drivers.find(d => d.id === a.prevDriverId)?.name} → ${drivers.find(d => d.id === a.driverId)?.name}` : drivers.find(d => d.id === a.driverId)?.name}</div>
                              {a.note ? <div className="text-muted-foreground">{a.note}</div> : null}
                            </div>
                          ))}
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Fermer</AlertDialogCancel>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={truck.driverId || ''}
                      onValueChange={(value) => {
                        // منع التعارض: لا تعيّن سائق لديه شاحنة نشطة أخرى دون تأكيد
                        const conflict = driverHasActiveTruck(value);
                        if (conflict && conflict.id !== truck.id) {
                          setPendingChange({ truckId: truck.id, newDriverId: value });
                          setConfirmOpen(true);
                          return;
                        }
                        setPendingChange({ truckId: truck.id, newDriverId: value });
                        setConfirmOpen(true);
                      }}
                    >
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Sélectionner un chauffeur" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers.map(driver => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Confirmation dialog (single row driver change) */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le changement de chauffeur</AlertDialogTitle>
            <AlertDialogDescription>
              Le chauffeur est déjà assigné à un autre camion actif. Confirmer le changement mettra l'autre camion en repos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingChange(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingChange) {
                  const { truckId, newDriverId } = pendingChange;
                  // اجعل أي شاحنة أخرى يقودها نفس السائق غير نشطة
                  const otherTrucksWithSameDriver = trucks.filter(
                    (t) => t.driverId === newDriverId && t.id !== truckId
                  );
                  otherTrucksWithSameDriver.forEach((t) => {
                    updateTruck(t.id, { isActive: false });
                  });
                  // حدّث الشاحنة الحالية بالسائق الجديد واجعلها نشطة
                  updateTruck(truckId, { driverId: newDriverId, isActive: true });
                  setPendingChange(null);
                  setConfirmOpen(false);
                  toast({
                    title: "Chauffeur mis à jour",
                    description: "Le chauffeur a été changé avec succès. Les autres camions ont été mis en repos si nécessaire.",
                  });
                }
              }}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Trucks;