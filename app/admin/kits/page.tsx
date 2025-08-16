import { requireAdmin } from "@/lib/auth/requireAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  User as UserIcon, 
  Calendar,
  Eye,
  CheckCircle,
  Clock,
  Edit
} from "lucide-react";
import Link from "next/link";

export default async function AdminKitsPage() {
  // Server-side authentication guard
  const { supabase } = await requireAdmin();

  // Fetch kits data server-side
  const { data: kits, error } = await supabase
    .from("kits")
    .select(`
      *,
      users (
        id,
        email,
        name
      ),
      orders (
        id,
        status,
        total_cents
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch kits:', error);
    throw new Error('Failed to load kits data');
  }

  const getStatusBadge = (status: string) => {
    const badgeConfig = {
      draft: { className: "bg-gray-100 text-gray-900 border-gray-200", icon: Edit },
      generating: { className: "bg-blue-100 text-blue-900 border-blue-200", icon: Clock },
      generated: { className: "bg-green-100 text-green-900 border-green-200", icon: CheckCircle },
      editing: { className: "bg-orange-100 text-orange-900 border-orange-200", icon: Edit },
      published: { className: "bg-emerald-100 text-emerald-900 border-emerald-200", icon: CheckCircle }
    };

    const config = badgeConfig[status as keyof typeof badgeConfig];
    if (!config) {
      return <Badge variant="secondary" className="border">{status}</Badge>;
    }

    const IconComponent = config.icon;
    return (
      <Badge className={`border ${config.className}`}>
        <IconComponent className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
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

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kits Management</h1>
          <p className="text-gray-600">Manage hiring kit generation and approval</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Kits</p>
                <p className="text-2xl font-bold text-gray-900">{kits?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {kits?.filter(kit => ['generating', 'editing'].includes(kit.status)).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Published</p>
                <p className="text-2xl font-bold text-gray-900">
                  {kits?.filter(kit => kit.status === 'published').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Edit className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Drafts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {kits?.filter(kit => kit.status === 'draft').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kits Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Kits</CardTitle>
        </CardHeader>
        <CardContent>
          {!kits || kits.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No kits found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Kit</th>
                    <th>Status</th>
                    <th>User</th>
                    <th>Order</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {kits.map((kit) => (
                    <tr key={kit.id}>
                      <td>
                        <div>
                          <p className="font-medium">{kit.title || kit.intake_json?.role_title || "Untitled Kit"}</p>
                          <p className="text-sm text-gray-600">ID: {kit.id.slice(0, 8)}...</p>
                        </div>
                      </td>
                      <td>
                        {getStatusBadge(kit.status)}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">
                            {kit.users?.name || kit.users?.email || kit.user_id.slice(0, 8) + '...'}
                          </span>
                        </div>
                      </td>
                      <td>
                        {kit.orders ? (
                          <div>
                            <p className="text-sm font-medium">
                              ${(kit.orders.total_cents / 100).toFixed(0)}
                            </p>
                            <p className="text-xs text-gray-500">{kit.orders.status}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">No order</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">
                            {formatDate(kit.created_at)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Link href={`/kit/${kit.id}`}>
                            <Button variant="secondary" size="sm">
                              <Eye className="h-3 w-3 mr-1" />
                              View Kit
                            </Button>
                          </Link>
                          {kit.orders && (
                            <Link href={`/admin/orders/${kit.orders.id}`}>
                              <Button variant="secondary" size="sm">
                                View Order
                              </Button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}