import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Plus, Trash2, UserPlus, Eye, Pencil } from "lucide-react";
import { DISTRICTS } from "@shared/constants";
import { useLocation } from "wouter";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface User {
  id: number;
  username: string;
  fullName: string;
  role: "admin" | "vht";
  district: string;
  healthFacility: string;
  status: "active" | "inactive" | "pending";
  email?: string;
  phoneNumber?: string;
  createdAt?: string;
  lastLogin?: string;
  mobilePhone?: string;
}

export default function UserManagementPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    fullName: "",
    role: "vht",
    district: "",
    healthFacility: "",
  });

  // Redirect if not admin
  if (user?.role !== "admin") {
    setLocation("/dashboard");
    return null;
  }

  // Fetch users
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      return response.json();
    },
  });

  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to add user");
      }
      
      return data;
    },
    onSuccess: (data) => {
      // Update the users list immediately with the new user
      queryClient.setQueryData<User[]>(["/api/users"], (oldData) => {
        if (!oldData) return [data];
        return [...oldData, data];
      });
      
      // Then invalidate to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      
      setIsAddUserOpen(false);
      setNewUser({
        username: "",
        password: "",
        fullName: "",
        role: "vht",
        district: "",
        healthFacility: "",
      });
      
      toast({
        title: "Success",
        description: "User added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete user");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    addUserMutation.mutate(newUser);
  };

  const handleDeleteUser = (user: User) => {
    // Don't allow deletion of default admin user
    if (user.id === 1) {
      toast({
        title: "Cannot Delete",
        description: "The default admin user cannot be deleted",
        variant: "destructive",
      });
      return;
    }
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setIsDetailsOpen(true);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-purple-100 text-purple-800">Admin</Badge>;
      case "vht":
        return <Badge className="bg-blue-100 text-blue-800">VHT</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "inactive":
        return <Badge className="bg-red-100 text-red-800">Inactive</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">User Management</h1>
          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
                </Button>
              </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                </DialogHeader>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                              <Input 
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                      />
                    </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={newUser.fullName}
                    onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                    required
                      />
                    </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value) => setNewUser({ ...newUser, role: value as "admin" | "vht" })}
                  >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="vht">VHT</SelectItem>
                              </SelectContent>
                            </Select>
                    </div>
                <div className="space-y-2">
                  <Label htmlFor="district">District</Label>
                  <Select
                    value={newUser.district}
                    onValueChange={(value) => setNewUser({ ...newUser, district: value })}
                  >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select district" />
                                </SelectTrigger>
                    <SelectContent>
                      {DISTRICTS.map((district) => (
                                  <SelectItem key={district} value={district}>
                                    {district}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="healthFacility">Health Facility</Label>
                              <Input 
                    id="healthFacility"
                    value={newUser.healthFacility}
                    onChange={(e) => setNewUser({ ...newUser, healthFacility: e.target.value })}
                    required
                      />
                    </div>
                <Button type="submit" className="w-full" disabled={addUserMutation.isPending}>
                  {addUserMutation.isPending ? (
                    <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding User...
                    </>
                  ) : (
                    "Add User"
                        )}
                      </Button>
                  </form>
              </DialogContent>
            </Dialog>
          </div>
          
        <Card>
          <CardHeader>
            <CardTitle>Registered Users</CardTitle>
          </CardHeader>
          <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>District</TableHead>
                      <TableHead>Health Facility</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {user.fullName?.substring(0, 2).toUpperCase() || user.username?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.fullName}</TableCell>
                        <TableCell>{user.mobilePhone || 'N/A'}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{user.district || (user.role === "admin" ? "All" : "-")}</TableCell>
                        <TableCell>{user.healthFacility || (user.role === "admin" ? "All" : "-")}</TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handleViewDetails(user)}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
          </CardContent>
          </Card>
          
        {/* User Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent>
              <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Username</Label>
                    <p className="text-sm">{selectedUser.username}</p>
                  </div>
                  <div>
                    <Label>Full Name</Label>
                    <p className="text-sm">{selectedUser.fullName}</p>
                  </div>
                  <div>
                    <Label>Role</Label>
                    <p className="text-sm">{getRoleBadge(selectedUser.role)}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <p className="text-sm">{getStatusBadge(selectedUser.status)}</p>
                  </div>
                  <div>
                    <Label>District</Label>
                    <p className="text-sm">{selectedUser.district}</p>
                  </div>
                  <div>
                    <Label>Health Facility</Label>
                    <p className="text-sm">{selectedUser.healthFacility}</p>
                  </div>
                  {selectedUser.email && (
                    <div>
                      <Label>Email</Label>
                      <p className="text-sm">{selectedUser.email}</p>
                    </div>
                  )}
                  {selectedUser.phoneNumber && (
                    <div>
                      <Label>Phone Number</Label>
                      <p className="text-sm">{selectedUser.phoneNumber}</p>
                    </div>
                  )}
                  {selectedUser.createdAt && (
                    <div>
                      <Label>Created At</Label>
                      <p className="text-sm">{new Date(selectedUser.createdAt).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedUser.lastLogin && (
                    <div>
                      <Label>Last Login</Label>
                      <p className="text-sm">{new Date(selectedUser.lastLogin).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete {userToDelete?.fullName}? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setUserToDelete(null);
                }}
                    >
                      Cancel
                    </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteUserMutation.isPending}
              >
                {deleteUserMutation.isPending ? (
                  <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                      )}
                    </Button>
            </div>
            </DialogContent>
          </Dialog>
      </div>
    </PageLayout>
  );
}
