import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp } from '@/contexts/AppContext';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface AddDriverDialogProps {
  trigger?: React.ReactNode;
}

export const AddDriverDialog = ({ trigger }: AddDriverDialogProps) => {
  const { addDriver } = useApp();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    addDriver({
      id: crypto.randomUUID(),
      name: formData.name,
      debt: 0,
      advances: 0,
      balance: 0
    });
    
    toast.success('Chauffeur ajouté avec succès');
    setOpen(false);
    setFormData({ name: '' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un chauffeur
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
  <DialogHeader>
    <DialogTitle>Ajouter un chauffeur</DialogTitle>
  </DialogHeader>
        <DialogHeader>
          <DialogTitle>Ajouter un chauffeur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nom complet</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Ahmed Hassan"
              required
            />
          </div>
          <Button type="submit" className="w-full">Ajouter le chauffeur</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
