import { requireAdmin } from "@/lib/auth/requireAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  User as UserIcon, 
  Mail,
  Calendar,
  Shield,
  Eye,
  Building
} from "lucide-react";

export default async function AdminUsersPage() {
  // Server-side authentication guard
  const { supabase } = await requireAdmin();

  // Fetch users data server-side
  const { data: users, error } = await supabase
    .from("users")
    .select(`
      *,
      organizations (
        id,
        name
      ),
      orders (
        id,
        status,
        total_cents
      ),
      kits (
        id,
        status
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch users:', error);
    throw new Error('Failed to load users data');
  }

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return (
        <Badge className="bg-red-100 text-red-900 border-red-200">
          <Shield className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-100 text-blue-900 border-blue-200">
        <UserIcon className="h-3 w-3 mr-1" />
        User
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getUserStats = (userOrders: Array<{total_cents: number}>, userKits: Array<{status: string}>) => {
    const totalSpent = userOrders?.reduce((sum, order) => sum + order.total_cents, 0) || 0;
    const completedKits = userKits?.filter(kit => kit.status === 'published').length || 0;
    return { totalSpent, completedKits };
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
          <p className="text-gray-600">Manage user accounts and permissions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{users?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Admins</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users?.filter(u => u.role === 'admin').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Building className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">With Organizations</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users?.filter(u => u.org_id).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users?.filter(u => u.orders?.length > 0).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {!users || users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No users found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Organization</th>
                    <th>Activity</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((userRecord) => {
                    const stats = getUserStats(userRecord.orders || [], userRecord.kits || []);
                    return (
                      <tr key={userRecord.id}>
                        <td>
                          <div>
                            <p className="font-medium">{userRecord.name || "Unnamed User"}</p>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Mail className="h-3 w-3" />
                              {userRecord.email}
                            </div>
                            <p className="text-xs text-gray-500">ID: {userRecord.id.slice(0, 8)}...</p>
                          </div>
                        </td>
                        <td>
                          {getRoleBadge(userRecord.role)}
                        </td>
                        <td>
                          {userRecord.organizations ? (
                            <span className="text-sm">{userRecord.organizations.name}</span>
                          ) : (
                            <span className="text-sm text-gray-400">No organization</span>
                          )}
                        </td>
                        <td>
                          <div className="text-sm">
                            <p className="font-medium">${(stats.totalSpent / 100).toFixed(0)} spent</p>
                            <p className="text-gray-600">{stats.completedKits} kits completed</p>
                            <p className="text-gray-600">{userRecord.orders?.length || 0} orders</p>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              {formatDate(userRecord.created_at)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Button variant="secondary" size="sm" disabled>
                              <Eye className="h-3 w-3 mr-1" />
                              View Profile
                            </Button>
                            {userRecord.orders?.length > 0 && (
                              <span className="text-xs text-gray-500">
                                {userRecord.orders.length} order{userRecord.orders.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}