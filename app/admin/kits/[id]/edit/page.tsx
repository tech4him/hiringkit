import { requireAdmin } from "@/lib/auth/requireAdmin";
import { notFound } from "next/navigation";
import { AdminKitEditor } from "@/components/admin/AdminKitEditor";

export default async function AdminKitEditPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // Verify admin access
  const { supabase, user } = await requireAdmin();
  
  // Await params in Next.js 15
  const { id } = await params;
  
  // Fetch comprehensive kit data with order info
  const { data: kit, error } = await supabase
    .from("kits")
    .select(`
      *,
      orders (
        id,
        status,
        total_cents,
        users (
          id,
          email,
          name
        )
      )
    `)
    .eq('id', id)
    .single();
    
  if (error || !kit) {
    console.error('Kit not found:', id, error);
    notFound();
  }

  // Ensure this is a kit that requires admin editing (Pro plan)
  const isPro = kit.orders?.some((order: { total_cents: number }) => order.total_cents >= 10000);
  if (!isPro) {
    console.error('Kit is not a Pro plan kit:', id);
    notFound();
  }
  
  return (
    <AdminKitEditor 
      kit={kit}
      currentUser={user}
    />
  );
}