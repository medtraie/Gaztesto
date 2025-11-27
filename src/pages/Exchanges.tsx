import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/contexts/AppContext';
import { ArrowRightLeft, Plus, Building2, TrendingUp, TrendingDown, Calendar, Package, AlertTriangle, Download, Trash, Edit } from 'lucide-react';
import { AddForeignBottleDialog } from '@/components/dialogs/AddForeignBottleDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { BottleType, Brand } from '@/types';

export const COMPANIES = [
  'Aziz gaz', 'Winxo', 'Dima gaz', 'Total', 'Putagaz', 
  'Nadigaz', 'Somap gaz', 'Atlas gaz', 'Ultra gaz', 'Petrom gaz'
];

const Exchanges = () => {
  const { exchanges = [], bottleTypes = [], addExchange, foreignBottles = [], brands = [] } = useApp();
  const [showExchangeForm, setShowExchangeForm] = useState(false);
  const [selectedBottleType, setSelectedBottleType] = useState<BottleType | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | undefined>(undefined);
  const [addForeignDialogOpen, setAddForeignDialogOpen] = useState(false);
  const [showBrandDialog, setShowBrandDialog] = useState(false);
  const [exchangeForm, setExchangeForm] = useState({
    companyName: '',
    clientName: '',
    bottleType: '',
    quantityGiven: 0,
    quantityReceived: 0,
    unitPrice: 0,
    paidBy: 'nous' as 'nous' | 'client'
  });

  const handleExchange = () => {
    const bottleTypeData = bottleTypes.find(bt => bt.id === exchangeForm.bottleType);
    const priceDifference = (exchangeForm.quantityReceived - exchangeForm.quantityGiven) * (exchangeForm.unitPrice || bottleTypeData?.unitPrice || 0);
    
    addExchange({
      companyName: exchangeForm.companyName,
      clientName: exchangeForm.clientName || undefined,
      bottleType: bottleTypeData?.name || '',
      quantityGiven: exchangeForm.quantityGiven,
      quantityReceived: exchangeForm.quantityReceived,
      priceDifference: Math.abs(priceDifference),
      date: new Date().toISOString(),
      isPaidByUs: priceDifference < 0,
      paidBy: exchangeForm.paidBy
    });

    setExchangeForm({
      companyName: '',
      clientName: '',
      bottleType: '',
      quantityGiven: 0,
      quantityReceived: 0,
      unitPrice: 0,
      paidBy: 'nous'
    });
    setShowExchangeForm(false);
  };

  // Get foreign bottles stock grouped by company and bottle type
  const getForeignStockByCompany = (companyName: string) => {
    return foreignBottles
      .filter(fb => fb.companyName === companyName && fb.type === 'normal')
      .reduce((acc, fb) => {
        const existing = acc.find(item => item.bottleType === fb.bottleType);
        if (existing) {
          existing.quantity += fb.quantity;
        } else {
          acc.push({ bottleType: fb.bottleType, quantity: fb.quantity });
        }
        return acc;
      }, [] as { bottleType: string; quantity: number }[]);
  };

  const getTotalForeignStockByCompany = (companyName: string) => {
    return foreignBottles
      .filter(fb => fb.companyName === companyName && fb.type === 'normal')
      .reduce((sum, fb) => sum + fb.quantity, 0);
  };

  // Get foreign stock for a specific bottle type and company
  const getForeignStockForBottleTypeAndCompany = (bottleTypeName: string, companyName: string) => {
    return foreignBottles
      .filter(fb => fb.bottleType === bottleTypeName && fb.companyName === companyName && fb.type === 'normal')
      .reduce((sum, fb) => sum + fb.quantity, 0);
  };

  // Get total foreign stock for a bottle type across all companies
  const getTotalForeignStockForBottleType = (bottleTypeName: string) => {
    return foreignBottles
      .filter(fb => fb.bottleType === bottleTypeName && fb.type === 'normal')
      .reduce((sum, fb) => sum + fb.quantity, 0);
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { status: 'Vide', variant: 'destructive' as const, icon: TrendingDown };
    if (quantity < 20) return { status: 'Faible', variant: 'secondary' as const, icon: TrendingDown };
    return { status: 'Normal', variant: 'default' as const, icon: TrendingUp };
  };

  // Filter out Détendeur
  const availableBottleTypes = bottleTypes.filter(bt => !bt.name.includes('Détendeur'));

  const totalExchangeValue = exchanges.reduce((sum, ex) => sum + ex.priceDifference, 0);
  const ourPayments = exchanges.filter(ex => ex.isPaidByUs).reduce((sum, ex) => sum + ex.priceDifference, 0);
  const theirPayments = exchanges.filter(ex => !ex.isPaidByUs).reduce((sum, ex) => sum + ex.priceDifference, 0);

  // إضافة: توليد و تحميل PDF لـ "Historique des échanges"
  const exportExchangesToPDF = () => {
      const w = window.open('', '_blank');
      if (!w) return;
  
      const totalNousPayons = exchanges.filter(ex => ex.isPaidByUs).reduce((sum, ex) => sum + ex.priceDifference, 0);
      const totalIlsPaient = exchanges.filter(ex => !ex.isPaidByUs).reduce((sum, ex) => sum + ex.priceDifference, 0);
      const rows = exchanges.map(ex => `
          <tr>
            <td>${new Date(ex.date).toLocaleDateString('fr-FR')}</td>
            <td>${ex.companyName}</td>
            <td>${ex.clientName ?? '-'}</td>
            <td>${ex.bottleType}</td>
            <td style="text-align:right">${ex.quantityGiven}</td>
            <td style="text-align:right">${ex.quantityReceived}</td>
            <td>${ex.isPaidByUs ? 'Nous payons' : 'Ils paient'}</td>
            <td style="text-align:right">${ex.priceDifference.toLocaleString('fr-FR')}</td>
          </tr>
      `).join('');
  
      w.document.write(`
        <html>
          <head>
            <title>Historique des échanges</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
              h1 { margin: 0 0 8px 0; }
              .meta { margin-bottom: 16px; color: #555; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; font-size: 13px; }
              th { background: #f7f7f7; text-align: left; }
              tfoot td { font-weight: bold; background: #fafafa; }
            </style>
          </head>
          <body>
            <h1>Historique des échanges</h1>
            // Inside the w.document.write template in Exchanges component
            <div class="meta">
              Total échanges: ${exchanges.length} |
              Nous payons: ${totalNousPayons.toLocaleString('fr-FR')} DH |
              Ils paient: ${totalIlsPaient.toLocaleString('fr-FR')} DH
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Marque</th>
                  <th>Client</th>
                  <th>Type</th>
                  <th style="text-align:right">Donné</th>
                  <th style="text-align:right">Reçu</th>
                  <th>Sens</th>
                  <th style="text-align:right">Montant (DH)</th>
                </tr>
              </thead>
              <tbody>
                ${rows || `<tr><td colspan="8" style="text-align:center;color:#777">Aucun échange enregistré</td></tr>`}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="7">Solde</td>
                  <td style="text-align:right">${(totalIlsPaient - totalNousPayons).toLocaleString('fr-FR')} DH</td>
                </tr>
              </tfoot>
            </table>
          </body>
        </html>
      `);
      w.document.close();
      setTimeout(() => w.print(), 200);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        // Inside Exchanges component header area
        <div>
          <p className="text-muted-foreground mt-1">
            Échanges de bouteilles avec les autres marques
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowExchangeForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvel échange
          </Button>
          <Button variant="outline" onClick={() => setShowBrandDialog(true)}>
            Gérer les marques
          </Button>
        </div>
      </div>

      {/* Stock de Bouteilles étranger - Inventaire par Type */}
      <div>
        <div className="sticky top-0 z-10 bg-white pb-2">
          <h2 className="text-2xl font-bold mb-4">Stock de Bouteilles étranger</h2>
          <p className="text-muted-foreground mb-6">Inventaire des bouteilles étrangères par type et marque</p>
        </div>

        <div className="space-y-8">
          {availableBottleTypes.map((bottleType) => {
            const totalStockForType = getTotalForeignStockForBottleType(bottleType.name);
            const { status, variant } = getStockStatus(totalStockForType);

            return (
              <Card key={bottleType.id}>
                <CardHeader className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    {bottleType.name}
                  </CardTitle>
                  <Badge variant={variant}>{status}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-3">
                    {brands.map((company) => {
                      const qty = getForeignStockForBottleTypeAndCompany(bottleType.name, company.name);
                      return (
                        <div key={company.id} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-3">
                            <Building2 className="w-5 h-5 text-muted-foreground" />
                            <span>{company.name}</span>
                          </div>
                          <span className={qty === 0 ? 'text-muted-foreground' : 'font-medium'}>{qty}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="text-sm text-muted-foreground">Total: {totalStockForType}</div>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSelectedBottleType(bottleType);
                        setAddForeignDialogOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Ajouter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Exchange Form */}
      {showExchangeForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nouvel Échange</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company">Marque</Label>
                <Select
                  value={exchangeForm.companyName}
                  onValueChange={(value) => setExchangeForm({ ...exchangeForm, companyName: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une marque" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map(company => {
                      const totalStock = getTotalForeignStockByCompany(company.name);
                      return (
                        <SelectItem key={company.id} value={company.name}>
                          <div className="flex items-center justify-between w-full">
                            <span>{company.name}</span>
                            {totalStock > 0 && (
                              <Badge variant="secondary" className="ml-2">
                                Stock: {totalStock}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {exchangeForm.companyName && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {getForeignStockByCompany(exchangeForm.companyName).length > 0 && (
                      <div className="space-y-1">
                        <p className="font-medium">Stock moderne:</p>
                        {getForeignStockByCompany(exchangeForm.companyName).map((stock) => (
                          <div key={stock.bottleType} className="flex justify-between">
                            <span>{stock.bottleType}</span>
                            <span className="font-medium">{stock.quantity}</span>
                          </div>
                        ))}                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="clientName">Nom client</Label>
                <Input
                  id="clientName"
                  type="text"
                  value={exchangeForm.clientName}
                  onChange={(e) => setExchangeForm({...exchangeForm, clientName: e.target.value})}
                  placeholder="Nom du client"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bottleType">Type de bouteille</Label>
                <Select 
                  value={exchangeForm.bottleType} 
                  onValueChange={(value) => setExchangeForm({...exchangeForm, bottleType: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {bottleTypes.map(bt => (
                      <SelectItem key={bt.id} value={bt.id}>{bt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="paidBy">Qui paie?</Label>
                <Select 
                  value={exchangeForm.paidBy} 
                  onValueChange={(value: 'nous' | 'client') => setExchangeForm({...exchangeForm, paidBy: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nous">Nous payons</SelectItem>
                    <SelectItem value="client">Client paie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="given">Quantité donnée</Label>
                <Input
                  id="given"
                  type="number"
                  value={exchangeForm.quantityGiven}
                  onChange={(e) => setExchangeForm({...exchangeForm, quantityGiven: parseInt(e.target.value) || 0})}
                />
              </div>
              
              <div>
                <Label htmlFor="received">Quantité reçue</Label>
                <Input
                  id="received"
                  type="number"
                  value={exchangeForm.quantityReceived}
                  onChange={(e) => setExchangeForm({...exchangeForm, quantityReceived: parseInt(e.target.value) || 0})}
                />
              </div>

              <div>
                <Label htmlFor="price">Prix unitaire (optionnel)</Label>
                <Input
                  id="price"
                  type="number"
                  value={exchangeForm.unitPrice}
                  onChange={(e) => setExchangeForm({...exchangeForm, unitPrice: parseFloat(e.target.value) || 0})}
                  placeholder="Prix par défaut utilisé"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleExchange}>Enregistrer l'échange</Button>
              <Button variant="outline" onClick={() => setShowExchangeForm(false)}>Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exchanges History */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Historique des échanges
          </CardTitle>
          <Button variant="outline" onClick={exportExchangesToPDF}>
            <Download className="w-4 h-4 mr-2" />
            Télécharger PDF
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {exchanges.length > 0 ? exchanges.map((exchange) => (
              <div key={exchange.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <ArrowRightLeft className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{exchange.companyName}</div>
                    {exchange.clientName && (
                      <div className="text-sm text-muted-foreground">
                        Client: {exchange.clientName}
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground">
                      {exchange.bottleType} • {new Date(exchange.date).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="text-sm">
                      Donné: {exchange.quantityGiven} → Reçu: {exchange.quantityReceived}
                    </div>
                    {exchange.paidBy && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Payé par: {exchange.paidBy === 'nous' ? 'Nous' : 'Client'}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <Badge variant={exchange.isPaidByUs ? "destructive" : "default"} className="mb-2">
                    {exchange.isPaidByUs ? "Nous payons" : "Ils paient"}
                  </Badge>
                  <div className={`text-lg font-bold ${
                    exchange.isPaidByUs ? 'text-destructive' : 'text-success'
                  }`}>
                    {exchange.priceDifference.toLocaleString()} DH
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-muted-foreground">
                Aucun échange enregistré
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Companies Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Résumé par marque</CardTitle>
        </CardHeader>
        <CardContent>
        <div className="grid gap-4">
            {brands.map(brand => {
              const companyExchanges = exchanges.filter(ex => ex.companyName === brand.name);
              if (companyExchanges.length === 0) return null;

              const totalValue = companyExchanges.reduce((sum, ex) => 
                sum + (ex.isPaidByUs ? -ex.priceDifference : ex.priceDifference), 0
              );

              return (
                <div key={brand.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{brand.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {companyExchanges.length} échange(s)
                      </div>
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${
                    totalValue > 0 ? 'text-success' : totalValue < 0 ? 'text-destructive' : 'text-muted-foreground'
                  }`}>
                    {totalValue > 0 ? '+' : ''}{totalValue.toLocaleString()} DH
                  </div>
                </div>
              );
            })}
        </div>
      </CardContent>
      </Card>

      {/* Add Foreign Bottle Dialog */}
      {selectedBottleType && (
        <AddForeignBottleDialog
          bottleType={selectedBottleType}
          companyName={selectedCompany}
          open={addForeignDialogOpen}
          onOpenChange={setAddForeignDialogOpen}
        />
      )}

      <BrandManagerDialog open={showBrandDialog} onOpenChange={setShowBrandDialog} />
    </div>
  );
};

const BrandManagerDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void; }) => {
  const { brands, addBrand, updateBrand, deleteBrand } = useApp();
  const [newBrandName, setNewBrandName] = useState("");
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  const handleAddBrand = () => {
    if (newBrandName.trim()) {
      if (editingBrand) {
        updateBrand(editingBrand.id, { name: newBrandName });
        setEditingBrand(null);
      } else {
        addBrand({ name: newBrandName, id: '' });
      }
      setNewBrandName("");
    }
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setNewBrandName(brand.name);
  };

  const handleCancelEdit = () => {
    setEditingBrand(null);
    setNewBrandName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gérer les marques</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {brands.map((brand) => (
            <div key={brand.id} className="flex items-center justify-between">
              <span>{brand.name}</span>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(brand)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteBrand(brand.id)}>
                  <Trash className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex space-x-2 mt-4">
          <Input
            value={newBrandName}
            onChange={(e) => setNewBrandName(e.target.value)}
            placeholder={editingBrand ? "Nouveau nom" : "Nom de la marque"}
          />
          <Button onClick={handleAddBrand}>{editingBrand ? "Mettre à jour" : "Ajouter"}</Button>
          {editingBrand && <Button variant="ghost" onClick={handleCancelEdit}>Annuler</Button>}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Exchanges;