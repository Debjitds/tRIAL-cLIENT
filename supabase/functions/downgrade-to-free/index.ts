import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS configuration
const allowedOrigins = [
  'https://avsuyudchzyoyakxotfm.lovable.app',
  'https://trial-clients.vercel.app',
  /^https:\/\/.*\.lovable\.app$/,
  /^https:\/\/.*\.lovable\.dev$/,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
  'http://localhost:8081',
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const isAllowed = allowedOrigins.some(allowed => {
    if (typeof allowed === 'string') return origin === allowed;
    return allowed.test(origin);
  });
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current subscription
    const { data: existingSub, error: subError } = await adminSupabase
      .from('subscriptions')
      .select('plan, credits')
      .eq('user_id', user.id)
      .single();

    if (subError) {
      console.error('Error checking subscription:', subError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify subscription status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already on free plan
    if (existingSub.plan === 'free') {
      return new Response(
        JSON.stringify({ error: 'Already on Free plan', already_free: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Downgrade to free plan - KEEP purchased credits intact
    // Clear plan expiry timestamps since free plan doesn't expire
    const { error: updateError } = await adminSupabase
      .from('subscriptions')
      .update({
        plan: 'free',
        plan_started_at: null,
        plan_expires_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error downgrading plan:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to downgrade plan' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log in audit
    await adminSupabase
      .from('admin_audit_logs')
      .insert({
        admin_user_id: user.id,
        action_type: 'plan_downgrade',
        target_user_id: user.id,
        details: {
          previous_plan: existingSub.plan,
          new_plan: 'free',
          credits_retained: existingSub.credits,
          timestamp: new Date().toISOString()
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Successfully downgraded to Free plan',
        previous_plan: existingSub.plan,
        new_plan: 'free',
        credits_retained: existingSub.credits
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error downgrading plan:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
