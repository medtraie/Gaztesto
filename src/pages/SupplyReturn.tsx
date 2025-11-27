import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApp } from '@/contexts/AppContext';

import { Package, FileText, Plus, Printer, Download, Search, Calendar, RotateCcw, Trash2, Edit, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, FileSpreadsheet, Loader2, Settings, DollarSign, Calculator } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SupplyOrderItem, SupplyOrder } from '@/types';
import { format } from 'date-fns';
import { RecordReturnDialog } from '@/components/dialogs/RecordReturnDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn, safeDate } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const SupplyReturn = () => {
  const { bottleTypes = [], drivers = [], clients = [], addClient, addSupplyOrder, updateBottleType, supplyOrders = [], returnOrders = [], deleteSupplyOrder, deleteReturnOrder, addRevenue, updateDriver, updateDriverDebt } = useApp();
  console.log(supplyOrders);
  const { toast } = useToast();



  const [selectedSupplyOrder, setSelectedSupplyOrder] = useState<SupplyOrder | null>(null);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  
  // Delete confirmation dialogs
  const [deleteSupplyDialogOpen, setDeleteSupplyDialogOpen] = useState(false);
  const [deleteReturnDialogOpen, setDeleteReturnDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  
  const [selectionType, setSelectionType] = useState<'existing' | 'new-driver' | 'new-client'>('existing');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [newDriverMatricule, setNewDriverMatricule] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [reference, setReference] = useState('');
  const [lastReference, setLastReference] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  
  // Load last reference from localStorage when component mounts
  useEffect(() => {
    const savedReference = localStorage.getItem('lastSupplyReference');
    if (savedReference) {
      setLastReference(savedReference);
    }
  }, []);

  useEffect(() => {
    if (supplyOrders.length === 0) {
      setOrderNumber("BS-1");
    } else {
      const maxNum = supplyOrders.reduce((max, order) => {
        if (order.orderNumber && order.orderNumber.startsWith('BS-')) {
          const num = parseInt(order.orderNumber.split('-')[1]);
          if (!isNaN(num) && num > max) {
            return num;
          }
        }
        return max;
      }, 0);
      setOrderNumber(`BS-${maxNum + 1}`);
    }
  }, [supplyOrders]);
  
  const [items, setItems] = useState<SupplyOrderItem[]>([]);
  
  // Filters for supply orders history
  const [filterDriver, setFilterDriver] = useState('all');
  const [filterClient, setFilterClient] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  // Filters for return orders history
  const [returnStartDate, setReturnStartDate] = useState<Date | undefined>(undefined);
  const [returnEndDate, setReturnEndDate] = useState<Date | undefined>(undefined);
  const [returnSearchQuery, setReturnSearchQuery] = useState('');
  const [returnFilterDriver, setReturnFilterDriver] = useState('all');
  const [returnFilterClient, setReturnFilterClient] = useState('all');
  const [returnCurrentPage, setReturnCurrentPage] = useState(1);
  const [selectedReturnOrder, setSelectedReturnOrder] = useState<any | null>(null);
  const [returnDetailsDialogOpen, setReturnDetailsDialogOpen] = useState(false);
  
  // Payment tracking states
  const [cashAmount, setCashAmount] = useState<string>('');
  const [checkAmount, setCheckAmount] = useState<string>('');
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  
  // Payment dialog states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedReturnOrderForPayment, setSelectedReturnOrderForPayment] = useState<any | null>(null);
  const [paymentCashAmount, setPaymentCashAmount] = useState<string>('');
  const [paymentCheckAmount, setPaymentCheckAmount] = useState<string>('');

  // State for expense notes in return dialog
  const [expenseNotes, setExpenseNotes] = useState<{ description: string; amount: number }[]>([]);
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  const addExpenseNote = () => {
    const amount = parseFloat(expenseAmount);
    if (expenseDescription.trim() && amount > 0) {
      setExpenseNotes([...expenseNotes, { description: expenseDescription.trim(), amount }]);
      setExpenseDescription('');
      setExpenseAmount('');
    }
  };

  const removeExpenseNote = (index: number) => {
    setExpenseNotes(expenseNotes.filter((_, i) => i !== index));
  };

  const totalExpenses = useMemo(() => {
    return expenseNotes.reduce((total, note) => total + note.amount, 0);
  }, [expenseNotes]);
  
  // Supply details dialog
  const [supplyDetailsDialogOpen, setSupplyDetailsDialogOpen] = useState(false);
  
  // Sorting
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(1);

  // الطي/الإظهار لقسم Historique des Bons de Sortie (محفوظ في localStorage)
  const [supplyHistoryOpen, setSupplyHistoryOpen] = useState<boolean>(() => {
    const v = localStorage.getItem("supplyReturn.historyOpen");
    return v ? v === "true" : false; // افتراضي: مخفي إذا لا يوجد تخزين سابق
  });
  useEffect(() => {
    localStorage.setItem("supplyReturn.historyOpen", String(supplyHistoryOpen));
  }, [supplyHistoryOpen]);
  

  // Calculate total amount from products
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  
  // Calculate debt (remaining amount)
  const calculateDebt = () => {
    const cash = parseFloat(cashAmount) || 0;
    const check = parseFloat(checkAmount) || 0;
    return Math.max(0, totalAmount - (cash + check));
  };

  // Get remaining debt for payment processing
  const getRemainingDebt = () => {
    const cash = parseFloat(cashAmount) || 0;
    const check = parseFloat(checkAmount) || 0;
    return Math.max(0, total - (cash + check));
  };

  // Reset payment form
  const resetPaymentForm = () => {
    setCashAmount('');
    setCheckAmount('');
    setShowPaymentSection(false);
  };
  
  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const handleQuantityChange = (bottleTypeId: string, field: 'empty' | 'full', value: string) => {
    const raw = parseInt(value) || 0;
    const bottleType = bottleTypes.find(bt => bt.id === bottleTypeId);
    if (!bottleType) return;

    const safeQuantity =
      field === 'full'
        ? Math.max(0, Math.min(raw, bottleType.remainingQuantity))
        : Math.max(0, raw);

    setItems(prev => {
      const existing = prev.find(item => item.bottleTypeId === bottleTypeId);

      if (existing) {
        const updated = { ...existing };
        if (field === 'empty') updated.emptyQuantity = safeQuantity;
        if (field === 'full') updated.fullQuantity = safeQuantity;
        updated.amount = updated.fullQuantity * bottleType.unitPrice;

        return prev.map(item => item.bottleTypeId === bottleTypeId ? updated : item);
      } else {
        const newItem: SupplyOrderItem = {
          bottleTypeId: bottleType.id,
          bottleTypeName: bottleType.name,
          emptyQuantity: field === 'empty' ? safeQuantity : 0,
          fullQuantity: field === 'full' ? safeQuantity : 0,
          unitPrice: bottleType.unitPrice,
          taxLabel: `${bottleType.taxRate}%`,
          amount: (field === 'full' ? safeQuantity : 0) * bottleType.unitPrice
        };

        return [...prev, newItem];
      }
    });
  };
  
  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxRate = 10; // 10% TVA
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    
    return { subtotal, taxRate, taxAmount, total };
  };
  
  const handleSubmit = () => {
    if (items.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez ajouter au moins un produit",
        variant: "destructive"
      });
      return;
    }
    
    // Client is now optional, so we don't check for it
    
    if (selectionType === 'new-driver' && !newDriverMatricule.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un matricule",
        variant: "destructive"
      });
      return;
    }
    
    if (selectionType === 'new-client' && !newClientName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un nom de client",
        variant: "destructive"
      });
      return;
    }
    
    // Update stock
    items.forEach(item => {
      const bottleType = bottleTypes.find(bt => bt.id === item.bottleTypeId);
      if (bottleType) {
        // Each full bottle counts as 1 empty + 1 full
        // So we remove fullQuantity from remainingQuantity (pleine)
        const newRemainingQuantity = bottleType.remainingQuantity - item.fullQuantity;
        const newDistributedQuantity = bottleType.distributedQuantity + item.fullQuantity;
        
        updateBottleType(item.bottleTypeId, {
          remainingQuantity: newRemainingQuantity,
          distributedQuantity: newDistributedQuantity
        });
      }
    });
    
    const { subtotal, taxRate, taxAmount, total } = calculateTotals();
    
    // Handle new client
    let finalClientId = selectedClientId;
    let finalClientName = '';
    if (selectionType === 'new-client' && newClientName.trim()) {
      const newClient = { name: newClientName.trim() };
      const clientId = addClient(newClient);
      finalClientId = clientId;
      finalClientName = newClientName.trim();
    } else if (selectedClientId) {
      const client = clients.find(c => c.id === selectedClientId);
      finalClientName = client?.name || '';
    }
    
    // Handle driver
    let finalDriverId = selectedDriverId;
    let finalDriverName = '';
    if (selectionType === 'new-driver' && newDriverMatricule.trim()) {
      finalDriverName = newDriverMatricule.trim();
    } else if (selectedDriverId) {
      const driver = drivers.find(d => d.id === selectedDriverId);
      finalDriverName = driver?.name || '';
    }
    
    // Process payments if payment section is shown
    if (showPaymentSection) {
      const cashAmountNum = parseFloat(cashAmount) || 0;
      const checkAmountNum = parseFloat(checkAmount) || 0;
      const debtAmount = getRemainingDebt();
      
      // Add revenue for cash and check payments
      if (cashAmountNum > 0 || checkAmountNum > 0) {
        addRevenue({
          totalCash: cashAmountNum,
          totalCheque: checkAmountNum,
          totalBank: 0,
          totalDebt: debtAmount,
          totalAmount: total,
          date: new Date().toISOString(),
          source: `B.S ${orderNumber}`,
          driverName: finalDriverName
        });
      }
      
      // Update driver debt if there's remaining debt and a driver is selected
      if (debtAmount > 0 && finalDriverId) {
        const driver = drivers.find(d => d.id === finalDriverId);
        if (driver) {
          updateDriver(finalDriverId, {
            debt: driver.debt + debtAmount
          });
        }
      }
    }
    
    addSupplyOrder({
      id: orderNumber, // Use the generated order number as the ID
      orderNumber: orderNumber,
      reference,
      date: new Date().toISOString(),
      driverId: finalDriverId || undefined,
      driverName: finalDriverName || undefined,
      clientId: finalClientId || undefined,
      clientName: finalClientName || undefined,
      items,
      subtotal,
      taxRate,
      taxAmount,
      total
    });
    
    toast({
      title: "Bon de sortie créé",
      description: `B.S N° ${orderNumber} a été créé avec succès`,
    });
    
    // Save the last reference if it exists
    if (reference) {
      localStorage.setItem('lastSupplyReference', reference);
      setLastReference(reference);
    }
    
    // Reset form
    resetPaymentForm();
    setItems([]);
    setSelectedDriverId('');
    setSelectedClientId('');
    setNewDriverMatricule('');
    setNewClientName('')
  };
  
  const handlePrintBS = (order: SupplyOrder) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bon de Sortie ${order.orderNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 24px; }
            .info { margin-bottom: 20px; }
            .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .totals { margin-top: 20px; text-align: right; }
            .total-row { display: flex; justify-content: flex-end; gap: 100px; margin: 5px 0; }
            .total-label { font-weight: normal; }
            .total-value { font-weight: bold; }
            .final-total { font-size: 18px; }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>BON DE SORTIE (B.S)</h1>
            <p>N° ${order.orderNumber}</p>
          </div>
          
          <div class="info">
            <div class="info-row">
              <strong>Date:</strong>
              <span>${format(new Date(order.date), 'dd/MM/yyyy HH:mm')}</span>
            </div>
            ${order.driverName ? `<div class="info-row"><strong>Chauffeur:</strong><span>${order.driverName}</span></div>` : ''}
            ${order.clientName ? `<div class="info-row"><strong>Client:</strong><span>${order.clientName}</span></div>` : ''}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Produit</th>
                <th>Quantité Vide</th>
                <th>Quantité Pleine</th>
                <th>Prix Unitaire</th>
                <th>TVA</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>${item.bottleTypeName}</td>
                  <td>${item.emptyQuantity}</td>
                  <td>${item.fullQuantity}</td>
                  <td>${item.unitPrice.toFixed(2)} DH</td>
                  <td>${item.taxLabel}</td>
                  <td>${item.amount.toFixed(2)} DH</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="total-row">
              <span class="total-label">Montant hors taxes:</span>
              <span class="total-value">${order.subtotal.toFixed(2)} DH</span>
            </div>
            <div class="total-row">
              <span class="total-label">TVA (${order.taxRate}%):</span>
              <span class="total-value">${order.taxAmount.toFixed(2)} DH</span>
            </div>
            <div class="total-row final-total">
              <span class="total-label">Total:</span>
              <span class="total-value">${order.total.toFixed(2)} DH</span>
            </div>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const filteredOrders = (supplyOrders || []).filter(order => {
    const orderDate = new Date(order.date);
    if (startDate && orderDate < startDate) return false;
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      if (orderDate > endOfDay) return false;
    }
    if (filterDriver !== 'all' && order.driverId !== filterDriver) return false;
    if (filterClient !== 'all' && order.clientId !== filterClient) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        order.orderNumber.toLowerCase().includes(query) ||
        order.driverName?.toLowerCase().includes(query) ||
        order.clientName?.toLowerCase().includes(query)
      );
    }
    return true;
  }).sort((a, b) => {
    const aValue = a[sortField as keyof typeof a];
    const bValue = b[sortField as keyof typeof b];

    if (aValue < bValue) {
      return sortDirection === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortDirection === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const filteredReturnOrders = (returnOrders || []).filter(order => {
    const orderDate = new Date(order.date);
    if (returnStartDate && orderDate < returnStartDate) return false;
    if (returnEndDate) {
      const endOfDay = new Date(returnEndDate);
      endOfDay.setHours(23, 59, 59, 999);
      if (orderDate > endOfDay) return false;
    }
    if (returnFilterDriver !== 'all' && order.driverId !== returnFilterDriver) return false;
    if (returnFilterClient !== 'all' && order.clientId !== returnFilterClient) return false;
    if (returnSearchQuery) {
      const query = returnSearchQuery.toLowerCase();
      return (
        order.orderNumber.toLowerCase().includes(query) ||
        order.supplyOrderNumber.toLowerCase().includes(query) ||
        (order.driverName && order.driverName.toLowerCase().includes(query)) ||
        (order.clientName && order.clientName.toLowerCase().includes(query))
      );
    }
    return true;
  }).sort((a, b) => {
    const aValue = a[sortField as keyof typeof a];
    const bValue = b[sortField as keyof typeof b];

    if (aValue < bValue) {
      return sortDirection === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortDirection === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const handleDeleteSupplyOrder = (id: string) => {
    // Restore stock from the deleted supply order
    const order = (supplyOrders || []).find((o: any) => o.id === id);

    if (order && order.items && order.items.length > 0) {
      order.items.forEach((item: any) => {
        const bt = bottleTypes.find(b => b.id === item.bottleTypeId);
        if (!bt) return;

        const fullQty = item.fullQuantity || 0;

        // Increase available stock, decrease distributed, enforce bounds
        const maxTotal = (bt as any).totalQuantity;
        const computedRemaining = (bt.remainingQuantity || 0) + fullQty;
        const newRemaining = typeof maxTotal === 'number' ? Math.min(maxTotal, computedRemaining) : computedRemaining;
        const newDistributed = Math.max(0, (bt.distributedQuantity || 0) - fullQty);

        updateBottleType(item.bottleTypeId, {
          remainingQuantity: newRemaining,
          distributedQuantity: newDistributed,
        });
      });
    }

    deleteSupplyOrder(id);
    setDeleteSupplyDialogOpen(false);
    setOrderToDelete(null);
    toast({
      title: "Bon de sortie supprimé",
      description: "Le stock a été rétabli et le bon de sortie supprimé",
    });
  };

  const handleDeleteReturnOrder = (id: string) => {
    deleteReturnOrder(id);
    setDeleteReturnDialogOpen(false);
    setOrderToDelete(null);
    toast({
      title: "Bon d'Entrée supprimé",
      description: "Le bon d'Entrée a été supprimé avec succès",
    });
  };

  // Payment dialog functions
  const calculatePaymentTotals = () => {
    if (!selectedReturnOrderForPayment || !selectedReturnOrderForPayment.items) {
      return { subtotal: 0, taxAmount: 0, total: 0 };
    }
    
    // Find the original supply order to get unit prices
    const originalSupplyOrder = supplyOrders.find(order =>
      order.id === selectedReturnOrderForPayment.supplyOrderId
    );

    if (!originalSupplyOrder) {
      return { subtotal: 0, taxAmount: 0, total: 0 };
    }

    // رسوم الـ Consigne حسب نوع القنينة
    const CONSIGNE_FEES: Record<string, number> = {
      'Butane 12KG': 50,
      'Butane 6KG': 40,
      'Butane 3KG': 30,
    };

    const subtotal = selectedReturnOrderForPayment.items.reduce((sum: number, item: any) => {
      // Find the original item to get unit price
      const originalItem = originalSupplyOrder.items.find((origItem: any) =>
        origItem.bottleTypeId === item.bottleTypeId
      );

      if (!originalItem) return sum;

      // Calculate sold quantity based on returned empty + consigne
      const soldQuantity = (item.returnedEmptyQuantity || 0) + (item.consigneQuantity || 0);

      const amount = soldQuantity * (originalItem.unitPrice || 0);
      return sum + amount;
    }, 0);

    const taxRate = 10; // 10% TVA
    const taxAmount = subtotal * (taxRate / 100);

    // إجمالي رسوم الـ Consigne تُضاف مباشرة إلى Montant Total
    const consigneFeesTotal = selectedReturnOrderForPayment.items.reduce((sum: number, item: any) => {
      const fee = CONSIGNE_FEES[item.bottleTypeName] || 0;
      const q = item.consigneQuantity || 0;
      return sum + (q * fee);
    }, 0);

    const total = subtotal + taxAmount + consigneFeesTotal;

    return { subtotal, taxAmount, total };
  };

  const calculatePaymentDebt = () => {
    const { total } = calculatePaymentTotals();
    const cash = parseFloat(paymentCashAmount) || 0;
    const check = parseFloat(paymentCheckAmount) || 0;
    return Math.max(0, total - (cash + check));
  };

  const handlePaymentSubmit = () => {
    if (!selectedReturnOrderForPayment) return;

    const { total } = calculatePaymentTotals();
    const cash = parseFloat(paymentCashAmount) || 0;
    const check = parseFloat(paymentCheckAmount) || 0;
    const debt = calculatePaymentDebt();

    // Add revenue entry
    addRevenue({
      date: new Date().toISOString(),
      description: `Règlement B.D ${selectedReturnOrderForPayment.orderNumber}`,
      amount: cash + check,
      paymentMethod: cash > 0 && check > 0 ? 'mixed' : cash > 0 ? 'cash' : 'check',
      cashAmount: cash,
      checkAmount: check,
      relatedOrderId: selectedReturnOrderForPayment.id,
      relatedOrderType: 'return'
    });

    // Update driver debt if there's remaining debt and a driver is assigned
    if (debt > 0 && selectedReturnOrderForPayment.driverId) {
      updateDriverDebt(selectedReturnOrderForPayment.driverId, debt);
    }

    // Reset form and close dialog
    setPaymentCashAmount('');
    setPaymentCheckAmount('');
    setPaymentDialogOpen(false);
    setSelectedReturnOrderForPayment(null);

    toast({
      title: "Règlement enregistré",
      description: `Paiement de ${(cash + check).toFixed(2)} DH enregistré avec succès${debt > 0 ? `. Dette de ${debt.toFixed(2)} DH ajoutée au chauffeur.` : '.'}`,
    });
  };

  const resetPaymentDialog = () => {
    setPaymentCashAmount('');
    setPaymentCheckAmount('');
    setSelectedReturnOrderForPayment(null);
  };

  const handlePrintBD = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bon d'Entrée ${order.orderNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 24px; }
            .info { margin-bottom: 20px; }
            .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .legend { margin-top: 20px; font-size: 12px; }
            .legend-item { margin-bottom: 5px; }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>BON D'ENTRÉE (B.D)</h1>
            <p>N° ${order.orderNumber}</p>
          </div>
          
          <div class="info">
            <div class="info-row">
              <strong>Date:</strong>
              <span>${format(new Date(order.date), 'dd/MM/yyyy HH:mm')}</span>
            </div>
            <div class="info-row">
              <strong>Référence B.S:</strong>
              <span>${order.supplyOrderNumber}</span>
            </div>
            ${order.driverName ? `<div class="info-row"><strong>Chauffeur:</strong><span>${order.driverName}</span></div>` : ''}
            ${order.clientName ? `<div class="info-row"><strong>Client:</strong><span>${order.clientName}</span></div>` : ''}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Produit</th>
                <th>Vides</th>
                <th>Pleines</th>
                <th>Étrangères</th>
                <th>Défectueuses</th>
                <th>Consigne</th>
                <th>R.C</th>
                <th>Ventes</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || []).map(item => `
                <tr>
                  <td>${item.bottleTypeName}</td>
                  <td>${item.returnedEmptyQuantity || 0}</td>
                  <td>${item.returnedFullQuantity || 0}</td>
                  <td>${item.foreignQuantity || 0}</td>
                  <td>${item.defectiveQuantity || 0}</td>
                  <td>${item.consigneQuantity || 0}</td>
                  <td>${item.lostQuantity || 0}</td>
                  <td>${(item.returnedEmptyQuantity || 0) + (item.consigneQuantity || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="legend">
            <div class="legend-item"><strong>Légende:</strong></div>
            <div class="legend-item">Vides: Bouteilles vides retournées</div>
            <div class="legend-item">Pleines: Bouteilles pleines retournées</div>
            <div class="legend-item">Étrangères: Bouteilles d'autres fournisseurs</div>
            <div class="legend-item">Défectueuses: Bouteilles endommagées</div>
            <div class="legend-item">Consigne: Bouteilles vendues sans échange</div>
            <div class="legend-item">R.C: Bouteilles non retournées (dette chauffeur)</div>
            <div class="legend-item">Ventes: Vides + Consigne</div>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
  
  const { subtotal, taxAmount, total } = calculateTotals();
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bon de Sortie (B.S)</h1>
          <p className="text-muted-foreground mt-1">
            Alimenter un camion
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        {/* Selection Section */}
        <Card>
          <CardHeader>
            <CardTitle>Sélection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={selectionType} onValueChange={(value: any) => setSelectionType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="existing">Chauffeur / Client existant</SelectItem>
                  <SelectItem value="new-driver">Nouveau chauffeur</SelectItem>
                  <SelectItem value="new-client">Nouveau client</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectionType === 'existing' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Chauffeur</Label>
                  <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                    <SelectTrigger>
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
                </div>

                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {selectionType === 'new-driver' && (
              <div className="space-y-2">
                <Label>Matricule du camion</Label>
                <Input
                  placeholder="Ex: 12345-A-67"
                  value={newDriverMatricule}
                  onChange={(e) => setNewDriverMatricule(e.target.value)}
                />
              </div>
            )}

            {selectionType === 'new-client' && (
              <div className="space-y-2">
                <Label>Nom du client</Label>
                <Input
                  placeholder="Nom du client"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>N° BS</Label>
              <Input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Référence</Label>
              <div className="space-y-1">
                <Input
                  placeholder="Référence (optionnel)"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
                {lastReference && (
                  <div className="text-xs text-muted-foreground flex items-center">
                    <span>Dernière référence: </span>
                    <span 
                      className="ml-1 text-primary cursor-pointer hover:underline" 
                      onClick={() => setReference(lastReference)}
                    >
                      {lastReference}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={resetPaymentForm}>
                Annuler
              </Button>
              <Button onClick={handleSubmit} disabled={items.length === 0}>
                Enregistrer le Bon de Sortie
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Produits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead className="text-center">Vides</TableHead>
                  <TableHead className="text-center">Pleines</TableHead>
                  <TableHead className="text-center">Stock disponible</TableHead>
                  <TableHead className="text-right">Prix Unitaire</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bottleTypes.map(bt => {
                  const currentItem = items.find(i => i.bottleTypeId === bt.id);
                  const emptyQty = currentItem?.emptyQuantity ?? 0;
                  const fullQty = currentItem?.fullQuantity ?? 0;
                  const amount = currentItem?.amount ?? 0;

                  return (
                    <TableRow key={bt.id}>
                      <TableCell className="font-medium">
                        {bt.name}
                        <div className="text-xs text-muted-foreground">{bt.capacity}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min={0}
                          value={emptyQty}
                          onChange={(e) => handleQuantityChange(bt.id, 'empty', e.target.value)}
                          className="w-24 text-center"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min={0}
                          max={bt.remainingQuantity}
                          value={fullQty}
                          onChange={(e) => handleQuantityChange(bt.id, 'full', e.target.value)}
                          className="w-24 text-center"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          max {bt.remainingQuantity}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {bt.remainingQuantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {bt.unitPrice.toFixed(2)} DH
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {amount.toFixed(2)} DH
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Totaux</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
              <span>Sous-total</span>
              <span className="font-semibold">{subtotal.toFixed(2)} DH</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
              <span>TVA (10%)</span>
              <span className="font-semibold">{taxAmount.toFixed(2)} DH</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
              <span>Total</span>
              <span className="font-bold text-primary">{total.toFixed(2)} DH</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Section */}
      <Card className="mt-8">
        <Collapsible open={supplyHistoryOpen} onOpenChange={setSupplyHistoryOpen}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Historique des Bons de Sortie
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                {supplyHistoryOpen ? (
                  <>
                    <ChevronUp className="w-4 h-4" /> Masquer
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" /> Afficher
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </CardHeader>

          <CollapsibleContent>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="search" className="mb-2">Rechercher</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="search"
                      placeholder="N° BS, Chauffeur, Client..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="w-[200px]">
                  <Label htmlFor="start-date" className="mb-2">Date de début</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="start-date"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "dd/MM/yyyy") : <span>Choisir</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="w-[200px]">
                  <Label htmlFor="end-date" className="mb-2">Date de fin</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="end-date"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "dd/MM/yyyy") : <span>Choisir</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="w-[200px]">
                  <Label htmlFor="filter-driver" className="mb-2">Chauffeur</Label>
                  <Select value={filterDriver} onValueChange={setFilterDriver}>
                    <SelectTrigger id="filter-driver">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      {drivers.map(driver => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-[200px]">
                  <Label htmlFor="filter-client" className="mb-2">Client</Label>
                  <Select value={filterClient} onValueChange={setFilterClient}>
                    <SelectTrigger id="filter-client">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° BS</TableHead>
                      <TableHead>Référence</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Chauffeur</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Produits</TableHead>
                      <TableHead className="text-right">Montant Total</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Aucun bon de sortie trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrders.map(order => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.orderNumber}</TableCell>
                          <TableCell>{order.reference || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              {format(new Date(order.date), 'dd/MM/yyyy HH:mm')}
                            </div>
                          </TableCell>
                          <TableCell>{order.driverName || '-'}</TableCell>
                          <TableCell>{order.clientName || '-'}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="p-0 h-auto font-normal text-primary"
                                onClick={() => {
                                  setSelectedSupplyOrder(order);
                                  setSupplyDetailsDialogOpen(true);
                                }}
                              >
                                {order.items.length} produit{order.items.length > 1 ? 's' : ''} - Voir détails
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {order.total.toFixed(2)} DH
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex gap-2 justify-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePrintBS(order)}
                              >
                                <Printer className="w-4 h-4 mr-1" />
                                Imprimer
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setSelectedSupplyOrder(order);
                                  setReturnDialogOpen(true);
                                }}
                              >
                                <RotateCcw className="w-4 h-4 mr-1" />
                                Retour
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setOrderToDelete(order.id);
                                  setDeleteSupplyDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Supprimer
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Return Orders History */}
      <Card className="mt-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Historique des Bons d'Entrées (B.D)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <FileSpreadsheet className="w-4 h-4" />
              Exporter
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-1" />
                  Options
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Affichage</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={true}>
                  Date
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={true}>
                  B.S Référence
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={true}>
                  Chauffeur
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={true}>
                  Client
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Éléments par page</DropdownMenuLabel>
                <DropdownMenuRadioGroup value="10">
                  <DropdownMenuRadioItem value="5">5</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="10">10</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="20">20</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="50">50</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters for Return Orders */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="w-[200px]">
              <Label htmlFor="return-start-date" className="mb-2">Date de début</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="return-start-date"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !returnStartDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {returnStartDate ? format(returnStartDate, "dd/MM/yyyy") : <span>Choisir</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={returnStartDate}
                    onSelect={setReturnStartDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="w-[200px]">
              <Label htmlFor="return-end-date" className="mb-2">Date de fin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="return-end-date"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !returnEndDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {returnEndDate ? format(returnEndDate, "dd/MM/yyyy") : <span>Choisir</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={returnEndDate}
                    onSelect={setReturnEndDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Filters for Return Orders - Additional filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="return-search" className="mb-2">Rechercher</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="return-search"
                  placeholder="N° BD, Chauffeur, Client..."
                  value={returnSearchQuery}
                  onChange={(e) => setReturnSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="w-[200px]">
              <Label htmlFor="return-filter-driver" className="mb-2">Chauffeur</Label>
              <Select value={returnFilterDriver} onValueChange={setReturnFilterDriver}>
                <SelectTrigger id="return-filter-driver">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {drivers.map(driver => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[200px]">
              <Label htmlFor="return-filter-client" className="mb-2">Client</Label>
              <Select value={returnFilterClient} onValueChange={setReturnFilterClient}>
                <SelectTrigger id="return-filter-client">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loading indicator */}
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2">Chargement des données...</span>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('orderNumber')}>
                      <div className="flex items-center">
                        N° B.D
                        {sortField === 'orderNumber' && (
                          sortDirection === 'asc' ? 
                            <ChevronUp className="ml-1 h-4 w-4" /> : 
                            <ChevronDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('date')}>
                      <div className="flex items-center">
                        Date
                        {sortField === 'date' && (
                          sortDirection === 'asc' ? 
                            <ChevronUp className="ml-1 h-4 w-4" /> : 
                            <ChevronDown className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>B.S Référence</TableHead>
                    <TableHead>Chauffeur</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Produits</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReturnOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Aucun bon d'entrée trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReturnOrders.map(order => (
                        <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => {
                          setSelectedReturnOrder(order);
                          setReturnDetailsDialogOpen(true);
                        }}>
                          <TableCell className="font-medium">{order.orderNumber}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              {format(new Date(order.date), 'dd/MM/yyyy HH:mm')}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-primary">{order.supplyOrderNumber}</TableCell>
                          <TableCell>{order.driverName || '-'}</TableCell>
                          <TableCell>{order.clientName || '-'}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {order.items && order.items.length > 0 && (
                                <Collapsible>
                                  <CollapsibleTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="p-0 h-auto font-normal text-primary"
                                    >
                                      {order.items.length} produit{order.items.length > 1 ? 's' : ''} - Voir détails
                                    </Button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="mt-1 space-y-1">
                                    {order.items.map((item) => (
                                      <div key={item.bottleTypeId} className="text-xs pl-2 border-l-2 border-primary/30">
                                        {item.bottleTypeName}: {item.quantity}
                                      </div>
                                    ))}
                                  </CollapsibleContent>
                                </Collapsible>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2 justify-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedReturnOrderForPayment(order);
                                  setPaymentDialogOpen(true);
                                }}
                              >
                                <DollarSign className="w-4 h-4 mr-1" />
                                Règlement
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrintBD(order);
                                }}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Télécharger
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOrderToDelete(order.id);
                                  setDeleteReturnDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Supprimer
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination for Return Orders */}
          <div className="flex flex-wrap items-center justify-between px-4 py-4 mt-2">
            <div className="text-sm text-muted-foreground mb-2 sm:mb-0">
              Affichage de <span className="font-medium">{Math.min((returnCurrentPage - 1) * itemsPerPage + 1, filteredReturnOrders.length)}</span> à <span className="font-medium">{Math.min(returnCurrentPage * itemsPerPage, filteredReturnOrders.length)}</span> sur <span className="font-medium">{filteredReturnOrders.length}</span> bon{filteredReturnOrders.length > 1 ? 's' : ''} d'entrée
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={returnCurrentPage === 1}
                onClick={() => setReturnCurrentPage(prev => Math.max(prev - 1, 1))}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Précédent
              </Button>
              <div className="flex items-center">
                {Array.from({ length: Math.min(3, Math.ceil(filteredReturnOrders.length / itemsPerPage)) }, (_, i) => (
                  <Button 
                    key={i} 
                    variant={returnCurrentPage === i + 1 ? "default" : "outline"} 
                    size="sm" 
                    className="w-8 h-8 p-0 mx-1"
                    onClick={() => setReturnCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </Button>
                ))}
                {Math.ceil(filteredReturnOrders.length / itemsPerPage) > 3 && (
                  <span className="mx-1">...</span>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={returnCurrentPage * itemsPerPage >= filteredReturnOrders.length}
                onClick={() => setReturnCurrentPage(prev => prev + 1)}
              >
                Suivant
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {returnDialogOpen && selectedSupplyOrder && (
        <RecordReturnDialog
          open={returnDialogOpen}
          onOpenChange={(open) => {
            setReturnDialogOpen(open);
            if (!open) {
              setSelectedSupplyOrder(null);
            }
          }}
          supplyOrder={selectedSupplyOrder}
        />
      )}

      {/* Delete Supply Order Confirmation Dialog */}
      <AlertDialog open={deleteSupplyDialogOpen} onOpenChange={setDeleteSupplyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce bon de sortie ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action ne peut pas être annulée. Cette action supprimera définitivement le bon de sortie.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => orderToDelete && handleDeleteSupplyOrder(orderToDelete)}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Return Order Confirmation Dialog */}
      <AlertDialog open={deleteReturnDialogOpen} onOpenChange={setDeleteReturnDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce bon de retour ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action ne peut pas être annulée. Cette action supprimera définitivement le bon de retour.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => orderToDelete && handleDeleteReturnOrder(orderToDelete)}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Supply Order Details Dialog */}
      <Dialog open={supplyDetailsDialogOpen} onOpenChange={setSupplyDetailsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Détails du Bon de Sortie N°{selectedSupplyOrder?.orderNumber}</DialogTitle>
            <DialogDescription>
              {selectedSupplyOrder && (
                <>
                  Date: {format(new Date(selectedSupplyOrder.date), 'dd/MM/yyyy HH:mm')}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSupplyOrder && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {selectedSupplyOrder.driverName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Chauffeur</p>
                    <p className="font-medium">{selectedSupplyOrder.driverName}</p>
                  </div>
                )}
                {selectedSupplyOrder.clientName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="font-medium">{selectedSupplyOrder.clientName}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Montant Total</p>
                  <p className="font-medium">{selectedSupplyOrder.total.toFixed(2)} DH</p>
                </div>
              </div>
              
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>Quantité Vides</TableHead>
                      <TableHead>Quantité Pleines</TableHead>
                      <TableHead>Prix Unitaire</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSupplyOrder.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.bottleTypeName}</TableCell>
                        <TableCell>{item.emptyQuantity}</TableCell>
                        <TableCell>{item.fullQuantity}</TableCell>
                        <TableCell>{item.unitPrice.toFixed(2)} DH</TableCell>
                        <TableCell className="text-right">{item.amount.toFixed(2)} DH</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => handlePrintBS(selectedSupplyOrder)}>
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger PDF
                </Button>
                <Button onClick={() => setSupplyDetailsDialogOpen(false)}>
                  Fermer
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Return Order Details Dialog */}
      <Dialog open={returnDetailsDialogOpen} onOpenChange={setReturnDetailsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Détails du Bon d'Entrée</DialogTitle>
            <DialogDescription>
              Bon d'Entrée N° {selectedReturnOrder?.orderNumber ?? ''} - {selectedReturnOrder ? format(safeDate(selectedReturnOrder.date), 'dd/MM/yyyy HH:mm') : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedReturnOrder && (
            <>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Référence B.S</p>
                  <p className="font-medium">{selectedReturnOrder.supplyOrderNumber}</p>
                </div>
                {selectedReturnOrder.driverName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Chauffeur</p>
                    <p className="font-medium">{selectedReturnOrder.driverName}</p>
                  </div>
                )}
                {selectedReturnOrder.clientName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="font-medium">{selectedReturnOrder.clientName}</p>
                  </div>
                )}
              </div>

              <div className="border rounded-lg overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Produit</TableHead>
                      <TableHead className="whitespace-nowrap">Vides</TableHead>
                      <TableHead className="whitespace-nowrap">Pleines</TableHead>
                      <TableHead className="whitespace-nowrap">Étrangères</TableHead>
                      <TableHead className="whitespace-nowrap">Défectueuses</TableHead>
                      <TableHead className="whitespace-nowrap">Consigne</TableHead>
                      <TableHead className="whitespace-nowrap">R.C</TableHead>
                      <TableHead className="whitespace-nowrap">Ventes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedReturnOrder.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium whitespace-nowrap">{item.bottleTypeName}</TableCell>
                        <TableCell>{item.returnedEmptyQuantity}</TableCell>
                        <TableCell>{item.returnedFullQuantity}</TableCell>
                        <TableCell>{item.foreignQuantity}</TableCell>
                        <TableCell>{item.defectiveQuantity}</TableCell>
                        <TableCell>{item.consigneQuantity || 0}</TableCell>
                        <TableCell>{item.lostQuantity}</TableCell>
                        <TableCell>{(item.returnedEmptyQuantity || 0) + (item.consigneQuantity || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div className="font-semibold">Légende:</div><div></div>
                <div><span className="font-medium">Vides:</span> Bouteilles vides retournées</div>
                <div><span className="font-medium">Pleines:</span> Bouteilles pleines retournées</div>
                <div><span className="font-medium">Étrangères:</span> Bouteilles d'autres fournisseurs</div>
                <div><span className="font-medium">Défectueuses:</span> Bouteilles endommagées</div>
                <div><span className="font-medium">Perdues:</span> Bouteilles non retournées</div>
                <div><span className="font-medium">Vendues:</span> Bouteilles vendues au client</div>
              </div>

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setReturnDetailsDialogOpen(false)}>Fermer</Button>
                <Button onClick={() => handlePrintBD(selectedReturnOrder)}>
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger PDF
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={(open) => {
        setPaymentDialogOpen(open);
        if (!open) resetPaymentDialog();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Règlement - B.D {selectedReturnOrderForPayment?.orderNumber}
            </DialogTitle>
            <DialogDescription>
              Enregistrer le paiement pour ce bon d'entrée
            </DialogDescription>
          </DialogHeader>

          {selectedReturnOrderForPayment && (
            <>
              {/* Order Information */}
              <div className="bg-muted/50 p-4 rounded-lg mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Date:</span> {format(new Date(selectedReturnOrderForPayment.date), 'dd/MM/yyyy HH:mm')}
                  </div>
                  <div>
                    <span className="font-medium">B.S Référence:</span> {selectedReturnOrderForPayment.supplyOrderNumber}
                  </div>
                  <div>
                    <span className="font-medium">Chauffeur:</span> {selectedReturnOrderForPayment.driverName || '-'}
                  </div>
                  <div>
                    <span className="font-medium">Client:</span> {selectedReturnOrderForPayment.clientName || '-'}
                  </div>
                </div>
              </div>

              {/* Products Summary */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">Produits retournés:</h4>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead className="text-center">Quantité</TableHead>
                        <TableHead className="text-right">Prix Unitaire</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedReturnOrderForPayment.items.map((item: any, idx: number) => {
                        // Find the original supply order to get prices
                        const originalSupplyOrder = supplyOrders.find(order => 
                          order.id === selectedReturnOrderForPayment.supplyOrderId
                        );
                        const originalItem = originalSupplyOrder?.items.find((origItem: any) => 
                          origItem.bottleTypeId === item.bottleTypeId
                        );

                        // Calculate sold quantity based on returned empty + consigne
                        const soldQuantity = (item.returnedEmptyQuantity || 0) + (item.consigneQuantity || 0);

                        const unitPrice = originalItem?.unitPrice || 0;
                        const amount = soldQuantity * unitPrice;

                        // Only show items that have been sold
                        if (soldQuantity === 0) return null;

                        return (
                          <TableRow key={idx}>
                            <TableCell>{item.bottleTypeName}</TableCell>
                            <TableCell className="text-center">{soldQuantity}</TableCell>
                            <TableCell className="text-right">{unitPrice.toFixed(2)} DH</TableCell>
                            <TableCell className="text-right font-medium">{amount.toFixed(2)} DH</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Payment Summary Section - French Version */}
              <Card className="border-2 border-primary/20 mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Total des Montants et Méthodes de Paiement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Total Amount Display */}
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-medium">Montant Total:</span>
                        <span className="text-2xl font-bold text-primary">{calculatePaymentTotals().total.toFixed(2)} DH</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {(() => {
                          let soldItemsCount = 0;
                          selectedReturnOrderForPayment.items.forEach((item: any) => {
                            const soldQuantity = (item.returnedEmptyQuantity || 0) + (item.consigneQuantity || 0);
                            if (soldQuantity > 0) soldItemsCount++;
                          });
                          return `Produits vendus: ${soldItemsCount} article${soldItemsCount > 1 ? 's' : ''}`;
                        })()}
                      </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="payment-cash-amount">Montant payé en Espèces</Label>
                        <Input
                          id="payment-cash-amount"
                          type="number"
                          step="0.01"
                          min="0"
                          max={calculatePaymentTotals().total}
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
                          max={calculatePaymentTotals().total}
                          value={paymentCheckAmount}
                          onChange={(e) => setPaymentCheckAmount(e.target.value)}
                          placeholder="0.00"
                          className="text-lg"
                        />
                      </div>
                    </div>

                    {/* Debt Calculation */}
                    {(paymentCashAmount || paymentCheckAmount) && (
                      <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-lg font-medium text-orange-800">Montant Restant (Dette):</span>
                          <span className="text-2xl font-bold text-orange-600">{calculatePaymentDebt().toFixed(2)} DH</span>
                        </div>
                        <div className="text-sm text-orange-700">
                          Calcul: {calculatePaymentTotals().total.toFixed(2)} - ({(parseFloat(paymentCashAmount) || 0).toFixed(2)} + {(parseFloat(paymentCheckAmount) || 0).toFixed(2)}) = {calculatePaymentDebt().toFixed(2)} DH
                        </div>
                        {calculatePaymentDebt() > 0 && selectedReturnOrderForPayment.driverId && (
                          <div className="mt-2 p-2 bg-orange-100 rounded text-sm text-orange-800">
                            ⚠️ Ce montant sera enregistré comme dette du chauffeur sélectionné
                          </div>
                        )}
                      </div>
                    )}

                    {/* Payment Summary */}
                    {(paymentCashAmount || paymentCheckAmount) && (
                      <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-sm text-green-600">Espèces</div>
                          <div className="text-lg font-bold text-green-700">{(parseFloat(paymentCashAmount) || 0).toFixed(2)} DH</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-sm text-blue-600">Chèque</div>
                          <div className="text-lg font-bold text-blue-700">{(parseFloat(paymentCheckAmount) || 0).toFixed(2)} DH</div>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                          <div className="text-sm text-red-600">Dette</div>
                          <div className="text-lg font-bold text-red-700">{calculatePaymentDebt().toFixed(2)} DH</div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Résumé et Paiement Section */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Résumé et Paiement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Totals Summary */}
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Montant HT</p>
                        <p className="font-bold text-lg">{calculatePaymentTotals().subtotal.toFixed(2)} DH</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">TVA (10%)</p>
                        <p className="font-bold text-lg">{calculatePaymentTotals().taxAmount.toFixed(2)} DH</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total TTC</p>
                        <p className="font-bold text-xl text-primary">{calculatePaymentTotals().total.toFixed(2)} DH</p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Montant en Espèces</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={paymentCashAmount}
                        onChange={(e) => setPaymentCashAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Montant par Chèque</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={paymentCheckAmount}
                        onChange={(e) => setPaymentCheckAmount(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <DialogFooter>
                <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={handlePaymentSubmit}
                  disabled={!paymentCashAmount && !paymentCheckAmount}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Enregistrer le règlement
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplyReturn;
