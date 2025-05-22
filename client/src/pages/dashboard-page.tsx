import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageLayout } from "@/components/layout/page-layout";
import { StatsCard } from "@/components/dashboard/stats-card";
import { DistrictChart } from "@/components/dashboard/district-chart";
import { StatusChart } from "@/components/dashboard/status-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardList, BellRing, Activity, Eye, Ear, Brain, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DISTRICTS } from "@shared/constants";
import { Child, Screening } from "@shared/schema";

interface DashboardStats {
  totalChildren: number;
  totalScreenings: number;
  totalReferrals: number;
  activeUsers: number;
  districtDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  recentChildren: Array<{
    id: number;
    childId: string;
    fullName: string;
    district: string;
    healthFacility: string;
    status: string;
  }>;
}

interface ScreeningWithChild extends Screening {
  childName: string;
  status: string;
  assessmentType: string;
}

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [selectedDistrict, setSelectedDistrict] = useState<string>("_all");
  const [selectedFacility, setSelectedFacility] = useState<string>("_all");
  const [availableFacilities, setAvailableFacilities] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [selectedStatCard, setSelectedStatCard] = useState<string | null>(null);

  // Fetch children data
  const { data: children, isLoading: childrenLoading } = useQuery<Child[]>({
    queryKey: ["/api/children", selectedDistrict, selectedFacility],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (selectedDistrict !== "_all") queryParams.append("district", selectedDistrict);
      if (selectedFacility !== "_all") queryParams.append("healthFacility", selectedFacility);
      const url = `/api/children${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch children");
      }
      return response.json();
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  });

  // Fetch screenings data
  const { data: screenings, isLoading: screeningsLoading } = useQuery<ScreeningWithChild[]>({
    queryKey: ["/api/screenings", selectedDistrict, selectedFacility],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (selectedDistrict !== "_all") queryParams.append("district", selectedDistrict);
      if (selectedFacility !== "_all") queryParams.append("healthFacility", selectedFacility);
      const url = `/api/screenings${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch screenings");
      }
      const data = await response.json();
      // Combine screenings with child information
      return data.map((screening: Screening) => {
        const child = children?.find(c => c.id === screening.childId);
        return {
          ...screening,
          childName: child?.fullName || "Unknown",
          status: child?.status || "unknown",
          assessmentType: screening.referralRequired ? "Referral" : "General"
        };
      });
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  });

  // Calculate stats from the fetched data
  const stats: DashboardStats = {
    totalChildren: children?.length || 0,
    totalScreenings: screenings?.length || 0,
    totalReferrals: (screenings as ScreeningWithChild[])?.filter((s: ScreeningWithChild) => s.referralRequired)?.length || 0,
    activeUsers: 0, // This will be fetched separately if needed
    districtDistribution: (children as Child[])?.reduce((acc: Record<string, number>, child: Child) => {
      const district = child.district || "Unknown";
      acc[district] = (acc[district] || 0) + 1;
      return acc;
    }, {}) || {},
    statusDistribution: (children as Child[])?.reduce((acc: Record<string, number>, child: Child) => {
      const status = child.status || "Unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {}) || {},
    recentChildren: (children as Child[])
      ?.sort((a: Child, b: Child) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5)
      .map((child: Child) => ({
        id: child.id,
        childId: child.childId,
        fullName: child.fullName,
        district: child.district || "Unknown",
        healthFacility: child.healthFacility || "Unknown",
        status: child.status || "Unknown"
      })) || []
  };

  const isLoading = childrenLoading || screeningsLoading;

  // Update available facilities when district changes
  useEffect(() => {
    if (children && selectedDistrict !== "_all") {
      const facilities = [...new Set(children
        .filter(child => child.district === selectedDistrict)
        .map(child => child.healthFacility)
      )];
      setAvailableFacilities(facilities);
      setSelectedFacility("_all"); // Reset facility selection when district changes
    } else {
      setAvailableFacilities([]);
    }
  }, [selectedDistrict, children]);

  const handleDistrictChange = (value: string) => {
    setSelectedDistrict(value);
    setSelectedStatCard(null);
  };

  const handleFacilityChange = (value: string) => {
    setSelectedFacility(value);
    setSelectedStatCard(null);
  };

  const handleStatCardClick = (statType: string) => {
    if (statType === "children") {
      // Navigate to children list with filters
      const queryParams = new URLSearchParams();
      if (selectedDistrict !== "_all") queryParams.append("district", selectedDistrict);
      if (selectedFacility !== "_all") queryParams.append("healthFacility", selectedFacility);
      
      navigate(`/children${queryParams.toString() ? `?${queryParams.toString()}` : ""}`);
    } else {
    setSelectedStatCard(selectedStatCard === statType ? null : statType);
    setActiveTab("details");
    }
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  // Transform district data for the chart
  const districtData = Object.entries(stats.districtDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Transform status data for the chart
  const statusData = [
        {
          label: "Healthy",
          value: stats.statusDistribution.healthy || 0,
          color: "bg-green-500",
          bgColor: "bg-green-100",
        },
        {
          label: "Monitoring",
          value: stats.statusDistribution.monitoring || 0,
          color: "bg-yellow-500",
          bgColor: "bg-yellow-100",
        },
        {
          label: "Referred",
          value: stats.statusDistribution.referred || 0,
          color: "bg-red-500",
          bgColor: "bg-red-100",
        },
  ];

  const getStatusClass = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-800";
      case "monitoring":
        return "bg-yellow-100 text-yellow-800";
      case "referred":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <PageLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Overview of child health and screenings
                {selectedDistrict !== "_all" && (
                  <> for <span className="font-semibold">{selectedDistrict}</span></>
                )}
                {selectedFacility !== "_all" && (
                  <> at <span className="font-semibold">{selectedFacility}</span></>
                )}
              </p>
            </div>

            <div className="mt-4 md:mt-0 flex items-center gap-2 p-2 bg-gray-50 rounded-md border">
              <div className="flex items-center">
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground mr-2">Filter:</span>
              </div>

              <Select value={selectedDistrict} onValueChange={handleDistrictChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="District" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Districts</SelectItem>
                  {DISTRICTS.map((district) => (
                    <SelectItem key={district} value={district}>
                      {district}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedFacility}
                onValueChange={handleFacilityChange}
                disabled={selectedDistrict === "_all" || availableFacilities.length === 0}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Health Facility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Facilities</SelectItem>
                  {availableFacilities.map((facility) => (
                    <SelectItem key={facility} value={facility}>
                      {facility}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total Children"
              value={stats.totalChildren}
              icon={<Users className="h-6 w-6" />}
              onClick={() => handleStatCardClick("children")}
              isActive={selectedStatCard === "children"}
            />
            <StatsCard
              title="Screenings"
              value={stats.totalScreenings}
              icon={<ClipboardList className="h-6 w-6" />}
              iconColor="text-yellow-500"
              onClick={() => handleStatCardClick("screenings")}
              isActive={selectedStatCard === "screenings"}
            />
            <StatsCard
              title="Referrals"
              value={stats.totalReferrals}
              icon={<BellRing className="h-6 w-6" />}
              iconColor="text-red-500"
              onClick={() => handleStatCardClick("referrals")}
              isActive={selectedStatCard === "referrals"}
            />
            <StatsCard
              title="Assessments"
              value={stats.totalScreenings}
              icon={<Brain className="h-6 w-6" />}
              iconColor="text-purple-500"
              onClick={() => handleStatCardClick("assessments")}
              isActive={selectedStatCard === "assessments"}
            />
          </div>

          {/* Tabs for different views */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Detailed Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-4">
              {/* Enrolled Children per District Chart */}
              <DistrictChart data={districtData} title="Enrolled Children per District" />

              {/* Health Status Chart and Recent Children */}
              <div className="grid gap-6 md:grid-cols-2">
                <StatusChart data={statusData} title="Health Status" />

                <Card>
                  <CardHeader className="border-b">
                    <CardTitle>Recent Children</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {stats.recentChildren.length > 0 ? (
                      stats.recentChildren.map((child) => (
                        <div
                          key={child.id}
                          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-white rounded-lg border shadow-sm"
                        >
                          <div>
                            <h3 className="font-medium">{child.fullName}</h3>
                            <p className="text-sm text-gray-500">ID: {child.childId}</p>
                          </div>
                          <div>
                            <p className="text-sm">
                              <span className="text-gray-500">Facility:</span> {child.healthFacility}
                            </p>
                            <p className="text-sm">
                              <span className="text-gray-500">District:</span> {child.district}
                            </p>
                          </div>
                          <div className="flex justify-end items-center">
                            <Badge className={getStatusClass(child.status || "unknown")}>
                              {(child.status || "unknown").charAt(0).toUpperCase() + (child.status || "unknown").slice(1)}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No recent children records found.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="details" className="mt-4">
              <Card>
                <CardHeader className="border-b">
                  <CardTitle>
                    {selectedStatCard === "children"
                      ? "Children Details"
                      : selectedStatCard === "screenings"
                      ? "Screening Details"
                      : selectedStatCard === "referrals"
                      ? "Referral Details"
                      : selectedStatCard === "assessments"
                      ? "Assessment Details"
                      : "Detailed Reports"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {selectedStatCard ? (
                    <div className="space-y-6">
                      {/* Children Details */}
                      {selectedStatCard === "children" && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Total Children</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-2xl font-bold">{stats.totalChildren}</div>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">By District</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2">
                                  {Object.entries(stats.districtDistribution)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([district, count]) => (
                                      <div key={district} className="flex justify-between items-center">
                                        <span className="text-sm">{district}</span>
                                        <span className="font-medium">{count}</span>
                                      </div>
                                    ))}
                                </div>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">By Status</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2">
                                  {Object.entries(stats.statusDistribution)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([status, count]) => (
                                      <div key={status} className="flex justify-between items-center">
                                        <span className="text-sm capitalize">{status}</span>
                                        <span className="font-medium">{count}</span>
                                      </div>
                                    ))}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                      <Table>
                            <TableHeader>
                          <TableRow>
                                <TableHead>Child ID</TableHead>
                                <TableHead>Full Name</TableHead>
                                <TableHead>District</TableHead>
                                <TableHead>Health Facility</TableHead>
                                <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                              {children?.map((child) => (
                                <TableRow key={child.id}>
                                  <TableCell>{child.childId}</TableCell>
                                  <TableCell>{child.fullName}</TableCell>
                                  <TableCell>{child.district}</TableCell>
                                  <TableCell>{child.healthFacility}</TableCell>
                                  <TableCell>
                                    <Badge className={getStatusClass(child.status || "unknown")}>
                                      {(child.status || "unknown").charAt(0).toUpperCase() + (child.status || "unknown").slice(1)}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {/* Screenings Details */}
                      {selectedStatCard === "screenings" && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Total Screenings</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-2xl font-bold">{stats.totalScreenings}</div>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Referrals Required</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-2xl font-bold">{stats.totalReferrals}</div>
                              </CardContent>
                            </Card>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Child ID</TableHead>
                                <TableHead>Child Name</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Referral Required</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {screenings?.map((screening: ScreeningWithChild) => (
                                <TableRow key={screening.id}>
                                  <TableCell>{screening.childId}</TableCell>
                                  <TableCell>{screening.childName}</TableCell>
                                  <TableCell>{new Date(screening.date).toLocaleDateString()}</TableCell>
                                  <TableCell>
                                    <Badge className={screening.referralRequired ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                                      {screening.referralRequired ? "Yes" : "No"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={getStatusClass(screening.status || "unknown")}>
                                      {(screening.status || "unknown").charAt(0).toUpperCase() + (screening.status || "unknown").slice(1)}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                        </TableBody>
                      </Table>
                    </div>
                      )}

                      {/* Referrals Details */}
                      {selectedStatCard === "referrals" && (
                        <div className="space-y-4">
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold">{stats.totalReferrals}</div>
                            </CardContent>
                          </Card>
                      <Table>
                            <TableHeader>
                          <TableRow>
                                <TableHead>Child ID</TableHead>
                                <TableHead>Child Name</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                              {screenings?.filter((s: ScreeningWithChild) => s.referralRequired).map((screening: ScreeningWithChild) => (
                                <TableRow key={screening.id}>
                                  <TableCell>{screening.childId}</TableCell>
                                  <TableCell>{screening.childName}</TableCell>
                                  <TableCell>{new Date(screening.date).toLocaleDateString()}</TableCell>
                                  <TableCell>{screening.referralReason || "Not specified"}</TableCell>
                                  <TableCell>
                                    <Badge className={getStatusClass(screening.status || "unknown")}>
                                      {(screening.status || "unknown").charAt(0).toUpperCase() + (screening.status || "unknown").slice(1)}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {/* Assessments Details */}
                      {selectedStatCard === "assessments" && (
                        <div className="space-y-4">
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold">{stats.totalScreenings}</div>
                            </CardContent>
                          </Card>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Child ID</TableHead>
                                <TableHead>Child Name</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Assessment Type</TableHead>
                                <TableHead>Result</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {screenings?.map((screening: ScreeningWithChild) => (
                                <TableRow key={screening.id}>
                                  <TableCell>{screening.childId}</TableCell>
                                  <TableCell>{screening.childName}</TableCell>
                                  <TableCell>{new Date(screening.date).toLocaleDateString()}</TableCell>
                                  <TableCell>{screening.assessmentType || "General"}</TableCell>
                                  <TableCell>
                                    <Badge className={getStatusClass(screening.status || "unknown")}>
                                      {(screening.status || "unknown").charAt(0).toUpperCase() + (screening.status || "unknown").slice(1)}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                        </TableBody>
                      </Table>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center p-6">
                      <p className="text-muted-foreground">
                        Click on a statistic card above to view detailed information
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageLayout>
  );
}
