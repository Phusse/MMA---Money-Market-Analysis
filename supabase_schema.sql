-- ============================================
-- Money Market Intelligence Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- Stores additional user info beyond Supabase Auth
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    name VARCHAR(100),
    account_type VARCHAR(20) DEFAULT 'both' CHECK (account_type IN ('forex', 'stock', 'both')),
    plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only see/update their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);


-- ============================================
-- USER PREFERENCES TABLE
-- Stores user settings and preferences
-- ============================================
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Notification Settings
    telegram_enabled BOOLEAN DEFAULT FALSE,
    telegram_chat_id VARCHAR(100),
    telegram_bot_token VARCHAR(255),
    phone_number VARCHAR(20),  -- Optional phone for SMS alerts
    email_reports BOOLEAN DEFAULT TRUE,
    report_frequency VARCHAR(20) DEFAULT 'daily' CHECK (report_frequency IN ('daily', 'weekly', 'none')),
    
    -- Trading Preferences
    default_markets JSONB DEFAULT '["us_market", "forex"]'::jsonb,
    risk_tolerance VARCHAR(20) DEFAULT 'moderate' CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
    default_currency VARCHAR(3) DEFAULT 'USD',
    favorite_symbols JSONB DEFAULT '[]'::jsonb,
    
    -- Appearance
    theme VARCHAR(20) DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'system')),
    compact_mode BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see/update their own preferences
CREATE POLICY "Users can view own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ============================================
-- WATCHLISTS TABLE
-- User's saved symbols to watch
-- ============================================
CREATE TABLE IF NOT EXISTS user_watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    market VARCHAR(20) NOT NULL CHECK (market IN ('us', 'ngx', 'forex', 'crypto')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, symbol, market)
);

-- Enable Row Level Security
ALTER TABLE user_watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own watchlist" ON user_watchlists
    FOR ALL USING (auth.uid() = user_id);


-- ============================================
-- API KEYS TABLE (Admin only)
-- Pool of API keys for rotation
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('finnhub', 'alpha_vantage', 'openai', 'gemini', 'cryptocompare')),
    api_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    calls_today INTEGER DEFAULT 0,
    daily_limit INTEGER DEFAULT 100,
    last_rotated TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- This table should NOT have RLS - only accessible by service role


-- ============================================
-- USER API USAGE TABLE
-- Track per-user API consumption
-- ============================================
CREATE TABLE IF NOT EXISTS user_api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    endpoint VARCHAR(100) NOT NULL,
    provider VARCHAR(50),
    called_at TIMESTAMPTZ DEFAULT NOW(),
    response_time_ms INTEGER,
    success BOOLEAN DEFAULT TRUE
);

-- Index for fast lookups
CREATE INDEX idx_user_api_usage_user_date ON user_api_usage(user_id, called_at);

-- Enable Row Level Security (users can only see their own usage)
ALTER TABLE user_api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON user_api_usage
    FOR SELECT USING (auth.uid() = user_id);


-- ============================================
-- SIGNAL HISTORY TABLE
-- Store signals per user for tracking
-- ============================================
CREATE TABLE IF NOT EXISTS user_signal_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    signal_type VARCHAR(20) NOT NULL CHECK (signal_type IN ('BUY', 'SELL', 'STRONG_BUY', 'STRONG_SELL', 'NEUTRAL')),
    entry_price DECIMAL(18, 8),
    stop_loss DECIMAL(18, 8),
    take_profit DECIMAL(18, 8),
    trade_taken BOOLEAN DEFAULT FALSE,
    outcome VARCHAR(20) CHECK (outcome IN ('win', 'loss', 'breakeven', 'pending')),
    pnl_percent DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- Index for performance
CREATE INDEX idx_signal_history_user ON user_signal_history(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE user_signal_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own signals" ON user_signal_history
    FOR ALL USING (auth.uid() = user_id);


-- ============================================
-- TRIGGER: Auto-create profile on user signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
    );
    
    -- Create default preferences
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================
-- TRIGGER: Update timestamps
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================
-- FUNCTION: Reset daily API counts (call via cron)
-- ============================================
CREATE OR REPLACE FUNCTION reset_daily_api_counts()
RETURNS void AS $$
BEGIN
    UPDATE api_keys SET calls_today = 0, last_rotated = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- SAMPLE: Insert your first API key
-- ============================================
-- Uncomment and add your keys:
-- INSERT INTO api_keys (provider, api_key, daily_limit, notes) VALUES
--     ('finnhub', 'your-finnhub-key', 60, 'Free tier - 60 calls/minute'),
--     ('alpha_vantage', 'your-alpha-key', 25, 'Free tier - 25 calls/day'),
--     ('openai', 'your-openai-key', 100, 'Pay as you go');
