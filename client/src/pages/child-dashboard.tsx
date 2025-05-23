import { useState, useEffect } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Child, Screening } from "@shared/schema";
import { Separator } from "@/components/ui/separator";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Loader2, AlertTriangle, User, Calendar, MapPin, Phone, Home, Activity, FilePlus, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

// Function to calculate age from date of birth
const calculateAge = (dateOfBirth: string) => {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  
  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();
  
  if (months < 0 || (months === 0 && now.getDate() < dob.getDate())) {
    years--;
    months += 12;
  }
  
  return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
};

// Function to get badge color for screening result
const getScreeningStatusBadge = (screening: Screening) => {
  if (screening.referralRequired) {
    return <Badge variant="destructive">Referral Required</Badge>;
  }
  return <Badge variant="outline">Normal</Badge>;
};

// Add getResultBadge function
const getResultBadge = (result: string | undefined | null) => {
  if (!result) return <Badge variant="outline">N/A</Badge>;
  
  switch (result.toLowerCase()) {
    case 'normal':
      return <Badge className="bg-green-100 text-green-800">Normal</Badge>;
    case 'moderate':
      return <Badge className="bg-yellow-100 text-yellow-800">Moderate</Badge>;
    case 'severe':
      return <Badge className="bg-red-100 text-red-800">Severe</Badge>;
    default:
      return <Badge variant="outline">{result}</Badge>;
  }
};

function getPassFailBadge(status: string | null | undefined) {
  if (!status || status === "Not recorded") return <Badge variant="outline">Not Tested</Badge>;
  if (status === "pass") return <Badge className="bg-green-100 text-green-800">Pass</Badge>;
  if (status === "fail") return <Badge className="bg-red-100 text-red-800">Fail</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

export default function ChildDashboardPage() {
  const [match, params] = useParams<{ id: string }>();
  const childId = params?.id;
  const [activeTab, setActiveTab] = useState("profile");
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Query to fetch child data
  const { data: childData, isLoading: childLoading, error: childError } = useQuery<Child>({
    queryKey: [`/api/children/${childId}`],
    enabled: !!childId,
  });

  // Query to fetch screenings for this child
  const { data: screenings, isLoading: screeningsLoading, error: screeningsError } = useQuery<Screening[]>({
    queryKey: ["/api/screenings", { childId: parseInt(childId || "0") }],
    enabled: !!childId,
  });

  const isLoading = childLoading || screeningsLoading;
  const error = childError || screeningsError;

  const handleNewScreening = () => {
    if (!childData) return;
    
    toast({
      title: "Opening Screening Form",
      description: "Please wait while we prepare the form...",
    });
    navigate(`/screening/new/${childData.id}`);
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading child data...</span>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="flex items-center text-red-500 mb-4">
            <AlertTriangle className="h-6 w-6 mr-2" />
            <h2 className="text-xl font-semibold">Error Loading Data</h2>
          </div>
          <p className="text-muted-foreground mb-6">
            {error instanceof Error ? error.message : "Failed to load child data"}
          </p>
          <Button asChild>
            <Link href="/children">Return to Children List</Link>
          </Button>
        </div>
      </PageLayout>
    );
  }

  if (!childData) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="flex items-center text-amber-500 mb-4">
            <AlertTriangle className="h-6 w-6 mr-2" />
            <h2 className="text-xl font-semibold">Child Not Found</h2>
          </div>
          <p className="text-muted-foreground mb-6">The requested child could not be found</p>
          <Button asChild>
            <Link href="/children">Return to Children List</Link>
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="p-4 container mx-auto max-w-5xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{childData.fullName}</h1>
            <p className="text-muted-foreground">ID: {childData.childId}</p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={handleNewScreening}
            >
              <Plus className="mr-2 h-4 w-4" /> 
              New Screening
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/children/edit/${childData.id}`}>
                Edit Child
              </Link>
            </Button>
            <Button asChild>
              <Link href="/children">
                Back to List
              </Link>
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Child Profile</TabsTrigger>
            <TabsTrigger value="screenings">Screenings ({screenings?.length || 0})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="font-medium">{childData.fullName}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date of Birth / Age</p>
                      <p className="font-medium">{new Date(childData.dateOfBirth).toLocaleDateString()} ({calculateAge(childData.dateOfBirth)})</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">District</p>
                      <p className="font-medium">{childData.district}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Home className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Health Facility</p>
                      <p className="font-medium">{childData.healthFacility}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Caretaker</p>
                      <p className="font-medium">{childData.caretakerName}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Contact</p>
                      <p className="font-medium">{childData.caretakerContact || "N/A"}</p>
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground mb-1">Address</p>
                    <p className="font-medium">{childData.address || "N/A"}</p>
                  </div>
                  
                  <div className="flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge className={`${
                        childData.status === "healthy" ? "bg-green-500 hover:bg-green-600" : 
                        childData.status === "at-risk" ? "bg-amber-500 hover:bg-amber-600" : 
                        "bg-red-500 hover:bg-red-600"
                      }`}>
                        {childData.status === "healthy" ? "Healthy" : 
                         childData.status === "at-risk" ? "At Risk" : 
                         "Requires Attention"}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Registration Date</p>
                      <p className="font-medium">
                        {childData.createdAt ? new Date(childData.createdAt).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {screenings && screenings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Latest Screening Results</CardTitle>
                  <CardDescription>
                    Last screening on {new Date(screenings[0].date).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Anthropometric Status</p>
                      {getScreeningStatusBadge(screenings[0])}
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Hearing</p>
                      {getPassFailBadge(screenings[0].hearingScreening)}
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Vision</p>
                      {getPassFailBadge(screenings[0].visionScreening)}
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">MDAT-SF (1)</p>
                      {getPassFailBadge(screenings[0].mdatSF1)}
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">MDAT-LF (1)</p>
                      {getPassFailBadge(screenings[0].mdatLF1)}
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Current Age</p>
                      <p className="font-medium">{screenings[0].currentAge || "Not recorded"}</p>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Weight</p>
                      <p className="font-medium">{screenings[0].weight || "N/A"} kg</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Height</p>
                      <p className="font-medium">{screenings[0].height || "N/A"} cm</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">MUAC</p>
                      <p className="font-medium">{screenings[0].muac || "N/A"} cm</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Referral</p>
                      <Badge variant={screenings[0].referralRequired ? "default" : "outline"}>
                        {screenings[0].referralRequired ? "Required" : "Not Required"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" onClick={() => setActiveTab("screenings")}>
                    View All Screenings
                  </Button>
                </CardFooter>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="screenings" className="space-y-4">
            {screenings && screenings.length > 0 ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Latest Screening Results</CardTitle>
                    <CardDescription>
                      Date: {new Date(screenings[0].date).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Anthropometric Measurements</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader className="bg-muted">
                              <TableRow>
                                <TableHead>Measurement</TableHead>
                                <TableHead>Value</TableHead>
                                <TableHead>Result</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell className="font-medium">Height</TableCell>
                                <TableCell>{screenings[0].height && screenings[0].height !== "Not recorded" ? `${screenings[0].height} cm` : "Not recorded"}</TableCell>
                                <TableCell>{getResultBadge(screenings[0].heightForAge)}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">Weight</TableCell>
                                <TableCell>{screenings[0].weight && screenings[0].weight !== "Not recorded" ? `${screenings[0].weight} kg` : "Not recorded"}</TableCell>
                                <TableCell>{getResultBadge(screenings[0].weightForAge)}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">Weight for Height</TableCell>
                                <TableCell>{screenings[0].weightForHeight ? screenings[0].weightForHeight : "-"}</TableCell>
                                <TableCell>{getResultBadge(screenings[0].weightForHeight)}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">MUAC</TableCell>
                                <TableCell>{screenings[0].muac && screenings[0].muac !== "Not recorded" ? `${screenings[0].muac} cm` : "Not recorded"}</TableCell>
                                <TableCell>{getResultBadge(screenings[0].muacResult)}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Developmental Screenings</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader className="bg-muted">
                              <TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>Result</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell className="font-medium">Hearing Screening</TableCell>
                                <TableCell>{getPassFailBadge(screenings[0].hearingScreening)}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">Vision Screening</TableCell>
                                <TableCell>{getPassFailBadge(screenings[0].visionScreening)}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">MDAT-SF (1)</TableCell>
                                <TableCell>{getPassFailBadge(screenings[0].mdatSF1)}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">MDAT-LF (1)</TableCell>
                                <TableCell>{getPassFailBadge(screenings[0].mdatLF1)}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">MDAT-SF (2)</TableCell>
                                <TableCell>{getPassFailBadge(screenings[0].mdatSF2)}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">MDAT-LF (2)</TableCell>
                                <TableCell>{getPassFailBadge(screenings[0].mdatLF2)}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </div>

                    {screenings[0].referralRequired && (
                      <Card className="mt-6">
                        <CardHeader>
                          <CardTitle>Referral Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Referral Required:</span>
                              <Badge variant="default">Yes</Badge>
                            </div>
                            
                            {screenings[0].referralFacility && (
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Facility</p>
                                <p>{screenings[0].referralFacility}</p>
                              </div>
                            )}
                            
                            {screenings[0].referralDate && (
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Date</p>
                                <p>{screenings[0].referralDate}</p>
                              </div>
                            )}
                            
                            {screenings[0].referralReason && (
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Reason</p>
                                <p className="p-3 bg-muted rounded-md">{screenings[0].referralReason}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Screening History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {screenings.map((screening) => (
                          <TableRow key={screening.id}>
                            <TableCell>{new Date(screening.date).toLocaleDateString()}</TableCell>
                            <TableCell>{getScreeningStatusBadge(screening)}</TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/screenings/${screening.id}`}>
                                  View Details
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground mb-4">No screenings recorded yet</p>
                  <Button onClick={handleNewScreening}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Screening
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
