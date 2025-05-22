import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SyncStatus } from "@/components/sync-status";

interface PageLayoutProps {
  children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  const { user } = useAuth();
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b">
          <div className="flex h-16 items-center px-4 md:px-6">
            <div className="flex-1">
              <h1 className="text-lg font-semibold">IDEC Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <SyncStatus />
              <div className="flex items-center gap-2">
                <Avatar className="bg-primary text-white">
                  <AvatarFallback>
                    {user?.fullName?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <div className="text-sm font-medium">{user?.fullName}</div>
                  <div className="text-xs text-muted-foreground">{user?.role}</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
