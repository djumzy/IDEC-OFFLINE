import { useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Users, Activity, AlertTriangle, Calendar, FileText } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { db } from "@/services/db";

interface Screening {
  id: number;
  child_id: number;
  date: string;
  weight?: string;
  height?: string;
  muac?: string;
  hearing_screening?: string;
  vision_screening?: string;
  mdat_sf1?: string;
  mdat_lf1?: string;
  mdat_sf2?: string;
  mdat_lf2?: string;
  current_age?: string;
  screening_date?: string;
  oedema: boolean;
  appetite?: string;
  symptoms?: string;
  height_for_age?: 'normal' | 'moderate' | 'severe';
  weight_for_age?: 'normal' | 'moderate' | 'severe';
  weight_for_height?: 'normal' | 'moderate' | 'severe';
  muac_result?: 'normal' | 'moderate' | 'severe';
  referral_required: boolean;
  referral_facility?: string;
  referral_date?: string;
  referral_reason?: string;
  screened_by: number;
  created_at: string;
  sync_status: 'synced' | 'pending' | 'error';
  last_modified: number;
}

interface Child {
  id: number;
  child_id: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
  district: string;
  health_facility: string;
  caretaker_name: string;
  caretaker_contact?: string;
  address?: string;
  status: string;
  registered_by: number;
  created_at: string;
  last_modified: number;
}

interface DashboardStats {
  totalChildren: number;
  totalScreenings: number;
  pendingReferrals: number;
  recentScreenings: Array<{
    id: number;
    childId: string;
    childName: string;
    date: string;
    referralRequired: boolean;
    status: string;
  }>;
}

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isOnline } = useNetworkStatus();
  const [localStats, setLocalStats] = useState<DashboardStats | null>(null);

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard"],
    enabled: isOnline,
  });

  // Load local data when offline
  useEffect(() => {
    const loadLocalData = async () => {
      if (!isOnline) {
        try {
          const children = await db.getAllChildren();
          const screenings = await db.getAllScreenings();
          const pendingReferrals = screenings.filter((s: Screening) => s.referral_required).length;

          setLocalStats({
            totalChildren: children.length,
            totalScreenings: screenings.length,
            pendingReferrals,
            recentScreenings: screenings.slice(0, 5).map((s: Screening) => ({
              id: s.id,
              childId: s.child_id.toString(),
              childName: children.find((c: Child) => c.id === s.child_id)?.full_name || "Unknown",
              date: s.date,
              referralRequired: s.referral_required,
              status: s.referral_required ? "Needs Referral" : "Completed"
            }))
          });
        } catch (error) {
          console.error("Error loading local data:", error);
          toast({
            title: "Error",
            description: "Failed to load local data",
            variant: "destructive",
          });
        }
      }
    };

    loadLocalData();
  }, [isOnline, toast]);

  const stats = isOnline ? dashboardData : localStats;

  if (isLoading && isOnline) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-neutral-700">Dashboard</h1>
            <div className="flex gap-4">
              <Button onClick={() => navigate("/children/new")}>
                Register New Child
              </Button>
              <Button variant="outline" onClick={() => navigate("/screenings/new")}>
                New Screening
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Children</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalChildren || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Registered children
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Screenings</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalScreenings || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Completed screenings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Referrals</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.pendingReferrals || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Require attention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isOnline ? "Online" : "Offline"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isOnline ? "Connected to server" : "Working locally"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Screenings */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Screenings</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Child ID</TableHead>
                    <TableHead>Child Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.recentScreenings.map((screening) => (
                    <TableRow key={screening.id}>
                      <TableCell>{new Date(screening.date).toLocaleDateString()}</TableCell>
                      <TableCell>{screening.childId}</TableCell>
                      <TableCell>{screening.childName}</TableCell>
                      <TableCell>
                        <Badge variant={screening.referralRequired ? "destructive" : "default"}>
                          {screening.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/screenings/${screening.id}`)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-24"
                  onClick={() => navigate("/children")}
                >
                  <div className="flex flex-col items-center">
                    <Users className="h-6 w-6 mb-2" />
                    <span>View All Children</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-24"
                  onClick={() => navigate("/screenings")}
                >
                  <div className="flex flex-col items-center">
                    <Activity className="h-6 w-6 mb-2" />
                    <span>View All Screenings</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-24"
                  onClick={() => navigate("/referrals")}
                >
                  <div className="flex flex-col items-center">
                    <AlertTriangle className="h-6 w-6 mb-2" />
                    <span>View Referrals</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-24"
                  onClick={() => navigate("/reports")}
                >
                  <div className="flex flex-col items-center">
                    <FileText className="h-6 w-6 mb-2" />
                    <span>View Reports</span>
                  </div>
                </Button>
              </CardContent>
            </Card>

            {/* Offline Status Card */}
            {!isOnline && (
              <Card className="bg-amber-50 border-amber-200">
                <CardHeader>
                  <CardTitle className="text-amber-800">Offline Mode</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-amber-700 mb-4">
                    You are currently working offline. All changes will be saved locally and synced when you're back online.
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm text-amber-600">
                      • Local data is being used
                    </p>
                    <p className="text-sm text-amber-600">
                      • Changes will sync automatically when online
                    </p>
                    <p className="text-sm text-amber-600">
                      • You can continue working normally
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
} 