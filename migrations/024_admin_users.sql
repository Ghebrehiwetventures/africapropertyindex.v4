-- 024_admin_users.sql
-- Individual admin accounts backed by Supabase Auth.
-- Each row links a Supabase Auth user to an admin role.

CREATE TABLE IF NOT EXISTS public.admin_users (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text        NOT NULL,
  role       text        NOT NULL DEFAULT 'admin'
                         CHECK (role IN ('admin', 'editor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own row (to verify they are an admin).
CREATE POLICY admin_users_self_read
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Anon can also read (needed during the post-login admin check before
-- the Supabase client switches to the authenticated role).
CREATE POLICY admin_users_anon_read
  ON public.admin_users
  FOR SELECT
  TO anon
  USING (false);
