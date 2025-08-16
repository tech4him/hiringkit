import { createSupabaseServerClient } from '@/lib/auth/supabase-server';
import type { OrderStatus } from '@/types';

export async function getOrderDetails(orderId: string) {
  const supabase = await createSupabaseServerClient();
  
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      kits (
        *,
        artifacts_json,
        edited_json,
        intake_json
      ),
      users (
        id,
        email,
        name
      ),
      organizations (
        id,
        name,
        brand_logo_url
      )
    `)
    .eq('id', orderId)
    .single();

  return { data, error };
}

export async function updateOrderStatus(
  orderId: string, 
  status: OrderStatus,
  userId: string,
  previousStatus?: OrderStatus
) {
  const supabase = await createSupabaseServerClient();
  
  // Update order
  const { error: orderError } = await supabase
    .from('orders')
    .update({ 
      status, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', orderId);
    
  // Add audit log entry (if audit_log table exists)
  // Note: This may need to be adjusted based on actual audit_log schema
  try {
    await supabase
      .from('audit_log')
      .insert({
        order_id: orderId,
        user_id: userId,
        action: `status_changed_to_${status}`,
        metadata: { 
          previous_status: previousStatus, 
          new_status: status 
        },
        created_at: new Date().toISOString()
      });
  } catch (auditError) {
    // Log audit error but don't fail the operation
    console.warn('Failed to create audit log entry:', auditError);
  }
    
  return { success: !orderError, error: orderError };
}

export async function getOrderAuditLog(orderId: string) {
  const supabase = await createSupabaseServerClient();
  
  // Try to fetch audit log, but handle gracefully if table doesn't exist
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });
      
    return { data: data || [], error };
  } catch (error) {
    // Return empty array if audit_log table doesn't exist
    console.warn('Audit log table not available:', error);
    return { data: [], error: null };
  }
}

export async function resendOrderEmail(orderId: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  
  // This would typically trigger an email service
  // For now, just log the action
  try {
    await supabase
      .from('audit_log')
      .insert({
        order_id: orderId,
        user_id: userId,
        action: 'email_resent',
        metadata: { 
          timestamp: new Date().toISOString() 
        },
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.warn('Failed to log email resend action:', error);
  }
  
  return { success: true };
}

export async function addOrderNote(orderId: string, userId: string, note: string) {
  const supabase = await createSupabaseServerClient();
  
  try {
    await supabase
      .from('audit_log')
      .insert({
        order_id: orderId,
        user_id: userId,
        action: 'note_added',
        metadata: { 
          note,
          timestamp: new Date().toISOString() 
        },
        created_at: new Date().toISOString()
      });
      
    return { success: true };
  } catch (error) {
    console.error('Failed to add order note:', error);
    return { success: false, error };
  }
}