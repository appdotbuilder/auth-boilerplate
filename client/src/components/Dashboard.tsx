import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from './AuthContext';
import { ProfileSettings } from './ProfileSettings';

interface DashboardProps {
  onNavigateToAdmin?: () => void;
}

export function Dashboard({ onNavigateToAdmin }: DashboardProps) {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

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

  const getDisplayName = () => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user.first_name) {
      return user.first_name;
    }
    return user.username;
  };

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
              <Badge variant="secondary">Dashboard</Badge>
            </div>

            <div className="flex items-center space-x-4">
              {user.is_admin && onNavigateToAdmin && (
                <Button variant="outline" onClick={onNavigateToAdmin}>
                  Admin Panel
                </Button>
              )}
              
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {getInitials(user.first_name, user.last_name, user.username)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-gray-700">
                  {getDisplayName()}
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
            Welcome back, {user.first_name || user.username}! 👋
          </h1>
          <p className="text-gray-600">
            Manage your account and explore all the features available to you.
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="profile">Profile Settings</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Welcome Card */}
            <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Account Status</span>
                  {user.email_verified ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      ✓ Verified
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      ⚠ Unverified
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-blue-100">
                  Your account is {user.is_active ? 'active' : 'inactive'} and 
                  {user.email_verified ? ' verified' : ' pending email verification'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-blue-100">Member since</p>
                    <p className="font-semibold">
                      {user.created_at.toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-100">Last login</p>
                    <p className="font-semibold">
                      {user.last_login ? user.last_login.toLocaleDateString() : 'First time'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <span className="mr-2">👤</span>
                    Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Username:</span>
                      <span className="font-medium">{user.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium truncate">{user.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">
                        {user.first_name && user.last_name 
                          ? `${user.first_name} ${user.last_name}`
                          : user.first_name || 'Not set'
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <span className="mr-2">🔒</span>
                    Security
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Email Verified</span>
                      {user.email_verified ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          ✓ Yes
                        </Badge>
                      ) : (
                        <Badge variant="destructive">✗ No</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Account Status</span>
                      {user.is_active ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    {user.is_admin && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Role</span>
                        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                          Administrator
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <span className="mr-2">📊</span>
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.floor((Date.now() - user.created_at.getTime()) / (1000 * 60 * 60 * 24))}
                      </div>
                      <div className="text-sm text-gray-600">Days as member</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">100%</div>
                      <div className="text-sm text-gray-600">Profile completion</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Frequently used features and settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button variant="outline" className="justify-start">
                    <span className="mr-2">✏️</span>
                    Edit Profile
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <span className="mr-2">🔑</span>
                    Change Password
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <span className="mr-2">📧</span>
                    Email Settings
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <span className="mr-2">🔔</span>
                    Notifications
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <ProfileSettings />
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Your recent account activity and changes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm">👋</span>
                    </div>
                    <div>
                      <p className="font-medium">Account created</p>
                      <p className="text-sm text-gray-600">
                        {user.created_at.toLocaleDateString()} at {user.created_at.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  
                  {user.last_login && (
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm">🔐</span>
                      </div>
                      <div>
                        <p className="font-medium">Last login</p>
                        <p className="text-sm text-gray-600">
                          {user.last_login.toLocaleDateString()} at {user.last_login.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 text-sm">📝</span>
                    </div>
                    <div>
                      <p className="font-medium">Profile updated</p>
                      <p className="text-sm text-gray-600">
                        {user.updated_at.toLocaleDateString()} at {user.updated_at.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}