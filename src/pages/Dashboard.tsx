import React from 'react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import OilBarrelsWidget from '@/components/dashboard/OilBarrelsWidget';
import { 
  Package, 
  Truck, 
  Users, 
  TrendingUp,
  AlertTriangle,
  DollarSign,
  BarChart3
} from 'lucide-react';

const Dashboard = () => {
  const { 
    bottleTypes = [], 
    trucks = [], 
    drivers = [], 
    transactions = [],
    expenses = [],
    repairs = []
  } = useApp();

  // Calculate metrics
  const totalStock = bottleTypes.reduce((sum, bt) => sum + bt.remainingQuantity, 0);
  const totalValue = bottleTypes.reduce((sum, bt) => sum + (bt.remainingQuantity * bt.unitPrice), 0);
  const activeTrucks = trucks.filter(t => t.isActive).length;
  const totalDriverDebt = drivers.reduce((sum, d) => sum + Math.abs(d.debt), 0);
  const lowStockBottles = bottleTypes.filter(bt => bt.remainingQuantity < 50);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">
          Aperçu général de votre système de distribution
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Stock Total"
          value={`${totalStock} unités`}
          icon={Package}
          trend={{ value: 5.2, isPositive: true }}
        />
        <MetricCard
          title="Valeur Stock"
          value={`${totalValue.toLocaleString()} DH`}
          icon={DollarSign}
          trend={{ value: 12.5, isPositive: true }}
        />
        <MetricCard
          title="Camions Actifs"
          value={`${activeTrucks}/${trucks.length}`}
          icon={Truck}
        />
        <MetricCard
          title="Dettes Chauffeurs"
          value={`${totalDriverDebt.toLocaleString()} DH`}
          icon={Users}
          valueClassName="text-destructive"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Stock Status */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              État des Stocks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bottleTypes.map((bottle) => (
                <div key={bottle.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium">{bottle.name}</div>
                    {bottle.remainingQuantity < 50 && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Stock faible
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {bottle.remainingQuantity}
                    </span>
                    <div className="w-16 bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ 
                          width: `${Math.min((bottle.remainingQuantity / bottle.totalQuantity) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Oil Barrels Widget - أسفل خزان الوقود */}
        <div className="space-y-6">
          {/* يمكن إضافة خزان الوقود هنا إذا كان موجوداً */}
          
          {/* براميل الزيت */}
          <OilBarrelsWidget />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Activité Récente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...transactions, ...expenses, ...repairs]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <div className="text-sm font-medium">
                        {'type' in activity && activity.type === 'supply' && 'Alimentation camion'}
                        {'type' in activity && activity.type === 'return' && 'Retour camion'}
                        {'type' in activity && activity.type === 'exchange' && 'Échange bouteilles'}
                        {'type' in activity && activity.type === 'factory' && 'Envoi usine'}
                        {'amount' in activity && `Dépense: ${activity.type}`}
                        {'totalCost' in activity && `Réparation: ${activity.type}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(activity.date).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      {('totalValue' in activity && activity.totalValue) ||
                        ('totalVentes' in activity && activity.totalVentes) ||
                        ('amount' in activity && activity.amount) ||
                        ('totalCost' in activity && activity.totalCost) ||
                        0}{' '}
                      DH
                    </div>
                  </div>
                ))}
              {transactions.length === 0 && expenses.length === 0 && repairs.length === 0 && (
                <div className="text-center text-muted-foreground py-4">
                  Aucune activité récente
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              État du Système
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Gestion de Carburant</span>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Actif
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Gestion d'Huile</span>
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  Nouveau
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Système de Distribution</span>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Opérationnel
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {lowStockBottles.length > 0 && (
        <Card className="border-warning bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="w-5 h-5" />
              Alertes Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {lowStockBottles.map((bottle) => (
                <div key={bottle.id} className="flex items-center justify-between">
                  <span className="text-sm">{bottle.name}</span>
                  <Badge variant="outline" className="text-warning border-warning">
                    {bottle.remainingQuantity} restantes
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;