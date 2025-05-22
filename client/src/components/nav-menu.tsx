import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User, Settings, Home, Users, ClipboardList, FileText, BarChart, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
    roles: ["admin", "vht"],
  },
  {
    title: "Children",
    href: "/children",
    icon: Users,
    roles: ["admin", "vht"],
  },
  {
    title: "Screenings",
    href: "/screenings",
    icon: ClipboardList,
    roles: ["admin", "vht"],
  },
  {
    title: "TRIERS",
    href: "/triers",
    icon: Activity,
    roles: ["admin", "vht"],
  },
  {
    title: "TIER Follow-ups",
    href: "/tier-followups",
    icon: Activity,
    roles: ["admin", "vht"],
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart,
    roles: ["admin"],
  },
  {
    title: "User Management",
    href: "/users",
    icon: User,
    roles: ["admin"],
  },
];

export function NavMenu() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const isActive = (path: string) => location === path;

  return (
    <div className="flex h-16 items-center px-4 border-b">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <Home className="h-6 w-6" />
          <span className="font-semibold">IDEC</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center space-x-4">
        {menuItems
          .filter((item) => item.roles.includes(user.role))
          .map((item) => (
            <Button
              key={item.href}
              variant={isActive(item.href) ? "default" : "ghost"}
              asChild
            >
              <Link href={item.href}>{item.title}</Link>
            </Button>
          ))}
      </div>

      <div className="flex items-center space-x-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {user.fullName?.split(" ").map(n => n[0]).join("") || user.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.fullName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.role === "admin" ? "Administrator" : "VHT"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => logoutMutation.mutate()} 
              className="cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
} 