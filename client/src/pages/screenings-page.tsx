import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Search, Eye, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DISTRICTS } from "@shared/constants";
import { Child, Screening } from "@shared/schema";
import { useAuth } from "@/lib/authService";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface ScreeningWithChild extends Screening {
  childName: string;
  status: string;
  assessmentType: string;
  healthFacility?: string;
}

export default function ScreeningsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("_all");
  const [facilityInput, setFacilityInput] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("_all");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showChildSelect, setShowChildSelect] = useState(false);
  const [childSearchTerm, setChildSearchTerm] = useState("");
  
  // Fetch screenings data
  const { data: screenings, isLoading: screeningsLoading, error: screeningsError } = useQuery<Screening[]>({
    queryKey: ["screenings", { 
      district: selectedDistrict !== "_all" ? selectedDistrict : undefined,
      healthFacility: facilityInput.trim() ? facilityInput.trim() : undefined
    }],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (selectedDistrict !== "_all") queryParams.append("district", selectedDistrict);
      if (facilityInput.trim()) queryParams.append("healthFacility", facilityInput.trim());

      const url = `/api/screenings${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch screenings");
      }

      return response.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchIntervalInBackground: true, // Continue refetching even when tab is not active
  });

  // Fetch children data
  const { data: children, isLoading: childrenLoading, error: childrenError } = useQuery<Child[]>({
    queryKey: ["children", { 
      district: selectedDistrict !== "_all" ? selectedDistrict : undefined,
      healthFacility: facilityInput.trim() ? facilityInput.trim() : undefined
    }],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (selectedDistrict !== "_all") queryParams.append("district", selectedDistrict);
      if (facilityInput.trim()) queryParams.append("healthFacility", facilityInput.trim());

      const url = `/api/children${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch children");
      }

      return response.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchIntervalInBackground: true, // Continue refetching even when tab is not active
  });

  const isLoading = screeningsLoading || childrenLoading;
  
  // Combine screenings with child information
  const screeningsWithChildren: ScreeningWithChild[] = screenings?.map(screening => {
    const child = children?.find(c => c.id === screening.childId);
    return {
      ...screening,
      childName: child?.fullName || "Unknown",
      status: child?.status || "unknown",
      assessmentType: screening.referralRequired ? "Referral" : "General",
      healthFacility: child?.healthFacility || ""
    };
  }) || [];
  
  // Filter screenings based on search term, status, and health facility
  const filteredScreenings = screeningsWithChildren.filter(screening => {
    const matchesSearch =
      screening.childName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      screening.childId.toString().includes(searchTerm);
    const matchesStatus = selectedStatus === "_all" || screening.status === selectedStatus;
    const matchesFacility = facilityInput.trim() === "" || (screening.childName && screening.childName.toLowerCase().includes(facilityInput.toLowerCase())) || (screening.healthFacility && screening.healthFacility.toLowerCase().includes(facilityInput.toLowerCase()));
    return matchesSearch && matchesStatus && matchesFacility;
  });

  // Filter children based on search term
  const filteredChildren = children?.filter(child => 
    child.fullName.toLowerCase().includes(childSearchTerm.toLowerCase()) ||
    child.childId.toLowerCase().includes(childSearchTerm.toLowerCase())
  ) || [];

  // Update available facilities when district changes
  const handleDistrictChange = (value: string) => {
    setSelectedDistrict(value);
    setFacilityInput("");
    setSearchTerm("");
    if (children && value !== "_all") {
      const facilities = [...new Set(children
        .filter(child => child.district === value)
        .map(child => child.healthFacility)
      )];
    } else {
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this screening? This action cannot be undone.")) {
      return;
    }
    setDeletingId(id);
    try {
      const response = await fetch(`/api/screenings/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to delete screening");
      }
      toast({
        title: "Success",
        description: "Screening deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["screenings"] });
      queryClient.invalidateQueries({ queryKey: ["children"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete screening",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

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

  if (!isAuthenticated) {
    return (
      <PageLayout>
        <Alert variant="destructive">
          <AlertDescription>
            Please log in to view screenings
          </AlertDescription>
        </Alert>
      </PageLayout>
    );
  }

  if (screeningsError || childrenError) {
    return (
      <PageLayout>
        <Alert variant="destructive">
          <AlertDescription>
            {screeningsError ? "Failed to load screenings" : "Failed to load children data"}
          </AlertDescription>
        </Alert>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold">Health Screenings</h1>
              <p className="text-muted-foreground mt-1">
                View and manage child health screenings
              </p>
            </div>
            <Button
              onClick={() => setShowChildSelect(true)}
              className="mt-4 md:mt-0"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Screening
            </Button>
          </div>

          {/* Child Selection Dialog */}
          <Dialog open={showChildSelect} onOpenChange={setShowChildSelect}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Select Child for New Screening</DialogTitle>
                <DialogDescription>
                  Search and select a child to create a new screening
                </DialogDescription>
              </DialogHeader>
              
              <div className="mt-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by child name or ID..."
                    value={childSearchTerm}
                    onChange={(e) => setChildSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                
                <div className="mt-4 max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Child ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredChildren.length > 0 ? (
                        filteredChildren.map((child) => (
                          <TableRow key={child.id}>
                            <TableCell>{child.childId}</TableCell>
                            <TableCell>{child.fullName}</TableCell>
                            <TableCell>
                              {new Date().getFullYear() - new Date(child.dateOfBirth).getFullYear()} years
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  navigate(`/screening/new/${child.id}`);
                                  setShowChildSelect(false);
                                }}
                              >
                                Select
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            {childSearchTerm
                              ? "No children match your search"
                              : "No children found"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by child name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={selectedDistrict} onValueChange={handleDistrictChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select District" />
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
            <Input
              placeholder="Type health facility name..."
              value={facilityInput}
              onChange={e => setFacilityInput(e.target.value)}
              className="w-[180px]"
            />
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Statuses</SelectItem>
                <SelectItem value="healthy">Healthy</SelectItem>
                <SelectItem value="monitoring">Monitoring</SelectItem>
                <SelectItem value="referred">Referred</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Table */}
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="bg-white rounded-lg border shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Child ID</TableHead>
                    <TableHead>Child Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Assessment Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Referral Required</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredScreenings.length > 0 ? (
                    filteredScreenings.map((screening) => (
                      <TableRow key={screening.id}>
                        <TableCell>{screening.childId}</TableCell>
                        <TableCell>{screening.childName}</TableCell>
                        <TableCell>{new Date(screening.date).toLocaleDateString()}</TableCell>
                        <TableCell>{screening.assessmentType}</TableCell>
                        <TableCell>
                          <Badge className={getStatusClass(screening.status)}>
                            {screening.status.charAt(0).toUpperCase() + screening.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={screening.referralRequired ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                            {screening.referralRequired ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/screenings/${screening.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => handleDelete(screening.id)}
                              disabled={deletingId === screening.id}
                              className="hover:bg-red-600 focus:ring-2 focus:ring-red-400"
                            >
                              {deletingId === screening.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {searchTerm || selectedStatus !== "_all" || selectedDistrict !== "_all" || facilityInput !== ""
                          ? "No screenings match your search criteria"
                          : "No screenings found"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
