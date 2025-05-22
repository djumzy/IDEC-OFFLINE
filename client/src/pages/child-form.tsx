import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertChildSchema, Child } from "@shared/schema";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DISTRICTS } from "@shared/constants";
import { useAuth } from "@/hooks/use-auth";

// Health facilities
const healthFacilities = ["Central Hospital", "District Health Center", "Community Clinic", "Primary Care Unit"];

// Just use the insert schema directly, which now has dateOfBirth as string
const childFormSchema = insertChildSchema.extend({
  // Add any additional validation if needed
  dateOfBirth: z.string({
    required_error: "Date of birth is required",
  }).min(1, "Date of birth is required")
});

type ChildFormValues = z.infer<typeof childFormSchema>;

export default function ChildFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isEditing = !!id;
  
  // Setup form with string-based date handling
  const form = useForm<ChildFormValues>({
    resolver: zodResolver(childFormSchema),
    defaultValues: {
      childId: "",
      fullName: "",
      dateOfBirth: new Date().toISOString().split("T")[0],
      gender: "male",
      district: "",
      healthFacility: "",
      caretakerName: "",
      caretakerContact: "",
      address: "",
      status: "healthy",
      registeredBy: user?.id
    },
  });
  
  // Fetch child data if editing
  const { data: childData, isLoading: isLoadingChild } = useQuery<Child>({
    queryKey: ["/api/children", id],
    enabled: isEditing,
  });
  
  useEffect(() => {
    if (childData && isEditing) {
      // Format dateOfBirth as YYYY-MM-DD string for the form
      let dateString = "";
      
      if (typeof childData.dateOfBirth === 'string') {
        // Try to convert to YYYY-MM-DD format if it's a string (like ISO format)
        try {
          const date = new Date(childData.dateOfBirth);
          dateString = date.toISOString().split('T')[0];
        } catch (e) {
          // If conversion fails, use the original string
          dateString = childData.dateOfBirth;
        }
      }
      
      // Convert null values to empty strings for form fields
      form.reset({
        ...childData,
        dateOfBirth: dateString,
        caretakerContact: childData.caretakerContact || "",
        address: childData.address || "",
        registeredBy: childData.registeredBy || user?.id
      });
    }
  }, [childData, form, isEditing, user?.id]);
  
  // Create mutation with proper error handling
  const createChildMutation = useMutation({
    mutationFn: async (data: ChildFormValues) => {
      if (!user?.id) {
        throw new Error("You must be logged in to register a child");
      }
      
      // Create a copy of data to avoid modifying the original
      const submissionData = { 
        ...data,
        registeredBy: user.id // Ensure registeredBy is set from current user
      };
      
      const res = await apiRequest("POST", "/api/children", submissionData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to register child");
      }
      return await res.json();
    },
    onSuccess: (data: any, variables: ChildFormValues) => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      toast({
        title: "Success",
        description: `Child '${variables.fullName}' registered successfully!`,
        action: (
          <button onClick={() => toast.dismiss()} className="ml-4 px-3 py-1 bg-green-600 text-white rounded">OK</button>
        ),
        duration: 7000, // 7 seconds
      });
      navigate("/children");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to register child",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update mutation with proper error handling
  const updateChildMutation = useMutation({
    mutationFn: async (data: ChildFormValues) => {
      if (!user?.id) {
        throw new Error("You must be logged in to update a child");
      }
      
      // Create a copy of data to avoid modifying the original
      const submissionData = { 
        ...data,
        registeredBy: user.id // Ensure registeredBy is set from current user
      };
      
      const res = await apiRequest("PUT", `/api/children/${id}`, submissionData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update child");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      toast({
        title: "Success",
        description: "Child information updated successfully",
      });
      navigate("/children");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update child information",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: ChildFormValues) => {
    console.log('Current user object:', user); // Debugging line
    if (!user?.id || typeof user.id !== 'number') {
      toast({
        title: "Error",
        description: "You must be logged in as a valid user to register/update a child. Please log in again.",
        variant: "destructive",
      });
      return;
    }
    
    if (isEditing) {
      updateChildMutation.mutate(data);
    } else {
      createChildMutation.mutate(data);
    }
  };
  
  if (isEditing && isLoadingChild) {
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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-neutral-700 mb-6">
            {isEditing ? "Edit Child Information" : "Register New Child"}
          </h1>
          
          <Card>
            <CardHeader>
              <CardTitle>Child Details</CardTitle>
            </CardHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="childId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Child ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter unique child ID" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="district"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>District</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select district" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {DISTRICTS.map((district) => (
                                <SelectItem key={district} value={district}>
                                  {district}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="healthFacility"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Health Facility</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter health facility name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="caretakerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Caretaker Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter caretaker name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="caretakerContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Caretaker Contact</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter caretaker phone number" 
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
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter residential address" 
                            {...field}
                            value={field.value || ""}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                
                <CardFooter className="border-t px-6 py-4 flex justify-between">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate("/children")}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createChildMutation.isPending || updateChildMutation.isPending}
                  >
                    {(createChildMutation.isPending || updateChildMutation.isPending) 
                      ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                      : null}
                    {isEditing ? "Update" : "Register"} Child
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
