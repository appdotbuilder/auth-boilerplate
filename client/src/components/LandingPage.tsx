import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface LandingPageProps {
  onNavigateToLogin: () => void;
  onNavigateToRegister: () => void;
}

export function LandingPage({ onNavigateToLogin, onNavigateToRegister }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-xl font-bold text-gray-900">AppName</span>
          </div>
          <div className="space-x-4">
            <Button variant="ghost" onClick={onNavigateToLogin}>
              Sign In
            </Button>
            <Button onClick={onNavigateToRegister}>
              Get Started
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <Badge className="mb-4" variant="secondary">
            🚀 New Application Boilerplate
          </Badge>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Your Complete Web Application
            <span className="text-blue-600"> Solution</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            A modern, secure, and scalable web application boilerplate with authentication, 
            user management, and administrative features built with the latest technologies.
          </p>
          <div className="space-x-4">
            <Button size="lg" onClick={onNavigateToRegister}>
              Start Your Journey
            </Button>
            <Button size="lg" variant="outline" onClick={onNavigateToLogin}>
              Sign In to Continue
            </Button>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Everything You Need to Get Started
          </h2>
          <p className="text-lg text-gray-600">
            Built with modern technologies and best practices for security and scalability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🔐</span>
              </div>
              <CardTitle>Secure Authentication</CardTitle>
              <CardDescription>
                JWT-based authentication with login, registration, and password reset functionality.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Email verification</li>
                <li>• Password recovery</li>
                <li>• Session management</li>
                <li>• Secure token storage</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">👤</span>
              </div>
              <CardTitle>User Dashboard</CardTitle>
              <CardDescription>
                Personalized dashboard for authenticated users with profile management.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Profile editing</li>
                <li>• Password changes</li>
                <li>• Account settings</li>
                <li>• Activity tracking</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">⚙️</span>
              </div>
              <CardTitle>Admin Panel</CardTitle>
              <CardDescription>
                Comprehensive administrative interface for user and system management.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• User management (CRUD)</li>
                <li>• Permissions control</li>
                <li>• System analytics</li>
                <li>• Bulk operations</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <CardTitle>Modern Stack</CardTitle>
              <CardDescription>
                Built with cutting-edge technologies for optimal performance and developer experience.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• React & TypeScript</li>
                <li>• tRPC for type safety</li>
                <li>• Tailwind CSS</li>
                <li>• Radix UI components</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🔒</span>
              </div>
              <CardTitle>Security First</CardTitle>
              <CardDescription>
                Enterprise-grade security features to protect your application and users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Password hashing</li>
                <li>• CSRF protection</li>
                <li>• Input validation</li>
                <li>• Secure headers</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📱</span>
              </div>
              <CardTitle>Responsive Design</CardTitle>
              <CardDescription>
                Fully responsive interface that works seamlessly across all devices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Mobile-first approach</li>
                <li>• Tablet optimization</li>
                <li>• Desktop experience</li>
                <li>• Accessibility features</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Build Something Amazing?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of developers who trust our boilerplate for their next project.
          </p>
          <div className="space-x-4">
            <Button size="lg" variant="secondary" onClick={onNavigateToRegister}>
              Create Account
            </Button>
            <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-blue-600" onClick={onNavigateToLogin}>
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <span className="text-xl font-bold">AppName</span>
              </div>
              <p className="text-gray-400 text-sm">
                A modern web application boilerplate for building secure and scalable applications.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Features</li>
                <li>Security</li>
                <li>Documentation</li>
                <li>API Reference</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>About Us</li>
                <li>Contact</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Help Center</li>
                <li>Community</li>
                <li>Status</li>
                <li>Updates</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2024 AppName. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}