import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { trpc } from '@/utils/trpc';
import type { UpdateProfileInput, ChangePasswordInput } from '../../../server/src/schema';

export function ProfileSettings() {
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Profile form state
  const [profileData, setProfileData] = useState<UpdateProfileInput>({
    username: '',
    first_name: null,
    last_name: null,
    email: ''
  });

  // Password form state
  const [passwordData, setPasswordData] = useState<ChangePasswordInput>({
    current_password: '',
    new_password: ''
  });
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Initialize profile data when user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email
      });
    }
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await trpc.updateProfile.mutate(profileData);
      await refreshUser(); // Refresh user data from server
      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate password confirmation
    if (passwordData.new_password !== confirmNewPassword) {
      setError('New passwords do not match');
      return;
    }

    // Validate password strength
    if (passwordData.new_password.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      await trpc.changePassword.mutate(passwordData);
      setSuccess('Password changed successfully!');
      
      // Clear password form
      setPasswordData({
        current_password: '',
        new_password: ''
      });
      setConfirmNewPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to change password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {success && (
        <Alert>
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your personal information and account details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  type="text"
                  value={profileData.first_name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setProfileData((prev: UpdateProfileInput) => ({ 
                      ...prev, 
                      first_name: e.target.value || null 
                    }))
                  }
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  type="text"
                  value={profileData.last_name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setProfileData((prev: UpdateProfileInput) => ({ 
                      ...prev, 
                      last_name: e.target.value || null 
                    }))
                  }
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={profileData.username || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setProfileData((prev: UpdateProfileInput) => ({ 
                    ...prev, 
                    username: e.target.value 
                  }))
                }
                disabled={isLoading}
                minLength={3}
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profileData.email || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setProfileData((prev: UpdateProfileInput) => ({ 
                    ...prev, 
                    email: e.target.value 
                  }))
                }
                disabled={isLoading}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Update Profile'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Account Status */}
      <Card>
        <CardHeader>
          <CardTitle>Account Status</CardTitle>
          <CardDescription>
            Your current account status and verification details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Email Verification</p>
                <p className="text-sm text-gray-600">
                  {user.email_verified 
                    ? 'Your email address is verified'
                    : 'Please verify your email address'
                  }
                </p>
              </div>
              <div>
                {user.email_verified ? (
                  <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    ✓ Verified
                  </div>
                ) : (
                  <Button variant="outline" size="sm">
                    Send Verification
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Account Status</p>
                <p className="text-sm text-gray-600">
                  Your account is currently {user.is_active ? 'active' : 'inactive'}
                </p>
              </div>
              <div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  user.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {user.is_active ? '✓ Active' : '✗ Inactive'}
                </div>
              </div>
            </div>

            {user.is_admin && (
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                <div>
                  <p className="font-medium">Administrator Access</p>
                  <p className="text-sm text-gray-600">
                    You have administrative privileges
                  </p>
                </div>
                <div>
                  <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                    Admin
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">Current Password</Label>
              <Input
                id="current_password"
                type="password"
                value={passwordData.current_password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPasswordData((prev: ChangePasswordInput) => ({ 
                    ...prev, 
                    current_password: e.target.value 
                  }))
                }
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <Input
                id="new_password"
                type="password"
                value={passwordData.new_password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPasswordData((prev: ChangePasswordInput) => ({ 
                    ...prev, 
                    new_password: e.target.value 
                  }))
                }
                disabled={isLoading}
                minLength={8}
                required
              />
              <p className="text-sm text-gray-600">
                Password must be at least 8 characters long
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_new_password">Confirm New Password</Label>
              <Input
                id="confirm_new_password"
                type="password"
                value={confirmNewPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setConfirmNewPassword(e.target.value)
                }
                disabled={isLoading}
                required
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}