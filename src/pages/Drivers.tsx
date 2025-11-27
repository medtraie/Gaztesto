import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { Users, Plus, DollarSign, TrendingUp, TrendingDown, ArrowUpDown, Download, Eye, Edit, CheckCircle, UserX } from 'lucide-react';
import { AddDriverDialog } from '@/components/dialogs/AddDriverDialog';
import { RecordPaymentDialog } from '@/components/dialogs/RecordPaymentDialog';
import { Driver as DriverType } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import jsPDF from 'jspdf';

const Drivers = () => {
  const { drivers } = useApp();
  const [selectedDriver, setSelectedDriver] = useState<DriverType | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const totalDebt = drivers.reduce((sum, d) => sum + Math.abs(d.debt || 0), 0);
  const totalAdvances = drivers.reduce((sum, d) => sum + (d.advances || 0), 0);
  const driversInDebt = drivers.filter(d => (d.balance || 0) < 0).length;

  const filteredDrivers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return drivers.filter((d) => {
      const nameMatch = !term || (d.name || '').toLowerCase().includes(term);
      const statusMatch =
        statusFilter === 'all' ||
        (statusFilter === 'debt' && (d.balance || 0) < 0) ||
        (statusFilter === 'credit' && (d.balance || 0) > 0) ||
        (statusFilter === 'balanced' && (d.balance || 0) === 0);
      return nameMatch && statusMatch;
    });
  }, [drivers, searchTerm, statusFilter]);

  const handleGeneratePDF = (driver: DriverType) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Chauffeur: ${driver.name}`, 20, 20);
    doc.setFontSize(12);
    
    doc.text(`Dette: ${Math.abs(driver.debt || 0)} DH`, 20, 35);
    doc.text(`Avances: ${(driver.advances || 0)} DH`, 20, 45);
    doc.text(
      `Balance: ${Math.abs(driver.balance || 0)} DH (${(driver.balance || 0) > 0 ? 'Crédit' : (driver.balance || 0) < 0 ? 'Dette' : 'Équilibré'})`,
      20,
      55
    );

    const yStart = 70;
    doc.setFontSize(14);
    doc.text('Historique des transactions', 20, yStart);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    let y = yStart + 10;
    doc.text('Date', 20, y);
    doc.text('Type', 60, y);
    doc.text('Montant', 100, y);
    doc.text('Description', 140, y);
    doc.setFont('helvetica', 'normal');
    y += 8;

    (driver.transactions ?? []).slice(0, 50).forEach((tx) => {
      doc.text(new Date(tx.date).toLocaleDateString(), 20, y);
      doc.text(tx.type, 60, y);
      doc.text(`${tx.amount} DH`, 100, y);
      doc.text(tx.description ?? '', 140, y);
      y += 8;
      if (y > 280) {
        doc.addPage();
        y = 20;
        doc.setFont('helvetica', 'bold');
        doc.text('Date', 20, y);
        doc.text('Type', 60, y);
        doc.text('Montant', 100, y);
        doc.text('Description', 140, y);
        doc.setFont('helvetica', 'normal');
        y += 8;
      }
    });

    doc.save(`chauffeur_${driver.id}.pdf`);
  };
  const getBalanceStatus = (balance: number) => {
    if (balance > 0) return { variant: 'default' as const, icon: TrendingUp, text: 'Crédit' };
    if (balance < 0) return { variant: 'destructive' as const, icon: TrendingDown, text: 'Dette' };
    return { variant: 'secondary' as const, icon: DollarSign, text: 'Équilibré' };
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Chauffeurs</h1>
          <p className="text-muted-foreground mt-1">
            Suivi des dettes, avances et paiements
          </p>
        </div>
        <AddDriverDialog />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Chauffeurs</p>
                <p className="text-2xl font-bold">{drivers.length}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dettes Totales</p>
                <p className="text-2xl font-bold text-destructive">
                  {totalDebt.toLocaleString()} DH
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avances Totales</p>
                <p className="text-2xl font-bold text-success">
                  {totalAdvances.toLocaleString()} DH
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En Dette</p>
                <p className="text-2xl font-bold text-warning">
                  {driversInDebt}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drivers List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Liste des Chauffeurs</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="debt">En dette</SelectItem>
                  <SelectItem value="credit">En crédit</SelectItem>
                  <SelectItem value="balanced">Équilibré</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Rechercher..."
                className="max-w-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Button variant="outline" size="sm" onClick={() => {
              // Logique pour télécharger le PDF de tous les chauffeurs
              alert("Téléchargement du PDF en cours...");
              // Vous pouvez implémenter la génération de PDF avec une bibliothèque comme jsPDF
            }}>
              <Download className="w-4 h-4 mr-1" />
              PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => {
                    // Logique pour trier par nom
                  }}>Nom <ArrowUpDown className="inline h-4 w-4" /></TableHead>
                  <TableHead className="cursor-pointer" onClick={() => {
                    // Logique pour trier par dette
                  }}>Dette <ArrowUpDown className="inline h-4 w-4" /></TableHead>
                  <TableHead className="cursor-pointer" onClick={() => {
                    // Logique pour trier par avances
                  }}>Avances <ArrowUpDown className="inline h-4 w-4" /></TableHead>
                  <TableHead className="cursor-pointer" onClick={() => {
                    // Logique pour trier par balance
                  }}>Balance <ArrowUpDown className="inline h-4 w-4" /></TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.length > 0 ? filteredDrivers.map((driver) => {
                  const balanceStatus = getBalanceStatus(driver.balance);
                  
                  return (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">{driver.name}</TableCell>
                      <TableCell className="text-destructive font-medium">
                        {Math.abs(driver.debt).toLocaleString()} DH
                      </TableCell>
                      <TableCell className="text-success font-medium">
                        {driver.advances.toLocaleString()} DH
                      </TableCell>
                      <TableCell className={`font-medium ${
                        driver.balance > 0 ? 'text-success' : 
                        driver.balance < 0 ? 'text-destructive' : 
                        'text-muted-foreground'
                      }`}>
                        {Math.abs(driver.balance).toLocaleString()} DH
                      </TableCell>
                      <TableCell>
                        <Badge variant={balanceStatus.variant} className="flex items-center gap-1">
                          <balanceStatus.icon className="w-3 h-3" />
                          {balanceStatus.text}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedDriver(driver);
                              setDetailsDialogOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Détails
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGeneratePDF(driver)}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            PDF
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedDriver(driver);
                              setPaymentDialogOpen(true);
                            }}
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Paiement
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      Aucun chauffeur enregistré
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex items-center justify-between px-4 py-2 mt-2">
            <div className="text-sm text-muted-foreground">
              {drivers.length} chauffeurs au total
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" disabled={true}>
                Précédent
              </Button>
              <Button variant="outline" size="sm" className="px-3">
                1
              </Button>
              <Button variant="outline" size="sm" disabled={true}>
                Suivant
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {drivers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun chauffeur enregistré</h3>
            <p className="text-muted-foreground text-center mb-4">
              Ajoutez vos chauffeurs pour commencer le suivi des dettes et paiements
            </p>
            <AddDriverDialog trigger={
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter le premier chauffeur
              </Button>
            } />
          </CardContent>
        </Card>
      )}

      {selectedDriver && (
        <RecordPaymentDialog
          driver={selectedDriver}
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
        />
      )}

      {selectedDriver && (
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Détails du chauffeur</DialogTitle>
              <DialogDescription>
                Informations détaillées et historique des transactions pour {selectedDriver.name}
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Aperçu</TabsTrigger>
                <TabsTrigger value="history">Historique</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-destructive">
                      {Math.abs(selectedDriver.debt).toLocaleString()} DH
                    </div>
                    <div className="text-sm text-muted-foreground">Dette</div>
                  </div>
                  
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-success">
                      {selectedDriver.advances.toLocaleString()} DH
                    </div>
                    <div className="text-sm text-muted-foreground">Avances</div>
                  </div>
                  
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className={`text-2xl font-bold ${
                      selectedDriver.balance > 0 ? 'text-success' : 
                      selectedDriver.balance < 0 ? 'text-destructive' : 
                      'text-muted-foreground'
                    }`}>
                      {Math.abs(selectedDriver.balance).toLocaleString()} DH
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedDriver.balance > 0 ? 'Crédit' : selectedDriver.balance < 0 ? 'Reste à payer' : 'Équilibré'}
                    </div>
                  </div>
                </div>
                
                {selectedDriver.debt > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progression du remboursement</span>
                      <span className="font-medium">
                        {selectedDriver.advances > 0 ? Math.min((selectedDriver.advances / Math.abs(selectedDriver.debt)) * 100, 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-success h-2 rounded-full transition-all" 
                        style={{ 
                          width: `${Math.min((selectedDriver.advances / Math.abs(selectedDriver.debt)) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="history" className="mt-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Historique des transactions</h3>
                    <Button variant="outline" size="sm" onClick={() => handleGeneratePDF(selectedDriver)}>
                      <Download className="w-4 h-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                  
                  <div className="rounded-md border max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Montant</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedDriver.transactions && selectedDriver.transactions.length > 0 ? (
                          selectedDriver.transactions.map((tx, index) => (
                            <TableRow key={`${selectedDriver.id}-${tx.id ?? index}`}>
                              <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Badge variant={tx.type === 'debit' ? 'destructive' : 'success'}>
                                  {tx.type === 'debit' ? 'Dette' : 'Paiement'}
                                </Badge>
                              </TableCell>
                              <TableCell>{tx.amount.toLocaleString()} DH</TableCell>
                              <TableCell>{tx.description}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center">Aucune transaction</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="actions" className="mt-4">
                {/* Actions content can be simplified or kept as is */}
                <p className="text-sm text-muted-foreground">Les actions sont disponibles dans la liste principale des chauffeurs.</p>
              </TabsContent>
            </Tabs>
            
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button variant="outline">Fermer</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Drivers;