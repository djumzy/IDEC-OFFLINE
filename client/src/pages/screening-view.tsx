import { useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Child, Screening } from "@shared/schema";
import { Separator } from "@/components/ui/separator";
import { Loader2, AlertTriangle, Calendar, User, ClipboardCheck, Ruler, Scale, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Function to get badge color for screening result
const getResultBadge = (result: string | null | undefined) => {
  if (!result) return <Badge variant="outline">N/A</Badge>;
  switch (result.toLowerCase()) {
    case "normal":
      return <Badge className="bg-green-100 text-green-800">Normal</Badge>;
    case "moderate":
      return <Badge className="bg-yellow-100 text-yellow-800">Moderate</Badge>;
    case "severe":
      return <Badge className="bg-red-100 text-red-800">Severe</Badge>;
    default:
      return <Badge variant="outline">{result}</Badge>;
  }
};

const getPassFailBadge = (result: string | null | undefined) => {
  if (!result || result === "Not recorded") return <Badge variant="outline">Not Recorded</Badge>;
  if (result === "pass") return <Badge className="bg-green-100 text-green-800">Pass</Badge>;
  if (result === "fail") return <Badge className="bg-red-100 text-red-800">Fail</Badge>;
  return <Badge variant="outline">{result}</Badge>;
};

export default function ScreeningViewPage() {
  const { id } = useParams();
  const screeningId = parseInt(id || "0");
  
  // Query to fetch screening data
  const { 
    data: screening, 
    isLoading: screeningLoading, 
    error: screeningError 
  } = useQuery<Screening>({
    queryKey: ["/api/screenings", screeningId],
    queryFn: async () => {
      const res = await fetch(`/api/screenings/${screeningId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch screening");
      return res.json();
    },
    enabled: !!id,
  });

  // Query to fetch child data
  const { 
    data: childData,
    isLoading: childLoading,
    error: childError
  } = useQuery<Child>({
    queryKey: [`/api/children/${screening?.childId}`],
    queryFn: async () => {
      const res = await fetch(`/api/children/${screening?.childId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch child data");
      return res.json();
    },
    enabled: !!screening?.childId,
  });

  const isLoading = screeningLoading || childLoading;
  const error = screeningError || childError;

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading screening data...</span>
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
            {error instanceof Error ? error.message : "Failed to load screening data"}
          </p>
          <Button asChild>
            <Link href="/screenings">Return to Screenings List</Link>
          </Button>
        </div>
      </PageLayout>
    );
  }

  if (!screening) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="flex items-center text-amber-500 mb-4">
            <AlertTriangle className="h-6 w-6 mr-2" />
            <h2 className="text-xl font-semibold">Screening Not Found</h2>
          </div>
          <p className="text-muted-foreground mb-6">The requested screening could not be found</p>
          <Button asChild>
            <Link href="/screenings">Return to Screenings List</Link>
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
            <h1 className="text-2xl font-bold">Screening Details</h1>
            <p className="text-muted-foreground">
              Date: {new Date(screening.date).toLocaleDateString()}
            </p>
          </div>
          <div className="flex space-x-2">
            {childData && (
              <Button variant="secondary" asChild>
                <Link href={`/children/${childData.id}`}>
                  View Child Profile
                </Link>
              </Button>
            )}
            <Button asChild>
              <Link href="/screenings">
                Back to List
              </Link>
            </Button>
          </div>
        </div>

        {childData && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Child Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium text-lg">{childData.fullName}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Current Age</p>
                    <p className="font-medium">{screening.currentAge || "Not recorded"}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Activity className="h-4 w-4 mr-2 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Health Facility</p>
                    <p className="font-medium">{childData.healthFacility}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                    <TableCell>{screening.height && screening.height !== "Not recorded" ? `${screening.height} cm` : "Not recorded"}</TableCell>
                    <TableCell>{getResultBadge(screening.heightForAge)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Weight</TableCell>
                    <TableCell>{screening.weight && screening.weight !== "Not recorded" ? `${screening.weight} kg` : "Not recorded"}</TableCell>
                    <TableCell>{getResultBadge(screening.weightForAge)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Weight for Height</TableCell>
                    <TableCell>{screening.weightForHeight ? screening.weightForHeight : "-"}</TableCell>
                    <TableCell>{getResultBadge(screening.weightForHeight)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">MUAC</TableCell>
                    <TableCell>{screening.muac && screening.muac !== "Not recorded" ? `${screening.muac} cm` : "Not recorded"}</TableCell>
                    <TableCell>{getResultBadge(screening.muacResult)}</TableCell>
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
                    <TableCell>{getPassFailBadge(screening.hearingScreening)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Vision Screening</TableCell>
                    <TableCell>{getPassFailBadge(screening.visionScreening)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">MDAT-SF (1)</TableCell>
                    <TableCell>{getPassFailBadge(screening.mdatSF1)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">MDAT-LF (1)</TableCell>
                    <TableCell>{getPassFailBadge(screening.mdatLF1)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">MDAT-SF (2)</TableCell>
                    <TableCell>{getPassFailBadge(screening.mdatSF2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">MDAT-LF (2)</TableCell>
                    <TableCell>{getPassFailBadge(screening.mdatLF2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Referral Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">Referral Required:</span>
                <Badge variant={screening.referralRequired ? "default" : "outline"}>
                  {screening.referralRequired ? "Yes" : "No"}
                </Badge>
              </div>
              
              {screening.referralRequired && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {screening.referralFacility && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Facility</p>
                        <p>{screening.referralFacility}</p>
                      </div>
                    )}
                    
                    {screening.referralDate && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Date</p>
                        <p>{screening.referralDate}</p>
                      </div>
                    )}
                  </div>
                  
                  {screening.referralReason && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Reason</p>
                      <p className="p-3 bg-muted rounded-md">{screening.referralReason}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4 flex justify-end">
            <div className="flex gap-2">
              {childData && (
                <Button variant="outline" asChild>
                  <Link href={`/screening/new/${childData.id}`}>
                    New Screening for This Child
                  </Link>
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>
    </PageLayout>
  );
}