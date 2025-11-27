import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp } from '@/contexts/AppContext';
import { Driver } from '@/types';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface RecordPaymentDialogProps {
  driver: Driver;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RecordPaymentDialog = ({ driver, open, onOpenChange }: RecordPaymentDialogProps) => {
    const { recordDriverPayment, addCashOperation, addFinancialTransaction } = useApp();
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'especes' | 'cheque' | 'virement'>('especes');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const paymentAmount = parseFloat(amount);
      if (paymentAmount <= 0) {
        toast.error('Le montant doit être positif');
        return;
      }

      // تحديث دين/رصيد السائق: الدفع يقلل الدين والزيادة تتحول إلى avance
      recordDriverPayment(driver.id, paymentAmount);

      // تحويل mode de paiement إلى حساب caisse
      const account: 'espece' | 'cheque' | 'banque' =
        paymentMethod === 'especes' ? 'espece' :
        paymentMethod === 'cheque' ? 'cheque' : 'banque';

      // تسجيل كعملية caisse (versement)
      addCashOperation({
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        name: `Paiement chauffeur: ${driver.name}`,
        amount: paymentAmount,
        type: 'versement',
        accountAffected: account,
        status: 'validated',
      });

      // تسجيل أيضاً في السجل المالي العام
      addFinancialTransaction({
        date: new Date().toISOString(),
        type: 'encaissement',
        description: `Paiement chauffeur: ${driver.name}`,
        amount: paymentAmount,
        sourceAccount: 'chauffeur',
        destinationAccount: account,
        status: 'completed',
        createdAt: new Date().toISOString(),
      });

      toast.success('Paiement enregistré avec succès');
      onOpenChange(false);
      setAmount('');
      setPaymentMethod('especes');
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement - {driver.name}</DialogTitle>
          </DialogHeader>
          {/* اجعل DialogHeader واحداً داخل DialogContent */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Dette actuelle:</span>
                <span className="font-bold text-destructive">{Math.abs(driver.debt).toLocaleString()} DH</span>
              </div>
              <div className="flex justify-between">
                <span>Avances:</span>
                <span className="font-bold text-success">{driver.advances.toLocaleString()} DH</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span>Solde:</span>
                <span className={`font-bold ${driver.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {Math.abs(driver.balance).toLocaleString()} DH
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="amount">Montant du paiement (DH)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            {/* Mode de paiement */}
            <div>
              <Label>Mode de paiement *</Label>
              <Select value={paymentMethod} onValueChange={(v: 'especes' | 'cheque' | 'virement') => setPaymentMethod(v)}>
                <SelectTrigger><SelectValue placeholder="Choisir un mode" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="especes">Espèces</SelectItem>
                  <SelectItem value="cheque">Chèque</SelectItem>
                  <SelectItem value="virement">Virement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full">Enregistrer le paiement</Button>
          </form>
        </DialogContent>
      </Dialog>
    );
};
