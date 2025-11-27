import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp } from '@/contexts/AppContext';
import { Package } from 'lucide-react';
import { toast } from 'sonner';

export const AddBottleTypeDialog = () => {
  const { bottleTypes } = useApp();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    totalQuantity: '',
    unitPrice: '',
    taxRate: '20'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newBottle = {
      id: Date.now().toString(),
      name: formData.name,
      capacity: formData.capacity,
      totalQuantity: parseInt(formData.totalQuantity),
      distributedQuantity: 0,
      remainingQuantity: parseInt(formData.totalQuantity),
      unitPrice: parseFloat(formData.unitPrice),
      taxRate: parseFloat(formData.taxRate)
    };

    // We'll need to add this method to context
    localStorage.setItem('bottleTypes', JSON.stringify([...bottleTypes, newBottle]));
    window.location.reload(); // Temporary solution
    
    toast.success('Type de bouteille ajouté avec succès');
    setOpen(false);
    setFormData({ name: '', capacity: '', totalQuantity: '', unitPrice: '', taxRate: '20' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Package className="w-4 h-4 mr-2" />
          Ajouter un type
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un type de bouteille</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Butane 12KG"
              required
            />
          </div>
          <div>
            <Label htmlFor="capacity">Capacité</Label>
            <Input
              id="capacity"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              placeholder="Ex: 12KG"
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
              placeholder="500"
              required
            />
          </div>
          <div>
            <Label htmlFor="unitPrice">Prix unitaire (DH)</Label>
            <Input
              id="unitPrice"
              type="number"
              step="0.01"
              value={formData.unitPrice}
              onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
              placeholder="150"
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
              placeholder="20"
              required
            />
          </div>
          <Button type="submit" className="w-full">Ajouter</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
