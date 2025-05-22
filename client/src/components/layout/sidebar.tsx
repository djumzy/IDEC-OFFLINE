import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  LogOut,
  BarChart4, 
  Menu, 
  X 
} from "lucide-react";

// Import the logos
import fcaLogo from "@/assets/fca-logo.jpg";
import unicefLogo from "@/assets/unicef-logo.jpg";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAdmin = user?.role === "admin";

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      active: location === "/dashboard",
      adminOnly: false,
    },
    {
      href: "/children",
      label: "Children",
      icon: <Users className="h-5 w-5" />,
      active: location.startsWith("/children"),
      adminOnly: false,
    },
    {
      href: "/screenings",
      label: "Screenings",
      icon: <ClipboardList className="h-5 w-5" />,
      active: location.startsWith("/screenings"),
      adminOnly: false,
    },
    {
      href: "/users",
      label: "User Management",
      icon: <Users className="h-5 w-5" />,
      active: location === "/users",
      adminOnly: true,
    },
    {
      href: "/reports",
      label: "Reports",
      icon: <BarChart4 className="h-5 w-5" />,
      active: location === "/reports",
      adminOnly: true,
    },
    {
      href: "/triers",
      label: "TIER",
      icon: <ClipboardList className="h-5 w-5" />,
      active: location === "/triers",
      adminOnly: false,
    },
    {
      href: "/tier-followups",
      label: "TIER Follow-ups",
      icon: <ClipboardList className="h-5 w-5" />,
      active: location === "/tier-followups",
      adminOnly: false,
    },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Mobile menu button for small screens
  const MobileMenuButton = (
    <button 
      className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
      onClick={toggleMobileMenu}
    >
      {isMobileMenuOpen ? (
        <X className="h-6 w-6" />
      ) : (
        <Menu className="h-6 w-6" />
      )}
    </button>
  );

  // Additional overlay for mobile menu backdrop
  const MobileOverlay = isMobileMenuOpen && (
    <div 
      className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
      onClick={() => setIsMobileMenuOpen(false)}
    />
  );

  return (
    <>
      {MobileMenuButton}
      {MobileOverlay}
      
      <aside
        className={`
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} 
          md:translate-x-0 fixed md:sticky top-0 left-0 h-full w-64 
          bg-white border-r transition-transform duration-200 z-50 md:z-0
        `}
      >
        <div className="p-4 border-b bg-blue-50">
          <div className="flex items-center justify-center mb-3">
            <span className="text-xl font-bold text-blue-700">IDEC DASHBOARD</span>
          </div>
          <div className="flex items-center justify-between space-x-3">
            <div className="flex-1 flex justify-center">
              <img src={fcaLogo} alt="FCA Logo" className="h-14 w-auto object-contain" />
            </div>
            <div className="flex-1 flex justify-center">
              <img src={unicefLogo} alt="UNICEF Logo" className="h-14 w-auto object-contain" />
            </div>
          </div>
        </div>
        
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            (!item.adminOnly || isAdmin) && (
              <Link key={item.href} href={item.href}>
                <div
                  className={`
                    flex items-center space-x-3 px-3 py-2 rounded-md cursor-pointer
                    ${item.active 
                      ? "bg-primary text-white" 
                      : "hover:bg-slate-100 text-neutral-700"
                    }
                  `}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </div>
              </Link>
            )
          ))}
        </nav>
        
        <div className="p-4 border-t">
          <Button 
            variant="ghost" 
            className="flex items-center w-full justify-start" 
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-2" />
            <span>Logout</span>
          </Button>
        </div>
      </aside>
    </>
  );
}
