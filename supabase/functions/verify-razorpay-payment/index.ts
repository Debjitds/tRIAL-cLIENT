import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS configuration - restrict to known origins
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

interface VerifyRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  plan: 'pro' | 'proplus';
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role for updates
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // User client for auth check
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Admin client for updates
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan }: VerifyRequest = await req.json();

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
      return new Response(
        JSON.stringify({ error: 'Missing required payment verification fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Razorpay secret
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!razorpayKeySecret) {
      console.error('Razorpay secret not configured');
      return new Response(
        JSON.stringify({ error: 'Payment verification not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify signature using HMAC SHA256 with Web Crypto API
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(razorpayKeySecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (expectedSignature !== razorpay_signature) {
      console.error('Payment signature verification failed');
      return new Response(
        JSON.stringify({ error: 'Payment verification failed - invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Signature verified! Update user subscription
    // ONLY purchased credits are granted - free quotas are NOT touched
    const planCredits: Record<string, number> = {
      'pro': 15,
      'proplus': 30
    };

    const planDisplayNames: Record<string, string> = {
      'pro': 'Pro Plan',
      'proplus': 'Pro Plus Plan'
    };

    // Check for existing subscription to prevent duplicates
    const { data: existingSub, error: subError } = await adminSupabase
      .from('subscriptions')
      .select('plan, credits, razorpay_payment_id')
      .eq('user_id', user.id)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      console.error('Error checking subscription:', subError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify subscription status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Idempotency check: Prevent duplicate credit grants for same payment
    if (existingSub?.razorpay_payment_id === razorpay_payment_id) {
      console.log('Payment already processed, returning success without duplicate grant');
      return new Response(
        JSON.stringify({
          success: true,
          message: `Already upgraded to ${plan} plan!`,
          plan: plan,
          credits_added: 0,
          duplicate: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update subscription - ONLY update plan and credits
    // DO NOT touch beginner_left, intermediate_left, veteran_left
    // Free quotas reset ONLY on monthly cycle, NOT on purchase
    const newBalance = (existingSub?.credits || 0) + planCredits[plan];
    
    // Calculate plan expiry: 30 days from now
    const planStartedAt = new Date().toISOString();
    const planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { error: updateError } = await adminSupabase
      .from('subscriptions')
      .update({
        plan: plan,
        credits: newBalance,
        razorpay_payment_id: razorpay_payment_id, // Store for idempotency
        plan_started_at: planStartedAt,
        plan_expires_at: planExpiresAt,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log credit transaction for history using secure RPC function
    await adminSupabase.rpc('insert_credit_transaction', {
      _user_id: user.id,
      _type: 'purchase',
      _amount: planCredits[plan],
      _description: `Purchased ${planDisplayNames[plan]} - ${planCredits[plan]} credits`,
      _balance_after: newBalance,
      _metadata: {
        razorpay_order_id,
        razorpay_payment_id,
        plan
      }
    });

    // Log the payment in audit logs
    await adminSupabase
      .from('admin_audit_logs')
      .insert({
        admin_user_id: user.id, // User who made payment (not admin action)
        action_type: 'payment_verified',
        target_user_id: user.id,
        details: {
          razorpay_order_id,
          razorpay_payment_id,
          plan,
          credits_added: planCredits[plan],
          timestamp: new Date().toISOString()
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully upgraded to ${plan} plan!`,
        plan: plan,
        credits_added: planCredits[plan]
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error verifying payment:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
