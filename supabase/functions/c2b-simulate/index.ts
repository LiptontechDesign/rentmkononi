// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// M-Pesa Sandbox URL
const SANDBOX_URL = 'https://sandbox.safaricom.co.ke';

// Decrypt function for stored credentials
async function decrypt(encryptedBase64: string, key: CryptoKey): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  return new TextDecoder().decode(decrypted);
}

// Derive encryption key from secret
async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('MPESA_ENCRYPTION_SECRET') || 'default-secret-change-in-production';
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('rentmkononi-mpesa-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Get M-Pesa access token
async function getMpesaAccessToken(
  consumerKey: string,
  consumerSecret: string
): Promise<string> {
  const auth = btoa(`${consumerKey}:${consumerSecret}`);
  
  const response = await fetch(
    `${SANDBOX_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get access token: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Simulate C2B payment
async function simulateC2BPayment(
  accessToken: string,
  shortcode: string,
  phoneNumber: string,
  amount: number,
  billRefNumber: string
): Promise<{ success: boolean; message: string; data?: any }> {
  const response = await fetch(
    `${SANDBOX_URL}/mpesa/c2b/v1/simulate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ShortCode: shortcode,
        CommandID: 'CustomerPayBillOnline', // or 'CustomerBuyGoodsOnline' for Till
        Amount: amount,
        Msisdn: phoneNumber,
        BillRefNumber: billRefNumber,
      }),
    }
  );

  const data = await response.json();
  console.log('C2B Simulate Response:', JSON.stringify(data));

  if (data.ResponseCode === '0' || data.ResponseDescription?.includes('Accept')) {
    return { 
      success: true, 
      message: data.ResponseDescription || 'Simulation successful',
      data 
    };
  }

  return { 
    success: false, 
    message: data.ResponseDescription || data.errorMessage || 'Simulation failed',
    data 
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { landlord_id, phone_number, amount, bill_ref_number } = body;

    // Validate required fields
    if (!phone_number || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Phone number and amount are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify landlord_id matches the authenticated user
    if (landlord_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: landlord_id mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get M-Pesa settings for this landlord
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: mpesaSettings, error: settingsError } = await supabaseAdmin
      .from('mpesa_settings')
      .select('*')
      .eq('landlord_id', landlord_id)
      .single();

    if (settingsError || !mpesaSettings) {
      return new Response(
        JSON.stringify({ error: 'M-Pesa settings not found. Please configure your credentials first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decrypt credentials
    const encryptionKey = await getEncryptionKey();
    const consumerKey = await decrypt(mpesaSettings.consumer_key_encrypted, encryptionKey);
    const consumerSecret = await decrypt(mpesaSettings.consumer_secret_encrypted, encryptionKey);

    // Get access token
    console.log('Getting M-Pesa access token for simulation...');
    const accessToken = await getMpesaAccessToken(consumerKey, consumerSecret);

    // Format phone number (ensure it starts with 254)
    let formattedPhone = phone_number.replace(/\s/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1);
    }

    // Simulate the C2B payment
    console.log(`Simulating C2B payment: ${formattedPhone}, Amount: ${amount}, Ref: ${bill_ref_number || 'N/A'}`);
    
    const result = await simulateC2BPayment(
      accessToken,
      mpesaSettings.shortcode,
      formattedPhone,
      Math.round(amount),
      bill_ref_number || ''
    );

    if (result.success) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payment simulation sent successfully. Check your payments list for the incoming transaction.',
          details: result.data
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.message,
          details: result.data 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
