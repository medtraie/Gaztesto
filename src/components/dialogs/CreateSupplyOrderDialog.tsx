import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Package, Plus, Minus, Trash2 } from 'lucide-react';
import { SupplyOrderItem } from '@/types';

interface CreateSupplyOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId: string;
  driverName: string;
  truckId?: string;
}

export const CreateSupplyOrderDialog: React.FC<CreateSupplyOrderDialogProps> = ({
  open,
  onOpenChange,
  driverId,
  driverName,
  truckId,
}) => {
  const { bottleTypes, clients, addSupplyOrder, updateBottleType, supplyOrders } = useApp();
  const { toast } = useToast();

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [items, setItems] = useState<SupplyOrderItem[]>([]);
  const [orderNumber, setOrderNumber] = useState<string>('');

  React.useEffect(() => {
    if (open) {
      if (!supplyOrders || supplyOrders.length === 0) {
        setOrderNumber('BS-1');
      } else {
        let maxNum = 0;
        supplyOrders.forEach(order => {
          if (order.orderNumber && typeof order.orderNumber === 'string') {
            const match = order.orderNumber.match(/(?:BS-)(\d+)/i);
            if (match && match[1]) {
              const num = parseInt(match[1], 10);
              if (num > maxNum) {
                maxNum = num;
              }
            }
          }
        });
        setOrderNumber(`BS-${maxNum + 1}`);
      }
    }
  }, [open, supplyOrders]);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const addItem = () => {
    if (bottleTypes.length === 0) return;
    
    const newItem: SupplyOrderItem = {
      bottleTypeId: bottleTypes[0].id,
      bottleTypeName: bottleTypes[0].name,
      emptyQuantity: 0,
      fullQuantity: 0,
      unitPrice: bottleTypes[0].unitPrice,
      taxLabel: bottleTypes[0].taxLabel,
      amount: 0,
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, field: keyof SupplyOrderItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    if (field === 'bottleTypeId') {
      const bottleType = bottleTypes.find(bt => bt.id === value);
      if (bottleType) {
        updatedItems[index].bottleTypeName = bottleType.name;
        updatedItems[index].unitPrice = bottleType.unitPrice;
        updatedItems[index].taxLabel = bottleType.taxLabel;
      }
    }
    
    // Recalculate amount
    const item = updatedItems[index];
    item.amount = item.fullQuantity * item.unitPrice;
    
    setItems(updatedItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const tax = subtotal * 0.2; // 20% TVA
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleSubmit = () => {
    if (items.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez ajouter au moins un produit",
        variant: "destructive",
      });
      return;
    }

    const trimmedOrderNumber = orderNumber.trim();
    if (!trimmedOrderNumber) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un numéro de B.S",
        variant: "destructive",
      });
      return;
    }

    const duplicate = supplyOrders.some(
      (o) => (o.orderNumber || "").toLowerCase() === trimmedOrderNumber.toLowerCase()
    );
    if (duplicate) {
      toast({
        title: "Doublon",
        description: "Ce numéro de B.S existe déjà",
        variant: "destructive",
      });
      return;
    }

    const { subtotal, tax, total } = calculateTotals();

    items.forEach(item => {
      const bt = bottleTypes.find(bt => bt.id === item.bottleTypeId);
      if (!bt) return;
      const nextRemaining = Math.max(0, (bt.remainingQuantity || 0) - item.fullQuantity);
      const nextDistributed = (bt.distributedQuantity || 0) + item.fullQuantity;
      updateBottleType(item.bottleTypeId, {
        remainingQuantity: nextRemaining,
        distributedQuantity: nextDistributed,
      });
    });

    addSupplyOrder({
      orderNumber: trimmedOrderNumber,
      date: new Date().toISOString(),
      driverId,
      driverName,
      clientId: selectedClientId,
      clientName: selectedClient?.name || '',
      items: items.filter(item => item.emptyQuantity > 0 || item.fullQuantity > 0),
      subtotal,
      tax,
      total,
    });

    toast({
      title: "Bon de Sortie créé",
      description: `B.S N° ${trimmedOrderNumber} a été créé avec succès pour ${driverName}`,
    });

    // Reset form
    setSelectedClientId('');
    setItems([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Nouveau Bon de Sortie (B.S) - {driverName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Number */}
          <div className="space-y-2">
            <Label htmlFor="order-number">N° Bon de Sortie</Label>
            <Input
              id="order-number"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
            />
          </div>

          {/* Client Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations Client</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="client-select">Client (Optionnel)</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger id="client-select">
                    <SelectValue placeholder="Sélectionner un client (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} - {client.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Produits</CardTitle>
              <Button onClick={addItem} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Ajouter Produit
              </Button>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun produit ajouté. Cliquez sur "Ajouter Produit" pour commencer.
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead className="text-center">Quantité Vides</TableHead>
                        <TableHead className="text-center">Quantité Pleines</TableHead>
                        <TableHead className="text-right">Prix Unitaire</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Select
                              value={item.bottleTypeId}
                              onValueChange={(value) => updateItem(index, 'bottleTypeId', value)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {bottleTypes.map(bottleType => (
                                  <SelectItem key={bottleType.id} value={bottleType.id}>
                                    {bottleType.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateItem(index, 'emptyQuantity', Math.max(0, item.emptyQuantity - 1))}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <Input
                                type="number"
                                value={item.emptyQuantity}
                                onChange={(e) => updateItem(index, 'emptyQuantity', parseInt(e.target.value) || 0)}
                                className="w-20 text-center"
                                min="0"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateItem(index, 'emptyQuantity', item.emptyQuantity + 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateItem(index, 'fullQuantity', Math.max(0, item.fullQuantity - 1))}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <Input
                                type="number"
                                value={item.fullQuantity}
                                onChange={(e) => updateItem(index, 'fullQuantity', parseInt(e.target.value) || 0)}
                                className="w-20 text-center"
                                min="0"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateItem(index, 'fullQuantity', item.fullQuantity + 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {item.unitPrice.toFixed(2)} DH
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {item.amount.toFixed(2)} DH
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Totals */}
          {items.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Sous-total:</span>
                    <span className="font-medium">{calculateTotals().subtotal.toFixed(2)} DH</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TVA (20%):</span>
                    <span className="font-medium">{calculateTotals().tax.toFixed(2)} DH</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>{calculateTotals().total.toFixed(2)} DH</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={items.length === 0}>
              Créer Bon de Sortie
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};