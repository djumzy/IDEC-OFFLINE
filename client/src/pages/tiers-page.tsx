import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface TrierChild {
  id: number;
  childId: string;
  fullName: string;
  district: string;
  healthFacility: string;
  status: string;
  referralDate: string;
  referralReason: string;
  lastFollowUp?: string;
  lastObservation?: string;
}

interface FollowUpData {
  childId: number;
  date: string;
  observation: string;
}

export default function TriersPage() {
  const [selectedChild, setSelectedChild] = useState<TrierChild | null>(null);
  const [followUpDate, setFollowUpDate] = useState("");
  const [observation, setObservation] = useState("");
  const queryClient = useQueryClient();

  // Fetch referred children
  const { data: referredChildren, isLoading } = useQuery<TrierChild[]>({
    queryKey: ["referred-children"],
    queryFn: async () => {
      const response = await fetch("/api/children/referred", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch referred children");
      }
      return response.json();
    },
  });

  // Add follow-up mutation
  const addFollowUpMutation = useMutation({
    mutationFn: async (data: FollowUpData) => {
      const response = await fetch("/api/followups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to add follow-up");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referred-children"] });
      setSelectedChild(null);
      setFollowUpDate("");
      setObservation("");
    },
  });

  const handleAddFollowUp = () => {
    if (!selectedChild || !followUpDate || !observation) return;

    addFollowUpMutation.mutate({
      childId: selectedChild.id,
      date: followUpDate,
      observation,
    });
  };

  if (isLoading) {
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-semibold">TRIERS</h1>
              <p className="text-muted-foreground mt-1">
                Track and follow up on referred children
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Referred Children</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Child ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>District</TableHead>
                    <TableHead>Health Facility</TableHead>
                    <TableHead>Referral Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Last Follow-up</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referredChildren?.map((child) => (
                    <TableRow key={child.id}>
                      <TableCell>{child.childId}</TableCell>
                      <TableCell>{child.fullName}</TableCell>
                      <TableCell>{child.district}</TableCell>
                      <TableCell>{child.healthFacility}</TableCell>
                      <TableCell>
                        {format(new Date(child.referralDate), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>{child.referralReason}</TableCell>
                      <TableCell>
                        {child.lastFollowUp ? (
                          <div>
                            <div>{format(new Date(child.lastFollowUp), "MMM d, yyyy")}</div>
                            <div className="text-sm text-muted-foreground">
                              {child.lastObservation}
                            </div>
                          </div>
                        ) : (
                          <Badge variant="outline">No follow-ups</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedChild(child)}
                            >
                              Add Follow-up
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Follow-up</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div>
                                <h4 className="font-medium mb-2">Child Information</h4>
                                <div className="text-sm">
                                  <p>
                                    <span className="text-muted-foreground">Name:</span>{" "}
                                    {selectedChild?.fullName}
                                  </p>
                                  <p>
                                    <span className="text-muted-foreground">ID:</span>{" "}
                                    {selectedChild?.childId}
                                  </p>
                                  <p>
                                    <span className="text-muted-foreground">
                                      Health Facility:
                                    </span>{" "}
                                    {selectedChild?.healthFacility}
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Follow-up Date
                                </label>
                                <Input
                                  type="date"
                                  value={followUpDate}
                                  onChange={(e) => setFollowUpDate(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Observations
                                </label>
                                <Textarea
                                  value={observation}
                                  onChange={(e) => setObservation(e.target.value)}
                                  placeholder="Enter your observations..."
                                  rows={4}
                                />
                              </div>
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedChild(null);
                                    setFollowUpDate("");
                                    setObservation("");
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={handleAddFollowUp}
                                  disabled={!followUpDate || !observation}
                                >
                                  Save Follow-up
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
} 