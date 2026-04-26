-- Security Logs Table Setup
-- This table stores all security-related events for founder-only access
-- Only the founder (with specific email) can access these records

-- Create security_logs table
CREATE TABLE IF NOT EXISTS security_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- login_success, login_failed, user_registered, address_updated, location_updated, etc.
  event_data JSONB DEFAULT '{}', -- Additional event-specific data
  ip_address TEXT,
  location JSONB, -- {lat, lng, timestamp}
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_timestamp ON security_logs(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only the founder can read security_logs
-- Replace 'founder@example.com' with the actual founder's email
CREATE POLICY "Founder can read all security logs"
ON security_logs FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE email = 'uguryigitkarakzu@gmail.com' -- TODO: Replace with actual founder email
  )
);

-- RLS Policy: Only the founder can insert security logs (via service role)
CREATE POLICY "Founder can insert security logs"
ON security_logs FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE email = 'uguryigitkarakuzu@gmail.com' -- TODO: Replace with actual founder email
  )
);

-- RLS Policy: No one can update security logs (immutable)
CREATE POLICY "No updates on security logs"
ON security_logs FOR UPDATE
USING (false);

-- RLS Policy: No one can delete security logs (immutable)
CREATE POLICY "No deletes on security logs"
ON security_logs FOR DELETE
USING (false);

-- Grant necessary permissions
GRANT SELECT ON security_logs TO authenticated;
GRANT INSERT ON security_logs TO authenticated;
GRANT USAGE ON security_logs TO authenticated;

-- Comment for documentation
COMMENT ON TABLE security_logs IS 'Security event logs for founder-only access. Contains user activity data including IP addresses, locations, and sensitive information for security protocols.';

-- Fix RLS for profilkisi table - allow users to insert their own profile
ALTER TABLE profilkisi ENABLE ROW LEVEL SECURITY;

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON profilkisi FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profilkisi FOR UPDATE
USING (auth.uid() = user_id);

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
ON profilkisi FOR SELECT
USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON profilkisi TO authenticated;
