import { useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Pencil, ClipboardList } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Child } from "@shared/schema";

// Uganda districts
const districts = [
  "All Districts",
  // Central Region
  "Buikwe", "Bukomansimbi", "Butambala", "Buvuma", "Gomba", "Kalangala", "Kalungu", 
  "Kampala", "Kayunga", "Kiboga", "Kyankwanzi", "Luwero", "Lwengo", "Lyantonde", 
  "Masaka", "Mityana", "Mpigi", "Mubende", "Mukono", "Nakaseke", "Nakasongola", 
  "Rakai", "Sembabule", "Wakiso",
  
  // Eastern Region
  "Bugiri", "Butaleja", "Butebo", "Buyende", "Budaka", "Bududa", "Bukedea", 
  "Bukwo", "Busia", "Kaberamaido", "Kaliro", "Kapchorwa", "Kibuku", "Kumi", 
  "Luuka", "Manafwa", "Mayuge", "Mbale", "Namayingo", "Namisindwa", "Namutumba", 
  "Ngora", "Pallisa", "Serere", "Sironko", "Soroti", "Tororo",
  
  // Northern Region
  "Abim", "Adjumani", "Agago", "Alebtong", "Amolatar", "Amudat", "Amuru", 
  "Apac", "Arua", "Dokolo", "Gulu", "Kaabong", "Kitgum", "Koboko", "Kole", 
  "Kotido", "Lamwo", "Lira", "Maracha", "Moroto", "Moyo", "Nakapiripirit", 
  "Nwoya", "Otuke", "Oyam", "Pader", "Pakwach", "Yumbe", "Zombo",
  
  // Western Region
  "Buhweju", "Buliisa", "Bundibugyo", "Bunyangabu", "Bushenyi", "Ibanda", 
  "Isingiro", "Kabale", "Kabarole", "Kagadi", "Kakumiro", "Kanungu", "Kasese", 
  "Kibaale", "Kibale", "Kiruhura", "Kiryandongo", "Kisoro", "Kitagwenda", 
  "Kyenjojo", "Masindi", "Mbarara", "Mitooma", "Ntoroko", "Ntungamo", "Rubanda", 
  "Rubirizi", "Rukiga", "Rukungiri", "Sheema"
];
// Sample health facility data
const healthFacilities = ["All Health Facilities", "Central Hospital", "District Health Center", "Community Clinic", "Primary Care Unit"];

export default function ChildrenListPage() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterFacility, setFilterFacility] = useState("");

  // Fetch children data
  const { data: children, isLoading } = useQuery<Child[]>({
    queryKey: ["/api/children", { searchTerm, district: filterDistrict, healthFacility: filterFacility }],
  });

  const handleEditChild = (id: number) => {
    navigate(`/children/${id}/edit`);
  };

  const handleScreenChild = (id: number) => {
    navigate(`/children/${id}/screening`);
  };

  const getStatusBadge = (status: string | undefined) => {
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

  // Format date string to display age in years and months
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

  return (
    <PageLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-neutral-700">Children Records</h1>
            <Button asChild>
              <Link href="/children/new">Register New Child</Link>
            </Button>
          </div>
          
          <Card className="mt-4 overflow-hidden">
            <div className="px-4 py-5 border-b border-neutral-100 sm:px-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
                <div className="w-full md:w-1/3">
                  <Input
                    placeholder="Search by name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-3">
                  <Select value={filterDistrict} onValueChange={setFilterDistrict}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Districts" />
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
                  
                  <Input
                    placeholder="Health Facility..."
                    value={filterFacility}
                    onChange={(e) => setFilterFacility(e.target.value)}
                    className="w-[200px]"
                  />
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
                        <TableRow key={child.id}>
                          <TableCell className="font-medium">{child.childId}</TableCell>
                          <TableCell>{child.fullName}</TableCell>
                          <TableCell>{calculateAge(child.dateOfBirth)}</TableCell>
                          <TableCell>{child.gender}</TableCell>
                          <TableCell>{child.district}</TableCell>
                          <TableCell>{child.healthFacility}</TableCell>
                          <TableCell>{getStatusBadge(child.status)}</TableCell>
                          <TableCell className="text-right">
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
                                <ClipboardList className="h-4 w-4" />
                                <span className="sr-only">Screen</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No children records found. 
                          {searchTerm || filterDistrict || filterFacility ? (
                            <span> Try adjusting your search or filters.</span>
                          ) : (
                            <span> Register a new child to get started.</span>
                          )}
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
    </PageLayout>
  );
}
