-- Migration: Add webhook events table for idempotency
-- This table tracks processed webhook events to prevent duplicate processing

-- Table for webhook idempotency
CREATE TABLE IF NOT EXISTS webhook_events (
  event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  event_type TEXT NOT NULL,
  metadata JSONB,
  processing_status TEXT DEFAULT 'processing' CHECK (processing_status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by processed_at for cleanup
CREATE INDEX idx_webhook_events_processed 
  ON webhook_events(processed_at DESC);

-- Index for event type filtering
CREATE INDEX idx_webhook_events_type 
  ON webhook_events(event_type);

-- Index for status filtering
CREATE INDEX idx_webhook_events_status 
  ON webhook_events(processing_status);

-- Enable RLS on webhook_events table
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role to access all webhook events
CREATE POLICY "Service role can manage webhook events" ON webhook_events
  FOR ALL USING (true) WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_webhook_events_updated_at 
  BEFORE UPDATE ON webhook_events 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old webhook events (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM webhook_events 
  WHERE processed_at < NOW() - INTERVAL '30 days'
  AND processing_status = 'completed';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup weekly (if pg_cron is available)
-- SELECT cron.schedule('webhook-cleanup', '0 2 * * 0', 'SELECT cleanup_old_webhook_events();');

COMMENT ON TABLE webhook_events IS 'Tracks processed webhook events for idempotency';
COMMENT ON COLUMN webhook_events.event_id IS 'Unique event ID from the webhook provider';
COMMENT ON COLUMN webhook_events.event_type IS 'Type of webhook event (e.g., checkout.session.completed)';
COMMENT ON COLUMN webhook_events.metadata IS 'Additional event metadata as JSON';
COMMENT ON COLUMN webhook_events.processing_status IS 'Current processing status of the event';
COMMENT ON FUNCTION cleanup_old_webhook_events() IS 'Removes webhook events older than 30 days';