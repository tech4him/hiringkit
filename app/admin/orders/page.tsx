import { requireAdmin } from "@/lib/auth/requireAdmin";
import { AdminDashboard } from "../dashboard";

export default async function AdminOrdersPage() {
  // Server-side authentication guard
  const { supabase, user } = await requireAdmin();

  // Fetch orders data server-side
  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      *,
      kits (
        id,
        title,
        status
      ),
      users (
        id,
        email,
        name
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch orders:', error);
    throw new Error('Failed to load orders data');
  }

  return <AdminDashboard initialOrders={orders || []} user={user} />;
}