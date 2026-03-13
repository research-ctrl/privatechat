-- =============================================================
-- Migration 002: Fix function permissions + harden trigger
-- Run this in Supabase SQL Editor if you already ran 001
-- =============================================================

-- Grant authenticated users permission to call the RPC.
-- Without this, clicking a user silently fails with "permission denied".
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid) TO authenticated;

-- Harden the new-user trigger so a missing display_name or
-- public_key in metadata doesn't cause a silent signup failure.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, public_key)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username'),
    COALESCE(new.raw_user_meta_data->>'public_key', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
