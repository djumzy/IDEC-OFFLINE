import { useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

// Schema for follow-up form
const followUpSchema = z.object({
  trierId: z.number(),
  followUpDate: z.string(),
  observation: z.string().min(1, "Observation is required"),
});

type FollowUpFormValues = z.infer<typeof followUpSchema>;

export default function TierFollowUpsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [selectedTrier, setSelectedTrier] = useState<any>(null);

  // Fetch triers data
  const { data: triers, isLoading: isLoadingTriers } = useQuery({
    queryKey: ["/api/triers"],
    queryFn: async () => {
      const response = await fetch("/api/triers");
      if (!response.ok) throw new Error("Failed to fetch triers");
      return response.json();
    },
  });

  // Create follow-up mutation
  const createFollowUpMutation = useMutation({
    mutationFn: async (data: FollowUpFormValues) => {
      const response = await fetch("/api/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create follow-up");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Follow-up recorded successfully",
      });
      setShowFollowUpDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<FollowUpFormValues>({
    resolver: zodResolver(followUpSchema),
    defaultValues: {
      trierId: 0,
      followUpDate: new Date().toISOString().split("T")[0],
      observation: "",
    },
  });

  const onSubmit = (data: FollowUpFormValues) => {
    createFollowUpMutation.mutate(data);
  };

  const handleAddFollowUp = (trier: any) => {
    setSelectedTrier(trier);
    form.reset({
      trierId: trier.id,
      followUpDate: new Date().toISOString().split("T")[0],
      observation: "",
    });
    setShowFollowUpDialog(true);
  };

  const filteredTriers = triers?.filter((trier: any) =>
    trier.childName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold">TIER Follow-ups</h1>
              <p className="text-muted-foreground mt-1">
                Manage follow-ups for children in TIER programs
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Active TIER Referrals</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by child name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingTriers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Child Name</TableHead>
                        <TableHead>TIER Program</TableHead>
                        <TableHead>Referral Date</TableHead>
                        <TableHead>Last Follow-up</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTriers?.map((trier: any) => (
                        <TableRow key={trier.id}>
                          <TableCell>{trier.childName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{trier.tierType}</Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(trier.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {trier.lastFollowUp
                              ? new Date(trier.lastFollowUp).toLocaleDateString()
                              : "No follow-ups"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddFollowUp(trier)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Follow-up
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Follow-up Dialog */}
      <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Follow-up</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="followUpDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Follow-up Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="observation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observation</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter your observations..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFollowUpDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createFollowUpMutation.isPending}
                >
                  {createFollowUpMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Follow-up"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
} 