import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import { Download, Edit, Trash2, Check, X, Filter, ArrowRightLeft, Wallet, History } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { BankTransfer, CashOperation, FinancialTransaction } from '@/types';

const fmtMAD = (n: number) =>
  n.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2 });

const fmtDate = (iso: string) => {
  try {
    return format(new Date(iso), 'dd/MM/yyyy', { locale: fr });
  } catch {
    return iso;
  }
};

type OpRow =
  | {
      kind: 'transfert';
      id: string;
      date: string;
      typeLabel: string;
      description: string;
      amount: number;
      sourceAccount: 'espece' | 'cheque' | 'banque';
      destinationAccount: 'espece' | 'cheque' | 'banque';
      status: 'pending' | 'validated';
    }
  | {
      kind: 'operation';
      id: string;
      date: string;
      typeLabel: 'versement' | 'retrait';
      description: string;
      amount: number;
      accountAffected: 'espece' | 'banque' | 'cheque' | 'autre';
      accountDetails?: string;
      status: 'pending' | 'validated';
    };

function Revenue() {
  const {
    revenues,
    expenses, // <-- Add expenses
    bankTransfers,
    cashOperations,
    financialTransactions,
    addBankTransfer,
    updateBankTransfer,
    validateBankTransfer,
    deleteBankTransfer,
    addCashOperation,
    updateCashOperation,
    validateCashOperation,
    deleteCashOperation,
    addFinancialTransaction,
    getAccountBalance,
  } = useApp();

  // Summary cards
  const soldeEspece = getAccountBalance('espece');
  const soldeCheque = getAccountBalance('cheque');
  const soldeBanque = getAccountBalance('banque');
  const totalDebt = useMemo(() => revenues.reduce((sum, r) => sum + (r.totalDebt || 0), 0), [revenues]);
  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const montantTotal = useMemo(() => {
    const totalRevenues = revenues.reduce((sum, r) => {
      const amount =
        typeof r.totalAmount === 'number'
          ? r.totalAmount
          : Number(r.totalCash || 0) + Number(r.totalCheque || 0) + Number(r.totalBank || 0);
      return sum + amount;
    }, 0);
    return totalRevenues - totalExpenses;
  }, [revenues, expenses]);

  // Transfer modal state
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferType, setTransferType] = useState<'versement_espece' | 'remise_cheques' | 'retrait_bancaire'>(
    'versement_espece'
  );
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferDescription, setTransferDescription] = useState<string>('');
  const [transferDate, setTransferDate] = useState<string>(() => new Date().toISOString());

  // Cash operation modal state
  const [cashDialogOpen, setCashDialogOpen] = useState(false);
  const [cashName, setCashName] = useState('');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [cashType, setCashType] = useState<'versement' | 'retrait'>('versement');
  const [cashAccount, setCashAccount] = useState<'espece' | 'banque' | 'cheque' | 'autre'>('espece');
  const [cashAccountDetails, setCashAccountDetails] = useState('');
  const [cashDate, setCashDate] = useState<string>(() => new Date().toISOString());

  // Edit dialogs
  const [editTransferOpen, setEditTransferOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<BankTransfer | null>(null);

  const [editCashOpen, setEditCashOpen] = useState(false);
  const [editingCash, setEditingCash] = useState<CashOperation | null>(null);

  // Filters (shared)
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all'); // 'all' | 'encaissement' | 'transfert' | 'versement' | 'retrait'
  const [filterAccount, setFilterAccount] = useState<string>('all'); // 'all' | 'espece' | 'banque' | 'cheque' | 'autre'
  const [filterAmountMin, setFilterAmountMin] = useState<string>('');
  const [filterAmountMax, setFilterAmountMax] = useState<string>('');

  // Normalize operations for "Gestion de Transfert"
  const opRows: OpRow[] = useMemo(() => {
    const transfers: OpRow[] = bankTransfers.map((t) => ({
      kind: 'transfert',
      id: t.id,
      date: t.date,
      typeLabel:
        t.type === 'versement_espece'
          ? 'Transfert Espèce → Banque'
          : t.type === 'remise_cheques'
          ? 'Remise de Chèques'
          : 'Retrait Bancaire',
      description: t.description,
      amount: t.amount,
      sourceAccount: t.sourceAccount,
      destinationAccount: t.destinationAccount,
      status: t.status,
    }));

    const ops: OpRow[] = cashOperations.map((o) => ({
      kind: 'operation',
      id: o.id,
      date: o.date,
      typeLabel: o.type,
      description: o.name,
      amount: o.amount,
      accountAffected: o.accountAffected,
      accountDetails: o.accountDetails,
      status: o.status,
    }));

    const revenuesOp: OpRow[] = [];
    revenues.forEach(r => {
      if (r.cashAmount && r.cashAmount > 0) {
        revenuesOp.push({
          kind: 'operation',
          id: `${r.id}-cash`,
          date: r.date,
          typeLabel: 'versement',
          description: r.description,
          amount: r.cashAmount,
          accountAffected: 'espece',
          status: 'validated',
        });
      }
      if (r.checkAmount && r.checkAmount > 0) {
        revenuesOp.push({
          kind: 'operation',
          id: `${r.id}-check`,
          date: r.date,
          typeLabel: 'versement',
          description: r.description,
          amount: r.checkAmount,
          accountAffected: 'cheque',
          status: 'validated',
        });
      }
    });

    const expensesOp: OpRow[] = expenses.map((e: any) => ({
      kind: 'operation',
      id: e.id,
      date: e.date,
      typeLabel: 'dépense',
      description: e.note || e.type,
      amount: -e.amount,
      accountAffected: e.paymentMethod.toLowerCase(),
      status: 'validated',
    }));

    return [...transfers, ...ops, ...revenuesOp, ...expensesOp].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [bankTransfers, cashOperations, revenues, expenses]);

  const passesDate = (iso: string) => {
    const d = new Date(iso);
    if (filterStartDate && d < new Date(filterStartDate)) return false;
    if (filterEndDate && d > new Date(filterEndDate)) return false;
    return true;
  };
  const passesType = (row: OpRow) => {
    if (filterType === 'all') return true;
    if (filterType === 'transfert') return row.kind === 'transfert';
    if (filterType === 'versement') return row.kind === 'operation' && row.typeLabel === 'versement';
    if (filterType === 'retrait') return row.kind === 'operation' && row.typeLabel === 'retrait';
    return true;
  };
  const passesAccount = (row: OpRow) => {
    if (filterAccount === 'all') return true;
    if (row.kind === 'transfert') {
      return row.sourceAccount === filterAccount || row.destinationAccount === filterAccount;
    }
    if (row.kind === 'operation') {
      return row.accountAffected === filterAccount;
    }
    return true;
  };
  const passesAmount = (amount: number) => {
    const min = filterAmountMin ? parseFloat(filterAmountMin) : null;
    const max = filterAmountMax ? parseFloat(filterAmountMax) : null;
    if (min !== null && amount < min) return false;
    if (max !== null && amount > max) return false;
    return true;
  };

  const filteredOps = useMemo(
    () => opRows.filter((r) => passesDate(r.date) && passesType(r) && passesAccount(r) && passesAmount(r.amount)),
    [opRows, filterStartDate, filterEndDate, filterType, filterAccount, filterAmountMin, filterAmountMax]
  );

  const filteredHistory = useMemo(() => {
    const rows = financialTransactions
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return rows.filter((r) => {
      // Type
      if (filterType !== 'all') {
        if (filterType === 'dépense') {
          if (r.type !== 'dépense' && r.type !== 'réparation') return false;
        } else {
          if (r.type !== filterType) return false;
        }
      }

      // Date
      if (!passesDate(r.date)) return false;

      // Account
      if (filterAccount !== 'all') {
        const affected = [r.sourceAccount, r.destinationAccount].filter(Boolean);
        if (affected.length > 0 && !affected.includes(filterAccount)) return false;
      }

      // Amount
      return passesAmount(r.amount);
    });
  }, [financialTransactions, filterType, filterStartDate, filterEndDate, filterAccount, filterAmountMin, filterAmountMax]);

  // Submit transfer
  const handleSubmitTransfer = () => {
    const amount = parseFloat(transferAmount);
    if (!amount || amount <= 0) {
      toast.error('Veuillez saisir un montant valide');
      return;
    }
    let source: BankTransfer['sourceAccount'] = 'espece';
    let dest: BankTransfer['destinationAccount'] = 'banque';
    if (transferType === 'versement_espece') {
      source = 'espece';
      dest = 'banque';
    } else if (transferType === 'remise_cheques') {
      source = 'cheque';
      dest = 'banque';
    } else {
      source = 'banque';
      dest = 'espece';
    }

    const id = (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
    addBankTransfer({
      id,
      date: transferDate,
      type: transferType,
      sourceAccount: source,
      destinationAccount: dest,
      amount,
      description: transferDescription || '',
      status: 'pending',
    });
    // Validation immédiate pour mettre à jour les cartes et appliquer les effets
    validateBankTransfer(id);

    toast.success('Transfert enregistré et validé');
    setTransferDialogOpen(false);
    setTransferAmount('');
    setTransferDescription('');
    setTransferDate(new Date().toISOString());
    setTransferType('versement_espece');
  };

  // Submit cash operation
  const handleSubmitCash = () => {
    const amount = parseFloat(cashAmount);
    if (!cashName.trim() || !amount || amount <= 0) {
      toast.error('Veuillez renseigner le libellé et un montant valide');
      return;
    }

    addCashOperation({
      date: cashDate,
      name: cashName.trim(),
      amount,
      type: cashType,
      accountAffected: cashAccount,
      accountDetails: cashAccount === 'autre' ? cashAccountDetails : undefined,
      status: 'pending',
    });

    toast.success('Opération de caisse enregistrée (en attente de validation)');
    setCashDialogOpen(false);
    setCashName('');
    setCashAmount('');
    setCashType('versement');
    setCashAccount('espece');
    setCashAccountDetails('');
    setCashDate(new Date().toISOString());
  };

  // Edit transfer
  const openEditTransfer = (t: BankTransfer) => {
    setEditingTransfer(t);
    setEditTransferOpen(true);
  };
  const handleUpdateTransfer = () => {
    if (!editingTransfer) return;
    if (editingTransfer.amount <= 0) {
      toast.error('Montant invalide');
      return;
    }
    // Ensure source/destination reflect type
    let source: BankTransfer['sourceAccount'] = 'espece';
    let dest: BankTransfer['destinationAccount'] = 'banque';
    if (editingTransfer.type === 'versement_espece') {
      source = 'espece';
      dest = 'banque';
    } else if (editingTransfer.type === 'remise_cheques') {
      source = 'cheque';
      dest = 'banque';
    } else {
      source = 'banque';
      dest = 'espece';
    }

    updateBankTransfer(editingTransfer.id, {
      type: editingTransfer.type,
      amount: editingTransfer.amount,
      description: editingTransfer.description,
      date: editingTransfer.date,
      sourceAccount: source,
      destinationAccount: dest,
    });
    setEditTransferOpen(false);
    setEditingTransfer(null);
    toast.success('Transfert mis à jour');
  };

  // Edit cash op
  const openEditCash = (o: CashOperation) => {
    setEditingCash(o);
    setEditCashOpen(true);
  };
  const handleUpdateCash = () => {
    if (!editingCash) return;
    if (editingCash.amount <= 0 || !editingCash.name.trim()) {
      toast.error('Libellé ou montant invalide');
      return;
    }
    updateCashOperation(editingCash.id, {
      name: editingCash.name,
      amount: editingCash.amount,
      type: editingCash.type,
      date: editingCash.date,
      accountAffected: editingCash.accountAffected,
      accountDetails: editingCash.accountDetails,
    });
    setEditCashOpen(false);
    setEditingCash(null);
    toast.success('Opération mise à jour');
  };

  // Validate logic
  const handleValidateTransfer = (t: BankTransfer) => {
    validateBankTransfer(t.id);

    if (t.type === 'remise_cheques') {
      // Historiser la régularisation de remise de chèques
      addFinancialTransaction({
        date: new Date().toISOString(),
        type: 'transfert',
        description: 'Régularisation: chèques déposés à la banque',
        amount: t.amount,
        sourceAccount: 'cheque',
        destinationAccount: 'banque',
        status: 'completed',
        createdAt: new Date().toISOString(),
      });
    }

    toast.success('Transfert validé');
  };

  const handleValidateCash = (o: CashOperation) => {
    validateCashOperation(o.id);
    toast.success('Opération validée');
  };

  // Delete
  const handleDeleteTransfer = (t: BankTransfer) => {
    deleteBankTransfer(t.id);
    toast.success('Transfert supprimé');
  };
  const handleDeleteCash = (o: CashOperation) => {
    deleteCashOperation(o.id);
    toast.success('Opération supprimée');
  };

  const exportOpsToPDF = () => {
    // Ouvre une fenêtre imprimable; l’utilisateur peut enregistrer en PDF
    const w = window.open('', '_blank');
    if (!w) return;
    const rowsHtml = filteredOps
      .map((r) => {
        if (r.kind === 'transfert') {
          return `<tr>
            <td>${fmtDate(r.date)}</td>
            <td>${r.typeLabel}</td>
            <td>${r.description || ''}</td>
            <td>${fmtMAD(r.amount)}</td>
            <td>${r.sourceAccount} → ${r.destinationAccount}</td>
            <td>${r.status}</td>
          </tr>`;
        }
        return `<tr>
          <td>${fmtDate(r.date)}</td>
          <td>${r.typeLabel}</td>
          <td>${r.description || ''}</td>
          <td>${fmtMAD(r.amount)}</td>
          <td>${r.accountAffected}${r.accountDetails ? ' (' + r.accountDetails + ')' : ''}</td>
          <td>${r.status}</td>
        </tr>`;
      })
      .join('');
    w.document.write(`
      <html>
        <head>
          <title>Export - Gestion de Transfert</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 18px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #888; padding: 6px 8px; font-size: 12px; }
            th { background: #f0f0f0; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Gestion de Transfert - Export (filtres appliqués)</h1>
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Type</th><th>Description</th><th>Montant</th><th>Compte(s)</th><th>Statut</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  const exportHistoryToPDF = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const rowsHtml = filteredHistory
      .map(
        (r) => `<tr>
          <td>${fmtDate(r.date)}</td>
          <td>${r.type}</td>
          <td>${r.description || ''}</td>
          <td>${fmtMAD(r.amount)}</td>
          <td>${[r.sourceAccount, r.destinationAccount].filter(Boolean).join(' → ') || '-'}</td>
          <td>${r.status}</td>
        </tr>`
      )
      .join('');
    w.document.write(`
      <html>
        <head>
          <title>Export - Historique Financier</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 18px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #888; padding: 6px 8px; font-size: 12px; }
            th { background: #f0f0f0; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Historique Financier - Export (filtres appliqués)</h1>
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Type</th><th>Description</th><th>Montant</th><th>Compte(s)</th><th>Statut</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="p-4 space-y-6">
      {/* Summary cards */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Solde des comptes</CardTitle>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setTransferDialogOpen(true)}>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transfert Bancaire
            </Button>
            <Button variant="secondary" onClick={() => setCashDialogOpen(true)}>
              <Wallet className="mr-2 h-4 w-4" />
              Opération de Caisse
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="rounded-md border p-3">
              <div className="text-sm text-muted-foreground">Espèce</div>
              <div className="text-xl font-semibold">{fmtMAD(soldeEspece)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-sm text-muted-foreground">Chèque</div>
              <div className="text-xl font-semibold">{fmtMAD(soldeCheque)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-sm text-muted-foreground">Banque</div>
              <div className="text-xl font-semibold">{fmtMAD(soldeBanque)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-sm text-muted-foreground">Dette</div>
              <div className="text-xl font-semibold">{fmtMAD(totalDebt)}</div>
            </div>
            <div className="rounded-md border p-3 bg-red-50">
              <div className="text-sm text-muted-foreground">Total des Dépenses</div>
              <div className="text-xl font-semibold text-red-600">{fmtMAD(totalExpenses)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-sm text-muted-foreground">Montant Total</div>
              <div className="text-xl font-semibold">{fmtMAD(montantTotal)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="gestion" className="w-full">
        <TabsList>
          <TabsTrigger value="gestion">
            <Filter className="mr-2 h-4 w-4" />
            Gestion de Transfert
          </TabsTrigger>
          <TabsTrigger value="historique">
            <History className="mr-2 h-4 w-4" />
            Historique
          </TabsTrigger>
        </TabsList>

        {/* Gestion de Transfert */}
        <TabsContent value="gestion">
          <Card>
            <CardHeader>
              <CardTitle>Transferts & Opérations (enregistrés)</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                <div>
                  <Label>Du</Label>
                  <Input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
                </div>
                <div>
                  <Label>Au</Label>
                  <Input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger><SelectValue placeholder="Type d'opération" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="transfert">Transfert</SelectItem>
                      <SelectItem value="versement">Versement</SelectItem>
                      <SelectItem value="retrait">Retrait</SelectItem>
                  <SelectItem value="dépense">Dépense</SelectItem>
                </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Compte impacté</Label>
                  <Select value={filterAccount} onValueChange={setFilterAccount}>
                    <SelectTrigger><SelectValue placeholder="Compte" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="espece">Espèce</SelectItem>
                      <SelectItem value="cheque">Chèque</SelectItem>
                      <SelectItem value="banque">Banque</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label>Montant min</Label>
                    <Input value={filterAmountMin} onChange={(e) => setFilterAmountMin(e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <Label>Montant max</Label>
                    <Input value={filterAmountMax} onChange={(e) => setFilterAmountMax(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end mb-3">
                <Button variant="outline" onClick={exportOpsToPDF}>
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger PDF
                </Button>
              </div>

              {/* Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Compte(s)</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOps.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Aucun mouvement trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOps.map((r) => (
                      <TableRow key={`${r.kind}-${r.id}`}>
                        <TableCell>{fmtDate(r.date)}</TableCell>
                        <TableCell>{r.kind === 'transfert' ? r.typeLabel : r.typeLabel}</TableCell>
                        <TableCell>{r.description || '-'}</TableCell>
                        <TableCell>{fmtMAD(r.amount)}</TableCell>
                        <TableCell>
                          {r.kind === 'transfert'
                            ? `${r.sourceAccount} → ${r.destinationAccount}`
                            : `${r.accountAffected}${'accountDetails' in r && r.accountDetails ? ` (${r.accountDetails})` : ''}`}
                        </TableCell>
                        <TableCell>{r.status}</TableCell>
                        <TableCell className="flex gap-2">
                          {r.status === 'pending' ? (
                            <>
                              {r.kind === 'transfert' ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() =>
                                      openEditTransfer(
                                        bankTransfers.find((t) => t.id === r.id)!
                                      )
                                    }
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() =>
                                      handleValidateTransfer(
                                        bankTransfers.find((t) => t.id === r.id)!
                                      )
                                    }
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() =>
                                      handleDeleteTransfer(bankTransfers.find((t) => t.id === r.id)!)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() =>
                                      openEditCash(
                                        cashOperations.find((o) => o.id === r.id)!
                                      )
                                    }
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() =>
                                      handleValidateCash(
                                        cashOperations.find((o) => o.id === r.id)!
                                      )
                                    }
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() =>
                                      handleDeleteCash(cashOperations.find((o) => o.id === r.id)!)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </>
                          ) : (
                            <>
                              <>
                              <Button size="sm" variant="outline" disabled>
                                <X className="h-4 w-4 mr-1" />
                                Validé
                              </Button>
                              {(r.kind === 'transfert' || r.kind === 'cashOp') && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    if (r.kind === 'transfert') {
                                      const item = bankTransfers.find((t) => t.id === r.id);
                                      if (item) handleDeleteTransfer(item);
                                    } else {
                                      // cashOp
                                      const item = cashOperations.find((o) => o.id === r.id);
                                      if (item) handleDeleteCash(item);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                              {(r.kind === 'transfert' || r.kind === 'cashOp') && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    if (r.kind === 'transfert') {
                                      const item = bankTransfers.find((t) => t.id === r.id);
                                      if (item) handleDeleteTransfer(item);
                                    } else {
                                      // cashOp
                                      const item = cashOperations.find((o) => o.id === r.id);
                                      if (item) handleDeleteCash(item);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Historique */}
        <TabsContent value="historique">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Historique Financier (Lecture seule)</CardTitle>
              <Button variant="outline" onClick={exportHistoryToPDF}>
                <Download className="mr-2 h-4 w-4" />
                Télécharger PDF
              </Button>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                <div>
                  <Label>Du</Label>
                  <Input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
                </div>
                <div>
                  <Label>Au</Label>
                  <Input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger><SelectValue placeholder="Type d'opération" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="encaissement">Encaissement</SelectItem>
                      <SelectItem value="transfert">Transfert</SelectItem>
                      <SelectItem value="versement">Versement</SelectItem>
                      <SelectItem value="retrait">Retrait</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Compte impacté</Label>
                  <Select value={filterAccount} onValueChange={setFilterAccount}>
                    <SelectTrigger><SelectValue placeholder="Compte" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="espece">Espèce</SelectItem>
                      <SelectItem value="cheque">Chèque</SelectItem>
                      <SelectItem value="banque">Banque</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label>Montant min</Label>
                    <Input value={filterAmountMin} onChange={(e) => setFilterAmountMin(e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <Label>Montant max</Label>
                    <Input value={filterAmountMax} onChange={(e) => setFilterAmountMax(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Compte(s)</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Aucune transaction trouvée
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHistory.map((r: FinancialTransaction) => (
                      <TableRow key={r.id}>
                        <TableCell>{fmtDate(r.date)}</TableCell>
                        <TableCell>
                          <Badge variant={r.type === 'réparation' ? 'destructive' : 'outline'}>
                            {r.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{r.description || '-'}</TableCell>
                        <TableCell>{fmtMAD(r.amount)}</TableCell>
                        <TableCell>{[r.sourceAccount, r.destinationAccount].filter(Boolean).join(' → ') || '-'}</TableCell>
                        <TableCell>{r.status}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transfert Bancaire - Modal */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogTitle>Enregistrer un Transfert Bancaire</DialogTitle>
          <div className="space-y-3">
            <div>
              <Label>Type de transfert</Label>
              <Select value={transferType} onValueChange={(v) => setTransferType(v as any)}>
                <SelectTrigger><SelectValue placeholder="Choisir un type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="versement_espece">Versement Espèce (Espèce → Banque)</SelectItem>
                  <SelectItem value="remise_cheques">Remise de Chèques (Chèque → Banque)</SelectItem>
                  <SelectItem value="retrait_bancaire">Retrait Bancaire (Banque → Espèce)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Montant</Label>
              <Input value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} placeholder="Ex: 2000" />
            </div>
            <div>
              <Label>Libellé / Description</Label>
              <Textarea value={transferDescription} onChange={(e) => setTransferDescription(e.target.value)} />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={format(new Date(transferDate), 'yyyy-MM-dd')}
                onChange={(e) => {
                  const d = new Date(e.target.value);
                  setTransferDate(new Date(d.setHours(12)).toISOString());
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setTransferDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitTransfer}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Opération de Caisse - Modal */}
      <Dialog open={cashDialogOpen} onOpenChange={setCashDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogTitle>Opération de Caisse</DialogTitle>
          <div className="space-y-3">
            <div>
              <Label>Nom / Libellé</Label>
              <Input value={cashName} onChange={(e) => setCashName(e.target.value)} placeholder="Ex: Versement de fonds propres" />
            </div>
            <div>
              <Label>Montant</Label>
              <Input value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} placeholder="Ex: 3000" />
            </div>
            <div>
              <Label>Type d'opération</Label>
              <RadioGroup
                value={cashType}
                onValueChange={(v) => setCashType(v as 'versement' | 'retrait')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="versement" id="versement" />
                  <Label htmlFor="versement">Verser (Augmentation)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="retrait" id="retrait" />
                  <Label htmlFor="retrait">Retirer (Diminution)</Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label>Compte affecté</Label>
              <Select value={cashAccount} onValueChange={(v) => setCashAccount(v as any)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un compte" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="espece">Caisse Espèce</SelectItem>
                  <SelectItem value="banque">Compte Bancaire</SelectItem>
                  <SelectItem value="cheque">Chèque</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {cashAccount === 'autre' && (
              <div>
                <Label>Détails du compte</Label>
                <Input value={cashAccountDetails} onChange={(e) => setCashAccountDetails(e.target.value)} placeholder="Ex: Compte X / IBAN ..." />
              </div>
            )}
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={format(new Date(cashDate), 'yyyy-MM-dd')}
                onChange={(e) => {
                  const d = new Date(e.target.value);
                  setCashDate(new Date(d.setHours(12)).toISOString());
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCashDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitCash}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Transfer Modal */}
      <Dialog open={editTransferOpen} onOpenChange={setEditTransferOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogTitle>Modifier Transfert</DialogTitle>
          {editingTransfer ? (
            <div className="space-y-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={editingTransfer.type}
                  onValueChange={(v) => setEditingTransfer({ ...editingTransfer, type: v as any })}
                >
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="versement_espece">Versement Espèce</SelectItem>
                    <SelectItem value="remise_cheques">Remise de Chèques</SelectItem>
                    <SelectItem value="retrait_bancaire">Retrait Bancaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Montant</Label>
                <Input
                  value={editingTransfer.amount}
                  onChange={(e) => setEditingTransfer({ ...editingTransfer, amount: parseFloat(e.target.value || '0') })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingTransfer.description}
                  onChange={(e) => setEditingTransfer({ ...editingTransfer, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={format(new Date(editingTransfer.date), 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const d = new Date(e.target.value);
                    setEditingTransfer({ ...editingTransfer, date: new Date(d.setHours(12)).toISOString() });
                  }}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditTransferOpen(false)}>Annuler</Button>
            <Button onClick={handleUpdateTransfer}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Cash Op Modal */}
      <Dialog open={editCashOpen} onOpenChange={setEditCashOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogTitle>Modifier Opération</DialogTitle>
          {editingCash ? (
            <div className="space-y-3">
              <div>
                <Label>Libellé</Label>
                <Input
                  value={editingCash.name}
                  onChange={(e) => setEditingCash({ ...editingCash, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Montant</Label>
                <Input
                  value={editingCash.amount}
                  onChange={(e) => setEditingCash({ ...editingCash, amount: parseFloat(e.target.value || '0') })}
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={editingCash.type}
                  onValueChange={(v) => setEditingCash({ ...editingCash, type: v as any })}
                >
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="versement">Versement</SelectItem>
                    <SelectItem value="retrait">Retrait</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Compte affecté</Label>
                <Select
                  value={editingCash.accountAffected}
                  onValueChange={(v) => setEditingCash({ ...editingCash, accountAffected: v as any })}
                >
                  <SelectTrigger><SelectValue placeholder="Compte" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="espece">Espèce</SelectItem>
                    <SelectItem value="banque">Banque</SelectItem>
                    <SelectItem value="cheque">Chèque</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingCash.accountAffected === 'autre' && (
                <div>
                  <Label>Détails du compte</Label>
                  <Input
                    value={editingCash.accountDetails || ''}
                    onChange={(e) => setEditingCash({ ...editingCash, accountDetails: e.target.value })}
                  />
                </div>
              )}
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={format(new Date(editingCash.date), 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const d = new Date(e.target.value);
                    setEditingCash({ ...editingCash, date: new Date(d.setHours(12)).toISOString() });
                  }}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditCashOpen(false)}>Annuler</Button>
            <Button onClick={handleUpdateCash}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Revenue;