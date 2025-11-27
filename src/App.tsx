import { Toaster as UIToaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AppProvider } from "./contexts/AppContext";
import { Toaster } from "sonner";
import { Layout } from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Trucks from "./pages/Trucks";
import Drivers from "./pages/Drivers";
import Exchanges from "./pages/Exchanges";
import Factory from "./pages/Factory";
import SupplyReturn from "./pages/SupplyReturn";
import Clients from "./pages/Clients";
import DefectiveStock from "./pages/DefectiveStock";
import Expenses from "./pages/Expenses";
import Revenue from "./pages/Revenue";
import Reports from "./pages/Reports";
import FuelManagement from "./pages/FuelManagement";
import Allogaz from "./pages/Allogaz";
import Repairs from "./pages/Repairs";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <UIToaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/trucks" element={<Trucks />} />
                <Route path="/drivers" element={<Drivers />} />
                <Route path="/exchanges" element={<Exchanges />} />
                <Route path="/factory" element={<Factory />} />
                <Route path="/supply-return" element={<SupplyReturn />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/defective-stock" element={<DefectiveStock />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/revenue" element={<Revenue />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/fuel-management" element={<FuelManagement />} />
                <Route path="/oil-management" element={<Navigate to="/fuel-management" replace />} />
                <Route path="/allogaz" element={<Allogaz />} />
                <Route path="/repairs" element={<Repairs />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
