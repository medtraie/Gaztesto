// Top-level imports
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Repair } from '@/types';
import { Wrench, Plus, Search, Filter, Calendar, DollarSign, FileText, Truck, FileDown, Play, Pencil, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Repairs = () => {
  const { trucks, drivers, repairs, addRepair, updateRepair, deleteRepair, updateTruck, addExpense, deleteExpense } = useApp();
  const { toast } = useToast();

  const handleDownloadPDF = (repair: Repair) => {
    const doc = new jsPDF();
    const truck = trucks.find(t => t.id === repair.truckId);
    const typeLabel = repair.type === 'mecanique' ? 'Mécanique' : repair.type === 'electrique' ? 'Électrique' : 'Garage';
    const paymentMethodMap: { [key: string]: string } = { especes: 'Espèces', cheque: 'Chèque', virement: 'Virement' };

    doc.text("Détails de la Réparation", 14, 20);

    autoTable(doc, {
      startY: 30,
      head: [['Champ', 'Valeur']],
      body: [
        ['Date', new Date(repair.date).toLocaleDateString('fr-FR')],
        ['Véhicule', truck?.matricule || 'N/A'],
        ['Type', typeLabel],
        ['Coût Total', `${repair.totalCost.toFixed(2)} MAD`],
        ['Payé', `${repair.paidAmount.toFixed(2)} MAD`],
        ['Dette', `${repair.debtAmount.toFixed(2)} MAD`],
        ['Mode Paiement', paymentMethodMap[repair.paymentMethod] || repair.paymentMethod],
        ['Remarque', repair.remarks || 'N/A'],
      ],
    });

    doc.save(`reparation-${repair.id}.pdf`);
  };

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRepair, setEditingRepair] = useState<Repair | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    truckId: '',
    type: 'mecanique' as 'mecanique' | 'electrique' | 'garage',
    totalCost: '',
    paidAmount: '',
    paymentMethod: 'especes' as 'especes' | 'cheque' | 'virement',
    date: new Date().toISOString().split('T')[0],
    remarks: ''
  });

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('tous');
  const [periodFilter, setPeriodFilter] = useState('toutes');

  // Calculate statistics
  const totalRepairs = repairs.length;
  const mechanicalRepairs = repairs.filter(r => r.type === 'mecanique').length;
  const electricalRepairs = repairs.filter(r => r.type === 'electrique').length;
  const totalCost = repairs.reduce((sum, r) => sum + r.totalCost, 0);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.truckId || !formData.totalCost || !formData.paidAmount || !formData.remarks) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    const totalCost = parseFloat(formData.totalCost);
    const paidAmount = parseFloat(formData.paidAmount);

    if (paidAmount > totalCost) {
      toast({
        title: "Erreur",
        description: "Le montant payé ne peut pas être supérieur au coût total",
        variant: "destructive"
      });
      return;
    }

    if (isEditing && editingRepair) {
      const updatedRepair: Repair = {
        ...editingRepair,
        date: formData.date,
        truckId: formData.truckId,
        type: formData.type,
        totalCost,
        paidAmount,
        debtAmount: totalCost - paidAmount,
        paymentMethod: formData.paymentMethod,
        remarks: formData.remarks
      };
      updateRepair(updatedRepair);
    } else {
      const newRepair: Repair = {
        id: (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)),
        date: formData.date,
        truckId: formData.truckId,
        type: formData.type,
        totalCost,
        paidAmount,
        debtAmount: totalCost - paidAmount,
        paymentMethod: formData.paymentMethod,
        remarks: formData.remarks
      };
      addRepair(newRepair);

      // Add an expense for the paid amount
      if (paidAmount > 0) {
        addExpense({
          id: `repair-${newRepair.id}`,
          type: 'réparation',
          amount: paidAmount,
          paymentMethod: formData.paymentMethod as any,
          date: formData.date,
          note: `Réparation: ${formData.remarks}`
        });
      }

      if (newRepair.type === 'garage' && newRepair.truckId) {
        updateTruck(newRepair.truckId, { isActive: false, reposReason: 'Garage' });
      }
    }

    setDialogOpen(false);
    setIsEditing(false);
    setEditingRepair(null);

    toast({
      title: "Succès",
      description: isEditing ? "Réparation mise à jour avec succès" : "Réparation ajoutée avec succès"
    });
  };

  // Filter repairs based on search and filters
  const filteredRepairs = repairs.filter(repair => {
    const truck = trucks.find(t => t.id === repair.truckId);
    const truckMatricule = truck?.matricule || '';
    
    const matchesSearch = truckMatricule.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         repair.remarks.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'tous' || repair.type === typeFilter;
    
    let matchesPeriod = true;
    if (periodFilter !== 'toutes') {
      const repairDate = new Date(repair.date);
      const now = new Date();
      
      switch (periodFilter) {
        case '7jours':
          matchesPeriod = (now.getTime() - repairDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
          break;
        case '30jours':
          matchesPeriod = (now.getTime() - repairDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
          break;
        case '90jours':
          matchesPeriod = (now.getTime() - repairDate.getTime()) <= 90 * 24 * 60 * 60 * 1000;
          break;
      }
    }
    
    return matchesSearch && matchesType && matchesPeriod;
  });

  const selectedTruck = trucks.find(t => String(t.id) === formData.truckId);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wrench className="w-8 h-8 text-orange-600" />
            Gestion des Réparations
          </h1>
          <p className="text-muted-foreground mt-1">
            Enregistrement et gestion de toutes les opérations de maintenance et réparation
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setIsEditing(false); setEditingRepair(null); } }}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une réparation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Modifier la Réparation' : 'Ajouter une Nouvelle Réparation'}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Ajouter une nouvelle opération de réparation ou maintenance
              </p>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="truckId">Camion *</Label>
                  <Select value={formData.truckId} onValueChange={(value) => setFormData(prev => ({ ...prev, truckId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un camion...">
                        {selectedTruck ? (
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4" />
                            {selectedTruck.matricule}
                          </div>
                        ) : "Sélectionner un camion..."}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {trucks.map(truck => (
                        <SelectItem key={truck.id} value={String(truck.id)}>
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4" />
                            {truck.matricule}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type de Réparation *</Label>
                  <Select value={formData.type} onValueChange={(value: 'mecanique' | 'electrique' | 'garage') => setFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mecanique">🔧 Mécanique</SelectItem>
                      <SelectItem value="electrique">⚡ Électrique</SelectItem>
                      <SelectItem value="garage">🏪 Garage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalCost">Coût Total (MAD) *</Label>
                  <Input
                    id="totalCost"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.totalCost}
                    onChange={(e) => setFormData(prev => ({ ...prev, totalCost: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paidAmount">Payé (MAD) *</Label>
                  <Input
                    id="paidAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.paidAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, paidAmount: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dette (MAD)</Label>
                <div className="p-2 bg-muted rounded-md">
                  {formData.totalCost && formData.paidAmount 
                    ? (parseFloat(formData.totalCost) - parseFloat(formData.paidAmount)).toFixed(2)
                    : '0.00'
                  } MAD
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Mode de paiement *</Label>
                  <Select value={formData.paymentMethod} onValueChange={(value: 'especes' | 'cheque' | 'virement') => setFormData(prev => ({ ...prev, paymentMethod: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="especes">Espèces</SelectItem>
                      <SelectItem value="cheque">Chèque</SelectItem>
                      <SelectItem value="virement">Virement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Date de Réparation *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="attachments">Pièces jointes (facture ou photo)</Label>
                <Input
                  id="attachments"
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">Aucun fichier choisi</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarques *</Label>
                <Textarea
                  id="remarks"
                  placeholder="Exemple : Changement des freins avant, nettoyage du moteur"
                  value={formData.remarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setIsEditing(false); setEditingRepair(null); }}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
                  {isEditing ? 'Enregistrer les modifications' : 'Ajouter la réparation'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total des Réparations</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalRepairs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Réparations Mécaniques</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{mechanicalRepairs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Réparations Électriques</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{electricalRepairs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total des Coûts</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalCost.toFixed(2)} DH</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher dans les réparations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les types</SelectItem>
                <SelectItem value="mecanique">Mécanique</SelectItem>
                <SelectItem value="electrique">Électrique</SelectItem>
                <SelectItem value="garage">Garage</SelectItem>
              </SelectContent>
            </Select>

            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Toutes les périodes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="toutes">Toutes les périodes</SelectItem>
                <SelectItem value="7jours">7 derniers jours</SelectItem>
                <SelectItem value="30jours">30 derniers jours</SelectItem>
                <SelectItem value="90jours">90 derniers jours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Repairs List */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des réparations</CardTitle>
          <p className="text-sm text-muted-foreground">
            {filteredRepairs.length} réparation{filteredRepairs.length !== 1 ? 's' : ''} trouvée{filteredRepairs.length !== 1 ? 's' : ''}
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Véhicule</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Coût Total</TableHead>
                  <TableHead>Payé</TableHead>
                  <TableHead>Dette</TableHead>
                  <TableHead>Mode Paiement</TableHead>
                  <TableHead>Remarque</TableHead>
                  <TableHead>Pièces jointes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRepairs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      Aucune réparation ne correspond à la recherche.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRepairs.map((repair) => {
                    const truck = trucks.find(t => t.id === repair.truckId);
                    const driver = drivers.find(d => d.id === truck?.driverId);
                    
                    return (
                      <TableRow key={repair.id}>
                        <TableCell>
                          {new Date(repair.date).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{truck?.matricule || 'N/A'}</div>
                              {driver && (
                                <div className="text-xs text-muted-foreground">{driver.name}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={repair.type === 'mecanique' ? 'default' : repair.type === 'electrique' ? 'secondary' : 'default'}>
                            {repair.type === 'mecanique' ? '🔧 Mécanique' : repair.type === 'electrique' ? '⚡ Électrique' : '🏪 Garage'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {repair.totalCost.toFixed(2)} MAD
                        </TableCell>
                        <TableCell className="text-green-600">
                          {repair.paidAmount.toFixed(2)} MAD
                        </TableCell>
                        <TableCell>
                          {repair.debtAmount > 0 ? (
                            <span className="text-red-600 font-medium">
                              {repair.debtAmount.toFixed(2)} MAD
                            </span>
                          ) : (
                            <span className="text-green-600">Payé</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {repair.paymentMethod === 'especes' && 'Espèces'}
                            {repair.paymentMethod === 'cheque' && 'Chèque'}
                            {repair.paymentMethod === 'virement' && 'Virement'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {repair.remarks}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <FileText className="w-4 h-4" />
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(repair)}>
                              <FileDown className="w-4 h-4" />
                            </Button>
                        
                            {truck && !truck.isActive && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => updateTruck(truck.id, { isActive: true, reposReason: undefined, nextReturnDate: undefined })}
                              >
                                <Play className="w-4 h-4 mr-1" /> Réactiver
                              </Button>
                            )}
                        
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(repair)}>
                              <Pencil className="w-4 h-4 mr-1" />
                              Modifier
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-600"
                              onClick={() => {
                                deleteRepair(repair.id);
                                deleteExpense(`repair-${repair.id}`);
                                toast({ title: "Succès", description: "Réparation supprimée avec succès" });
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Supprimer
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Repairs;