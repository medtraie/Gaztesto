import { 
  BarChart3, 
  Package, 
  Truck, 
  Users, 
  ArrowRightLeft, 
  Factory,
  FileText,
  Home,
  PackagePlus,
  UserCircle,
  Package2,
  AlertTriangle,
  Receipt,
  DollarSign,
  Droplet,
  Wrench,
  Settings
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Tableau de bord", url: "/", icon: Home },
  { title: "Inventaire", url: "/inventory", icon: Package },
  { title: "Camions", url: "/trucks", icon: Truck },
  { title: "Chauffeurs", url: "/drivers", icon: Users },
  { title: "Clients", url: "/clients", icon: UserCircle },
  { title: "Alimenter et Retour", url: "/supply-return", icon: PackagePlus },
  { title: "ALLOGAZ", url: "/allogaz", icon: Truck },
  { title: "Stock Défectueux", url: "/defective-stock", icon: AlertTriangle },
  { title: "Échanges", url: "/exchanges", icon: ArrowRightLeft },
  { title: "Usine", url: "/factory", icon: Factory },
  { title: "Gestion Carburant & Huile", url: "/fuel-management", icon: Droplet },
  { title: "Gestion des Réparations", url: "/repairs", icon: Wrench },
  { title: "Dépenses Diverses", url: "/expenses", icon: DollarSign },
  { title: "Recette", url: "/revenue", icon: Receipt },
  { title: "Rapports", url: "/reports", icon: FileText },
  { title: "Paramètres", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center w-full ${isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`;

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent>
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary-foreground" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="font-bold text-lg">GazManager</h1>
                <p className="text-xs text-muted-foreground">Gestion de distribution</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="w-4 h-4" />
                      {!collapsed && <span className="ml-3">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}