import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Loader2, Pencil, ClipboardList, Trash2, Stethoscope } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DISTRICTS } from "@shared/constants";
import { Child } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Project-specific districts
const districts = [
  "All Districts",
  "Kassanda", 
  "Mubende", 
  "Kyegegwa", 
  "Kikuube", 
  "Kabarole"
];

export default function ChildrenListPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("_all");
  const [filterFacility, setFilterFacility] = useState("_all");
  const [availableFacilities, setAvailableFacilities] = useState<string[]>([]);
  const { toast } = useToast();
  const [childToDelete, setChildToDelete] = useState<number | undefined>(undefined);
  const queryClient = useQueryClient();

  // Initialize filters from URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const district = params.get("district");
    const facility = params.get("healthFacility");
    
    if (district && district !== "_all") setFilterDistrict(district);
    if (facility && facility !== "_all") setFilterFacility(facility);
  }, []);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filterDistrict !== "_all") params.set("district", filterDistrict);
    if (filterFacility !== "_all") params.set("healthFacility", filterFacility);
    
    const newUrl = `/children${params.toString() ? `?${params.toString()}` : ""}`;
    navigate(newUrl, { replace: true });
  }, [filterDistrict, filterFacility, navigate]);

  // Fetch children data with proper query parameters
  const { data: children, isLoading, error } = useQuery<Child[]>({
    queryKey: ["/api/children", { 
      search: searchTerm,
      district: filterDistrict !== "_all" ? filterDistrict : undefined,
      healthFacility: filterFacility !== "_all" ? filterFacility : undefined
    }],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.append("search", searchTerm);
      if (filterDistrict !== "_all") queryParams.append("district", filterDistrict);
      if (filterFacility !== "_all") queryParams.append("healthFacility", filterFacility);

      const url = `/api/children${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch children");
      }

      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchIntervalInBackground: true, // Continue refetching even when tab is not active
  });

  const handleEditChild = (id: number) => {
    navigate(`/children/edit/${id}`);
  };

  const handleScreenChild = (id: number) => {
    navigate(`/children/${id}/screening`);
    toast({
      title: "Child selected for screening",
      description: "Proceeding to screening form...",
    });
  };
  
  const handleViewChild = (id: number) => {
    navigate(`/children/${id}`);
  };

  const handleDeleteChild = async (id: number) => {
    try {
      const response = await fetch(`/api/children/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete child');
      }

      toast({
        title: "Success",
        description: "Child deleted successfully",
      });

      // Invalidate the children query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete child",
        variant: "destructive",
      });
    } finally {
      setChildToDelete(undefined);
    }
  };

  const getStatusBadge = (status: string | undefined | null) => {
    switch (status) {
      case "healthy":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Healthy</Badge>;
      case "monitoring":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Monitoring</Badge>;
      case "referred":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Referred</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const calculateAge = (dateOfBirth: Date | string | undefined) => {
    if (!dateOfBirth) return "N/A";
    
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    return `${years}y ${months}m`;
  };

  if (error) {
    return (
      <PageLayout>
        <div className="flex flex-col justify-center items-center h-full">
          <div className="text-red-500 font-medium mb-2">
            {error instanceof Error ? error.message : "An error occurred while loading data"}
          </div>
          <p className="text-sm text-muted-foreground">
            Please try refreshing the page or logging in again.
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-neutral-700">Children Records</h1>
            <Button asChild>
              <Link to="/children/new">Register New Child</Link>
            </Button>
          </div>
          
          <Card className="mt-4 overflow-hidden">
            <div className="px-4 py-5 border-b border-neutral-100 sm:px-6">
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Search children..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-4">
                  <Select value={filterDistrict} onValueChange={setFilterDistrict}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select District" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">All Districts</SelectItem>
                      {districts.filter(district => district !== "All Districts").map((district) => (
                        <SelectItem key={district} value={district}>
                          {district}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filterFacility}
                    onValueChange={setFilterFacility}
                    disabled={filterDistrict === "_all" || availableFacilities.length === 0}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Health Facility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">All Facilities</SelectItem>
                      {children
                        ?.filter(child => !filterDistrict || child.district === filterDistrict)
                        .map(child => child.healthFacility)
                        .filter((facility, index, self) => facility && self.indexOf(facility) === index)
                        .map(facility => (
                          <SelectItem key={facility} value={facility}>
                            {facility}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>District</TableHead>
                      <TableHead>Health Facility</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {children && children.length > 0 ? (
                      children.map((child) => (
                        <TableRow 
                          key={child.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleViewChild(child.id)}
                        >
                          <TableCell className="font-medium">{child.childId}</TableCell>
                          <TableCell>{child.fullName}</TableCell>
                          <TableCell>{calculateAge(child.dateOfBirth)}</TableCell>
                          <TableCell>{child.gender}</TableCell>
                          <TableCell>{child.district}</TableCell>
                          <TableCell>{child.healthFacility}</TableCell>
                          <TableCell>{getStatusBadge(child.status)}</TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end space-x-2">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={() => handleEditChild(child.id)}
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                              <Button 
                                variant="secondary" 
                                size="icon"
                                onClick={() => handleScreenChild(child.id)}
                              >
                                <Stethoscope className="h-4 w-4" />
                                <span className="sr-only">Screen</span>
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="icon"
                                onClick={() => setChildToDelete(child.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          {isLoading ? "Loading..." : "No children found"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      </div>

      <AlertDialog open={!!childToDelete} onOpenChange={() => setChildToDelete(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the child's record
              and all associated screenings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => childToDelete && handleDeleteChild(childToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
