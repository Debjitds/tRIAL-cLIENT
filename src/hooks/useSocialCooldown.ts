import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SocialCooldownState {
  ok: boolean;
  allowed: boolean;
  reason: string;
  now: string | null;
  last_approved_at: string | null;
  cooldown_end: string | null;
  ms_remaining: number | null;
}

export function useSocialCooldown() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cooldown, setCooldown] = useState<SocialCooldownState | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  const fetchCooldown = useCallback(async () => {
    if (!user) {
      setCooldown(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc("get_social_reward_cooldown");
      if (error) throw error;
      setCooldown(data as unknown as SocialCooldownState);
    } catch (err) {
      console.error("Error fetching social cooldown:", err);
      setCooldown(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchCooldown();
  }, [fetchCooldown]);

  // Auto-refetch when ms_remaining elapses (server-based timer)
  useEffect(() => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    // Only schedule if we have a cooldown with remaining time
    if (!cooldown || cooldown.allowed || cooldown.ms_remaining === null || cooldown.ms_remaining <= 0) {
      return;
    }

    // Schedule refetch when cooldown ends (add 1 second buffer for server timing)
    const delay = Math.min(cooldown.ms_remaining + 1000, 2147483647); // Cap at max setTimeout value
    
    refreshTimerRef.current = window.setTimeout(() => {
      fetchCooldown();
    }, delay);

    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [cooldown, fetchCooldown]);

  return { loading, cooldown, refetch: fetchCooldown };
}
