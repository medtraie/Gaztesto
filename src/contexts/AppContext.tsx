import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  Client,
  Driver,
  Truck,
  Supply,
  SupplyReturn,
  CashOperation,
  Expense,
  Repair,
  Exchange,
  DefectiveBottle,
  Inventory,
  FuelPurchase,
  FuelConsumption,
  FuelDrain,
  OilPurchase,
  OilConsumption,
  OilDrain,
  Revenue,
  BankTransfer,
  FinancialTransaction,
  BottleType,
  ForeignBottle,
  EmptyBottlesStock,
  Brand,
} from "@/types";

// A custom hook for sticky state
function useStickyState<T>(defaultValue: T, key: string): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
  });

  React.useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

// AppContextType interface additions
interface AppContextType {
  clients: Client[];
  addClient: (client: Client) => void;
  brands: Brand[];
  addBrand: (brand: Brand) => void;
  drivers: Driver[];
  addDriver: (driver: Driver) => void;
  updateDriver: (driverId: string, updates: Partial<Driver>) => void;
  updateDriverDebt: (driverId: string, delta: number) => void;
  // تسجّل الدفع وتعدّل الدين والـ avances حسب المبلغ
  recordDriverPayment: (driverId: string, amount: number) => void;
  updateBrand: (id: string, patch: Partial<Brand>) => void;
  deleteBrand: (id: string) => void;
  trucks: Truck[];
  addTruck: (truck: Truck) => void;
  // دوال إدارة الشاحنات المطلوبة لصفحة Gestion des Camions
  updateTruck: (id: string, patch: Partial<Truck>) => void;
  bulkSetRepos: (ids: string[], reposReason?: string, nextReturnDate?: string) => void;
  bulkReactivate: (ids: string[]) => void;
  bulkDissociateDriver: (ids: string[]) => void;
  driverHasActiveTruck: (driverId: string) => Truck | undefined;
  truckAssignments: any[];
  supplies: Supply[];
  addSupply: (supply: Supply) => void;
  supplyReturns: SupplyReturn[];
  addSupplyReturn: (supplyReturn: SupplyReturn) => void;
  supplyOrders: any[];
  addSupplyOrder: (order: any) => void;
  updateSupplyOrder: (order: any) => void;
  deleteSupplyOrder: (id: string) => void;
  returnOrders: any[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialTrucks: Truck[] = [];

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [clients, setClients] = useStickyState<Client[]>([], "clients");
  const [brands, setBrands] = useStickyState<Brand[]>([], "brands");
  const [drivers, setDrivers] = useStickyState<Driver[]>([], "drivers");
  const [trucks, setTrucks] = useStickyState<Truck[]>([], "trucks");
  const [truckAssignments, setTruckAssignments] = useStickyState<any[]>([], "truckAssignments");
  const [supplies, setSupplies] = useStickyState<Supply[]>([], "supplies");
  const [supplyReturns, setSupplyReturns] = useStickyState<SupplyReturn[]>([], "supplyReturns");
  const [supplyOrders, setSupplyOrders] = useStickyState<any[]>([], "supplyOrders");
  const [returnOrders, setReturnOrders] = useStickyState<any[]>([], "returnOrders");
  const [cashOperations, setCashOperations] = useStickyState<CashOperation[]>([], "cashOperations");
  const [expenses, setExpenses] = useStickyState<Expense[]>([], "expenses");
  const [repairs, setRepairs] = useStickyState<Repair[]>([], "repairs");
  const [exchanges, setExchanges] = useStickyState<Exchange[]>([], "exchanges");
  const [emptyBottlesStock, setEmptyBottlesStock] = useStickyState<EmptyBottlesStock[]>([], "emptyBottlesStock");
  const [defectiveStock, setDefectiveStock] = useStickyState<DefectiveBottle[]>([], "defectiveStock");
  const [bottleTypes, setBottleTypes] = useStickyState<BottleType[]>([], "bottleTypes");
  const [transactions, setTransactions] = useStickyState<any[]>([], "transactions");
  const [foreignBottles, setForeignBottles] = useStickyState<ForeignBottle[]>([], "foreignBottles");
  const [inventory, setInventory] = useStickyState<Inventory[]>([], "inventory");
  const [fuelPurchases, setFuelPurchases] = useStickyState<FuelPurchase[]>([], "fuelPurchases");
  const [fuelConsumptions, setFuelConsumptions] = useStickyState<FuelConsumption[]>([], "fuelConsumptions");
  const [fuelDrains, setFuelDrains] = useStickyState<FuelDrain[]>([], "fuelDrains");
  const [oilPurchases, setOilPurchases] = useStickyState<OilPurchase[]>([], "oilPurchases");
  const [oilConsumptions, setOilConsumptions] = useStickyState<OilConsumption[]>([], "oilConsumptions");
  const [oilDrains, setOilDrains] = useStickyState<OilDrain[]>([], "oilDrains");
  
    // New states for Revenue page
    const [revenues, setRevenues] = useStickyState<Revenue[]>([], "revenues");
    const [bankTransfers, setBankTransfers] = useStickyState<BankTransfer[]>([], "bankTransfers");
    const [financialTransactions, setFinancialTransactions] = useStickyState<FinancialTransaction[]>(
      [],
      "financialTransactions"
    );
  
    const addClient = (client: Client) => setClients((prev) => [...prev, client]);
    const addDriver = (driver: Driver) => setDrivers((prev) => [...prev, driver]);
  
    const addBrand = (brand: Brand) => {
      const id = brand.id ?? (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
      setBrands(prev => [...prev, { ...brand, id }]);
    };
  
    const updateBrand = (id: string, patch: Partial<Brand>) => {
      setBrands(prev => prev.map(b => (b.id === id ? { ...b, ...patch } : b)));
    };
  
    const deleteBrand = (id: string) => {
      setBrands(prev => prev.filter(b => b.id !== id));
    };
  
    // Ensure all drivers have unique string ids (fixes React key warnings)
    React.useEffect(() => {
      setDrivers(prev => {
        let changed = false;
        const seen = new Set<string>();
        const next = prev.map(d => {
          let id = d.id ? String(d.id) : (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
          if (seen.has(id)) {
            id = (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
            changed = true;
          }
          seen.add(id);
          if (!d.id || d.id !== id) changed = true;
          return { ...d, id };
        });
        return changed ? next : prev;
      });
    }, []);
  
    // Update a driver's debt and recompute balance
    const updateDriverDebt = (driverId: string, delta: number) => {
      setDrivers(prev =>
        prev.map(d => {
          if (String(d.id) === String(driverId)) {
            const nextDebt = Math.max(0, (d.debt || 0) + delta);
            const nextBalance = (d.advances || 0) - nextDebt;
            
            addTransaction({
              date: new Date().toISOString(),
              type: delta > 0 ? 'debt' : 'payment',
              amount: Math.abs(delta),
              driverId: driverId,
              description: delta > 0 ? `Augmentation de la dette de ${delta} DH.` : `Réduction de la dette de ${Math.abs(delta)} DH.`,
            });
  
            return { ...d, debt: nextDebt, balance: nextBalance };
          }
          return d;
        })
      );
    };
  
    // New: تسجيل الدفع — الفائض يتحول إلى avance
    const recordDriverPayment = (driverId: string, amount: number) => {
      setDrivers(prev =>
        prev.map(d => {
          if (String(d.id) === String(driverId)) {
            const currentDebt = d.debt || 0;
            const currentAdvances = d.advances || 0;
  
            let nextDebt: number;
            let nextAdvances: number;
            let description = "";
  
            if (amount <= currentDebt) {
              // Payment is less than or equal to debt
              nextDebt = currentDebt - amount;
              nextAdvances = currentAdvances;
              description = `Paiement de ${amount} DH sur la dette.`;
            } else {
              // Payment covers debt and adds to advances
              const debtPaid = currentDebt;
              const advance = amount - currentDebt;
              nextDebt = 0;
              nextAdvances = currentAdvances + advance;
              description = `Paiement de la dette (${debtPaid} DH) et ajout d'une avance (${advance} DH).`;
            }
  
            addTransaction({
              date: new Date().toISOString(),
              type: 'payment',
              amount: amount,
              driverId: driverId,
              description: description,
            });
  
            const nextBalance = nextAdvances - nextDebt;
            return { ...d, debt: nextDebt, advances: nextAdvances, balance: nextBalance };
          }
          return d;
        })
      );
    };
  
    // Sanitize trucks: ensure unique string ids
    React.useEffect(() => {
      setTrucks(prev => {
        let changed = false;
        const seen = new Set<string>();
        const next = prev.map(t => {
          let id = t.id ? String(t.id) : (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
          if (seen.has(id)) {
            id = (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
            changed = true;
          }
          seen.add(id);
          if (!t.id || t.id !== id) changed = true;
          return { ...t, id };
        });
        return changed ? next : prev;
      });
    }, []);
  
    // Ensure default 'allogaz' trucks exist
    React.useEffect(() => {
      setTrucks(prev => {
        if (prev.some(t => t.truckType === 'allogaz')) return prev;
        return [
          ...prev,
          { id: 'a1', matricule: 'AL-1001', driverId: '', isActive: true, currentLoad: [], truckType: 'allogaz' },
          { id: 'a2', matricule: 'AL-1002', driverId: '', isActive: true, currentLoad: [], truckType: 'allogaz' },
        ];
      });
    }, []);
    const addTruck = (truck: Truck) =>
      setTrucks(prev => [...prev, { ...truck, id: truck.id ?? (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) }]);
    const addSupply = (supply: Supply) => setSupplies((prev) => [...prev, supply]);
    const addSupplyReturn = (supplyReturn: SupplyReturn) => setSupplyReturns((prev) => [...prev, supplyReturn]);
  
    // تسوية: تأكد أن كل SupplyOrder لديه id فريد عند التحميل
    React.useEffect(() => {
      setSupplyOrders(prev => {
        let changed = false;
        const seen = new Set<string>();
        const next = prev.map(o => {
          let id = o.id ? String(o.id) : (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
          if (seen.has(id)) {
            id = (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
            changed = true;
          }
          seen.add(id);
          if (!o.id || o.id !== id) changed = true;
          return { ...o, id };
        });
        return changed ? next : prev;
      });
    }, []);
  
    const addSupplyOrder = (order: any) =>
      setSupplyOrders(prev => [
        ...prev,
        { ...order, id: order.id ?? (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) }
      ]);
    const updateSupplyOrder = (updatedOrder: any) => {
      setSupplyOrders(prev => prev.map(order => order.id === updatedOrder.id ? updatedOrder : order));
    };
    const deleteSupplyOrder = (id: string) => {
      setSupplyOrders(prev => prev.filter(order => order.id !== id));
    };
  
  // Create a new return order and update driver’s debt/balance
  const addReturnOrder = (
    supplyOrderId: string,
    items: any[],
    totalVentes: number,
    totalExpenses: number,
    totalRC: number,
    amountPaid: number,
    driverId: string,
    driverDebtChange: number,
    creditChange: number,
    note: string,
    orderNumber?: string
  ): string => {
    const id = `ret-${Date.now()}`;
    const supplyOrder = supplyOrders.find(o => o.id === supplyOrderId);
  
    const newReturnOrder: any = {
      id,
      orderNumber: orderNumber || `BD-${Date.now().toString().slice(-5)}`,
      date: new Date().toISOString(),
      supplyOrderId,
      supplyOrderNumber: supplyOrder?.orderNumber || '',
      driverId,
      driverName: drivers.find(d => String(d.id) === String(driverId))?.name,
      clientId: supplyOrder?.clientId,
      clientName: supplyOrder?.clientName,
      items,
      totalVentes,
      totalExpenses,
      totalRC,
      amountPaid,
      note,
    };
  
    setReturnOrders(prev => [...prev, newReturnOrder]);
    updateDriver(driverId, { debt: driverDebtChange, balance: creditChange });
    return id;
  };
  
  const deleteReturnOrder = (id: string) => {
    setReturnOrders(prev => prev.filter(order => order.id !== id));
  };
  
  // Cash operations helpers
  const addCashOperation = (operation: CashOperation) => {
    const id = operation.id ?? (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
    setCashOperations(prev => [...prev, { ...operation, id }]);
  };

  const addExpense = (expense: Expense) => {
    const id = expense.id ?? (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
    setExpenses(prev => [...prev, { ...expense, id }]);
  };

  const deleteExpense = (expenseId: string) => {
    setExpenses(prev => prev.filter(expense => expense.id !== expenseId));
  };

  const addRepair = (repair: Repair) => {
    const id = repair.id ?? (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
    setRepairs(prev => [...prev, { ...repair, id }]);
  };

  const updateRepair = (id: string, patch: Partial<Repair>) => {
    setRepairs(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  };

  const deleteRepair = (id: string) => {
    setRepairs(prev => prev.filter(r => r.id !== id));
  };

  const addExchange = (exchange: Exchange) => {
    const id = exchange.id ?? (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
    setExchanges(prev => [...prev, { ...exchange, id }]);
  };

  const addEmptyStock = (stock: EmptyBottlesStock) => {
    const id = stock.id ?? (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
    setEmptyBottlesStock(prev => [...prev, { ...stock, id }]);
  };

  const updateEmptyBottlesStock = (id: string, patch: Partial<EmptyBottlesStock>) => {
    setEmptyBottlesStock(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
  };

  // جديد: تعديل مخزون القنينات الفارغة حسب نوع القنينة وبفارق (delta)
  const updateEmptyBottlesStockByBottleType = (bottleTypeId: string, delta: number) => {
    if (!delta) return;
    setEmptyBottlesStock(prev => {
      const idx = prev.findIndex(s => s.bottleTypeId === bottleTypeId);
      const bottleTypeName = bottleTypes.find(bt => bt.id === bottleTypeId)?.name || '';
      const now = new Date().toISOString();

      if (idx === -1) {
        const quantity = Math.max(0, delta);
        if (quantity === 0) return prev;
        const id = window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
        return [
          ...prev,
          { id, bottleTypeId, bottleTypeName, quantity, lastUpdated: now },
        ];
      }

      const current = prev[idx];
      const nextQuantity = Math.max(0, (current.quantity || 0) + delta);
      const next = [...prev];
      next[idx] = { ...current, quantity: nextQuantity, bottleTypeName, lastUpdated: now };
      return next;
    });
  };

  // تعديل: إضافة مخزون القنينات المعيبة حسب المعرّف والكمية (متوافق مع الاستدعاءات)
  const addDefectiveStock = (bottleTypeId: string, quantity: number) => {
    const bottleTypeName = bottleTypes.find(bt => bt.id === bottleTypeId)?.name || '';
    const id = window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
    setDefectiveStock(prev => [
      ...prev,
      {
        id,
        returnOrderId: 'manual',
        bottleTypeId,
        bottleTypeName,
        quantity,
        date: new Date().toISOString(),
      },
    ]);
  };

  // تعديل: إضافة قنينة معيبة واحدة (يتولّد id إن لم يكن موجوداً)
  const addDefectiveBottle = (bottle: DefectiveBottle) => {
    const id = bottle.id ?? (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
    setDefectiveStock(prev => [...prev, { ...bottle, id }]);
  };

  // جديد: تحديث مخزون القنينات المعيبة حسب نوع القنينة والفرق (delta)
  const updateDefectiveBottlesStock = (bottleTypeId: string, delta: number) => {
    if (!delta) return;

    if (delta > 0) {
      // زيادة المخزون: نسجل إدخالاً جديداً
      const bottleTypeName = bottleTypes.find(bt => bt.id === bottleTypeId)?.name || '';
      const id = window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
      setDefectiveStock(prev => [
        ...prev,
        {
          id,
          returnOrderId: 'factory',
          bottleTypeId,
          bottleTypeName,
          quantity: delta,
          date: new Date().toISOString(),
        },
      ]);
    } else {
      // تخفيض المخزون: ننقص من الإدخالات الموجودة لهذا النوع دون جعل الكمية سالبة
      setDefectiveStock(prev => {
        let toRemove = Math.abs(delta);
        const next = prev.map(entry => {
          if (entry.bottleTypeId !== bottleTypeId || toRemove === 0) return entry;
          if (entry.quantity <= 0) return entry;

          const remove = Math.min(entry.quantity, toRemove);
          toRemove -= remove;
          return { ...entry, quantity: entry.quantity - remove };
        });

        // نحذف الإدخالات التي أصبحت كميتها 0 للحفاظ على نظافة السجل
        return next.filter(e => e.quantity > 0);
      });
    }
  };
  const updateInventory = (id: string, patch: Partial<Inventory>) => {
    setInventory(prev => prev.map(inv => (inv.id === id ? { ...inv, ...patch } : inv)));
  };
  const addFuelPurchase = (purchase: FuelPurchase) => {
    const id = purchase.id ?? (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
    setFuelPurchases(prev => [...prev, { ...purchase, id }]);
  };
  const addFuelConsumption = (consumption: FuelConsumption) => {
    const id = consumption.id ?? (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
    setFuelConsumptions(prev => [...prev, { ...consumption, id }]);
  };
  const addFuelDrain = (drain: FuelDrain) => {
    const id = drain.id ?? (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
    setFuelDrains(prev => [...prev, { ...drain, id }]);
  };
  const addOilPurchase = (purchase: OilPurchase) => {
    const id = purchase.id ?? (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
    setOilPurchases(prev => [...prev, { ...purchase, id }]);
  };
  const addOilConsumption = (consumption: OilConsumption) => {
    const id = consumption.id ?? (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
    setOilConsumptions(prev => [...prev, { ...consumption, id }]);
  };
  const addOilDrain = (drain: OilDrain) => {
    const id = drain.id ?? (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
    setOilDrains(prev => [...prev, { ...drain, id }]);
  };
  const updateCashOperation = (id: string | number, patch: Partial<CashOperation>) => {
    setCashOperations(prev => prev.map(op => (op.id === id ? { ...op, ...patch } : op)));
  };
  const validateCashOperation = (id: string | number, validatorName?: string) => {
    setCashOperations(prev =>
      prev.map(op =>
        op.id === id
          ? { ...op, status: 'validated', validatedAt: new Date().toISOString(), validatedBy: validatorName }
          : op
      )
    );
  };
  const deleteCashOperation = (id: string | number) => {
    setCashOperations(prev => prev.filter(op => op.id !== id));
  };
  
  // Financial transactions
  const addFinancialTransaction = (tx: Omit<FinancialTransaction, 'id'>) => {
    const newTx = { ...tx, id: window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) };
    setFinancialTransactions(prev => [...prev, newTx]);
  };
  
  // Record revenue and linked financial transactions
  const addRevenue = (rev: Revenue) => {
    const id = rev.id ?? (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
    setRevenues(prev => [...prev, { ...rev, id }]);
  
    if (rev.cashAmount && rev.cashAmount > 0) {
      addFinancialTransaction({
        date: rev.date,
        type: 'encaissement',
        description: rev.description ?? '',
        amount: rev.cashAmount,
        sourceAccount: 'espece',
        destinationAccount: 'client',
        status: 'completed',
        createdAt: new Date().toISOString(),
        relatedOrderId: rev.relatedOrderId,
        relatedOrderType: rev.relatedOrderType,
      });
    }
  
    if (rev.checkAmount && rev.checkAmount > 0) {
      addFinancialTransaction({
        date: rev.date,
        type: 'encaissement',
        description: rev.description ?? '',
        amount: rev.checkAmount,
        sourceAccount: 'cheque',
        destinationAccount: 'client',
        status: 'completed',
        createdAt: new Date().toISOString(),
        relatedOrderId: rev.relatedOrderId,
        relatedOrderType: rev.relatedOrderType,
      });
    }
  };
  
  // Bank transfers helpers
  const addBankTransfer = (bt: BankTransfer) => {
    setBankTransfers(prev => [
      ...prev,
      { ...bt, id: bt.id ?? (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) }
    ]);
  };
  const updateBankTransfer = (id: string, patch: Partial<BankTransfer>) => {
    setBankTransfers(prev => prev.map(bt => (bt.id === id ? { ...bt, ...patch } : bt)));
  };
  const validateBankTransfer = (id: string, validatorName?: string) => {
    const t = bankTransfers.find(b => b.id === id);
    if (t) {
      addFinancialTransaction({
        date: t.date,
        type: 'transfert',
        description: t.description || (t.type === 'remise_cheques' ? 'Remise de chèques' : 'Transfert bancaire'),
        amount: t.amount,
        sourceAccount: t.sourceAccount,
        destinationAccount: t.destinationAccount,
        status: 'completed',
        createdAt: new Date().toISOString(),
      });
    }
  
    setBankTransfers(prev =>
      prev.map(bt =>
        bt.id === id
          ? { ...bt, status: 'validated', validatedAt: new Date().toISOString(), validatedBy: validatorName }
          : bt
      )
    );
  };
  const deleteBankTransfer = (id: string) => {
    setBankTransfers(prev => prev.filter(t => t.id !== id));
  };
  

  const getAccountBalance = (account: 'espece' | 'cheque' | 'banque' | 'autre') => {
    const validatedOps = cashOperations.filter((op) => op.accountAffected === account && op.status === 'validated');
    const cashSum = validatedOps.reduce((sum, op) => sum + (op.type === 'versement' ? op.amount : -op.amount), 0);
    const validatedTransfers = bankTransfers.filter((t) => t.status === 'validated');
    const transferSum = validatedTransfers.reduce((sum, t) => {
      let s = sum;
      if (t.sourceAccount === account) s -= t.amount;
      if (t.destinationAccount === account) s += t.amount;
      return s;
    }, 0);
    return cashSum + transferSum;
  };
  
  // Misc updates
  const updateBottleType = (id: string, patch: Partial<BottleType>) => {
    setBottleTypes(prev => prev.map(b => (b.id === id ? { ...b, ...patch } : b)));
  };
  const addTransaction = (transaction: any) => {
    setTransactions(prev => [...prev, { ...transaction, id: window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) }]);
  };
  const updateDriver = (driverId: string, updates: Partial<Driver>) => {
    setDrivers(prev =>
      prev.map(d => {
        if (String(d.id) === String(driverId)) {
          const newDebt = updates.debt !== undefined ? (d.debt || 0) + updates.debt : d.debt;
          const newBalance = updates.balance !== undefined ? (d.balance || 0) + updates.balance : d.balance;
          const newAdvances = updates.advances !== undefined ? (d.advances || 0) + updates.advances : d.advances;
          return { ...d, ...updates, debt: newDebt, balance: newBalance, advances: newAdvances };
        }
        return d;
      })
    );
  };
  const addForeignBottle = (foreignBottle: ForeignBottle) => {
    setForeignBottles(prev => [...prev, { ...foreignBottle, id: foreignBottle.id || (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) }]);
  };

  // Truck management
  const updateTruck = (id: string, patch: Partial<Truck>) => {
    setTrucks(prev => {
      const current = prev.find(t => t.id === id);
      const nextDriverId = patch.driverId !== undefined ? patch.driverId : current?.driverId;

      if (current && nextDriverId !== undefined && nextDriverId !== current.driverId) {
        setTruckAssignments(assigns => [
          ...assigns,
          {
            id: window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2),
            truckId: id,
            prevDriverId: current.driverId || "",
            driverId: nextDriverId || "",
            date: new Date().toISOString(),
            note: patch.isActive === false ? "Mise en repos auto" : undefined,
          },
        ]);
      }

      return prev.map(t =>
        t.id === id
          ? { ...t, ...patch, updatedAt: new Date().toISOString() }
          : t
      );
    });
  };
  const bulkSetRepos = (ids: string[], reposReason?: string, nextReturnDate?: string) => {
    setTrucks(prev =>
      prev.map(t =>
        ids.includes(t.id)
          ? { ...t, isActive: false, reposReason, nextReturnDate, updatedAt: new Date().toISOString() }
          : t
      )
    );
  };
  const bulkReactivate = (ids: string[]) => {
    setTrucks(prev =>
      prev.map(t =>
        ids.includes(t.id)
          ? { ...t, isActive: true, reposReason: undefined, nextReturnDate: undefined, updatedAt: new Date().toISOString() }
          : t
      )
    );
  };
  const bulkDissociateDriver = (ids: string[]) => {
    setTruckAssignments(assigns => [
      ...assigns,
      ...ids.map(id => ({
        id: window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2),
        truckId: id,
        prevDriverId: trucks.find(t => t.id === id)?.driverId || "",
        driverId: "",
        date: new Date().toISOString(),
        note: "Dissocié",
      })),
    ]);
    setTrucks(prev => prev.map(t => (ids.includes(t.id) ? { ...t, driverId: undefined, updatedAt: new Date().toISOString() } : t)));
  };
  const driverHasActiveTruck = (driverId: string) => trucks.find(t => t.driverId === driverId && t.isActive);

  const driversWithTransactions = React.useMemo(() => {
    return drivers.map(driver => ({
      ...driver,
      transactions: transactions.filter(t => String(t.driverId) === String(driver.id))
    }));
  });
  
  const value = {
    clients,
    addClient,
    brands,
    addBrand,
    drivers: driversWithTransactions,
    addDriver,
    updateDriver,
    updateDriverDebt,
    recordDriverPayment,
    addBrand,
    updateBrand,
    deleteBrand,
    trucks,
    addTruck,
    updateTruck,
    bulkSetRepos,
    bulkReactivate,
    bulkDissociateDriver,
    driverHasActiveTruck,
    truckAssignments,
    supplies,
    addSupply,
    supplyReturns,
    addSupplyReturn,
    supplyOrders,
    addSupplyOrder,
    updateSupplyOrder,
    deleteSupplyOrder,
    returnOrders,
    addReturnOrder,
    deleteReturnOrder,
    cashOperations,
    addCashOperation,
    expenses,
    addExpense,
    deleteExpense,
    repairs,
    addRepair,
    updateRepair,
    deleteRepair,
    exchanges,
    addExchange,
    emptyBottlesStock,
    addEmptyStock,
    updateEmptyBottlesStock,
    updateEmptyBottlesStockByBottleType,
    defectiveStock,
    defectiveBottles: defectiveStock,
    addDefectiveStock,
    addDefectiveBottle,
    updateDefectiveBottlesStock,
    inventory,
    updateInventory,
    fuelPurchases,
    addFuelPurchase,
    fuelConsumptions,
    addFuelConsumption,
    fuelDrains,
    addFuelDrain,
    oilPurchases,
    addOilPurchase,
    oilConsumptions,
    addOilConsumption,
    oilDrains,
    addOilDrain,
    revenues,
    addRevenue,
    bankTransfers,
    addBankTransfer,
    updateBankTransfer,
    validateBankTransfer,
    deleteBankTransfer,
    financialTransactions,
    addFinancialTransaction,
    updateCashOperation,
    validateCashOperation,
    deleteCashOperation,
    getAccountBalance,
    bottleTypes,
    updateBottleType,
    transactions,
    addTransaction,
    foreignBottles,
    addForeignBottle,
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
  };
  
  export const useApp = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
      throw new Error("useApp must be used within an AppProvider");
    }
    return context;
  }