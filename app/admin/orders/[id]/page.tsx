import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getOrderDetails, getOrderAuditLog } from "@/lib/database/queries/orders";
import { OrderDetail } from "@/components/admin/OrderDetail";
import { notFound } from "next/navigation";

export default async function AdminOrderDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // Verify admin access
  const { user } = await requireAdmin();
  
  // Await params in Next.js 15
  const { id } = await params;
  
  // Fetch comprehensive order data
  const { data: order, error } = await getOrderDetails(id);
    
  if (error || !order) {
    console.error('Order not found:', id, error);
    notFound();
  }
  
  // Fetch audit log
  const { data: auditLog } = await getOrderAuditLog(id);
  
  return (
    <OrderDetail 
      order={order}
      auditLog={auditLog || []}
      currentUser={user}
    />
  );
}