-- =============================================================
-- Migration 003: Fix RLS infinite recursion → 500 errors
-- =============================================================
-- Root cause: policies on conversation_participants, conversations,
-- messages, and typing_indicators all query conversation_participants
-- to check membership. This causes RLS to call itself recursively
-- until PostgreSQL aborts with a 500 error.
--
-- Fix: create a SECURITY DEFINER function that queries
-- conversation_participants WITHOUT RLS applied (breaks the loop),
-- then use that function in all affected policies.
-- =============================================================

-- Step 1: Helper function — runs as DB owner, bypasses RLS
CREATE OR REPLACE FUNCTION public.get_my_conversation_ids()
RETURNS SETOF UUID LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT conversation_id
  FROM public.conversation_participants
  WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_conversation_ids() TO authenticated;

-- Step 2: Fix conversation_participants (was self-referential)
DROP POLICY IF EXISTS "participants_select_own_conversations" ON public.conversation_participants;
CREATE POLICY "participants_select_in_shared_conversations"
  ON public.conversation_participants FOR SELECT TO authenticated
  USING (conversation_id IN (SELECT public.get_my_conversation_ids()));

-- Step 3: Fix conversations SELECT (was querying conversation_participants → recursion)
DROP POLICY IF EXISTS "conversations_select_participant" ON public.conversations;
CREATE POLICY "conversations_select_participant"
  ON public.conversations FOR SELECT TO authenticated
  USING (id IN (SELECT public.get_my_conversation_ids()));

-- Step 4: Fix conversations UPDATE
DROP POLICY IF EXISTS "conversations_update_participant" ON public.conversations;
CREATE POLICY "conversations_update_participant"
  ON public.conversations FOR UPDATE TO authenticated
  USING (id IN (SELECT public.get_my_conversation_ids()));

-- Step 5: Fix messages SELECT
DROP POLICY IF EXISTS "messages_select_participant" ON public.messages;
CREATE POLICY "messages_select_participant"
  ON public.messages FOR SELECT TO authenticated
  USING (conversation_id IN (SELECT public.get_my_conversation_ids()));

-- Step 6: Fix messages INSERT
DROP POLICY IF EXISTS "messages_insert_participant" ON public.messages;
CREATE POLICY "messages_insert_participant"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND conversation_id IN (SELECT public.get_my_conversation_ids())
  );

-- Step 7: Fix typing_indicators SELECT
DROP POLICY IF EXISTS "typing_select_participant" ON public.typing_indicators;
CREATE POLICY "typing_select_participant"
  ON public.typing_indicators FOR SELECT TO authenticated
  USING (conversation_id IN (SELECT public.get_my_conversation_ids()));
