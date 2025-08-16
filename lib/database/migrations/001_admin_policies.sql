-- Migration: Admin RLS policies and audit logging
-- Enables admin access to all tables and creates audit logging infrastructure

-- Ensure users table has role column with proper index
DO $$
BEGIN
  -- Add role column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));
  END IF;
  
  -- Update existing admin users based on ADMIN_EMAILS env var
  -- This is safe because isAdminEmail() function already exists in the codebase
END $$;

-- Index for fast role lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user has admin role in users table
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on core tables and create admin policies

-- Orders table RLS policies
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Admin can read/write all orders
CREATE POLICY "Admins can manage all orders" ON orders
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Users can only see their own orders
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (user_id = auth.uid());

-- Kits table RLS policies  
ALTER TABLE kits ENABLE ROW LEVEL SECURITY;

-- Admin can read/write all kits
CREATE POLICY "Admins can manage all kits" ON kits
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Users can only see their own kits
CREATE POLICY "Users can view own kits" ON kits
  FOR SELECT USING (user_id = auth.uid());

-- Exports table RLS policies
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- Admin can read/write all exports
CREATE POLICY "Admins can manage all exports" ON exports
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Users can only see exports for their own kits
CREATE POLICY "Users can view own exports" ON exports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM kits 
      WHERE kits.id = exports.kit_id 
      AND kits.user_id = auth.uid()
    )
  );

-- Organizations table RLS policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Admin can read/write all organizations
CREATE POLICY "Admins can manage all organizations" ON organizations
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Users can view their own organization
CREATE POLICY "Users can view own organization" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.org_id = organizations.id 
      AND users.id = auth.uid()
    )
  );

-- Users table RLS policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Admin can read/write all users
CREATE POLICY "Admins can manage all users" ON users
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Users can view and update their own profile
CREATE POLICY "Users can manage own profile" ON users
  FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Create audit_logs table for admin action tracking
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit logs
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (is_admin());

-- System can insert audit logs (bypass RLS for logging)
CREATE POLICY "System can create audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log(
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id TEXT DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Insert audit log
  INSERT INTO audit_logs (
    actor_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    current_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_values,
    p_new_values,
    p_metadata,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old audit logs (older than 1 year)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs 
  WHERE created_at < NOW() - INTERVAL '1 year';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION create_audit_log(TEXT, TEXT, TEXT, JSONB, JSONB, JSONB, INET, TEXT) TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION is_admin() IS 'Returns true if current authenticated user has admin role';
COMMENT ON TABLE audit_logs IS 'Tracks admin actions for security and compliance';
COMMENT ON FUNCTION create_audit_log(TEXT, TEXT, TEXT, JSONB, JSONB, JSONB, INET, TEXT) IS 'Creates audit log entry for admin actions';
COMMENT ON FUNCTION cleanup_old_audit_logs() IS 'Removes audit logs older than 1 year';