import { requireAdmin } from "@/lib/auth/requireAdmin";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  LogOut,
  Home
} from "lucide-react";

function AdminHeader() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Navigation */}
          <div className="flex items-center space-x-8">
            <Link href="/admin" className="flex items-center space-x-2">
              <LayoutDashboard className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-semibold text-gray-900">Admin Panel</span>
            </Link>
            
            <nav className="hidden md:flex space-x-6">
              <Link 
                href="/admin" 
                className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                Dashboard
              </Link>
              <Link 
                href="/admin/orders" 
                className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                Orders
              </Link>
              <Link 
                href="/admin/kits" 
                className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                Kits
              </Link>
              <Link 
                href="/admin/users" 
                className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                Users
              </Link>
            </nav>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <Home className="h-4 w-4 mr-2" />
                View Site
              </Button>
            </Link>
            <Link href="/logout">
              <Button variant="ghost" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verify admin access at layout level
  await requireAdmin();
  
  return (
    <div className="admin-theme min-h-screen bg-gray-50">
      <AdminHeader />
      <main className="admin-content">
        {children}
      </main>
    </div>
  );
}