import { useState, useEffect } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, AlertTriangle, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertScreeningSchema, Child, Screening, ScreeningResult } from "@shared/schema";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const screeningFormSchema = insertScreeningSchema.omit({ screenedBy: true });
type ScreeningFormValues = z.infer<typeof screeningFormSchema>;

interface ChildData {
  id: number;
  childId: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  district: string;
  healthFacility: string;
  caretakerName: string;
  caretakerContact: string | null;
  address: string | null;
  status: string | null;
  registeredBy: number | null;
  createdAt: Date | null;
}

interface ScreeningFormData {
  childId: number;
  date: string;
  weight: string | null;
  height: string | null;
  muac: string | null;
  hearingScreening: string;
  visionScreening: string;
  mdatSF1: string;
  mdatLF1: string;
  mdatSF2: string;
  mdatLF2: string;
  currentAge: string;
  screeningDate: string;
  oedema: boolean;
  appetite: string;
  symptoms: string | null;
  heightForAge: ScreeningResult;
  weightForAge: ScreeningResult;
  weightForHeight: ScreeningResult;
  muacResult: ScreeningResult;
  referralRequired: boolean;
  referralFacility: string | null;
  referralDate: string | null;
  referralReason: string | null;
  screenedBy: number | null;
  tierIIMotor: boolean;
  tierIICST: boolean;
  tierIII: boolean;
}

// Function to get the appropriate badge for screening results
const getResultBadge = (result: string) => {
  if (!result) return null;
  
  switch (result) {
    case ScreeningResult.NORMAL:
      return <Badge className="bg-green-100 text-green-800">Normal</Badge>;
    case ScreeningResult.MODERATE:
      return <Badge className="bg-yellow-100 text-yellow-800">Moderate</Badge>;
    case ScreeningResult.SEVERE:
      return <Badge className="bg-red-100 text-red-800">Severe</Badge>;
    default:
      return <Badge variant="outline">{result}</Badge>;
  }
};

// Add the fetchChild function
const fetchChild = async (id: string): Promise<ChildData> => {
  const response = await fetch(`/api/children/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch child data');
  }
  return response.json();
};

// Update the form field types
interface FormFieldProps {
  value: string | null;
  onChange: (value: string) => void;
  onBlur: () => void;
  name: string;
  ref: (element: HTMLElement | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

// Update the form field render functions
const renderFormField = (field: FormFieldProps) => {
  return {
    ...field,
    value: field.value || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => field.onChange(e.target.value)
  };
};

export default function ScreeningFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [referralRequired, setReferralRequired] = useState(false);
  const [showHearingVision, setShowHearingVision] = useState(false);
  const [showMDAT1, setShowMDAT1] = useState(false);
  const [showMDAT2, setShowMDAT2] = useState(false);
  const [autoReferralTriggered, setAutoReferralTriggered] = useState(false);
  const [showTierReferral, setShowTierReferral] = useState(false);
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  
  // Move the useQuery hook inside the component
  const { data: childData, isLoading: isLoadingChild, error: childError } = useQuery<ChildData>({
    queryKey: ['child', id],
    queryFn: () => fetchChild(id as string),
    enabled: !!id
  });

  // Fetch previous screenings for this child
  const { data: previousScreenings, isLoading: isLoadingScreenings } = useQuery<Screening[]>({
    queryKey: ["/api/screenings", { childId: id }],
    enabled: !!id,
  });

  const form = useForm<ScreeningFormData>({
    defaultValues: {
      childId: parseInt(id || "0"),
      date: new Date().toISOString().split('T')[0],
      weight: '',
      height: '',
      muac: '',
      hearingScreening: "Not tested",
      visionScreening: "Not tested",
      mdatSF1: "Not tested",
      mdatLF1: "Not tested",
      mdatSF2: "Not tested",
      mdatLF2: "Not tested",
      currentAge: '',
      screeningDate: new Date().toISOString().split('T')[0],
      oedema: false,
      appetite: 'good',
      symptoms: '',
      heightForAge: ScreeningResult.NORMAL,
      weightForAge: ScreeningResult.NORMAL,
      weightForHeight: ScreeningResult.NORMAL,
      muacResult: ScreeningResult.NORMAL,
      referralRequired: false,
      referralFacility: '',
      referralDate: '',
      referralReason: '',
      tierIIMotor: false,
      tierIICST: false,
      tierIII: false
    }
  });

  // Function to calculate age in weeks
  const calculateAgeInWeeks = (dateOfBirth: string, screeningDate: string = new Date().toISOString().split("T")[0]) => {
    if (!dateOfBirth) return 0;
    
    try {
      const birthDate = new Date(dateOfBirth);
      const screenDate = new Date(screeningDate);
      const diffTime = Math.abs(screenDate.getTime() - birthDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.floor(diffDays / 7); // Convert days to weeks
    } catch (err) {
      console.error("Error calculating age in weeks:", err);
      return 0;
    }
  };

  // Function to calculate age in months
  const calculateAgeInMonths = (dateOfBirth: string, screeningDate: string = new Date().toISOString().split("T")[0]) => {
    if (!dateOfBirth) return 0;
    
    try {
      const birthDate = new Date(dateOfBirth);
      const screenDate = new Date(screeningDate);
      
      let months = (screenDate.getFullYear() - birthDate.getFullYear()) * 12;
      months += screenDate.getMonth() - birthDate.getMonth();
      
      // Adjust for day of month
      if (screenDate.getDate() < birthDate.getDate()) {
        months--;
      }
      
      return months;
    } catch (err) {
      console.error("Error calculating age in months:", err);
      return 0;
    }
  };

  // Add type guard for childData
  const isChildData = (data: unknown): data is ChildData => {
    return (
      typeof data === 'object' &&
      data !== null &&
      'dateOfBirth' in data &&
      'childId' in data &&
      'fullName' in data
    );
  };

  // Update the updateAssessmentFields function for new age logic
  const updateAssessmentFields = (currentAge: string | null | undefined) => {
    if (!childData || !isChildData(childData)) return;
    const dob = childData.dateOfBirth;
    const screeningDate = form.watch("screeningDate");
    const ageInWeeks = calculateAgeInWeeks(dob, screeningDate);
    const ageInMonths = calculateAgeInMonths(dob, screeningDate);

    // 0-6 weeks: Vision & Hearing only
    setShowHearingVision(ageInWeeks <= 6);
    // 10 weeks to 9 months: MDAT-SF1 & MDAT-LF1
    setShowMDAT1(ageInWeeks >= 10 && ageInMonths < 9);
    // 9 months to 18 months: MDAT-SF1 & MDAT-LF2
    setShowMDAT2(ageInMonths >= 9 && ageInMonths < 18);

    // Update currentAge field with months
    if (!currentAge) {
      form.setValue("currentAge", `${ageInMonths}m`);
    }
  };

  // Update the checkAndTriggerReferral function
  const checkAndTriggerReferral = (fieldName: "mdatLF1" | "mdatLF2" | "mdatSF2", value: string) => {
    if (value === "fail" && !referralRequired && !autoReferralTriggered) {
      setAutoReferralTriggered(true);
      setReferralRequired(true);
      form.setValue("referralRequired", true);
      
      // Pre-fill referral information based on the failed assessment
      let referralType = "";
      if (fieldName === "mdatLF1") {
        referralType = "TIER II Motor (6-12m)";
        setSelectedTiers(["TIER II Motor"]);
      } else if (fieldName === "mdatLF2") {
        referralType = "TIER II Motor (15-36m)";
        setSelectedTiers(["TIER II Motor"]);
      } else if (fieldName === "mdatSF2") {
        referralType = "TIER II CST";
        setSelectedTiers(["TIER II CST"]);
      }
      
      form.setValue("referralReason", `Automatic referral triggered by ${referralType} assessment failure.`);
      
      toast({
        title: "Automatic Referral Created",
        description: `A referral has been automatically created due to ${referralType} failure.`,
        variant: "default",
      });
    }
  };

  // Watch for changes to various fields 
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "referralRequired") {
        setReferralRequired(!!value.referralRequired);
      }
      
      // Check for MDAT-LF failures to trigger referral
      if (name === "mdatLF1" || name === "mdatLF2") {
        if (value[name] === "fail") {
          checkAndTriggerReferral(name as "mdatLF1" | "mdatLF2", value[name] as string);
        }
      }
      
      // Update assessment field visibility when screening date changes
      if (name === "screeningDate" && childData?.dateOfBirth) {
        updateAssessmentFields(value.currentAge as string);
      }

      // Check for MDAT-LF2 failure to show TIER referral UI
      if (name === "mdatLF2") {
        if (value.mdatLF2 === "fail") {
          setShowTierReferral(true);
        } else {
          setShowTierReferral(false);
          setSelectedTiers([]);
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, childData, referralRequired, autoReferralTriggered, showTierReferral, selectedTiers]);
  
  // Update the useEffect for assessment fields
  useEffect(() => {
    if (childData && isChildData(childData)) {
      const currentAge = form.watch("currentAge");
      updateAssessmentFields(currentAge);
    }
  }, [childData, form.watch("screeningDate")]);

  // Update the toast calls
  const showToast = (title: string, description: string, variant: 'default' | 'destructive' = 'default') => {
    toast({
      title,
      description,
      variant
    });
  };

  // Create screening mutation
  const createScreeningMutation = useMutation({
    mutationFn: async (data: ScreeningFormData) => {
      const response = await fetch('/api/screenings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to create screening');
      }
      return response.json();
    },
    onSuccess: (newScreening) => {
      showToast('Success', 'Screening created successfully');
      queryClient.invalidateQueries({ queryKey: ["screenings"] });
      // Navigate to the new screening's view page if id is present
      if (newScreening && newScreening.id != null) {
        navigate(`/screenings/${newScreening.id}`);
      }
    },
    onError: (error: Error) => {
      console.error('Error creating screening:', error);
      showToast('Error', 'Failed to create screening', 'destructive');
    }
  });

  const onSubmit = async (data: ScreeningFormData) => {
    try {
      // Format the data before sending
      const formattedData = {
        ...data,
        weight: data.weight && data.weight !== "Not recorded" ? String(data.weight) : "Not recorded",
        height: data.height && data.height !== "Not recorded" ? String(data.height) : "Not recorded",
        muac: data.muac && data.muac !== "Not recorded" ? String(data.muac) : "Not recorded",
        hearingScreening: data.hearingScreening && data.hearingScreening !== "Not recorded" ? data.hearingScreening : "Not recorded",
        visionScreening: data.visionScreening && data.visionScreening !== "Not recorded" ? data.visionScreening : "Not recorded",
        mdatSF1: data.mdatSF1 && data.mdatSF1 !== "Not recorded" ? data.mdatSF1 : "Not recorded",
        mdatLF1: data.mdatLF1 && data.mdatLF1 !== "Not recorded" ? data.mdatLF1 : "Not recorded",
        mdatSF2: data.mdatSF2 && data.mdatSF2 !== "Not recorded" ? data.mdatSF2 : "Not recorded",
        mdatLF2: data.mdatLF2 && data.mdatLF2 !== "Not recorded" ? data.mdatLF2 : "Not recorded",
        symptoms: data.symptoms && data.symptoms !== "Not recorded" ? data.symptoms : "Not recorded",
        referralFacility: data.referralRequired && data.referralFacility && data.referralFacility !== "Not recorded" ? data.referralFacility : "Not recorded",
        referralDate: data.referralRequired && data.referralDate && data.referralDate !== "Not recorded" ? data.referralDate : "Not recorded",
        referralReason: data.referralRequired && data.referralReason && data.referralReason !== "Not recorded" ? data.referralReason : "Not recorded",
        date: data.date || new Date().toISOString().split('T')[0],
        screenedBy: user?.id || null,
        tierIIMotor: !!data.tierIIMotor,
        tierIICST: !!data.tierIICST,
        tierIII: !!data.tierIII
      };
      await createScreeningMutation.mutateAsync(formattedData);
    } catch (error) {
      console.error('Error submitting screening:', error);
      showToast('Error', 'Failed to submit screening', 'destructive');
    }
  };

  const isLoading = 
    isLoadingChild || 
    isLoadingScreenings || 
    createScreeningMutation.isPending;

  // Calculate age in years and months
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

  // Show loading state
  if (isLoadingChild || isLoadingScreenings) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading screening form...</p>
        </div>
      </PageLayout>
    );
  }

  // Show error state
  if (childError) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
          <AlertTriangle className="h-8 w-8 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
          <p className="text-muted-foreground mb-4">
            {childError instanceof Error ? childError.message : "Failed to load child data"}
          </p>
          <Button onClick={() => navigate(`/children/${id}`)}>
            Return to Child Profile
          </Button>
        </div>
      </PageLayout>
    );
  }

  // Show not found state
  if (!childData) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
          <AlertTriangle className="h-8 w-8 text-amber-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Child Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested child could not be found</p>
          <Button onClick={() => navigate("/children")}>
            Return to Children List
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <h1 className="text-2xl font-semibold text-neutral-700">Health Screening</h1>
          
          <Card className="mt-4">
            <CardHeader className="border-b">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <CardTitle>Screening Assessment</CardTitle>
                
                {childData && isChildData(childData) && (
                  <div className="mt-3 md:mt-0 flex flex-wrap items-center gap-2">
                    <div className="text-sm">
                      <span className="font-medium text-neutral-500">Child ID:</span>{" "}
                      <span className="font-bold text-neutral-700">{childData.childId}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-neutral-500">Name:</span>{" "}
                      <span className="font-bold text-neutral-700">{childData.fullName}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-neutral-500">Date of Birth:</span>{" "}
                      <span className="font-bold text-neutral-700">{new Date(childData.dateOfBirth).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            
            <div className="overflow-x-auto max-h-[80vh] md:max-h-[90vh] scrollbar-thin scrollbar-thumb-gray-300">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="min-w-[350px] md:min-w-0">
                  <CardContent className="space-y-8 pt-6">
                    {/* Anthropometric Measurements Table */}
                    <div className="space-y-6">
                      <h3 className="text-md font-medium text-neutral-700">Anthropometric Measurements</h3>
                      <div className="overflow-x-auto">
                        <Table className="w-full border-collapse">
                          <TableHeader className="bg-primary/10">
                            <TableRow>
                              <TableHead className="border text-center">DOB AGE</TableHead>
                              <TableHead className="border text-center">CURRENT AGE</TableHead>
                              <TableHead className="border text-center">GENDER</TableHead>
                              <TableHead className="border text-center">HEIGHT-CM</TableHead>
                              <TableHead className="border text-center">WEIGHT-KG</TableHead>
                              <TableHead className="border text-center">MUAC-CM</TableHead>
                              <TableHead className="border text-center">TIME ID MEASURE</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="border text-center">{childData && isChildData(childData) ? calculateAge(childData.dateOfBirth) : ""}</TableCell>
                              <TableCell className="border text-center">
                                <FormField
                                  control={form.control}
                                  name="currentAge"
                                  render={({ field }) => (
                                    <Input 
                                      type="text" 
                                      placeholder="Current Age" 
                                      {...field}
                                      value={field.value || ""}
                                      onChange={(e) => {
                                        field.onChange(e.target.value);
                                        updateAssessmentFields(e.target.value);
                                      }}
                                      className="w-20 text-center"
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell className="border text-center">{childData && isChildData(childData) ? childData.gender : ""}</TableCell>
                              <TableCell className="border text-center">
                                <FormField
                                  control={form.control}
                                  name="height"
                                  render={({ field }) => (
                                    <Input 
                                      type="number" 
                                      step="0.1" 
                                      placeholder="Height" 
                                      {...field}
                                      value={field.value ?? ""}
                                      onChange={(e) => field.onChange(e.target.value ? e.target.value : null)}
                                      className="w-20 text-center"
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell className="border text-center">
                                <FormField
                                  control={form.control}
                                  name="weight"
                                  render={({ field }) => (
                                    <Input 
                                      type="number" 
                                      step="0.1" 
                                      placeholder="Weight" 
                                      {...field}
                                      value={field.value ?? ""}
                                      onChange={(e) => field.onChange(e.target.value ? e.target.value : null)}
                                      className="w-20 text-center"
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell className="border text-center">
                                <FormField
                                  control={form.control}
                                  name="muac"
                                  render={({ field }) => (
                                    <Input 
                                      type="number" 
                                      step="0.1" 
                                      placeholder="MUAC" 
                                      {...field}
                                      value={field.value ?? ""}
                                      onChange={(e) => field.onChange(e.target.value ? e.target.value : null)}
                                      className="w-20 text-center"
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell className="border text-center">
                                {new Date().toLocaleTimeString()}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <Separator />
                    
                    {/* Age-specific alerts */}
                    {showHearingVision && (
                      <Alert className="bg-blue-50 border-blue-200">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        <AlertTitle className="text-blue-800">Vision and Hearing Assessment</AlertTitle>
                        <AlertDescription className="text-blue-700">
                          Child is 0-6 weeks old - vision and hearing assessment is recommended.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {showMDAT1 && (
                      <Alert className="bg-indigo-50 border-indigo-200">
                        <AlertCircle className="h-4 w-4 text-indigo-600" />
                        <AlertTitle className="text-indigo-800">MDAT-SF (1) and MDAT-LF (1) Assessment</AlertTitle>
                        <AlertDescription className="text-indigo-700">
                          Child is 6-12 months old - MDAT-SF (1) and MDAT-LF (1) assessment is recommended.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {showMDAT2 && (
                      <Alert className="bg-purple-50 border-purple-200">
                        <AlertCircle className="h-4 w-4 text-purple-600" />
                        <AlertTitle className="text-purple-800">MDAT-SF (2) and MDAT-LF (2) Assessment</AlertTitle>
                        <AlertDescription className="text-purple-700">
                          Child is 15-36 months old - MDAT-SF (2) and MDAT-LF (2) assessment is recommended.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {autoReferralTriggered && (
                      <Alert className="bg-amber-50 border-amber-200">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800">Automatic Referral Generated</AlertTitle>
                        <AlertDescription className="text-amber-700">
                          A referral has been automatically created due to MDAT-LF failure. Please review and complete the referral details below.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {showTierReferral && (
                      <div className="my-4">
                        <Label>TIER Referral (select one or more):</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Button 
                            type="button" 
                            variant={selectedTiers.includes("TIER II Motor") ? "default" : "outline"} 
                            onClick={() => setSelectedTiers(tiers => 
                              tiers.includes("TIER II Motor") 
                                ? tiers.filter(t => t !== "TIER II Motor") 
                                : [...tiers, "TIER II Motor"]
                            )}
                          >
                            TIER II Motor
                          </Button>
                          <Button 
                            type="button" 
                            variant={selectedTiers.includes("TIER II CST") ? "default" : "outline"} 
                            onClick={() => setSelectedTiers(tiers => 
                              tiers.includes("TIER II CST") 
                                ? tiers.filter(t => t !== "TIER II CST") 
                                : [...tiers, "TIER II CST"]
                            )}
                          >
                            TIER II CST
                          </Button>
                          <Button 
                            type="button" 
                            variant={selectedTiers.includes("TIER III") ? "default" : "outline"} 
                            onClick={() => setSelectedTiers(tiers => 
                              tiers.includes("TIER III") 
                                ? tiers.filter(t => t !== "TIER III") 
                                : [...tiers, "TIER III"]
                            )}
                          >
                            TIER III
                          </Button>
                        </div>
                        <FormField
                          control={form.control}
                          name="referralReason"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Referral Reason</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...renderFormField(field)}
                                  placeholder="Enter reason for referral"
                                  value={field.value || `Automatic referral triggered for: ${selectedTiers.join(", ")}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    
                    {/* Additional Screenings */}
                    <div className="space-y-6">
                      <h3 className="text-md font-medium text-neutral-700">Additional Screenings</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Vision and Hearing Screening (0-6 weeks) */}
                        {showHearingVision && (
                          <div className="space-y-4 p-4 rounded-md bg-blue-50 border border-blue-100">
                            <h4 className="font-medium text-blue-800">Vision and Hearing (0-6 weeks)</h4>
                            {/* Hearing Screening */}
                            <div>
                              <Label>Hearing Screening</Label>
                              <FormField
                                control={form.control}
                                name="hearingScreening"
                                render={({ field }) => (
                                  <div className="flex items-center space-x-2 mt-1">
                                    <Select value={field.value || "Not tested"} onValueChange={field.onChange}>
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select result" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Not tested">Not tested</SelectItem>
                                        <SelectItem value="pass">Pass</SelectItem>
                                        <SelectItem value="fail">Fail</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              />
                            </div>
                            {/* Vision Screening */}
                            <div>
                              <Label>Vision Screening</Label>
                              <FormField
                                control={form.control}
                                name="visionScreening"
                                render={({ field }) => (
                                  <div className="flex items-center space-x-2 mt-1">
                                    <Select value={field.value || "Not tested"} onValueChange={field.onChange}>
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select result" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Not tested">Not tested</SelectItem>
                                        <SelectItem value="pass">Pass</SelectItem>
                                        <SelectItem value="fail">Fail</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              />
                            </div>
                          </div>
                        )}
                        {/* MDAT-SF1 & MDAT-LF1 (10 weeks to 9 months) */}
                        {showMDAT1 && (
                          <div className="space-y-4 p-4 rounded-md bg-indigo-50 border border-indigo-100">
                            <h4 className="font-medium text-indigo-800">MDAT Assessment (10w-9m)</h4>
                            {/* MDAT-SF1 */}
                            <div>
                              <Label>MDAT-SF (1)</Label>
                              <FormField
                                control={form.control}
                                name="mdatSF1"
                                render={({ field }) => (
                                  <div className="flex items-center space-x-2 mt-1">
                                    <Select value={field.value || "Not tested"} onValueChange={field.onChange}>
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select result" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Not tested">Not tested</SelectItem>
                                        <SelectItem value="pass">Pass</SelectItem>
                                        <SelectItem value="fail">Fail</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              />
                            </div>
                            {/* MDAT-LF1 */}
                            <div>
                              <Label>MDAT-LF (1)</Label>
                              <FormField
                                control={form.control}
                                name="mdatLF1"
                                render={({ field }) => (
                                  <div className="flex items-center space-x-2 mt-1">
                                    <Select value={field.value || "Not tested"} onValueChange={(value) => {
                                      field.onChange(value);
                                      if (value === "fail") {
                                        checkAndTriggerReferral("mdatLF1", value);
                                        setShowTierReferral(true);
                                        setSelectedTiers(prev => {
                                          const newTiers = [...prev];
                                          if (!newTiers.includes("TIER II Motor")) {
                                            newTiers.push("TIER II Motor");
                                          }
                                          return newTiers;
                                        });
                                      }
                                    }}>
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select result" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Not tested">Not tested</SelectItem>
                                        <SelectItem value="pass">Pass</SelectItem>
                                        <SelectItem value="fail">Fail</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              />
                            </div>
                          </div>
                        )}
                        {/* MDAT-SF1 & MDAT-LF2 (9 to 18 months) */}
                        {showMDAT2 && (
                          <div className="space-y-4 p-4 rounded-md bg-purple-50 border border-purple-100">
                            <h4 className="font-medium text-purple-800">MDAT Assessment (9-18m)</h4>
                            {/* MDAT-SF1 */}
                            <div>
                              <Label>MDAT-SF (1)</Label>
                              <FormField
                                control={form.control}
                                name="mdatSF1"
                                render={({ field }) => (
                                  <div className="flex items-center space-x-2 mt-1">
                                    <Select value={field.value || "Not tested"} onValueChange={field.onChange}>
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select result" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Not tested">Not tested</SelectItem>
                                        <SelectItem value="pass">Pass</SelectItem>
                                        <SelectItem value="fail">Fail</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              />
                            </div>
                            {/* MDAT-LF2 */}
                            <div>
                              <Label>MDAT-LF (2)</Label>
                              <FormField
                                control={form.control}
                                name="mdatLF2"
                                render={({ field }) => (
                                  <div className="flex items-center space-x-2 mt-1">
                                    <Select value={field.value || "Not tested"} onValueChange={(value) => {
                                      field.onChange(value);
                                      if (value === "fail") {
                                        checkAndTriggerReferral("mdatLF2", value);
                                        setShowTierReferral(true);
                                        setSelectedTiers(prev => {
                                          const newTiers = [...prev];
                                          if (!newTiers.includes("TIER II Motor")) {
                                            newTiers.push("TIER II Motor");
                                          }
                                          return newTiers;
                                        });
                                      }
                                    }}>
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select result" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Not tested">Not tested</SelectItem>
                                        <SelectItem value="pass">Pass</SelectItem>
                                        <SelectItem value="fail">Fail</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* TIER Selection Section */}
                    <div className="space-y-6">
                      <h3 className="text-md font-medium text-neutral-700">TIER Referral</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="tierIIMotor"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>TIER II Motor</FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  Refer to TIER II Motor program
                                </p>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="tierIICST"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>TIER II CST</FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  Refer to TIER II CST program
                                </p>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="tierIII"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>TIER III</FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  Refer to TIER III program
                                </p>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Referral Section */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-md font-medium text-neutral-700">Referral</h3>
                        <FormField
                          control={form.control}
                          name="referralRequired"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                <Switch
                                  checked={!!field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Referral Required
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                    
                      {form.watch("referralRequired") && (
                        <div className="bg-slate-50 p-4 rounded-md space-y-4">
                          <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                            <FormField
                              control={form.control}
                              name="referralFacility"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Referral Facility</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Enter health facility name" 
                                      {...field}
                                      value={field.value || ""}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                        
                            <FormField
                              control={form.control}
                              name="referralDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Referral Date</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="date"
                                      {...field}
                                      value={field.value || ""}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        
                          <FormField
                            control={form.control}
                            name="referralReason"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Referral Reason</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...renderFormField(field)}
                                    placeholder="Enter reason for referral"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* Previous Screenings */}
                    {previousScreenings && previousScreenings.length > 0 && (
                      <div className="space-y-6">
                        <h3 className="text-md font-medium text-neutral-700">Previous Screenings</h3>
                        <div className="overflow-x-auto rounded-md border">
                          <Table>
                            <TableHeader className="bg-gray-100">
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Current Age</TableHead>
                                <TableHead>Weight (kg)</TableHead>
                                <TableHead>Height (cm)</TableHead>
                                <TableHead>MUAC (cm)</TableHead>
                                <TableHead>HFA</TableHead>
                                <TableHead>WFA</TableHead>
                                <TableHead>WFH</TableHead>
                                <TableHead>MUAC</TableHead>
                                <TableHead>Referral</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {previousScreenings.map((screening, index) => (
                                <TableRow key={index}>
                                  <TableCell>{new Date(screening.date).toLocaleDateString()}</TableCell>
                                  <TableCell>{screening.currentAge || 'N/A'}</TableCell>
                                  <TableCell>{screening.weight || 'Not recorded'}</TableCell>
                                  <TableCell>{screening.height || 'Not recorded'}</TableCell>
                                  <TableCell>{screening.muac || 'Not recorded'}</TableCell>
                                  <TableCell>{getResultBadge(screening.heightForAge)}</TableCell>
                                  <TableCell>{getResultBadge(screening.weightForAge)}</TableCell>
                                  <TableCell>{getResultBadge(screening.weightForHeight)}</TableCell>
                                  <TableCell>{getResultBadge(screening.muacResult)}</TableCell>
                                  <TableCell>
                                    {screening.referralRequired ? (
                                      <Badge variant="destructive">Required</Badge>
                                    ) : (
                                      <Badge variant="outline">Not Required</Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  
                  <CardFooter className="flex justify-end space-x-4 py-4">
                    <Button 
                      variant="outline" 
                      type="button"
                      onClick={() => navigate("/children")}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createScreeningMutation.isPending}
                    >
                      {createScreeningMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>Save Screening</>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </div>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}