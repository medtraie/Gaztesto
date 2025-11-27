import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/contexts/AppContext';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface AddTruckDialogProps {
  trigger?: React.ReactNode;
}

export const AddTruckDialog = ({ trigger }: AddTruckDialogProps) => {
  const { addTruck, drivers = [] } = useApp();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    matricule: '',
    driverId: '',
    truckType: 'camion' as 'camion' | 'remorque' | 'allogaz'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.driverId) {
      toast.error('Veuillez sélectionner un chauffeur');
      return;
    }

    addTruck({
      id: (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)),
      matricule: formData.matricule,
      driverId: formData.driverId,
      truckType: formData.truckType,
      isActive: true,
      currentLoad: [],
      updatedAt: new Date().toISOString(),
      nextReturnDate: undefined,
      reposReason: undefined,
      techStatus: 'operational'
    });

    toast.success('Camion ajouté avec succès');
    setOpen(false);
    setFormData({ matricule: '', driverId: '', truckType: 'camion' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un camion
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
  <DialogHeader>
    <DialogTitle>Ajouter un camion</DialogTitle>
  </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="matricule">Matricule</Label>
            <Input
              id="matricule"
              value={formData.matricule}
              onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
              placeholder="Ex: A-12345"
              required
            />
          </div>
          <div>
            <Label htmlFor="truckType">Type de camion</Label>
            <Select value={formData.truckType} onValueChange={(value: 'camion' | 'remorque' | 'allogaz') => setFormData({ ...formData, truckType: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="camion">Camion</SelectItem>
                <SelectItem value="remorque">Remorque</SelectItem>
                <SelectItem value="allogaz">Allogaz</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="driverId">Chauffeur</Label>
            <Select 
              value={formData.driverId} 
              onValueChange={(value) => setFormData({ ...formData, driverId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un chauffeur" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map(driver => (
                  <SelectItem key={driver.id} value={String(driver.id)}>
                    {driver.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full">Ajouter le camion</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
