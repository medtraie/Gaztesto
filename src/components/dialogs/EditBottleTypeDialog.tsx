import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp } from '@/contexts/AppContext';
import { BottleType } from '@/types';
import { toast } from 'sonner';

interface EditBottleTypeDialogProps {
  bottle: BottleType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditBottleTypeDialog = ({ bottle, open, onOpenChange }: EditBottleTypeDialogProps) => {
  const { updateBottleType } = useApp();
  const [formData, setFormData] = useState({
    name: bottle.name,
    capacity: bottle.capacity,
    totalQuantity: bottle.totalQuantity.toString(),
    unitPrice: bottle.unitPrice.toString(),
    taxRate: bottle.taxRate.toString()
  });

  useEffect(() => {
    setFormData({
      name: bottle.name,
      capacity: bottle.capacity,
      totalQuantity: bottle.totalQuantity.toString(),
      unitPrice: bottle.unitPrice.toString(),
      taxRate: bottle.taxRate.toString()
    });
  }, [bottle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newTotalQuantity = parseInt(formData.totalQuantity);
    const quantityDifference = newTotalQuantity - bottle.totalQuantity;
    
    updateBottleType(bottle.id, {
      name: formData.name,
      capacity: formData.capacity,
      totalQuantity: newTotalQuantity,
      remainingQuantity: bottle.remainingQuantity + quantityDifference,
      unitPrice: parseFloat(formData.unitPrice),
      taxRate: parseFloat(formData.taxRate)
    });
    
    toast.success('Type de bouteille modifié avec succès');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier {bottle.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="capacity">Capacité</Label>
            <Input
              id="capacity"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="totalQuantity">Quantité totale</Label>
            <Input
              id="totalQuantity"
              type="number"
              value={formData.totalQuantity}
              onChange={(e) => setFormData({ ...formData, totalQuantity: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Actuel: {bottle.totalQuantity} | Restant: {bottle.remainingQuantity} | Distribué: {bottle.distributedQuantity}
            </p>
          </div>
          <div>
            <Label htmlFor="unitPrice">Prix unitaire (DH)</Label>
            <Input
              id="unitPrice"
              type="number"
              step="0.01"
              value={formData.unitPrice}
              onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="taxRate">Taux de taxe (%)</Label>
            <Input
              id="taxRate"
              type="number"
              step="0.01"
              value={formData.taxRate}
              onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" className="flex-1">Enregistrer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
