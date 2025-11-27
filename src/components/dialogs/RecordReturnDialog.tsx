// أعلى الملف: تحديث الاستيرادات
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { SupplyOrder, ReturnOrderItem, ExpenseReport } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Receipt, DollarSign } from 'lucide-react';
import { COMPANIES } from '@/pages/Exchanges';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';



// حساب الإجمالي: سعر وحدات مباعة + TVA 10% + رسوم Consigne
const CONSIGNE_FEES: Record<string, number> = {
  'Butane 12KG': 50,
  'Butane 6KG': 30,
  'Butane 3KG': 20,
};

const calculatePaymentTotals = (items: ReturnOrderItem[], supplyOrder: SupplyOrder, totalExpenses: number) => {
  if (!items || items.length === 0) {
    return { subtotal: 0, taxAmount: 0, total: 0, consigneFeesTotal: 0 };
  }

  const subtotal = items.reduce((sum, item) => {
    const originalItem = supplyOrder.items.find(orig => orig.bottleTypeId === item.bottleTypeId);
    if (!originalItem) return sum;
    const soldQuantity = (item.returnedEmptyQuantity || 0) + (item.consigneQuantity || 0);
    const amount = soldQuantity * (originalItem.unitPrice || 0);
    return sum + amount;
  }, 0);

  const consigneFeesTotal = items.reduce((sum, item) => {
    const fee = CONSIGNE_FEES[item.bottleTypeName] || 0;
    const q = item.consigneQuantity || 0;
    return sum + (q * fee);
  }, 0);

  const taxRate = 10;
  const taxAmount = subtotal * (taxRate / 100);

  // BD total includes consigne fees and subtracts enterprise expenses
  const total = subtotal + consigneFeesTotal - totalExpenses;
  return { subtotal, taxAmount, total, consigneFeesTotal };
};

interface RecordReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplyOrder: SupplyOrder;
}

interface ForeignBottleEntry {
  companyName: string;
  bottleType: string;
  quantity: number;
  
}

// داخل الدالة RecordReturnDialog: إضافة حالة النافذة وتنظيف إدخالات الكميات
export const RecordReturnDialog: React.FC<RecordReturnDialogProps> = ({ open, onOpenChange, supplyOrder }) => {
    const { addReturnOrder, addExpense, updateBottleType, bottleTypes, updateDriver, drivers, addForeignBottle, updateEmptyBottlesStockByBottleType, addDefectiveBottle, addRevenue, updateDriverDebt, brands } = useApp();
    const { toast } = useToast();

    const [items, setItems] = useState<ReturnOrderItem[]>([]);

    React.useEffect(() => {
      setItems(
        supplyOrder.items
          .filter(item => (item.emptyQuantity > 0 || item.fullQuantity > 0))
          .map(item => ({
            bottleTypeId: item.bottleTypeId,
            bottleTypeName: item.bottleTypeName,
            emptyQuantity: item.emptyQuantity,
            fullQuantity: item.fullQuantity,
            returnedEmptyQuantity: 0,
            returnedFullQuantity: 0,
            foreignQuantity: 0,
            defectiveQuantity: 0,
            lostQuantity: 0,
            consigneQuantity: 0,
            soldQuantity: 0,
          }))
      );
    }, [supplyOrder]);

    const [expenses, setExpenses] = useState<ExpenseReport[]>([]);
    const [newExpense, setNewExpense] = useState({ description: '', amount: 0 });

    // يحتسب مجموع المصاريف: المضافة للقائمة + المُدخلة حالياً حتى قبل الضغط على "+"
    const totalExpenses = React.useMemo(
      () =>
        expenses.reduce((sum, e) => sum + (e.amount ?? (e as any).price ?? 0), 0) +
        (newExpense.amount > 0 ? newExpense.amount : 0),
      [expenses, newExpense]
    );

    const paymentTotals = React.useMemo(
      () => calculatePaymentTotals(items, supplyOrder, totalExpenses),
      [items, supplyOrder, totalExpenses]
    );

    // حقول الدفع
    const [paymentCashAmount, setPaymentCashAmount] = useState<string>('');
    const [paymentCheckAmount, setPaymentCheckAmount] = useState<string>('');
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

    const [foreignBottlesModalOpen, setForeignBottlesModalOpen] = useState(false);
    const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null);
    const [foreignBottles, setForeignBottles] = useState<ForeignBottleEntry[]>([]);
    const [newForeignBottle, setNewForeignBottle] = useState<ForeignBottleEntry>({
      companyName: '',
      bottleType: '',
      quantity: 0,
    });

    const handleQuantityChange = (bottleTypeId: string, field: keyof ReturnOrderItem, value: string) => {
      const quantity = parseInt(value) || 0;
      setItems(prev =>
        prev.map(item =>
          item.bottleTypeId === bottleTypeId
            ? { ...item, [field]: quantity }
            : item
        )
      );
    };

  // Store foreign bottle details per product (keyed by bottleTypeId)
  const [foreignDetailsByItem, setForeignDetailsByItem] = useState<Record<string, ForeignBottleEntry[]>>({});
  // حساب إجمالي المبيعات وقيمتها المالية: Ventes = VIDES + CONSIGNE
  const ventesSummary = React.useMemo(() => {
    const totalVentes = items.reduce((sum, it) => {
      const ventes = (it.returnedEmptyQuantity || 0) + (it.consigneQuantity || 0);
      return sum + ventes;
    }, 0);

    const totalPrix = items.reduce((sum, it) => {
      const bt = bottleTypes.find(b => b.id === it.bottleTypeId);
      const unitPrice = bt?.unitPrice || 0;
      const ventes = (it.returnedEmptyQuantity || 0) + (it.consigneQuantity || 0);
      return sum + (ventes * unitPrice);
    }, 0);

    const consigneFeesTotal = items.reduce((sum, it) => {
      const fee = CONSIGNE_FEES[it.bottleTypeName] || 0;
      const q = it.consigneQuantity || 0;
      return sum + (q * fee);
    }, 0);

    return { totalVentes, totalPrix, consigneFeesTotal };
  }, [items, bottleTypes]);

  const openForeignBottlesModal = (index: number) => {
    setCurrentItemIndex(index);
    const currentItem = items[index];
    setNewForeignBottle({
      companyName: '',
      bottleType: currentItem.bottleTypeName,
      quantity: 0,
    });
    // Load previously saved entries for this product
    setForeignBottles(foreignDetailsByItem[currentItem.bottleTypeId] || []);
    setForeignBottlesModalOpen(true);
  };

  const addForeignBottleEntry = () => {
    const qty = Number(newForeignBottle.quantity) || 0;
    if (qty <= 0) {
      toast({
        title: "Quantité invalide",
        description: "Veuillez entrer une quantité > 0",
        variant: "destructive",
      });
      return;
    }

    const itemName =
      (currentItemIndex !== null ? items[currentItemIndex]?.bottleTypeName : undefined) ||
      newForeignBottle.bottleType;

    const company = (newForeignBottle.companyName || '').trim() || 'Autre';

    setForeignBottles(prev => [
      ...prev,
      {
        companyName: company,
        bottleType: itemName || '',
        quantity: qty,
      },
    ]);

    setNewForeignBottle({ companyName: '', bottleType: itemName || '', quantity: 0 });
  };

  const removeForeignBottleEntry = (index: number) => {
    setForeignBottles(prev => prev.filter((_, i) => i !== index));
  };

  const saveForeignBottles = () => {
    if (currentItemIndex !== null) {
      const item = items[currentItemIndex];
      const totalForeignQuantity = foreignBottles.reduce((sum, fb) => sum + fb.quantity, 0);
      setItems(prev =>
        prev.map((it, idx) =>
          idx === currentItemIndex
            ? { ...it, foreignQuantity: totalForeignQuantity }
            : it
        )
      );
      // Persist per-item foreign details
      setForeignDetailsByItem(prev => ({
        ...prev,
        [item.bottleTypeId]: foreignBottles
      }));
    }
    setForeignBottlesModalOpen(false);
  };

  const addExpenseEntry = () => {
    if (newExpense.description && newExpense.amount > 0) {
      setExpenses(prev => [...prev, newExpense]);
      setNewExpense({ description: '', amount: 0 });
    }
  };

  const removeExpenseEntry = (index: number) => {
    setExpenses(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    try {
      const orderNumber = `BD${Date.now().toString().slice(-5)}`;
      let driverDebtChange = 0;
      let driverCreditChange = 0;

      // Per-item coherence validation first
      const incoherences: string[] = [];
      items.forEach(item => {
        const vides = item.returnedEmptyQuantity || 0;
        const consigne = item.consigneQuantity || 0;
        const pleinsRevenus = item.returnedFullQuantity || 0;
        const defectueuses = item.defectiveQuantity || 0;
        const bsPleinsSortis = item.fullQuantity || 0;
        const ventes = vides + consigne;

        if (bsPleinsSortis !== (ventes + pleinsRevenus + defectueuses)) {
          incoherences.push(
            `${item.bottleTypeName}: B.S pleins ${bsPleinsSortis} ≠ VENTES ${ventes} + PLEINS revenus ${pleinsRevenus} + DÉFECTUEUSES ${defectueuses}`
          );
        }
      });

      // if (incoherences.length > 0) {
      //   toast({
      //     title: "Contrôle de cohérence",
      //     description: incoherences.join(' | '),
      //     variant: "destructive",
      //   });
      //   return;
      // }

      // Apply stock, debt, and tracking rules
      items.forEach(item => {
        const bottleType = bottleTypes.find(bt => bt.id === item.bottleTypeId);
        if (!bottleType) return;

        const returnedEmpty = item.returnedEmptyQuantity || 0;     // VIDES
        const returnedFull = item.returnedFullQuantity || 0;       // PLEINS revenus
        const foreign = item.foreignQuantity || 0;                 // ÉTRANGER
        const defective = item.defectiveQuantity || 0;             // DÉFECTUEUSES
        const rc = item.lostQuantity || 0;                         // R.C
        const consigne = item.consigneQuantity || 0;               // CONSIGNE

        // تطبيق الأثر الصحيح على stock vides باستخدام الدالة حسب نوع القنينة
        updateEmptyBottlesStockByBottleType(item.bottleTypeId, returnedEmpty);             // + VIDES
        if (consigne > 0) updateEmptyBottlesStockByBottleType(item.bottleTypeId, -consigne); // - CONSIGNE
        if (rc > 0) updateEmptyBottlesStockByBottleType(item.bottleTypeId, -rc);             // - RC
        if (foreign > 0) updateEmptyBottlesStockByBottleType(item.bottleTypeId, -foreign);   // - ÉTRANGÈRES

        // Full inventory: إضافة "pleins revenus" فقط
        const newRemaining = bottleType.remainingQuantity + returnedFull;
        const newDistributed = Math.max(0, bottleType.distributedQuantity - (item.fullQuantity || 0));
        updateBottleType(item.bottleTypeId, {
          remainingQuantity: newRemaining,
          distributedQuantity: newDistributed,
        });

        // 5) Driver debt: RC increases debt only
        if (rc > 0) {
          driverDebtChange += rc * bottleType.unitPrice;
        }
      });
  
    const netSales = ventesSummary.totalPrix - totalExpenses;
  
    const totalRC = items.reduce((sum, it) => sum + (it.lostQuantity || 0), 0);
  
    // حساب الدفع والديون المتبقية وفق واجهة الدفع الجديدة
    const cash = parseFloat(paymentCashAmount) || 0;
    const check = parseFloat(paymentCheckAmount) || 0;
    const paymentDebt = Math.max(0, paymentTotals.total - (cash + check));
  
    // إنشاء بون الدخول وإرجاع معرفه لربط الإيراد
    const paymentInfo = {
      cash,
      check,
      debt: paymentDebt,
      total: paymentTotals.total,
      subtotal: paymentTotals.subtotal,
      taxAmount: paymentTotals.taxAmount,
    };
    const newReturnOrderId = addReturnOrder(
      supplyOrder.id,
      items,
      ventesSummary.totalVentes,
      totalExpenses,
      totalRC,
      netSales,
      supplyOrder.driverId ?? '',
      driverDebtChange,
      0,
      JSON.stringify(paymentInfo),
      orderNumber
    );
    
    // تحديث سجلات الزجاجات الأجنبية والمعيبة لتستخدم returnOrderId الصحيح
    items.forEach(item => {
        const foreignEntries = foreignDetailsByItem[item.bottleTypeId] || [];
        foreignEntries.forEach(fb => {
          addForeignBottle({
            returnOrderId: newReturnOrderId,
            companyName: fb.companyName,
            bottleType: fb.bottleType,
            quantity: fb.quantity,
            date: new Date().toISOString(),
          });
        });
        if (foreignEntries.length === 0 && (item.foreignQuantity || 0) > 0) {
          addForeignBottle({
            returnOrderId: newReturnOrderId,
            companyName: 'Autre',
            bottleType: item.bottleTypeName,
            quantity: item.foreignQuantity || 0,
            date: new Date().toISOString(),
          });
        }

        if ((item.defectiveQuantity || 0) > 0) {
          addDefectiveBottle({
            returnOrderId: newReturnOrderId,
            bottleTypeId: item.bottleTypeId,
            bottleTypeName: item.bottleTypeName,
            quantity: item.defectiveQuantity || 0,
            date: new Date().toISOString(),
          });
        }
      });

        // تسجيل المصاريف المؤسسية وربطها بـ returnOrderId الصحيح
        expenses.forEach(expense => {
          addExpense({
            id: `exp-${Date.now()}-${Math.random()}`,
            type: 'note de frais',
            amount: expense.amount,
            paymentMethod: 'dette',
            date: new Date().toISOString(),
            note: expense.description,
            returnOrderId: newReturnOrderId,
          });
        });
        if (newExpense.description && newExpense.amount > 0) {
          addExpense({
            id: `exp-${Date.now()}-${Math.random()}`,
            type: 'note de frais',
            amount: newExpense.amount,
            paymentMethod: 'dette',
            date: new Date().toISOString(),
            note: newExpense.description,
            returnOrderId: newReturnOrderId,
          });
        }

        // تسجيل الإيراد وربطه بـ B.D
        addRevenue({
          date: new Date().toISOString(),
          description: `Règlement B.D ${orderNumber}`,
          amount: cash + check,
          paymentMethod: cash > 0 && check > 0 ? 'mixed' : cash > 0 ? 'cash' : 'check',
          cashAmount: cash,
          checkAmount: check,
          relatedOrderId: newReturnOrderId,
          relatedOrderType: 'return',
        });

        // إضافة الدين المتبقي على السائق إن وُجد
        if (paymentDebt > 0 && supplyOrder.driverId) {
          updateDriverDebt(supplyOrder.driverId, paymentDebt);
        }

        // إشعارات وإغلاق
        toast({
          title: "Bon d'Entrée créé",
          description: `B.D N° ${orderNumber} a été créé avec succès`,
        });

        onOpenChange(false);
        setForeignBottles([]);
        setExpenses([]);
        setPaymentCashAmount('');
        setPaymentCheckAmount('');
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement. Veuillez vérifier la console pour plus de détails.",
        variant: "destructive",
      });
    }
  };

    return (
      <>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Enregistrer un retour — {supplyOrder.orderNumber}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="flex items-center justify-between">
                <Label>Produits retournés</Label>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPaymentDialogOpen(true)}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Règlement
                </Button>
              </div>



              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>Vides (B.S)</TableHead>
                      <TableHead>Pleins (B.S)</TableHead>
                      <TableHead>Étranger</TableHead>
                      <TableHead>Défectueux</TableHead>
                      <TableHead>Consigne</TableHead>
                      <TableHead>R.C</TableHead>
                      <TableHead>Ventes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => {
                      const ventes = (item.returnedEmptyQuantity || 0) + (item.consigneQuantity || 0);
                      return (
                        <TableRow key={item.bottleTypeId}>
                          <TableCell className="font-medium">{item.bottleTypeName}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.returnedEmptyQuantity || 0}
                              onChange={(e) =>
                                handleQuantityChange(item.bottleTypeId, 'returnedEmptyQuantity', e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.returnedFullQuantity || 0}
                              onChange={(e) =>
                                handleQuantityChange(item.bottleTypeId, 'returnedFullQuantity', e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={item.foreignQuantity || 0}
                                onChange={(e) =>
                                  handleQuantityChange(item.bottleTypeId, 'foreignQuantity', e.target.value)
                                }
                              />
                              <Button variant="outline" size="icon" onClick={() => openForeignBottlesModal(idx)}>
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.defectiveQuantity || 0}
                              onChange={(e) =>
                                handleQuantityChange(item.bottleTypeId, 'defectiveQuantity', e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.consigneQuantity || 0}
                              onChange={(e) =>
                                handleQuantityChange(item.bottleTypeId, 'consigneQuantity', e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.lostQuantity || 0}
                              onChange={(e) =>
                                handleQuantityChange(item.bottleTypeId, 'lostQuantity', e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold">{ventes}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Résumé des Ventes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between">
                    <span>Total des Ventes (avant frais):</span>
                    <span>{ventesSummary.totalPrix.toFixed(2)} DH</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Consigne (dépôt bouteilles):</span>
                    <span>{ventesSummary.consigneFeesTotal.toFixed(2)} DH</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Note de frais:</span>
                    <span>{totalExpenses.toFixed(2)} DH</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Montant Total des Ventes (à verser par le chauffeur):</span>
                    <span className="text-primary">
                      {(ventesSummary.totalPrix + ventesSummary.consigneFeesTotal - totalExpenses).toFixed(2)} DH
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Note de frais (Dette de l'entreprise)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {expenses.map((expense, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input value={expense.description} readOnly className="flex-grow" />
                        <Input value={expense.amount} readOnly className="w-24" />
                        <Button variant="ghost" size="icon" onClick={() => removeExpenseEntry(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Description de la dépense"
                        value={newExpense.description}
                        onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                        className="flex-grow"
                      />
                      <Input
                        type="number"
                        placeholder="Montant"
                        value={newExpense.amount || ''}
                        onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                        className="w-24"
                      />
                      <Button onClick={addExpenseEntry}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DialogFooter>
              <Button onClick={handleSubmit} className="w-full" disabled={items.length === 0}>
                Enregistrer
              </Button>
            </DialogFooter>

          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Règlement - B.D {supplyOrder.orderNumber}
                    </DialogTitle>
                    <DialogDescription>
                        Enregistrer le paiement pour ce bon d'entrée.
                    </DialogDescription>
                </DialogHeader>

                <Card className="border-2 border-primary/20 mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            Total des Montants et Méthodes de Paiement
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            <div className="bg-muted/50 p-4 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-medium">Montant Total:</span>
                                    <span className="text-2xl font-bold text-primary">{paymentTotals.total.toFixed(2)} DH</span>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="payment-cash-amount">Montant payé en Espèces</Label>
                                    <Input
                                        id="payment-cash-amount"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={paymentCashAmount}
                                        onChange={(e) => setPaymentCashAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="text-lg"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="payment-check-amount">Montant payé par Chèque</Label>
                                    <Input
                                        id="payment-check-amount"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={paymentCheckAmount}
                                        onChange={(e) => setPaymentCheckAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="text-lg"
                                    />
                                </div>
                            </div>

                            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-lg font-medium text-orange-800">Montant Restant (Dette):</span>
                                    <span className="text-2xl font-bold text-orange-600">
                                        {Math.max(0, paymentTotals.total - (parseFloat(paymentCashAmount) || 0) - (parseFloat(paymentCheckAmount) || 0)).toFixed(2)} DH
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                        Annuler
                    </Button>
                    <Button onClick={() => setPaymentDialogOpen(false)}>
                        Confirmer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={foreignBottlesModalOpen} onOpenChange={setForeignBottlesModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Ajouter Bouteilles Étrangères</DialogTitle>
              <DialogDescription>
                Ajoutez les détails des bouteilles étrangères ici.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="companyName" className="text-right">
                  Marque
                </Label>
                <Select
                  onValueChange={(value) => setNewForeignBottle({ ...newForeignBottle, companyName: value })}
                  value={newForeignBottle.companyName}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Sélectionner une marque" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.name}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bottleType" className="text-right">
                  Type
                </Label>
                <Input
                  id="bottleType"
                  value={newForeignBottle.bottleType}
                  onChange={(e) => setNewForeignBottle({ ...newForeignBottle, bottleType: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quantity" className="text-right">
                  Quantité
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  value={newForeignBottle.quantity}
                  onChange={(e) => setNewForeignBottle({ ...newForeignBottle, quantity: parseInt(e.target.value) || 0 })}
                  className="col-span-3"
                />
              </div>
              <div className="col-span-4 flex justify-end">
                <Button onClick={addForeignBottleEntry}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </div>

            {foreignBottles.length > 0 && (
              <div className="border rounded-md mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Société</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantité</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {foreignBottles.map((bottle, index) => (
                      <TableRow key={index}>
                        <TableCell>{bottle.companyName}</TableCell>
                        <TableCell>{bottle.bottleType}</TableCell>
                        <TableCell>{bottle.quantity}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeForeignBottleEntry(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setForeignBottlesModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={saveForeignBottles}>
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
};
