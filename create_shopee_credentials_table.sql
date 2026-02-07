-- Table to store Shopee API credentials and tokens
CREATE TABLE IF NOT EXISTS shopee_credentials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    shop_id BIGINT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    access_token_expires_at TIMESTAMPTZ NOT NULL,
    refresh_token_expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE shopee_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own credentials" ON shopee_credentials
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credentials" ON shopee_credentials
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credentials" ON shopee_credentials
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own credentials" ON shopee_credentials
    FOR DELETE USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_shopee_credentials_user_id ON shopee_credentials(user_id);
