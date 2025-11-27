import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useApp } from '@/contexts/AppContext';
import { Users, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Clients = () => {
  const { clients, addClient, updateClient, deleteClient } = useApp();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string } | null>(null);
  const [newClientName, setNewClientName] = useState('');
  const [editClientName, setEditClientName] = useState('');

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) {
      toast.error('Veuillez entrer un nom de client');
      return;
    }
    addClient({ name: newClientName.trim() });
    toast.success('Client ajouté avec succès');
    setAddDialogOpen(false);
    setNewClientName('');
  };

  const handleEditClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !editClientName.trim()) {
      toast.error('Veuillez entrer un nom de client');
      return;
    }
    updateClient(selectedClient.id, { name: editClientName.trim() });
    toast.success('Client modifié avec succès');
    setEditDialogOpen(false);
    setSelectedClient(null);
    setEditClientName('');
  };

  const handleDeleteClient = () => {
    if (!selectedClient) return;
    deleteClient(selectedClient.id);
    toast.success('Client supprimé avec succès');
    setDeleteDialogOpen(false);
    setSelectedClient(null);
  };

  const openEditDialog = (client: { id: string; name: string }) => {
    setSelectedClient(client);
    setEditClientName(client.name);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (client: { id: string; name: string }) => {
    setSelectedClient(client);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Clients</h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos clients
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un client
            </Button>
          </DialogTrigger>
          <DialogContent>
  <DialogHeader>
    <DialogTitle>Modifier le client</DialogTitle>
  </DialogHeader>
            <DialogHeader>
              <DialogTitle>Ajouter un client</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddClient} className="space-y-4">
              <div>
                <Label htmlFor="clientName">Nom du client</Label>
                <Input
                  id="clientName"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ex: Restaurant Al Amal"
                  required
                />
              </div>
              <Button type="submit" className="w-full">Ajouter</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Clients</p>
              <p className="text-2xl font-bold">{clients.length}</p>
            </div>
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Clients List */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des clients</CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun client enregistré</h3>
              <p className="text-muted-foreground mb-4">
                Commencez par ajouter votre premier client
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{client.name}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(client)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(client)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
  <DialogHeader>
    <DialogTitle>Modifier le client</DialogTitle>
  </DialogHeader>
          <DialogHeader>
            <DialogTitle>Modifier le client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditClient} className="space-y-4">
            <div>
              <Label htmlFor="editClientName">Nom du client</Label>
              <Input
                id="editClientName"
                value={editClientName}
                onChange={(e) => setEditClientName(e.target.value)}
                placeholder="Nom du client"
                required
              />
            </div>
            <Button type="submit" className="w-full">Enregistrer</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce client ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action ne peut pas être annulée. Cela supprimera définitivement le client.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClient}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Clients;
