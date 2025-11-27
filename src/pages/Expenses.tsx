import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApp } from '@/contexts/AppContext';
import { DollarSign, Plus, Calendar, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Expense } from '@/types';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DateRange } from 'react-day-picker';

const expenseTypes = [
  'bureau',
  'salaire',
  'cnss',
  'loyer',
  'charger dépôt',
  'équipement',
  'électricité',
  'transport',
  'autre'
];

const paymentMethods = [
  'cash',
  'cheque',
  'bank'
];

import { Trash2 } from 'lucide-react';

const Expenses = () => {
  const { expenses, addExpense, deleteExpense } = useApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expenseType, setExpenseType] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [note, setNote] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

  const handleAddExpense = () => {
    if (!expenseType || !amount || !paymentMethod) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const newExpense: Expense = {
      id: Date.now().toString(),
      type: expenseType as any,
      amount: parseFloat(amount),
      paymentMethod: paymentMethod as any,
      date: date.toISOString(),
      note: note || undefined
    };

    addExpense(newExpense);
    toast.success('Dépense ajoutée avec succès');
    resetForm();
    setDialogOpen(false);
  };

  const resetForm = () => {
    setExpenseType('');
    setAmount('');
    setPaymentMethod('');
    setDate(new Date());
    setNote('');
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.text('Liste des Dépenses', 14, 16);

    const tableColumn = ["Type", "Date", "Mode de paiement", "Note", "Montant (MAD)"];
    const tableRows: (string | number)[][] = [];

    filteredExpenses.forEach(expense => {
      const expenseData = [
        expense.type,
        format(new Date(expense.date), 'dd/MM/yyyy'),
        expense.paymentMethod,
        expense.note || '-',
        `-${expense.amount.toFixed(2)} DH`
      ];
      tableRows.push(expenseData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(10);
    doc.text(`Total des dépenses: -${totalExpenses.toFixed(2)} DH`, 14, finalY + 10);

    doc.save(`dépenses_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const filteredExpenses = expenses.filter(expense => 
    (expense.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    expense.note?.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (!dateRange?.from || new Date(expense.date) >= dateRange.from) &&
    (!dateRange?.to || new Date(expense.date) <= dateRange.to)
  );

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dépenses Diverses</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Ajouter une dépense
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des dépenses</CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[300px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{">"}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Choisir une plage de dates</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            <Button onClick={handleDownloadPDF} variant="outline">
              <DollarSign className="mr-2 h-4 w-4" /> PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Mode de paiement</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right">Montant (MAD)</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Aucune dépense trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">{expense.type}</TableCell>
                    <TableCell>{format(new Date(expense.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{expense.paymentMethod}</TableCell>
                    <TableCell>{expense.note || '-'}</TableCell>
                    <TableCell className="text-right font-bold text-red-500">
                      -{expense.amount.toFixed(2)} DH
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          deleteExpense(expense.id);
                          toast.success('Dépense supprimée avec succès');
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
              <TableRow className="bg-muted/50">
                <TableCell colSpan={5} className="font-bold">Total</TableCell>
                <TableCell className="text-right font-bold text-red-500">
                  -{totalExpenses.toFixed(2)} DH
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
  <DialogHeader>
    <DialogTitle>{expenseToEdit ? 'Modifier' : 'Ajouter'} une Dépense</DialogTitle>
  </DialogHeader>
          <DialogHeader>
            <DialogTitle>Ajouter une dépense diverse</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type de dépense *</Label>
              <Select value={expenseType} onValueChange={setExpenseType}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un type" />
                </SelectTrigger>
                <SelectContent>
                  {expenseTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Montant (MAD) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Mode de paiement *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un mode" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(method => (
                    <SelectItem key={method} value={method}>{method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date de dépense *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {date ? format(date, "dd MMMM yyyy") : <span>Choisir une date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={(date) => date && setDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note (facultatif)</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note sur cette dépense..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleAddExpense}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Expenses;