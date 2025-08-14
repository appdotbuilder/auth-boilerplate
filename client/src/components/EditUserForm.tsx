import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState, useEffect } from 'react';
import { trpc } from '@/utils/trpc';
import type { AdminUpdateUserInput, PublicUser } from '../../../server/src/schema';

interface EditUserFormProps {
  user: PublicUser;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EditUserForm({ user, onSuccess, onCancel }: EditUserFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<AdminUpdateUserInput>({
    id: user.id,
    email: user.email,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    is_admin: user.is_admin,
    is_active: user.is_active,
    email_verified: user.email_verified
  });

  // Update form data when user prop changes
  useEffect(() => {
    setFormData({
      id: user.id,
      email: user.email,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      is_admin: user.is_admin,
      is_active: user.is_active,
      email_verified: user.email_verified
    });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await trpc.admin.updateUser.mutate(formData);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to update user. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit_first_name">First Name</Label>
          <Input
            id="edit_first_name"
            type="text"
            placeholder="First name"
            value={formData.first_name || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: AdminUpdateUserInput) => ({ 
                ...prev, 
                first_name: e.target.value || null 
              }))
            }
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit_last_name">Last Name</Label>
          <Input
            id="edit_last_name"
            type="text"
            placeholder="Last name"
            value={formData.last_name || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: AdminUpdateUserInput) => ({ 
                ...prev, 
                last_name: e.target.value || null 
              }))
            }
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit_username">Username</Label>
        <Input
          id="edit_username"
          type="text"
          placeholder="Username"
          value={formData.username || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: AdminUpdateUserInput) => ({ ...prev, username: e.target.value }))
          }
          disabled={isLoading}
          minLength={3}
          maxLength={50}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit_email">Email</Label>
        <Input
          id="edit_email"
          type="email"
          placeholder="Email address"
          value={formData.email || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: AdminUpdateUserInput) => ({ ...prev, email: e.target.value }))
          }
          disabled={isLoading}
        />
      </div>

      {/* User Settings */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="edit_is_active">Active Account</Label>
            <p className="text-sm text-gray-600">User can sign in and use the application</p>
          </div>
          <Switch
            id="edit_is_active"
            checked={formData.is_active || false}
            onCheckedChange={(checked: boolean) =>
              setFormData((prev: AdminUpdateUserInput) => ({ ...prev, is_active: checked }))
            }
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="edit_email_verified">Email Verified</Label>
            <p className="text-sm text-gray-600">Mark email as verified</p>
          </div>
          <Switch
            id="edit_email_verified"
            checked={formData.email_verified || false}
            onCheckedChange={(checked: boolean) =>
              setFormData((prev: AdminUpdateUserInput) => ({ ...prev, email_verified: checked }))
            }
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="edit_is_admin">Administrator</Label>
            <p className="text-sm text-gray-600">Grant administrative privileges</p>
          </div>
          <Switch
            id="edit_is_admin"
            checked={formData.is_admin || false}
            onCheckedChange={(checked: boolean) =>
              setFormData((prev: AdminUpdateUserInput) => ({ ...prev, is_admin: checked }))
            }
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Updating...' : 'Update User'}
        </Button>
      </div>
    </form>
  );
}