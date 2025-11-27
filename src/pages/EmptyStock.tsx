import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';
import { Package2, Plus, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { AddEmptyStockDialog } from '@/components/dialogs/AddEmptyStockDialog';
import { AddDefectiveStockDialog } from '@/components/dialogs/AddDefectiveStockDialog';
import { BottleType } from '@/types';

const EmptyStock = () => {
  const { emptyBottlesStock = [], bottleTypes = [], defectiveBottles = [] } = useApp();
  const [selectedBottleType, setSelectedBottleType] = useState<BottleType | null>(null);
  const [selectedDefectiveBottleType, setSelectedDefectiveBottleType] = useState<BottleType | null>(null);
  const [addStockDialogOpen, setAddStockDialogOpen] = useState(false);
  const [addDefectiveStockDialogOpen, setAddDefectiveStockDialogOpen] = useState(false);

  // Filter out Détendeur Clic-On
  const availableBottleTypes = bottleTypes.filter(bt => !bt.name.includes('Détendeur'));

  const getEmptyStockForBottleType = (bottleTypeId: string) => {
    return emptyBottlesStock.find(stock => stock.bottleTypeId === bottleTypeId)?.quantity || 0;
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { status: 'Vide', variant: 'destructive' as const, icon: TrendingDown };
    if (quantity < 50) return { status: 'Faible', variant: 'secondary' as const, icon: TrendingDown };
    return { status: 'Normal', variant: 'default' as const, icon: TrendingUp };
  };

  const getDefectiveStockForBottleType = (bottleTypeId: string) => {
    return defectiveBottles
      .filter(defective => defective.bottleTypeId === bottleTypeId)
      .reduce((sum, defective) => sum + defective.quantity, 0);
  };

  const totalEmptyBottles = emptyBottlesStock.reduce((sum, stock) => sum + stock.quantity, 0);
  const totalDefectiveBottles = defectiveBottles.reduce((sum, defective) => sum + defective.quantity, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stock Vides</h1>
          <p className="text-muted-foreground mt-1">
            Gestion des stocks de bouteilles vides
          </p>
        </div>
      </div>

      {/* Inventaire Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Inventaire</h2>
        <p className="text-muted-foreground mb-6">Gestion des stocks de bouteilles</p>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {availableBottleTypes.map((bottle) => {
            const emptyQuantity = getEmptyStockForBottleType(bottle.id);
            const stockInfo = getStockStatus(emptyQuantity);
            
            return (
              <Card key={bottle.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{bottle.name}</CardTitle>
                    <Badge variant={stockInfo.variant} className="flex items-center gap-1">
                      <stockInfo.icon className="w-3 h-3" />
                      {stockInfo.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{bottle.capacity}</p>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Stock Display */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Bouteilles vides</span>
                      <span className="font-medium text-2xl">{emptyQuantity}</span>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        setSelectedBottleType(bottle);
                        setAddStockDialogOpen(true);
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Ajouter Stock
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Stock de Bouteilles Défectueuses Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Stock de Bouteilles Défectueuses</h2>
        <p className="text-muted-foreground mb-6">Gestion des stocks de bouteilles défectueuses</p>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {availableBottleTypes.map((bottle) => {
            const defectiveQuantity = getDefectiveStockForBottleType(bottle.id);
            const stockInfo = getStockStatus(defectiveQuantity);
            
            return (
              <Card key={bottle.id} className="hover:shadow-lg transition-shadow border-destructive/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{bottle.name}</CardTitle>
                    <Badge variant={stockInfo.variant} className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {stockInfo.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{bottle.capacity}</p>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Stock Display */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Bouteilles défectueuses</span>
                      <span className="font-medium text-2xl text-destructive">{defectiveQuantity}</span>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full border-destructive/40 hover:bg-destructive/10"
                      onClick={() => {
                        setSelectedDefectiveBottleType(bottle);
                        setAddDefectiveStockDialogOpen(true);
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Ajouter Stock
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Existing Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package2 className="h-5 w-5" />
            Total des Bouteilles Vides: {totalEmptyBottles}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead className="text-right">Quantité</TableHead>
                <TableHead>Dernière Mise à Jour</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emptyBottlesStock.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Aucune bouteille vide en stock
                  </TableCell>
                </TableRow>
              ) : (
                emptyBottlesStock.map((stock) => (
                  <TableRow key={stock.id}>
                    <TableCell className="font-medium">{stock.bottleTypeName}</TableCell>
                    <TableCell className="text-right">{stock.quantity}</TableCell>
                    <TableCell>{format(new Date(stock.lastUpdated), 'dd/MM/yyyy HH:mm')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Defective Bottles Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Total des Bouteilles Défectueuses: {totalDefectiveBottles}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead className="text-right">Quantité</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {defectiveBottles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Aucune bouteille défectueuse en stock
                  </TableCell>
                </TableRow>
              ) : (
                defectiveBottles.map((defective) => (
                  <TableRow key={defective.id}>
                    <TableCell className="font-medium">{defective.bottleTypeName}</TableCell>
                    <TableCell className="text-right text-destructive">{defective.quantity}</TableCell>
                    <TableCell>{format(new Date(defective.date), 'dd/MM/yyyy HH:mm')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      {selectedBottleType && (
        <AddEmptyStockDialog
          bottleType={selectedBottleType}
          open={addStockDialogOpen}
          onOpenChange={setAddStockDialogOpen}
        />
      )}
      
      {selectedDefectiveBottleType && (
        <AddDefectiveStockDialog
          bottleType={selectedDefectiveBottleType}
          open={addDefectiveStockDialogOpen}
          onOpenChange={setAddDefectiveStockDialogOpen}
        />
      )}
    </div>
  );
};

export default EmptyStock;
