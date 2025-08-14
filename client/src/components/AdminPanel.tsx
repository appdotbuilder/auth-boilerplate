import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { trpc } from '@/utils/trpc';
import { CreateUserForm } from './CreateUserForm';
import { EditUserForm } from './EditUserForm';
import type { PublicUser, PaginationInput } from '../../../server/src/schema';

interface AdminPanelProps {
  onNavigateToDashboard: () => void;
}

export function AdminPanel({ onNavigateToDashboard }: AdminPanelProps) {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUser, setSelectedUser] = useState<PublicUser | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const loadUsers = useCallback(async (page = 1, limit = 10) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const paginationInput: PaginationInput = { page, limit };
      const response = await trpc.admin.getUsers.query(paginationInput);
      
      setUsers(response.users);
      setTotalPages(response.total_pages);
      setTotalUsers(response.total);
      setCurrentPage(response.page);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.is_admin) {
      loadUsers();
    }
  }, [user?.is_admin, loadUsers]);

  const handleDeleteUser = async (userId: number) => {
    try {
      await trpc.admin.deleteUser.mutate({ id: userId });
      await loadUsers(currentPage);
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const handleUserCreated = () => {
    setShowCreateDialog(false);
    loadUsers(currentPage);
  };

  const handleUserUpdated = () => {
    setShowEditDialog(false);
    setSelectedUser(null);
    loadUsers(currentPage);
  };

  const getInitials = (firstName?: string | null, lastName?: string | null, username?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName[0].toUpperCase();
    }
    if (username) {
      return username.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const filteredUsers = users.filter((u: PublicUser) =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.first_name && u.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.last_name && u.last_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!user?.is_admin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access the admin panel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onNavigateToDashboard} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <span className="text-xl font-bold text-gray-900">AppName</span>
              </div>
              <Badge variant="destructive">Admin Panel</Badge>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={onNavigateToDashboard}>
                Dashboard
              </Button>
              
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {getInitials(user.first_name, user.last_name, user.username)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-gray-700">
                  {user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.username}
                </span>
              </div>

              <Button variant="ghost" onClick={logout}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Admin Panel ⚙️
          </h1>
          <p className="text-gray-600">
            Manage users, system settings, and monitor application health.
          </p>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">System Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            {/* User Management Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Users</h2>
                <p className="text-gray-600">Manage user accounts and permissions</p>
              </div>
              
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <span className="mr-2">+</span>
                    Create User
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>
                      Add a new user to the system
                    </DialogDescription>
                  </DialogHeader>
                  <CreateUserForm onSuccess={handleUserCreated} />
                </DialogContent>
              </Dialog>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalUsers}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {users.filter((u: PublicUser) => u.is_active).length}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Admins</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {users.filter((u: PublicUser) => u.is_admin).length}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Verified</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {users.filter((u: PublicUser) => u.email_verified).length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4">
                  <Input
                    placeholder="Search users by name, email, or username..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    className="max-w-md"
                  />
                  <Button variant="outline" onClick={() => loadUsers(currentPage)}>
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                  {isLoading ? 'Loading users...' : `Showing ${filteredUsers.length} of ${totalUsers} users`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
                    {error}
                  </div>
                )}

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            Loading users...
                          </TableCell>
                        </TableRow>
                      ) : filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((u: PublicUser) => (
                          <TableRow key={u.id}>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>
                                    {getInitials(u.first_name, u.last_name, u.username)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">
                                    {u.first_name && u.last_name 
                                      ? `${u.first_name} ${u.last_name}`
                                      : u.username
                                    }
                                  </div>
                                  <div className="text-sm text-gray-600">@{u.username}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                              <div className="flex space-x-1">
                                <Badge variant={u.is_active ? "default" : "secondary"}>
                                  {u.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                                {u.email_verified && (
                                  <Badge variant="outline" className="text-green-600 border-green-600">
                                    Verified
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={u.is_admin ? "destructive" : "secondary"}>
                                {u.is_admin ? 'Admin' : 'User'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {u.created_at.toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setShowEditDialog(true);
                                  }}
                                >
                                  Edit
                                </Button>
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      disabled={u.id === user.id}
                                    >
                                      Delete
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete User</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete {u.username}? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteUser(u.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadUsers(currentPage - 1)}
                        disabled={currentPage <= 1 || isLoading}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadUsers(currentPage + 1)}
                        disabled={currentPage >= totalPages || isLoading}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Edit User Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit User</DialogTitle>
                  <DialogDescription>
                    Update user information and permissions
                  </DialogDescription>
                </DialogHeader>
                {selectedUser && (
                  <EditUserForm
                    user={selectedUser}
                    onSuccess={handleUserUpdated}
                    onCancel={() => {
                      setShowEditDialog(false);
                      setSelectedUser(null);
                    }}
                  />
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Analytics</CardTitle>
                <CardDescription>
                  Overview of system usage and performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📊</div>
                  <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
                  <p className="text-gray-600">
                    Detailed analytics and reporting features will be available here.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Configure application settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">⚙️</div>
                  <h3 className="text-lg font-semibold mb-2">System Configuration</h3>
                  <p className="text-gray-600">
                    System configuration options will be available here.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}