import { useEffect } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertChildSchema, Child } from "@shared/schema";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Uganda districts data
const districts = [
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

const childFormSchema = insertChildSchema.omit({ createdBy: true });
type ChildFormValues = z.infer<typeof childFormSchema>;

export default function ChildFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditMode = !!id;

  // Fetch child data if in edit mode
  const { data: childData, isLoading: isLoadingChild } = useQuery<Child>({
    queryKey: ["/api/children", id],
    enabled: isEditMode,
  });

  const form = useForm<ChildFormValues>({
    resolver: zodResolver(childFormSchema),
    defaultValues: {
      childId: "",
      fullName: "",
      dateOfBirth: new Date().toISOString().split("T")[0],
      gender: "",
      district: "",
      healthFacility: "",
      caretakerName: "",
      contactNumber: "",
      address: "",
      status: "healthy",
    },
  });

  // Update form with child data when it's loaded
  useEffect(() => {
    if (childData) {
      // Format date to YYYY-MM-DD for date input
      const formattedDate = typeof childData.dateOfBirth === "string"
        ? new Date(childData.dateOfBirth).toISOString().split("T")[0]
        : "";

      form.reset({
        ...childData,
        dateOfBirth: formattedDate,
      });
    }
  }, [childData, form]);

  // Create child mutation
  const createChildMutation = useMutation({
    mutationFn: async (data: ChildFormValues) => {
      const res = await apiRequest("POST", "/api/children", {
        ...data,
        createdBy: user?.id,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      toast({
        title: "Success",
        description: "Child registered successfully",
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

  // Update child mutation
  const updateChildMutation = useMutation({
    mutationFn: async (data: ChildFormValues) => {
      const res = await apiRequest("PUT", `/api/children/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      queryClient.invalidateQueries({ queryKey: ["/api/children", id] });
      toast({
        title: "Success",
        description: "Child information updated successfully",
      });
      navigate("/children");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update child",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ChildFormValues) => {
    if (isEditMode) {
      updateChildMutation.mutate(data);
    } else {
      createChildMutation.mutate(data);
    }
  };

  const isLoading = 
    isLoadingChild || 
    createChildMutation.isPending || 
    updateChildMutation.isPending;

  return (
    <PageLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-neutral-700">
            {isEditMode ? "Edit Child Information" : "Register New Child"}
          </h1>
          
          <Card className="mt-4">
            <CardHeader className="border-b">
              <CardTitle>Child Information</CardTitle>
            </CardHeader>
            
            {isLoadingChild ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                      <FormField
                        control={form.control}
                        name="childId"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel>Child ID</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="CH-XXX" 
                                {...field} 
                                disabled={isEditMode} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-4">
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter child's full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dateOfBirth"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel>Date of Birth</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
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
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="district"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-2">
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
                                {districts.map(district => (
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
                          <FormItem className="sm:col-span-6">
                            <FormLabel>Health Facility</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter health facility name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="caretakerName"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-3">
                            <FormLabel>Caretaker Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter caretaker's name" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="contactNumber"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-3">
                            <FormLabel>Contact</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter contact" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem className="sm:col-span-6">
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter address" 
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
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {isEditMode ? "Updating..." : "Saving..."}
                          </>
                        ) : (
                          <>{isEditMode ? "Update" : "Save"}</>
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
