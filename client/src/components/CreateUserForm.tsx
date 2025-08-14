import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import type { AdminCreateUserInput } from '../../../server/src/schema';

interface CreateUserFormProps {
  onSuccess: () => void;
}

export function CreateUserForm({ onSuccess }: CreateUserFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<AdminCreateUserInput>({
    email: '',
    username: '',
    password: '',
    first_name: null,
    last_name: null,
    is_admin: false,
    is_active: true,
    email_verified: false
  });

  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate password confirmation
    if (formData.password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      await trpc.admin.createUser.mutate(formData);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create user. Please try again.');
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
          <Label htmlFor="first_name">First Name</Label>
          <Input
            id="first_name"
            type="text"
            placeholder="John"
            value={formData.first_name || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: AdminCreateUserInput) => ({ 
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
            placeholder="Doe"
            value={formData.last_name || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: AdminCreateUserInput) => ({ 
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
          placeholder="johndoe"
          value={formData.username}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: AdminCreateUserInput) => ({ ...prev, username: e.target.value }))
          }
          required
          disabled={isLoading}
          minLength={3}
          maxLength={50}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="john@example.com"
          value={formData.email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: AdminCreateUserInput) => ({ ...prev, email: e.target.value }))
          }
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Create a password"
          value={formData.password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: AdminCreateUserInput) => ({ ...prev, password: e.target.value }))
          }
          required
          disabled={isLoading}
          minLength={8}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Confirm the password"
          value={confirmPassword}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setConfirmPassword(e.target.value)
          }
          required
          disabled={isLoading}
        />
      </div>

      {/* User Settings */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="is_active">Active Account</Label>
            <p className="text-sm text-gray-600">User can sign in and use the application</p>
          </div>
          <Switch
            id="is_active"
            checked={formData.is_active || false}
            onCheckedChange={(checked: boolean) =>
              setFormData((prev: AdminCreateUserInput) => ({ ...prev, is_active: checked }))
            }
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="email_verified">Email Verified</Label>
            <p className="text-sm text-gray-600">Mark email as verified</p>
          </div>
          <Switch
            id="email_verified"
            checked={formData.email_verified || false}
            onCheckedChange={(checked: boolean) =>
              setFormData((prev: AdminCreateUserInput) => ({ ...prev, email_verified: checked }))
            }
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="is_admin">Administrator</Label>
            <p className="text-sm text-gray-600">Grant administrative privileges</p>
          </div>
          <Switch
            id="is_admin"
            checked={formData.is_admin || false}
            onCheckedChange={(checked: boolean) =>
              setFormData((prev: AdminCreateUserInput) => ({ ...prev, is_admin: checked }))
            }
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create User'}
        </Button>
      </div>
    </form>
  );
}