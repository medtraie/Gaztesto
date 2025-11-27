import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/contexts/AppContext';
import { Truck as TruckType } from '@/types';
import { toast } from 'sonner';

interface SupplyTruckDialogProps {
  truck: TruckType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SupplyTruckDialog = ({ truck, open, onOpenChange }: SupplyTruckDialogProps) => {
  const { bottleTypes, updateBottleType, addTransaction } = useApp();
  const [supplies, setSupplies] = useState<Array<{ bottleTypeId: string; quantity: number }>>([]);
  const [selectedBottle, setSelectedBottle] = useState('');
  const [quantity, setQuantity] = useState('');

  const addSupply = () => {
    if (!selectedBottle || !quantity) return;
    
    setSupplies([...supplies, { 
      bottleTypeId: selectedBottle, 
      quantity: parseInt(quantity) 
    }]);
    setSelectedBottle('');
    setQuantity('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (supplies.length === 0) {
      toast.error('Veuillez ajouter au moins un article');
      return;
    }

    let totalValue = 0;
    supplies.forEach(supply => {
      const bottle = bottleTypes.find(bt => bt.id === supply.bottleTypeId);
      if (bottle) {
        updateBottleType(bottle.id, {
          distributedQuantity: bottle.distributedQuantity + supply.quantity,
          remainingQuantity: bottle.remainingQuantity - supply.quantity
        });
        totalValue += bottle.unitPrice * supply.quantity;
      }
    });

    addTransaction({
      type: 'supply',
      date: new Date().toISOString(),
      truckId: truck.id,
      bottleTypes: supplies,
      totalValue
    });
    
    toast.success('Camion alimenté avec succès');
    onOpenChange(false);
    setSupplies([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Alimenter le camion {truck.matricule}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Label>Type de bouteille</Label>
              <Select value={selectedBottle} onValueChange={setSelectedBottle}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {bottleTypes.map(bt => (
                    <SelectItem key={bt.id} value={bt.id}>
                      {bt.name} (Stock: {bt.remainingQuantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantité</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                />
                <Button type="button" onClick={addSupply} size="sm">+</Button>
              </div>
            </div>
          </div>

          {supplies.length > 0 && (
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-medium">Articles à charger:</h4>
              {supplies.map((supply, idx) => {
                const bottle = bottleTypes.find(bt => bt.id === supply.bottleTypeId);
                return (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{bottle?.name}</span>
                    <span>{supply.quantity} unités</span>
                  </div>
                );
              })}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={supplies.length === 0}>
            Valider l'alimentation
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
