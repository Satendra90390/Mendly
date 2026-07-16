-- ============================================================
-- Mendly/Mediguide — Supabase Database Schema (Core Tables)
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. profiles table (may already exist from auth trigger)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  date_of_birth TEXT,
  blood_type TEXT,
  profile_photo TEXT,
  avatar_color TEXT DEFAULT '#4f46e5',
  auth_provider TEXT DEFAULT 'email',
  is_active BOOLEAN DEFAULT TRUE,
  is_blocked BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ DEFAULT NOW()
);

-- 2. chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'bot')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. saved_searches table
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  query_type TEXT NOT NULL CHECK (query_type IN ('medicine', 'disease')),
  query_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  detail TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON public.saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 6. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
-- Profiles
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Chat messages
DROP POLICY IF EXISTS "Users read own chat" ON public.chat_messages;
CREATE POLICY "Users read own chat" ON public.chat_messages
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own chat" ON public.chat_messages;
CREATE POLICY "Users insert own chat" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own chat" ON public.chat_messages;
CREATE POLICY "Users delete own chat" ON public.chat_messages
  FOR DELETE USING (auth.uid() = user_id);

-- Saved searches
DROP POLICY IF EXISTS "Users read own searches" ON public.saved_searches;
CREATE POLICY "Users read own searches" ON public.saved_searches
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own searches" ON public.saved_searches;
CREATE POLICY "Users insert own searches" ON public.saved_searches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own searches" ON public.saved_searches;
CREATE POLICY "Users delete own searches" ON public.saved_searches
  FOR DELETE USING (auth.uid() = user_id);

-- Activity logs
DROP POLICY IF EXISTS "Users read own activity" ON public.activity_logs;
CREATE POLICY "Users read own activity" ON public.activity_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own activity" ON public.activity_logs;
CREATE POLICY "Users insert own activity" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own activity" ON public.activity_logs;
CREATE POLICY "Users delete own activity" ON public.activity_logs
  FOR DELETE USING (auth.uid() = user_id);

-- 8. Auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, auth_provider, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', ''),
    COALESCE(NEW.raw_user_meta_data->>'provider', 'email'),
    NEW.created_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();