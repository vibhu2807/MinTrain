-- MinTrain Database Schema
-- Run this in Supabase SQL Editor (supabase.com → your project → SQL Editor)

-- Users table (authentication)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  member_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table (onboarding data)
CREATE TABLE IF NOT EXISTS profiles (
  member_id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily plans (AI-generated, cached per day)
CREATE TABLE IF NOT EXISTS daily_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id TEXT NOT NULL,
  date_key TEXT NOT NULL,
  workout_plan JSONB DEFAULT '{}',
  meal_slots JSONB DEFAULT '[]',
  summary JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, date_key)
);

-- Tracking (daily exercise feedback, meal selections)
CREATE TABLE IF NOT EXISTS tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id TEXT NOT NULL,
  date_key TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, date_key)
);

-- Kitchen (shared dinner selection)
CREATE TABLE IF NOT EXISTS kitchen (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  selected_meal_id TEXT DEFAULT '',
  selected_meal_name TEXT DEFAULT '',
  groceries JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default kitchen row
INSERT INTO kitchen (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Enable real-time for kitchen table (dinner sync)
ALTER PUBLICATION supabase_realtime ADD TABLE kitchen;

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen ENABLE ROW LEVEL SECURITY;

-- Allow anon access (our app handles auth via signed cookies, not Supabase Auth)
CREATE POLICY "Allow all for anon" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON daily_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON tracking FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON kitchen FOR ALL USING (true) WITH CHECK (true);
