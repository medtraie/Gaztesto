import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/contexts/AppContext';
import { 
  FileText, 
  Download, 
  Filter, 
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
  Package,
  Truck,
  Users,
  ArrowRightLeft
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports = () => {
  const { transactions, bottleTypes, trucks, drivers, exchanges, expenses, revenues, returnOrders, supplyOrders } = useApp();
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedTruck, setSelectedTruck] = useState('all');
  const [selectedDriver, setSelectedDriver] = useState('all');
  const [dailyReportDate, setDailyReportDate] = useState(new Date());
  const [dailyReportDriver, setDailyReportDriver] = useState('all');

  // Filter transactions based on selected criteria
  const filteredTransactions = transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    const startDate = dateFilter.startDate ? new Date(dateFilter.startDate) : null;
    const endDate = dateFilter.endDate ? new Date(dateFilter.endDate) : null;

    if (startDate && transactionDate < startDate) return false;
    if (endDate && transactionDate > endDate) return false;
    if (selectedFilter !== 'all' && transaction.type !== selectedFilter) return false;
    if (selectedTruck !== 'all' && transaction.truckId !== selectedTruck) return false;
    if (selectedDriver !== 'all' && transaction.driverId !== selectedDriver) return false;

    return true;
  });

  // Calculate metrics
  const totalValue = filteredTransactions.reduce((sum, t) => sum + (t.totalValue || 0), 0);
  const transactionsByType = {
    supply: filteredTransactions.filter(t => t.type === 'supply').length,
    return: filteredTransactions.filter(t => t.type === 'return').length,
    exchange: filteredTransactions.filter(t => t.type === 'exchange').length,
    factory: filteredTransactions.filter(t => t.type === 'factory').length,
  };

  // Stock analysis
  const stockAnalysis = bottleTypes.map(bt => ({
    name: bt.name,
    total: bt.totalQuantity,
    distributed: bt.distributedQuantity,
    remaining: bt.remainingQuantity,
    value: bt.remainingQuantity * bt.unitPrice,
    distributionRate: (bt.distributedQuantity / bt.totalQuantity) * 100
  }));

  // Driver debt analysis
  const driverAnalysis = drivers.map(d => ({
    name: d.name,
    debt: d.debt,
    advances: d.advances,
    balance: d.balance,
    status: d.balance < 0 ? 'Dette' : d.balance > 0 ? 'Crédit' : 'Équilibré'
  }));

  const exportToPDF = () => {
    // Placeholder for PDF export functionality
    alert('Export PDF en cours de développement');
  };

  const exportToExcel = () => {
    // Placeholder for Excel export functionality
    alert('Export Excel en cours de développement');
  };


  const generateDailyExpenseReport = (currentExpenses: any[]) => {
    const reportDate = dailyReportDate.toISOString().slice(0, 10);
    const doc = new jsPDF();

    doc.text(`Rapport Journalier des Notes de Frais`, 14, 16);
    doc.text(`Date: ${reportDate}`, 14, 24);

    const dailyExpenses = currentExpenses.filter(expense => 
      expense.date.slice(0, 10) === reportDate && expense.type === 'note de frais'
    );
    if (dailyExpenses.length === 0) {
      doc.text("Aucune note de frais pour cette sélection.", 14, 32);
      doc.save(`rapport_frais_${reportDate}.pdf`);
      return;
    }

    const expensesByDriver = {};
    const companyExpenses = {
        driverName: "Dette de l'entreprise",
        expenses: []
    };

    dailyExpenses.forEach(expense => {
      let processed = false;
      if (expense.returnOrderId) {
        const returnOrder = returnOrders.find(ro => ro.id === expense.returnOrderId);
        if (returnOrder) {
          const driver = drivers.find(d => d.id === returnOrder.driverId);
          if (driver) {
            if (!expensesByDriver[driver.id]) {
              expensesByDriver[driver.id] = {
                driverName: driver.name,
                expenses: []
              };
            }
            expensesByDriver[driver.id].expenses.push(expense);
            processed = true;
          }
        }
      }
      
      if (!processed) {
        companyExpenses.expenses.push(expense);
      }
    });

    const tableColumn = ["Chauffeur", "Note de frais", "Montant (MAD)", "Total (MAD)"];
    const tableRows: any[] = [];

    const allGroupedExpenses = [...Object.values(expensesByDriver)];
    if (companyExpenses.expenses.length > 0) {
        allGroupedExpenses.push(companyExpenses);
    }

    allGroupedExpenses.forEach((driverData: any) => {
      const driverTotal = driverData.expenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);
      driverData.expenses.forEach((expense: any, index: number) => {
        tableRows.push([
          index === 0 ? driverData.driverName : '',
          expense.note,
          expense.amount.toFixed(2),
          index === 0 ? driverTotal.toFixed(2) : ''
        ]);
      });
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 32,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      didDrawCell: (data) => {
        if (data.column.index === 0 && data.cell.raw !== '') {
          // vertically center the driver name
        }
      }
    });

    doc.save(`rapport_frais_${reportDate}.pdf`);
  };

  const generateDriverDebtReport = () => {
    const reportDate = dailyReportDate.toISOString().slice(0, 10);
    const doc = new jsPDF();

    doc.text(`Rapport des Dettes des Chauffeurs`, 14, 16);
    doc.text(`Date: ${reportDate}`, 14, 24);

    const driversWithDebt = drivers.filter(driver => driver.debt > 0);

    if (driversWithDebt.length === 0) {
      doc.text("Aucun chauffeur avec des dettes.", 14, 32);
      doc.save(`rapport_dettes_${reportDate}.pdf`);
      return;
    }

    const tableColumn = ["Chauffeur", "Dette (MAD)", "Total (MAD)"];
    const tableRows: any[] = [];

    driversWithDebt.forEach(driver => {
      tableRows.push([
        driver.name,
        driver.debt.toFixed(2),
        driver.debt.toFixed(2)
      ]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 32,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });

    const totalDebt = driversWithDebt.reduce((sum, driver) => sum + driver.debt, 0);
    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(10);
    doc.text(`Total des dettes: ${totalDebt.toFixed(2)} MAD`, 14, finalY + 10);


    doc.save(`rapport_dettes_${reportDate}.pdf`);
  };

  const generateMiscellaneousExpensesReport = () => {
    const reportDate = dailyReportDate.toISOString().slice(0, 10);
    const doc = new jsPDF();

    doc.text(`Rapport des Dépenses Diverses`, 14, 16);
    doc.text(`Date: ${reportDate}`, 14, 24);

    const dailyExpenses = expenses.filter(expense => 
      expense.date.slice(0, 10) === reportDate && !expense.returnOrderId
    );

    if (dailyExpenses.length === 0) {
      doc.text("Aucune dépense diverse pour aujourd'hui.", 14, 32);
      doc.save(`rapport_depenses_diverses_${reportDate}.pdf`);
      return;
    }

    const tableColumn = ["Type", "Mode de paiement", "Note", "Montant (MAD)", "Total (MAD)"];
    const tableRows: any[] = [];

    dailyExpenses.forEach(expense => {
      tableRows.push([
        expense.type,
        expense.paymentMethod,
        expense.note || '-',
        expense.amount.toFixed(2),
        expense.amount.toFixed(2)
      ]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 32,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });

    const totalAmount = dailyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(10);
    doc.text(`Total des dépenses: ${totalAmount.toFixed(2)} MAD`, 14, finalY + 10);

    doc.save(`rapport_depenses_diverses_${reportDate}.pdf`);
  };

  const generateTransportReport = () => {
    const reportDate = dailyReportDate.toISOString().slice(0, 10);
    const doc = new jsPDF();

    doc.text(`Rapport Journalier des Dépenses de Transport`, 14, 16);
    doc.text(`Date: ${reportDate}`, 14, 24);

    // مقارنة التاريخ باليوم المحلي لمنع مشكلات المنطقة الزمنية
    const isSameDay = (d1: Date, d2: Date) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  
    // تضمين كل مصاريف النوع "transport" (من "Dépenses Diverses" ومن B.D) لليوم المختار
    const transportExpenses = expenses.filter(expense => {
      const expDate = new Date(expense.date);
      const type = (expense.type || '').toLowerCase().trim();
      return isSameDay(expDate, dailyReportDate) && type === 'transport';
    });
  
    if (transportExpenses.length === 0) {
      doc.text("Aucune dépense de transport pour aujourd'hui.", 14, 32);
      doc.save(`rapport_transport_${reportDate}.pdf`);
      return;
    }
  
    const tableColumn = ["Transport", "Note", "Mode de paiement", "Montant (MAD)", "Total (MAD)"];
    const tableRows: any[] = [];
  
    transportExpenses.forEach(expense => {
      tableRows.push([
        'Transport',
        expense.note || '-',
        expense.paymentMethod, // قد تكون 'espèces'/'chèques'/'banque' أو 'dette' (من B.D)
        expense.amount.toFixed(2),
        expense.amount.toFixed(2)
      ]);
    });
  
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 32,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });
  
    const totalAmount = transportExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(10);
    doc.text(`Total des dépenses de transport: ${totalAmount.toFixed(2)} MAD`, 14, finalY + 10);
  
    doc.save(`rapport_transport_${reportDate}.pdf`);
  };

  const generateDailyAllogazReport = () => {
    const doc = new jsPDF();
    const selectedDate = dailyReportDate.toISOString().split('T')[0];
    const driverName =
      dailyReportDriver === 'all'
        ? 'Tous'
        : drivers.find((d) => d.id === dailyReportDriver)?.name || 'Inconnu';
  
    doc.text(`Rapport Journalier Allogaz - Bons d'Entrée (B.D)`, 14, 16);
    doc.setFontSize(10);
    doc.text(`Date: ${selectedDate}`, 14, 22);
    doc.text(`Chauffeur: ${driverName}`, 14, 28);
  
    const tableColumn = ['Chauffeur', '3kg', '6kg', '12kg', '34kg', 'BNG', 'Chèque', 'Espèce'];
    const tableRows: (string | number)[][] = [];
  
    const driversToReport =
      dailyReportDriver === 'all' ? drivers : drivers.filter((d) => d.id === dailyReportDriver);
  
    const mapBottleKey = (name: string) => {
      const n = (name || '').toLowerCase().replace(/\s+/g, '');
      if (n.includes('bng')) return 'bng';
      if (/(^|[^0-9])3kg($|[^0-9])/.test(n) || /3\s*kg/.test(name.toLowerCase())) return '3kg';
      if (/(^|[^0-9])6kg($|[^0-9])/.test(n) || /6\s*kg/.test(name.toLowerCase())) return '6kg';
      if (/(^|[^0-9])12kg($|[^0-9])/.test(n) || /12\s*kg/.test(name.toLowerCase())) return '12kg';
      if (/(^|[^0-9])34kg($|[^0-9])/.test(n) || /34\s*kg/.test(name.toLowerCase())) return '34kg';
      return '';
    };
  
    // المجاميع (تعريف واحد فقط)
    let sum3kg = 0, sum6kg = 0, sum12kg = 0, sum34kg = 0, sumBNG = 0;
    let sumCheque = 0, sumEspece = 0;
  
    driversToReport.forEach((driver) => {
      const driverReturnOrders = (returnOrders || []).filter((o: any) => {
        if (!o || !o.date) return false;
        const d = new Date(o.date);
        return o.driverId === driver.id && d.toDateString() === dailyReportDate.toDateString();
      });
  
      const dailyDateString = selectedDate;
      const driverRevenues = (revenues || []).filter((r: any) => {
        const rDate = (r.date || '').slice(0, 10);
        if (rDate !== dailyDateString) return false;
        if (r.relatedOrderType !== 'return' || !r.relatedOrderId) return false;
        const ro = (returnOrders || []).find((o: any) => o.id === r.relatedOrderId);
        return ro?.driverId === driver.id;
      });
  
      const quantities = { '3kg': 0, '6kg': 0, '12kg': 0, '34kg': 0, 'bng': 0 };
  
      driverReturnOrders.forEach((o: any) => {
        (o.items || []).forEach((item: any) => {
          const bt = bottleTypes.find((b) => b.id === item.bottleTypeId);
          if (!bt) return;
          const key = mapBottleKey(bt.name);
          const sold = (item.returnedEmptyQuantity || 0) + (item.consigneQuantity || 0);
          if (key && key in quantities) {
            quantities[key as keyof typeof quantities] += sold;
          }
        });
      });
  
      const cheque = driverRevenues.reduce(
        (sum: number, r: any) => sum + (r.checkAmount || r.totalCheque || 0),
        0
      );
      const espece = driverRevenues.reduce(
        (sum: number, r: any) => sum + (r.cashAmount || r.totalCash || 0),
        0
      );
  
      if (driverReturnOrders.length > 0 || cheque > 0 || espece > 0) {
        tableRows.push([
          driver.name,
          quantities['3kg'],
          quantities['6kg'],
          quantities['12kg'],
          quantities['34kg'],
          quantities['bng'],
          cheque.toFixed(2),
          espece.toFixed(2),
        ]);
  
        // تجميع المجموع
        sum3kg += quantities['3kg'];
        sum6kg += quantities['6kg'];
        sum12kg += quantities['12kg'];
        sum34kg += quantities['34kg'];
        sumBNG += quantities['bng'];
        sumCheque += cheque;
        sumEspece += espece;
      }
    });
  
    if (tableRows.length > 0) {
      tableRows.push([
        'TOTAL',
        sum3kg,
        sum6kg,
        sum12kg,
        sum34kg,
        sumBNG,
        sumCheque.toFixed(2),
        sumEspece.toFixed(2),
      ]);
  
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
      });
    } else {
      doc.text("Aucune donnée de Bon d'Entrée pour cette sélection.", 14, 40);
    }
  
    doc.save(`rapport_journalier_allogaz_bd_${selectedDate}_${driverName.replace(/ /g, '_')}.pdf`);
  };

  const generateDriversSupplyReturnReport = () => {
    const selectedDate = dailyReportDate.toISOString().split('T')[0];
    const doc = new jsPDF();

    doc.text(`Historique des Bons d'Entrée (B.D) — Alimentation & Retour (Camions)`, 14, 16);
    doc.setFontSize(10);
    doc.text(`Date: ${selectedDate}`, 14, 22);
    doc.text(
      `Filtre chauffeur: ${
        dailyReportDriver === 'all' ? 'Tous' : (drivers.find(d => d.id === dailyReportDriver)?.name || 'Inconnu')
      }`,
      14,
      28
    );

    const hasCamion = (driverId: string) => trucks.some(t => t.driverId === driverId && t.truckType === 'camion');
    const driversToReport =
      dailyReportDriver === 'all'
        ? drivers.filter(d => hasCamion(d.id))
        : drivers.filter(d => d.id === dailyReportDriver && hasCamion(d.id));

    const mapBottleKey = (name?: string) => {
      const n = (name || '').toLowerCase().replace(/\s+/g, '');
      if (n.includes('bng')) return 'bng';
      if (/(^|[^0-9])3kg($|[^0-9])/.test(n) || /3\s*kg/.test(name.toLowerCase())) return '3kg';
      if (/(^|[^0-9])6kg($|[^0-9])/.test(n) || /6\s*kg/.test(name.toLowerCase())) return '6kg';
      if (/(^|[^0-9])12kg($|[^0-9])/.test(n) || /12\s*kg/.test(name.toLowerCase())) return '12kg';
      if (/(^|[^0-9])34kg($|[^0-9])/.test(n) || /34\s*kg/.test(name.toLowerCase())) return '34kg';
      return '';
    };

    const tableColumn = ['Chauffeur', '3kg', '6kg', '12kg', '34kg', 'BNG', 'Chèque', 'Espèce'];
    const tableRows: (string | number)[][] = [];
  
    // المجاميع
    let sum3kg = 0, sum6kg = 0, sum12kg = 0, sum34kg = 0, sumBNG = 0;
    let sumCheque = 0, sumEspece = 0;

    driversToReport.forEach(driver => {
      const roForDriver = (returnOrders || []).filter((o: any) => {
        const d = (o.date || '').slice(0, 10);
        return d === selectedDate && o.driverId === driver.id;
      });

      const quantities: Record<'3kg' | '6kg' | '12kg' | '34kg' | 'bng', number> = {
        '3kg': 0, '6kg': 0, '12kg': 0, '34kg': 0, 'bng': 0
      };

      roForDriver.forEach((o: any) => {
        (o.items || []).forEach((item: any) => {
          const name =
            item.bottleTypeName ||
            bottleTypes.find((b: any) => b.id === item.bottleTypeId)?.name ||
            '';
          const key = mapBottleKey(name);
          const sold = (item.returnedEmptyQuantity || 0) + (item.consigneQuantity || 0);
          if (key && quantities[key as keyof typeof quantities] !== undefined) {
            quantities[key as keyof typeof quantities] += sold;
          }
        });
      });

      const relatedRevenues = (revenues || []).filter((r: any) => {
        const rDate = (r.date || '').slice(0, 10);
        if (rDate !== selectedDate) return false;
        if (r.relatedOrderType !== 'return' || !r.relatedOrderId) return false;
        const ro = (returnOrders || []).find((o: any) => o.id === r.relatedOrderId);
        return ro?.driverId === driver.id;
      });

      const chequeFromRevenues = relatedRevenues.reduce(
        (sum: number, r: any) => sum + (r.checkAmount || r.totalCheque || 0),
        0
      );
      const cashFromRevenues = relatedRevenues.reduce(
        (sum: number, r: any) => sum + (r.cashAmount || r.totalCash || 0),
        0
      );

      const chequeFromOrders = roForDriver.reduce((sum: number, o: any) => sum + (o.paymentCheque || 0), 0);
      const cashFromOrders = roForDriver.reduce((sum: number, o: any) => sum + (o.paymentCash || 0), 0);

      const cheque = chequeFromRevenues + chequeFromOrders;
      const espece = cashFromRevenues + cashFromOrders;

      if (roForDriver.length > 0 || cheque > 0 || espece > 0) {
        const totalQty =
          quantities['3kg'] + quantities['6kg'] + quantities['12kg'] + quantities['34kg'] + quantities['bng'];
        tableRows.push([
          driver.name,
          quantities['3kg'],
          quantities['6kg'],
          quantities['12kg'],
          quantities['34kg'],
          quantities['bng'],
          cheque.toFixed(2),
          espece.toFixed(2),
        ]);

        // accumulate totals
        sum3kg += quantities['3kg'];
        sum6kg += quantities['6kg'];
        sum12kg += quantities['12kg'];
        sum34kg += quantities['34kg'];
        sumBNG += quantities['bng'];
        sumCheque += cheque;
        sumEspece += espece;
      }
    });

    // Append TOTAL row if we had data
    if (tableRows.length > 0) {
      tableRows.push([
        'TOTAL',
        sum3kg,
        sum6kg,
        sum12kg,
        sum34kg,
        sumBNG,
        sumCheque.toFixed(2),
        sumEspece.toFixed(2),
      ]);
    }

    if (tableRows.length === 0) {
      doc.text("Aucune donnée B.D pour la sélection.", 14, 40);
    } else {
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
      });
    }

    doc.save(`historique_bd_camions_${selectedDate}.pdf`);
  };
  // عادة بناء واجهة صفحة التقارير داخل return
  return (
      <div className="space-y-6">
          {/* فلاتر عامة */}
          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <Filter className="w-5 h-5" />
                      Filtres
                  </CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="grid md:grid-cols-5 gap-4">
                      <div>
                          <Label>Début</Label>
                          <Input
                              type="date"
                              value={dateFilter.startDate}
                              onChange={(e) =>
                                  setDateFilter((prev) => ({ ...prev, startDate: e.target.value }))
                              }
                          />
                      </div>
                      <div>
                          <Label>Fin</Label>
                          <Input
                              type="date"
                              value={dateFilter.endDate}
                              onChange={(e) =>
                                  setDateFilter((prev) => ({ ...prev, endDate: e.target.value }))
                              }
                          />
                      </div>
                      <div>
                          <Label>Type</Label>
                          <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                              <SelectTrigger>
                                  <SelectValue placeholder="Tous" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="all">Tous</SelectItem>
                                  <SelectItem value="supply">Alimentation</SelectItem>
                                  <SelectItem value="return">Retour</SelectItem>
                                  <SelectItem value="exchange">Échange</SelectItem>
                                  <SelectItem value="factory">Usine</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                      <div>
                          <Label>Camion</Label>
                          <Select value={selectedTruck} onValueChange={setSelectedTruck}>
                              <SelectTrigger>
                                  <SelectValue placeholder="Tous" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="all">Tous</SelectItem>
                                  {trucks.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                      {(t as any).name || (t as any).plateNumber || (t as any).registration || t.id}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>
                      <div>
                          <Label>Chauffeur</Label>
                          <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                              <SelectTrigger>
                                  <SelectValue placeholder="Tous" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="all">Tous</SelectItem>
                                  {drivers.map((d) => (
                                    <SelectItem key={d.id} value={d.id}>
                                      {d.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>
                  </div>
              </CardContent>
          </Card>
  
          {/* ملخصات سريعة */}
          <div className="grid md:grid-cols-4 gap-4">
              <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5" />
                          Valeur totale
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                      <Badge variant="secondary">{totalValue.toFixed(2)} MAD</Badge>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                          <Package className="w-5 h-5" />
                          Alimentation
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                      <Badge>{transactionsByType.supply}</Badge>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                          <ArrowRightLeft className="w-5 h-5" />
                          Retour
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                      <Badge>{transactionsByType.return}</Badge>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="w-5 h-5" />
                          Échange / Usine
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                      <Badge>Éch: {transactionsByType.exchange} — Usine: {transactionsByType.factory}</Badge>
                  </CardContent>
              </Card>
          </div>
  
          {/* تحليل المخزون */}
          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <PieChart className="w-5 h-5" />
                      Analyse du stock
                  </CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                          <thead>
                              <tr className="text-left">
                                  <th>Nom</th>
                                  <th>Total</th>
                                  <th>Distribué</th>
                                  <th>Restant</th>
                                  <th>Valeur</th>
                                  <th>Taux (%)</th>
                              </tr> {/* كان مفقودًا — تم الإغلاق هنا */}
                          </thead>
                          <tbody>
                              {stockAnalysis.map((s) => (
                                  <tr key={s.name}>
                                      <td>{s.name}</td>
                                      <td>{s.total}</td>
                                      <td>{s.distributed}</td>
                                      <td>{s.remaining}</td>
                                      <td>{s.value.toFixed(2)}</td>
                                      <td>{isFinite(s.distributionRate) ? s.distributionRate.toFixed(1) : '0.0'}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </CardContent>
          </Card>
  
          {/* تحليل السائقين */}
          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Analyse des chauffeurs
                  </CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                          <thead>
                              <tr className="text-left">
                                  <th>Chauffeur</th>
                                  <th>Dette</th>
                                  <th>Acomptes</th>
                                  <th>Solde</th>
                                  <th>Statut</th>
                              </tr>
                          </thead>
                          <tbody>
                              {driverAnalysis.map((d) => (
                                  <tr key={d.name}>
                                      <td>{d.name}</td>
                                      <td>{d.debt?.toFixed?.(2) ?? d.debt}</td>
                                      <td>{d.advances?.toFixed?.(2) ?? d.advances}</td>
                                      <td>{d.balance?.toFixed?.(2) ?? d.balance}</td>
                                      <td>
                                          <Badge variant={d.status === 'Dette' ? 'destructive' : d.status === 'Crédit' ? 'default' : 'secondary'}>
                                            {d.status}
                                          </Badge>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </CardContent>
          </Card>
  
          {/* تاريخ العمليات حسب الفلاتر */}
          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Historique des transactions
                  </CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                          <thead>
                              <tr className="text-left">
                                  <th>Date</th>
                                  <th>Type</th>
                                  <th>Chauffeur</th>
                                  <th>Camion</th>
                                  <th>Valeur</th>
                              </tr>
                          </thead>
                          <tbody>
                              {filteredTransactions.map((t) => {
                                  const dName = drivers.find((d) => d.id === t.driverId)?.name || '-';
                                  const trk = trucks.find((tr) => tr.id === t.truckId) as any;
                                  const tName = (trk?.name || trk?.plateNumber || trk?.registration || '-') as string;
                                  return (
                                    <tr key={t.id}>
                                      <td>{new Date(t.date).toLocaleDateString()}</td>
                                      <td>{t.type}</td>
                                      <td>{dName}</td>
                                      <td>{tName}</td>
                                      <td>{(t.totalValue || 0).toFixed(2)}</td>
                                    </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>
              </CardContent>
          </Card>
  
          {/* تقارير يومية للسائقين (B.D و غيرها) */}
          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      Rapport Journalier des Chauffeurs (Bons d'Entrée)
                  </CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div>
                          <Label>Date</Label>
                          <Input
                              type="date"
                              value={dailyReportDate.toISOString().slice(0, 10)}
                              onChange={(e) => setDailyReportDate(new Date(e.target.value))}
                          />
                      </div>
                      <div>
                          <Label>Chauffeur</Label>
                          <Select value={dailyReportDriver} onValueChange={setDailyReportDriver}>
                              <SelectTrigger>
                                  <SelectValue placeholder="Tous" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="all">Tous</SelectItem>
                                  {drivers.map((d) => (
                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>
                  </div>
  
                  <div className="grid md:grid-cols-3 gap-4">
                      <Button onClick={generateDailyAllogazReport} className="w-full">
                          <Download className="w-4 h-4 mr-2" />
                          Bons d'Entrée (B.D)
                      </Button>
                      <Button onClick={generateDriversSupplyReturnReport} className="w-full" variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          Historique B.D — Camions
                      </Button>
                      <Button onClick={generateDriverDebtReport} className="w-full" variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          Dettes Chauffeurs
                      </Button>
                      <Button onClick={() => generateDailyExpenseReport(expenses)} className="w-full" variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          Notes de Frais
                      </Button>
                      <Button onClick={generateMiscellaneousExpensesReport} className="w-full" variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          Dépenses Diverses
                      </Button>
                      <Button onClick={generateTransportReport} className="w-full" variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          Transport
                      </Button>
                  </div>
              </CardContent>
          </Card>
      </div>
  );
}

// Add the missing default export
export default Reports;