import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Access Denied
          </CardTitle>
          <p className="text-gray-600">
            You don&apos;t have permission to access this page
          </p>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-gray-500">
            Only admin users can access the admin dashboard. If you believe this is an error, please contact your administrator.
          </p>
          
          <div className="space-y-2">
            <Link href="/login">
              <Button variant="secondary" className="w-full">
                Try Different Account
              </Button>
            </Link>
            
            <Link href="/">
              <Button className="w-full">
                Return to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}