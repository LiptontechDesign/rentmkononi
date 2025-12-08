// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// M-Pesa API URLs
const SANDBOX_URL = 'https://sandbox.safaricom.co.ke';
const PRODUCTION_URL = 'https://api.safaricom.co.ke';

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
  consumerSecret: string,
  isSandbox: boolean
): Promise<string> {
  const baseUrl = isSandbox ? SANDBOX_URL : PRODUCTION_URL;
  const auth = btoa(`${consumerKey}:${consumerSecret}`);
  
  const response = await fetch(
    `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
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

// Register C2B URLs with Safaricom
async function registerC2BUrls(
  accessToken: string,
  shortcode: string,
  confirmationUrl: string,
  validationUrl: string,
  isSandbox: boolean
): Promise<{ success: boolean; message: string; responseCode?: string }> {
  const baseUrl = isSandbox ? SANDBOX_URL : PRODUCTION_URL;
  
  const response = await fetch(
    `${baseUrl}/mpesa/c2b/v1/registerurl`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ShortCode: shortcode,
        ResponseType: 'Completed', // or 'Cancelled' to auto-reject
        ConfirmationURL: confirmationUrl,
        ValidationURL: validationUrl,
      }),
    }
  );

  const data = await response.json();
  console.log('C2B Register Response:', JSON.stringify(data));

  if (data.ResponseCode === '0' || data.ResponseDescription?.includes('success')) {
    return { 
      success: true, 
      message: data.ResponseDescription || 'URLs registered successfully',
      responseCode: data.ResponseCode 
    };
  }

  return { 
    success: false, 
    message: data.ResponseDescription || data.errorMessage || 'Registration failed',
    responseCode: data.ResponseCode 
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
    const { landlord_id, is_sandbox = true } = body;

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
    console.log('Getting M-Pesa access token...');
    const accessToken = await getMpesaAccessToken(consumerKey, consumerSecret, is_sandbox);
    console.log('Access token obtained successfully');

    // Use c2b-callback for both URLs (it has JWT verification disabled)
    const callbackUrl = `${supabaseUrl}/functions/v1/c2b-callback?landlord_id=${landlord_id}`;
    
    // Use same URL for validation - it will just accept all valid transactions
    // The confirmation (c2b-callback) handles the actual payment recording
    const validationUrl = callbackUrl;
    const confirmationUrl = callbackUrl;

    // Register URLs
    console.log('Registering C2B URLs...');
    console.log('Confirmation URL:', confirmationUrl);
    console.log('Validation URL:', validationUrl);
    
    const result = await registerC2BUrls(
      accessToken,
      mpesaSettings.shortcode,
      confirmationUrl,
      validationUrl,
      is_sandbox
    );

    if (result.success) {
      // Update settings to mark as registered
      await supabaseAdmin
        .from('mpesa_settings')
        .update({ 
          callback_url: confirmationUrl,
          updated_at: new Date().toISOString() 
        })
        .eq('landlord_id', landlord_id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: result.message,
          confirmation_url: confirmationUrl,
          validation_url: validationUrl,
          is_sandbox 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.message,
          responseCode: result.responseCode 
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
