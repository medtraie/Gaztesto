import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/contexts/AppContext';
import { Factory as FactoryIcon, Plus, Truck, Package, AlertTriangle, TrendingUp, TrendingDown, CreditCard, DollarSign, CheckCircle, XCircle, Download, Eye, ArrowUpDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FactoryOperation {
  id: string;
  truckId: string;
  driverName: string;
  sentBottles: Array<{
    bottleTypeId: string;
    quantity: number;
    status: 'empty' | 'defective';
  }>;
  receivedBottles: Array<{
    bottleTypeId: string;
    quantity: number;
  }>;
  date: string;
  debtChange: number; // positive = debt to supplier, negative = debt reduction
}

interface SupplierDebt {
  bottleTypeId: string;
  emptyDebt: number; // Positive = supplier owes us empty bottles
  defectiveDebt: number; // Positive = supplier owes us compensation for defective bottles
}

interface DebtSettlement {
  id: string;
  date: string;
  bottleTypeId: string;
  type: 'empty' | 'defective';
  quantity: number;
  description: string;
}

const Factory = () => {
  const { 
    trucks, 
    bottleTypes, 
    drivers, 
    updateBottleType, 
    addTransaction,
    emptyBottlesStock,
    defectiveBottles,
    updateEmptyBottlesStockByBottleType,
    updateDefectiveBottlesStock
  } = useApp();

  const handleDownloadPDF = (operation: FactoryOperation) => {
    try {
      const doc = new jsPDF();
      const totalSent = operation.sentBottles.reduce((sum, bottle) => sum + bottle.quantity, 0);
      const totalReceived = operation.receivedBottles.reduce((sum, bottle) => sum + bottle.quantity, 0);

      doc.text(`Détails de l'opération - ${operation.id}`, 14, 20);
      doc.text(`Date: ${new Date(operation.date).toLocaleDateString('fr-FR')}`, 14, 30);
      doc.text(`Chauffeur: ${operation.driverName}`, 14, 40);
      doc.text(`Statut: ${operation.receivedBottles.length > 0 ? "Terminé" : "En attente"}`, 14, 50);

      autoTable(doc, {
        startY: 60,
        head: [['Type', 'Quantité']],
        body: [
          ...operation.sentBottles.map(b => {
            const bt = bottleTypes.find(bt_ => bt_.id === b.bottleTypeId);
            return [`Envoyé: ${bt?.name} (${b.status})`, b.quantity];
          }),
          ...operation.receivedBottles.map(b => {
            const bt = bottleTypes.find(bt_ => bt_.id === b.bottleTypeId);
            return [`Reçu: ${bt?.name}`, b.quantity];
          }),
        ],
      });

      const finalY = (doc as any).lastAutoTable.finalY;
      doc.text(`Total Envoyé: ${totalSent}`, 14, finalY + 10);
      doc.text(`Total Reçu: ${totalReceived}`, 14, finalY + 20);
      if (operation.debtChange !== 0) {
        doc.text(`Dette/Réduction: ${operation.debtChange > 0 ? 'Dette: +' : 'Réduction: '}${Math.abs(operation.debtChange)}`, 14, finalY + 30);
      }

      doc.save(`operation-${operation.id}.pdf`);
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      alert(`Une erreur est survenue lors de la génération du PDF. Assurez-vous que 'jspdf-autotable' est installé. Erreur: ${(error as Error).message}`);
    }
  };

  // Nouveau: Export PDF pour toutes les opérations
  const exportOperationsPDF = () => {
    try {
      const doc = new jsPDF();
      doc.text(`Historique des opérations - Usine`, 14, 20);
      autoTable(doc, {
        startY: 30,
        head: [['Date', 'Chauffeur', 'Envoyées', 'Reçues', 'Statut', 'Dette/Réd.']],
        body: factoryOperations.map(op => [
          new Date(op.date).toLocaleDateString('fr-FR'),
          op.driverName,
          op.sentBottles.reduce((s, b) => s + b.quantity, 0),
          op.receivedBottles.reduce((s, b) => s + b.quantity, 0),
          op.receivedBottles.length > 0 ? 'Terminé' : 'En attente',
          op.debtChange === 0 ? '0' : (op.debtChange > 0 ? `Dette +${op.debtChange}` : `Réduction ${Math.abs(op.debtChange)}`)
        ]),
      });
      doc.save('operations-usine.pdf');
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      alert(`Une erreur est survenue lors de la génération du PDF. Assurez-vous que 'jspdf-autotable' est installé. Erreur: ${(error as Error).message}`);
    }
  };

  // Load data from localStorage
  const [factoryOperations, setFactoryOperations] = useState<FactoryOperation[]>(() => {
    const saved = localStorage.getItem('factoryOperations');
    return saved ? JSON.parse(saved) : [];
  });

  // Load data from localStorage
  const [supplierDebts, setSupplierDebts] = useState<SupplierDebt[]>(() => {
    const saved = localStorage.getItem('supplierDebts');
    return saved ? JSON.parse(saved) : [];
  });

  const [debtSettlements, setDebtSettlements] = useState<DebtSettlement[]>(() => {
    const saved = localStorage.getItem('debtSettlements');
    return saved ? JSON.parse(saved) : [];
  });

  // حالات إظهار النماذج (إعلان واحد لكل حالة)
  const [showSendForm, setShowSendForm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showSupplierManagement, setShowSupplierManagement] = useState(false);
  const [showSettlementForm, setShowSettlementForm] = useState(false);

  // العملية الحالية (إعلان واحد فقط)
  const [currentOperation, setCurrentOperation] = useState<Partial<FactoryOperation>>({});

  // حفظ إلى التخزين المحلي عند تغيّر البيانات
  React.useEffect(() => {
    localStorage.setItem('factoryOperations', JSON.stringify(factoryOperations));
  }, [factoryOperations]);

  React.useEffect(() => {
    localStorage.setItem('supplierDebts', JSON.stringify(supplierDebts));
  }, [supplierDebts]);

  React.useEffect(() => {
    localStorage.setItem('debtSettlements', JSON.stringify(debtSettlements));
  }, [debtSettlements]);

  // نموذج الإرسال للمورّد
  const [sendForm, setSendForm] = useState({
    truckId: '',
    bottles: bottleTypes
      .filter(bt => !bt.name.includes('Détendeur'))
      .map(bt => ({
        bottleTypeId: bt.id,
        emptyQuantity: 0,
        defectiveQuantity: 0
      }))
  });

  // نموذج الاسترجاع
  const [returnForm, setReturnForm] = useState({
    operationId: '',
    receivedBottles: bottleTypes.map(bt => ({
      bottleTypeId: bt.id,
      quantity: 0
    }))
  });

  // نموذج التسوية (إعلان واحد فقط)
  const [settlementForm, setSettlementForm] = useState({
    bottleTypeId: '',
    type: 'empty' as 'empty' | 'defective',
    quantity: 0,
    description: ''
  });

  const supplierDebt = factoryOperations.reduce((sum, op) => sum + op.debtChange, 0);
  const totalSent = factoryOperations.reduce((sum, op) => 
    sum + op.sentBottles.reduce((s, b) => s + b.quantity, 0), 0
  );
  const totalReceived = factoryOperations.reduce((sum, op) => 
    sum + op.receivedBottles.reduce((s, b) => s + b.quantity, 0), 0
  );

  const getEmptyStock = (bottleTypeId: string): number => {
    const stock = emptyBottlesStock.find(s => s.bottleTypeId === bottleTypeId);
    return stock?.quantity || 0;
  };

  const getDefectiveStock = (bottleTypeId: string): number => {
    return defectiveBottles
      .filter(b => b.bottleTypeId === bottleTypeId)
      .reduce((sum, b) => sum + b.quantity, 0);
  };

  // Get supplier debt for a specific bottle type
  const getSupplierDebt = (bottleTypeId: string): SupplierDebt => {
    return supplierDebts.find(d => d.bottleTypeId === bottleTypeId) || {
      bottleTypeId,
      emptyDebt: 0,
      defectiveDebt: 0
    };
  };
  
  // Handle debt settlement with supplier
  const handleDebtSettlement = () => {
    if (!settlementForm.bottleTypeId || settlementForm.quantity <= 0) {
      alert('Veuillez sélectionner un type de bouteille et entrer une quantité valide');
      return;
    }
    
    // Create new settlement record
    const newSettlement: DebtSettlement = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      bottleTypeId: settlementForm.bottleTypeId,
      type: settlementForm.type,
      quantity: settlementForm.quantity,
      description: settlementForm.description
    };
    
    // Update supplier debts
    const updatedDebts = [...supplierDebts];
    const debtIndex = updatedDebts.findIndex(d => d.bottleTypeId === settlementForm.bottleTypeId);
    
    if (debtIndex >= 0) {
      if (settlementForm.type === 'empty') {
        updatedDebts[debtIndex].emptyDebt -= settlementForm.quantity;
      } else {
        updatedDebts[debtIndex].defectiveDebt -= settlementForm.quantity;
      }
    } else {
      const newDebt: SupplierDebt = {
        bottleTypeId: settlementForm.bottleTypeId,
        emptyDebt: settlementForm.type === 'empty' ? -settlementForm.quantity : 0,
        defectiveDebt: settlementForm.type === 'defective' ? -settlementForm.quantity : 0
      };
      updatedDebts.push(newDebt);
    }
    
    // Save changes
    setDebtSettlements([...debtSettlements, newSettlement]);
    setSupplierDebts(updatedDebts);
    
    // Reset form and close
    setSettlementForm({
      bottleTypeId: '',
      type: 'empty',
      quantity: 0,
      description: ''
    });
    setShowSettlementForm(false);
  };

  // Update supplier debt
  const updateSupplierDebt = (bottleTypeId: string, emptyChange: number, defectiveChange: number) => {
    setSupplierDebts(prev => {
      const existing = prev.find(d => d.bottleTypeId === bottleTypeId);
      if (existing) {
        return prev.map(d => 
          d.bottleTypeId === bottleTypeId 
            ? { 
                ...d, 
                emptyDebt: d.emptyDebt + emptyChange,
                defectiveDebt: d.defectiveDebt + defectiveChange
              }
            : d
        );
      } else {
        return [...prev, {
          bottleTypeId,
          emptyDebt: emptyChange,
          defectiveDebt: defectiveChange
        }];
      }
    });
  };

  const handleSendToFactory = () => {
    const truck = trucks.find(t => t.id === sendForm.truckId);
    if (!truck) return;
    
    const driver = drivers.find(d => d.id === truck.driverId);

    // Validate stock availability
    for (const bottle of sendForm.bottles) {
      const emptyStock = getEmptyStock(bottle.bottleTypeId);
      const defectiveStock = getDefectiveStock(bottle.bottleTypeId);
      
      if (bottle.emptyQuantity > emptyStock) {
        alert(`Stock insuffisant de bouteilles vides pour ${bottleTypes.find(bt => bt.id === bottle.bottleTypeId)?.name}`);
        return;
      }
      
      if (bottle.defectiveQuantity > defectiveStock) {
        alert(`Stock insuffisant de bouteilles défectueuses pour ${bottleTypes.find(bt => bt.id === bottle.bottleTypeId)?.name}`);
        return;
      }
    }

    const sentBottles = sendForm.bottles
      .filter(b => b.emptyQuantity > 0 || b.defectiveQuantity > 0)
      .flatMap(b => [
        ...(b.emptyQuantity > 0 ? [{
          bottleTypeId: b.bottleTypeId,
          quantity: b.emptyQuantity,
          status: 'empty' as const
        }] : []),
        ...(b.defectiveQuantity > 0 ? [{
          bottleTypeId: b.bottleTypeId,
          quantity: b.defectiveQuantity,
          status: 'defective' as const
        }] : [])
      ]);

    // Update stocks and supplier debts
    sendForm.bottles.forEach(bottle => {
      if (bottle.emptyQuantity > 0) {
        updateEmptyBottlesStockByBottleType(bottle.bottleTypeId, -bottle.emptyQuantity);
        // Supplier owes us empty bottles in return
        updateSupplierDebt(bottle.bottleTypeId, bottle.emptyQuantity, 0);
      }
      if (bottle.defectiveQuantity > 0) {
        updateDefectiveBottlesStock(bottle.bottleTypeId, -bottle.defectiveQuantity);
        // Supplier owes us compensation for defective bottles
        updateSupplierDebt(bottle.bottleTypeId, 0, bottle.defectiveQuantity);
      }
    });

    const operation: FactoryOperation = {
      id: Date.now().toString(),
      truckId: sendForm.truckId,
      driverName: driver?.name || 'N/A',
      sentBottles,
      receivedBottles: [],
      date: new Date().toISOString(),
      debtChange: 0
    };

    setFactoryOperations(prev => [...prev, operation]);
    setCurrentOperation(operation);
    setSendForm({
      truckId: '',
      bottles: bottleTypes
        .filter(bt => !bt.name.includes('Détendeur'))
        .map(bt => ({
          bottleTypeId: bt.id,
          emptyQuantity: 0,
          defectiveQuantity: 0
        }))
    });
    setShowSendForm(false);

    // Add transaction
    addTransaction({
      type: 'factory',
      date: new Date().toISOString(),
      truckId: sendForm.truckId,
      bottleTypes: sentBottles.map(b => ({
        bottleTypeId: b.bottleTypeId,
        quantity: b.quantity
      })),
      totalValue: 0
    });
  };

  const handleReturnFromFactory = () => {
    const operationId = returnForm.operationId;
    const operation = factoryOperations.find(op => op.id === operationId);
    if (!operation) return;

    const receivedBottles = returnForm.receivedBottles.filter(b => b.quantity > 0);
    
    // Track bottles by type for debt calculation
    const sentByType = {};
    operation.sentBottles.forEach(sentBottle => {
      if (!sentByType[sentBottle.bottleTypeId]) {
        sentByType[sentBottle.bottleTypeId] = {
          empty: 0,
          defective: 0
        };
      }
      
      if (sentBottle.status === 'empty') {
        sentByType[sentBottle.bottleTypeId].empty += sentBottle.quantity;
      } else if (sentBottle.status === 'defective') {
        sentByType[sentBottle.bottleTypeId].defective += sentBottle.quantity;
      }
    });
    
    // Calculate debt changes for each bottle type
    receivedBottles.forEach(receivedBottle => {
      const bottleTypeId = receivedBottle.bottleTypeId;
      const receivedQuantity = receivedBottle.quantity;
      const sent = sentByType[bottleTypeId] || { empty: 0, defective: 0 };
      
      // Calculate how many bottles were sent in total (empty + defective)
      const totalSentForType = sent.empty + sent.defective;
      
      // Always prioritize compensating empty bottles first, then defective bottles
      let remainingReceived = receivedQuantity;
      
      // First, compensate for empty bottles (أولاً، تعويض القنينات الفارغة)
      const emptyCompensation = Math.min(remainingReceived, sent.empty);
      if (emptyCompensation > 0) {
        updateSupplierDebt(bottleTypeId, -emptyCompensation, 0);
        remainingReceived -= emptyCompensation;
      }
      
      // Then, compensate for defective bottles (ثم، تعويض القنينات المعيبة)
      const defectiveCompensation = Math.min(remainingReceived, sent.defective);
      if (defectiveCompensation > 0) {
        updateSupplierDebt(bottleTypeId, 0, -defectiveCompensation);
        remainingReceived -= defectiveCompensation;
      }
      
      // If we still have excess bottles received, calculate supplier debt
      if (remainingReceived > 0) {
        // Calculate excess bottles received (supplier owes us)
        updateSupplierDebt(bottleTypeId, remainingReceived, 0);
      }
      
      // If we received fewer bottles than sent, calculate remaining debt
      if (receivedQuantity < totalSentForType) {
        // Calculate remaining empty bottles not compensated
        const remainingEmpty = Math.max(0, sent.empty - Math.max(0, receivedQuantity - sent.defective));
        if (remainingEmpty > 0) {
          // This is already handled by the initial empty compensation
        }
        
        // Calculate remaining defective bottles not compensated
        const remainingDefective = Math.max(0, sent.defective - Math.max(0, receivedQuantity - sent.empty));
        if (remainingDefective > 0) {
          // This is already handled by the defective compensation
        }
      }
    });

    // Calculate total debt change
    let totalEmptyDebtChange = 0;
    let totalDefectiveDebtChange = 0;
    
    // Sum up all sent bottles
    operation.sentBottles.forEach(sentBottle => {
      if (sentBottle.status === 'empty') {
        totalEmptyDebtChange += sentBottle.quantity;
      } else if (sentBottle.status === 'defective') {
        totalDefectiveDebtChange += sentBottle.quantity;
      }
    });
    
    // Subtract received bottles
    const totalReceived = receivedBottles.reduce((sum, b) => sum + b.quantity, 0);
    
    // If we received more than we sent in total, the excess is owed to us as empty bottles
    const totalSent = totalEmptyDebtChange + totalDefectiveDebtChange;
    if (totalReceived > totalSent) {
      totalEmptyDebtChange = totalReceived - totalDefectiveDebtChange;
    } else {
      // If we received less than we sent, prioritize defective compensation
      const remainingAfterDefective = Math.max(0, totalReceived - totalDefectiveDebtChange);
      totalEmptyDebtChange = remainingAfterDefective;
      totalDefectiveDebtChange = Math.min(totalDefectiveDebtChange, totalReceived);
    }
    
    // Calculate net debt change (positive means supplier owes us)
    const debtChange = totalReceived - totalSent;

    // Update operation
    setFactoryOperations(prev => prev.map(op => 
      op.id === operationId 
        ? { ...op, receivedBottles, debtChange }
        : op
    ));

    // Update stock with received bottles (full bottles go to inventory)
    receivedBottles.forEach(bottle => {
      updateBottleType(bottle.bottleTypeId, {
        remainingQuantity: bottleTypes.find(bt => bt.id === bottle.bottleTypeId)!.remainingQuantity + bottle.quantity
      });
    });

    setReturnForm({
      operationId: '',
      receivedBottles: bottleTypes.map(bt => ({
        bottleTypeId: bt.id,
        quantity: 0
      }))
    });
    setShowReturnForm(false);
  };

  const pendingOperations = factoryOperations.filter(op => op.receivedBottles.length === 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion Usine</h1>
          <p className="text-muted-foreground mt-1">
            Envois et retours de bouteilles vers le fournisseur
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowSendForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Envoi usine
          </Button>
          <Button variant="outline" onClick={() => setShowReturnForm(true)}>
            Retour usine
          </Button>
          <Button variant="secondary" onClick={() => setShowSupplierManagement(true)}>
            <CreditCard className="w-4 h-4 mr-2" />
            Gestion Fournisseur
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Envoyé</p>
                <p className="text-2xl font-bold">{totalSent}</p>
              </div>
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Reçu</p>
                <p className="text-2xl font-bold text-success">{totalReceived}</p>
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
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold text-warning">{pendingOperations.length}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dette Vides</p>
                <p className="text-2xl font-bold text-orange-600">
                  {supplierDebts.reduce((sum, d) => sum + d.emptyDebt, 0)}
                </p>
              </div>
              <Package className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dette Défectueuses</p>
                <p className="text-2xl font-bold text-red-600">
                  {supplierDebts.reduce((sum, d) => sum + d.defectiveDebt, 0)}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Send Form */}
      {showSendForm && (
        <Card>
          <CardHeader>
            <CardTitle>Envoi vers l'usine</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="truck">Remorque</Label>
              <Select 
                value={sendForm.truckId} 
                onValueChange={(value) => setSendForm({...sendForm, truckId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une remorque" />
                </SelectTrigger>
                <SelectContent>
                  {trucks.filter(truck => truck.truckType === 'remorque').map(truck => {
                    const driver = drivers.find(d => d.id === truck.driverId);
                    return (
                      <SelectItem key={truck.id} value={truck.id}>
                        {truck.matricule} - {driver?.name || 'N/A'}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Bouteilles à envoyer</h4>
              {bottleTypes
                .filter(bt => !bt.name.includes('Détendeur'))
                .map((bt, index) => {
                  const emptyStock = getEmptyStock(bt.id);
                  const defectiveStock = getDefectiveStock(bt.id);
                  const bottleIndex = sendForm.bottles.findIndex(b => b.bottleTypeId === bt.id);
                  
                  return (
                    <div key={bt.id} className="grid md:grid-cols-3 gap-4 p-3 border rounded">
                      <div className="font-medium">{bt.name}</div>
                      <div>
                        <Label htmlFor={`empty-${bt.id}`}>
                          Vides <span className="text-muted-foreground text-sm">(Stock: {emptyStock})</span>
                        </Label>
                        <Input
                          id={`empty-${bt.id}`}
                          type="number"
                          min="0"
                          max={emptyStock}
                          value={sendForm.bottles[bottleIndex]?.emptyQuantity || 0}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            const newBottles = [...sendForm.bottles];
                            if (bottleIndex !== -1) {
                              newBottles[bottleIndex].emptyQuantity = Math.min(value, emptyStock);
                              setSendForm({...sendForm, bottles: newBottles});
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`defective-${bt.id}`}>
                          Défectueuses <span className="text-muted-foreground text-sm">(Stock: {defectiveStock})</span>
                        </Label>
                        <Input
                          id={`defective-${bt.id}`}
                          type="number"
                          min="0"
                          max={defectiveStock}
                          value={sendForm.bottles[bottleIndex]?.defectiveQuantity || 0}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            const newBottles = [...sendForm.bottles];
                            if (bottleIndex !== -1) {
                              newBottles[bottleIndex].defectiveQuantity = Math.min(value, defectiveStock);
                              setSendForm({...sendForm, bottles: newBottles});
                            }
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSendToFactory}>Envoyer à l'usine</Button>
              <Button variant="outline" onClick={() => setShowSendForm(false)}>Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supplier Management */}
      {showSupplierManagement && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Gestion Fournisseur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Debt Summary */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Dette Vides Total</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {supplierDebts.reduce((sum, d) => sum + d.emptyDebt, 0)} bouteilles
                      </p>
                    </div>
                    <Package className="w-8 h-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Dette Défectueuses Total</p>
                      <p className="text-2xl font-bold text-red-600">
                        {supplierDebts.reduce((sum, d) => sum + d.defectiveDebt, 0)} bouteilles
                      </p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Debt Details by Bottle Type */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">Détail des dettes par type</h4>
                <Button 
                  size="sm" 
                  onClick={() => setShowSettlementForm(true)}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Nouveau Règlement
                </Button>
              </div>
              
              <div className="space-y-3">
                {bottleTypes
                  .filter(bt => !bt.name.includes('Détendeur'))
                  .map(bt => {
                    const debt = getSupplierDebt(bt.id);
                    const hasDebt = debt.emptyDebt > 0 || debt.defectiveDebt > 0;
                    
                    if (!hasDebt) return null;
                    
                    return (
                      <div key={bt.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium">{bt.name}</h5>
                          <div className="flex gap-2">
                            {debt.emptyDebt > 0 && (
                              <Badge variant="outline" className="text-orange-600">
                                Vides: {debt.emptyDebt}
                              </Badge>
                            )}
                            {debt.defectiveDebt > 0 && (
                              <Badge variant="outline" className="text-red-600">
                                Défectueuses: {debt.defectiveDebt}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Total dette: {debt.emptyDebt + debt.defectiveDebt} bouteilles
                        </p>
                      </div>
                    );
                  })}
                
                {supplierDebts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune dette fournisseur enregistrée
                  </div>
                )}
              </div>
            </div>

            {/* Settlement History */}
            {debtSettlements.length > 0 && (
              <div>
                <h4 className="font-medium mb-4">Historique des règlements</h4>
                <div className="space-y-2">
                  {debtSettlements.slice(-5).map(settlement => {
                    const bt = bottleTypes.find(b => b.id === settlement.bottleTypeId);
                    return (
                      <div key={settlement.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">{bt?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {settlement.description || `Règlement ${settlement.type}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{settlement.quantity} bouteilles</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(settlement.date).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowSupplierManagement(false)}>
                Fermer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settlement Form */}
      {showSettlementForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nouveau Règlement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="settlement-bottle">Type de bouteille</Label>
              <Select 
                value={settlementForm.bottleTypeId} 
                onValueChange={(value) => setSettlementForm({...settlementForm, bottleTypeId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  {bottleTypes
                    .filter(bt => !bt.name.includes('Détendeur'))
                    .filter(bt => {
                      const debt = getSupplierDebt(bt.id);
                      return debt.emptyDebt > 0 || debt.defectiveDebt > 0;
                    })
                    .map(bt => (
                      <SelectItem key={bt.id} value={bt.id}>
                        {bt.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="settlement-type">Type de dette</Label>
              <Select 
                value={settlementForm.type} 
                onValueChange={(value: 'empty' | 'defective') => setSettlementForm({...settlementForm, type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="empty">Bouteilles vides</SelectItem>
                  <SelectItem value="defective">Bouteilles défectueuses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="settlement-quantity">Quantité</Label>
              <Input
                id="settlement-quantity"
                type="number"
                min="1"
                value={settlementForm.quantity}
                onChange={(e) => setSettlementForm({...settlementForm, quantity: parseInt(e.target.value) || 0})}
              />
            </div>

            <div>
              <Label htmlFor="settlement-description">Description (optionnel)</Label>
              <Input
                id="settlement-description"
                value={settlementForm.description}
                onChange={(e) => setSettlementForm({...settlementForm, description: e.target.value})}
                placeholder="Ex: Paiement en espèces, compensation..."
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleDebtSettlement}>Enregistrer la tésowiye</Button>
              <Button variant="outline" onClick={() => setShowSettlementForm(false)}>Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Return Form */}
      {showReturnForm && pendingOperations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Retour de l'usine</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="operation">Opération</Label>
              <Select 
                value={returnForm.operationId} 
                onValueChange={(value) => setReturnForm({...returnForm, operationId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une opération" />
                </SelectTrigger>
                <SelectContent>
                  {pendingOperations.map(op => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.driverName} - {new Date(op.date).toLocaleDateString('fr-FR')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {returnForm.operationId && (
              <div className="space-y-3">
                <h4 className="font-medium">Bouteilles reçues</h4>
                {bottleTypes.map((bt, index) => (
                  <div key={bt.id} className="grid md:grid-cols-2 gap-4 p-3 border rounded">
                    <div className="font-medium">{bt.name}</div>
                    <div>
                      <Label htmlFor={`received-${bt.id}`}>Quantité reçue</Label>
                      <Input
                        id={`received-${bt.id}`}
                        type="number"
                        value={returnForm.receivedBottles[index].quantity}
                        onChange={(e) => {
                          const newBottles = [...returnForm.receivedBottles];
                          newBottles[index].quantity = parseInt(e.target.value) || 0;
                          setReturnForm({...returnForm, receivedBottles: newBottles});
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleReturnFromFactory}>Enregistrer le retour</Button>
              <Button variant="outline" onClick={() => setShowReturnForm(false)}>Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Operations History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Historique des opérations</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="completed">Terminé</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                </SelectContent>
              </Select>
              
              <Select defaultValue="all">
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les dates</SelectItem>
                  <SelectItem value="today">Aujourd'hui</SelectItem>
                  <SelectItem value="week">Cette semaine</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                </SelectContent>
              </Select>
              
              <Input 
                placeholder="Rechercher..." 
                className="max-w-xs" 
                onChange={(e) => {
                  // Implémentation du filtre ici
                  const filterValue = e.target.value.toLowerCase();
                  // Vous pouvez ajouter un état pour stocker la valeur du filtre
                }}
              />
            </div>
            
            <Button variant="outline" size="sm" onClick={exportOperationsPDF}>
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
                    // Logique pour trier par date
                  }}>Date <ArrowUpDown className="inline h-4 w-4" /></TableHead>
                  <TableHead>Chauffeur</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => {
                    // Logique pour trier par statut
                  }}>Statut <ArrowUpDown className="inline h-4 w-4" /></TableHead>
                  <TableHead className="cursor-pointer" onClick={() => {
                    // Logique pour trier par quantité envoyée
                  }}>Bouteilles Envoyées <ArrowUpDown className="inline h-4 w-4" /></TableHead>
                  <TableHead className="cursor-pointer" onClick={() => {
                    // Logique pour trier par quantité reçue
                  }}>Bouteilles Reçues <ArrowUpDown className="inline h-4 w-4" /></TableHead>
                  <TableHead>Dette/Réduction</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {factoryOperations.length > 0 ? factoryOperations.map((operation) => {
                  // Calculer le total des bouteilles envoyées
                  const totalSent = operation.sentBottles.reduce((sum, bottle) => sum + bottle.quantity, 0);
                  
                  // Calculer le total des bouteilles reçues
                  const totalReceived = operation.receivedBottles.reduce((sum, bottle) => sum + bottle.quantity, 0);
                  
                  return (
                    <TableRow key={operation.id}>
                      <TableCell>{new Date(operation.date).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <Truck className="w-4 h-4 text-primary" />
                          </div>
                          <span>{operation.driverName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={operation.receivedBottles.length > 0 ? "default" : "secondary"}>
                          {operation.receivedBottles.length > 0 ? "Terminé" : "En attente"}
                        </Badge>
                      </TableCell>
                      <TableCell>{totalSent}</TableCell>
                      <TableCell>{totalReceived}</TableCell>
                      <TableCell>
                        {operation.debtChange !== 0 && (
                          <span className={`font-medium ${
                            operation.debtChange > 0 ? 'text-destructive' : 'text-success'
                          }`}>
                            {operation.debtChange > 0 ? 'Dette: +' : 'Réduction: '}{Math.abs(operation.debtChange)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4 mr-1" />
                                Détails
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>Détails de l'opération</DialogTitle>
                              </DialogHeader>
                              
                              <div className="grid md:grid-cols-2 gap-6 mt-4">
                                <div>
                                  <h5 className="font-medium mb-3 text-lg">Envoyé</h5>
                                  <div className="space-y-2">
                                    {operation.sentBottles.map((bottle) => {
                                      const bt = bottleTypes.find(b => b.id === bottle.bottleTypeId);
                                      return (
                                        <div key={`sent-${bottle.bottleTypeId}-${bottle.status}`} className="flex justify-between border-b pb-1">
                                          <span>{bt?.name} ({bottle.status})</span>
                                          <span className="font-medium">{bottle.quantity}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div>
                                  <h5 className="font-medium mb-3 text-lg">Reçu</h5>
                                  {operation.receivedBottles.length > 0 ? (
                                    <div className="space-y-2">
                                      {operation.receivedBottles.map((bottle) => {
                                      const bt = bottleTypes.find(b => b.id === bottle.bottleTypeId);
                                      return (
                                        <div key={`received-${bottle.bottleTypeId}`} className="flex justify-between border-b pb-1">
                                          <span>{bt?.name}</span>
                                          <span className="font-medium">{bottle.quantity}</span>
                                        </div>
                                      );
                                    })}
                                      {operation.debtChange !== 0 && (
                                        <div className={`font-medium mt-4 ${
                                          operation.debtChange > 0 ? 'text-destructive' : 'text-success'
                                        }`}>
                                          {operation.debtChange > 0 ? 'Dette: +' : 'Réduction: '}{Math.abs(operation.debtChange)} bouteilles
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-muted-foreground">Pas encore de retour</div>
                                  )}
                                </div>
                              </div>
                              
                              <DialogFooter>
                                <Button variant="outline" onClick={() => handleDownloadPDF(operation)}>
                                  <Download className="w-4 h-4 mr-1" />
                                  Télécharger PDF
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(operation)}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      Aucune opération usine enregistrée
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <div className="flex items-center justify-between px-4 py-2 border-t">
          <div className="text-sm text-muted-foreground">
            {factoryOperations.length} opérations au total
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
      </Card>
    </div>
  );
};

export default Factory;