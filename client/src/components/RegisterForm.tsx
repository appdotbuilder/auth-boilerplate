import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState } from 'react';
import { useAuth } from './AuthContext';
import type { RegisterInput } from '../../../server/src/schema';

interface RegisterFormProps {
  onNavigateToLogin: () => void;
  onNavigateToLanding: () => void;
}

export function RegisterForm({ onNavigateToLogin, onNavigateToLanding }: RegisterFormProps) {
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<RegisterInput>({
    email: '',
    username: '',
    password: '',
    first_name: null,
    last_name: null
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
      await register(formData);
      // Navigation will be handled by App component based on auth state
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <button 
            onClick={onNavigateToLanding}
            className="flex items-center space-x-2 mx-auto mb-6 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-xl font-bold text-gray-900">AppName</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-600 mt-2">Join us and start your journey today</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>
              Create a new account to access all features
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                      setFormData((prev: RegisterInput) => ({ 
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
                      setFormData((prev: RegisterInput) => ({ 
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
                    setFormData((prev: RegisterInput) => ({ ...prev, username: e.target.value }))
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
                    setFormData((prev: RegisterInput) => ({ ...prev, email: e.target.value }))
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
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: RegisterInput) => ({ ...prev, password: e.target.value }))
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
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setConfirmPassword(e.target.value)
                  }
                  required
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  onClick={onNavigateToLogin}
                  className="text-blue-600 hover:text-blue-500 hover:underline font-medium"
                >
                  Sign in here
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}