import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp } from '@/contexts/AppContext';
import { BottleType } from '@/types';
import { toast } from 'sonner';

interface AddEmptyStockDialogProps {
  bottleType: BottleType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddEmptyStockDialog: React.FC<AddEmptyStockDialogProps> = ({
  bottleType,
  open,
  onOpenChange,
}) => {
  const { updateEmptyBottlesStockByBottleType } = useApp();
  const [quantity, setQuantity] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Veuillez entrer une quantité valide');
      return;
    }

    // حدّث مخزون الفارغ لهذا النوع مباشرة (يضيف إن لم يوجد)
    updateEmptyBottlesStockByBottleType(bottleType.id, qty);

    toast.success(`${qty} bouteilles vides ajoutées pour ${bottleType.name}`);
    setQuantity('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
  <DialogHeader>
    <DialogTitle>Ajouter au stock vide</DialogTitle>
  </DialogHeader>
        <DialogHeader>
          <DialogTitle>Ajouter Stock Vides - {bottleType.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="quantity">Quantité de bouteilles vides</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Entrer la quantité"
              required
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit">
              Ajouter
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
