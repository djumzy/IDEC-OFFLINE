import { useState, useEffect } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, AlertTriangle } from "lucide-react";
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

// Sample health facility data
const healthFacilities = ["Central Hospital", "District Health Center", "Community Clinic", "Primary Care Unit"];

const screeningFormSchema = insertScreeningSchema.omit({ screenedBy: true });
type ScreeningFormValues = z.infer<typeof screeningFormSchema>;

export default function ScreeningFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [referralRequired, setReferralRequired] = useState(false);
  
  // Fetch child data
  const { data: childData, isLoading: isLoadingChild } = useQuery<Child>({
    queryKey: ["/api/children", id],
    enabled: !!id,
  });
  
  // Fetch previous screenings for this child
  const { data: previousScreenings, isLoading: isLoadingScreenings } = useQuery<Screening[]>({
    queryKey: ["/api/screenings", { childId: id }],
    enabled: !!id,
  });

  const form = useForm<ScreeningFormValues>({
    resolver: zodResolver(screeningFormSchema),
    defaultValues: {
      childId: parseInt(id || "0"),
      date: new Date().toISOString().split("T")[0],
      weight: undefined,
      height: undefined,
      muac: undefined,
      oedema: false,
      appetite: "good",
      symptoms: "",
      heightForAge: ScreeningResult.NORMAL,
      weightForAge: ScreeningResult.NORMAL,
      weightForHeight: ScreeningResult.NORMAL,
      muacResult: ScreeningResult.NORMAL,
      referralRequired: false,
      referralFacility: "",
      referralDate: new Date().toISOString().split("T")[0],
      referralReason: "",
    },
  });

  // Watch for changes to referralRequired field
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "referralRequired") {
        setReferralRequired(value.referralRequired as boolean);
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  // Create screening mutation
  const createScreeningMutation = useMutation({
    mutationFn: async (data: ScreeningFormValues) => {
      const res = await apiRequest("POST", "/api/screenings", {
        ...data,
        screenedBy: user?.id,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/screenings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      toast({
        title: "Success",
        description: "Screening saved successfully",
      });
      navigate("/children");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save screening",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ScreeningFormValues) => {
    createScreeningMutation.mutate(data);
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

  const getResultBadge = (result: string | undefined) => {
    switch (result) {
      case "normal":
        return <Badge className="bg-green-100 text-green-800">Normal</Badge>;
      case "moderate":
        return <Badge className="bg-yellow-100 text-yellow-800">Moderate</Badge>;
      case "severe":
        return <Badge className="bg-red-100 text-red-800">Severe</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <PageLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-neutral-700">Health Screening</h1>
          
          <Card className="mt-4">
            <CardHeader className="border-b">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <CardTitle>Screening Assessment</CardTitle>
                
                {childData && (
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
                      <span className="font-medium text-neutral-500">Age:</span>{" "}
                      <span className="font-bold text-neutral-700">{calculateAge(childData.dateOfBirth)}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <CardContent className="space-y-8 pt-6">
                    {/* Measurements Section */}
                    <div className="space-y-6">
                      <h3 className="text-md font-medium text-neutral-700">Anthropometric Measurements</h3>
                      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        <FormField
                          control={form.control}
                          name="weight"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel>Weight (kg)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.1" 
                                  placeholder="Enter weight" 
                                  {...field}
                                  value={field.value?.toString() || ""}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="height"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel>Height (cm)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.1" 
                                  placeholder="Enter height" 
                                  {...field}
                                  value={field.value?.toString() || ""}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="muac"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel>MUAC (cm)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.1" 
                                  placeholder="Enter MUAC" 
                                  {...field}
                                  value={field.value?.toString() || ""}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Clinical Assessment */}
                    <div className="space-y-6">
                      <h3 className="text-md font-medium text-neutral-700">Clinical Assessment</h3>
                      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        <FormField
                          control={form.control}
                          name="oedema"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-3">
                              <FormLabel>Oedema</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={(value) => field.onChange(value === "true")}
                                  defaultValue={field.value ? "true" : "false"}
                                  className="flex flex-col space-y-1"
                                >
                                  <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="false" />
                                    </FormControl>
                                    <FormLabel className="font-normal">No</FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="true" />
                                    </FormControl>
                                    <FormLabel className="font-normal">Yes</FormLabel>
                                  </FormItem>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="appetite"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-3">
                              <FormLabel>Appetite Test</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  defaultValue={field.value || undefined}
                                  className="flex flex-col space-y-1"
                                >
                                  <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="good" />
                                    </FormControl>
                                    <FormLabel className="font-normal">Good</FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="poor" />
                                    </FormControl>
                                    <FormLabel className="font-normal">Poor</FormLabel>
                                  </FormItem>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="symptoms"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-6">
                              <FormLabel>Symptoms / Observations</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter any symptoms or observations"
                                  rows={3}
                                  {...field}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Results */}
                    <div className="space-y-6">
                      <h3 className="text-md font-medium text-neutral-700">Screening Results</h3>
                      <div className="bg-neutral-50 p-4 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="heightForAge"
                            render={({ field }) => (
                              <FormItem>
                                <div className="p-4 border rounded-lg bg-white">
                                  <div className="flex items-center justify-between mb-2">
                                    <FormLabel className="text-sm font-medium">Height for Age</FormLabel>
                                    {getResultBadge(field.value)}
                                  </div>
                                  <FormControl>
                                    <Select 
                                      value={field.value} 
                                      onValueChange={field.onChange}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select result" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="moderate">Moderate</SelectItem>
                                        <SelectItem value="severe">Severe</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="weightForAge"
                            render={({ field }) => (
                              <FormItem>
                                <div className="p-4 border rounded-lg bg-white">
                                  <div className="flex items-center justify-between mb-2">
                                    <FormLabel className="text-sm font-medium">Weight for Age</FormLabel>
                                    {getResultBadge(field.value)}
                                  </div>
                                  <FormControl>
                                    <Select 
                                      value={field.value} 
                                      onValueChange={field.onChange}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select result" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="moderate">Moderate</SelectItem>
                                        <SelectItem value="severe">Severe</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="muacResult"
                            render={({ field }) => (
                              <FormItem>
                                <div className="p-4 border rounded-lg bg-white">
                                  <div className="flex items-center justify-between mb-2">
                                    <FormLabel className="text-sm font-medium">MUAC Result</FormLabel>
                                    {getResultBadge(field.value)}
                                  </div>
                                  <FormControl>
                                    <Select 
                                      value={field.value} 
                                      onValueChange={field.onChange}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select result" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="moderate">Moderate</SelectItem>
                                        <SelectItem value="severe">Severe</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Referral Section */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-md font-medium text-neutral-700">Referral Decision</h3>
                        <FormField
                          control={form.control}
                          name="referralRequired"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Switch
                                  checked={field.value || false}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel>Referral Required</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {referralRequired && (
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            <h4 className="text-sm font-medium text-yellow-800">
                              Referral Information
                            </h4>
                          </div>
                          
                          <div className="mt-4 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                            <FormField
                              control={form.control}
                              name="referralFacility"
                              render={({ field }) => (
                                <FormItem className="sm:col-span-3">
                                  <FormLabel>Refer To</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Enter health facility name" 
                                      {...field} 
                                      value={field.value || ''}
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
                                <FormItem className="sm:col-span-3">
                                  <FormLabel>Referral Date</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="date" 
                                      {...field}
                                      value={field.value || ''} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="referralReason"
                              render={({ field }) => (
                                <FormItem className="sm:col-span-6">
                                  <FormLabel>Reason for Referral</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Enter reason for referral"
                                      rows={3}
                                      {...field}
                                      value={field.value || ''}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  
                  <CardFooter className="border-t bg-slate-50 px-6 py-4">
                    <div className="flex justify-end gap-4">
                      <Button
                        type="button"
                        variant="outline"
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
                          "Save Assessment"
                        )}
                      </Button>
                    </div>
                  </CardFooter>
                </form>
              </Form>
            )}
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
