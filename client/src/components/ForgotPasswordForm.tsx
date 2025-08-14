import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import type { ForgotPasswordInput } from '../../../server/src/schema';

interface ForgotPasswordFormProps {
  onNavigateToLogin: () => void;
  onNavigateToLanding: () => void;
}

export function ForgotPasswordForm({ onNavigateToLogin, onNavigateToLanding }: ForgotPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState<ForgotPasswordInput>({
    email: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await trpc.forgotPassword.mutate(formData);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
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
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">Check your email</CardTitle>
              <CardDescription className="text-center">
                We've sent password reset instructions to {formData.email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  If an account with that email exists, you'll receive password reset instructions shortly.
                  Please check your email and follow the link to reset your password.
                </AlertDescription>
              </Alert>

              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setSuccess(false)}
                  className="w-full"
                >
                  Try Again
                </Button>
              </div>

              <div className="text-center">
                <button
                  onClick={onNavigateToLogin}
                  className="text-blue-600 hover:text-blue-500 hover:underline text-sm font-medium"
                >
                  ← Back to Sign In
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Forgot your password?</h1>
          <p className="text-gray-600 mt-2">Enter your email and we'll send you reset instructions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              We'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: ForgotPasswordInput) => ({ ...prev, email: e.target.value }))
                  }
                  required
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={onNavigateToLogin}
                className="text-blue-600 hover:text-blue-500 hover:underline text-sm font-medium"
              >
                ← Back to Sign In
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}