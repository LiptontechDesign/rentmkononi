// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// C2B Validation Request payload from Safaricom
interface C2BValidationRequest {
  TransactionType: string;
  TransID: string;
  TransTime: string;
  TransAmount: string;
  BusinessShortCode: string;
  BillRefNumber: string;
  InvoiceNumber: string;
  MSISDN: string;
  FirstName: string;
  MiddleName: string;
  LastName: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get landlord_id from query params
    const url = new URL(req.url);
    const landlordId = url.searchParams.get('landlord_id');

    if (!landlordId) {
      console.error('Missing landlord_id in validation URL');
      // Still accept the transaction - we'll handle it in confirmation
      return new Response(
        JSON.stringify({ 
          ResultCode: 0, 
          ResultDesc: 'Accepted' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse validation request body
    const body: C2BValidationRequest = await req.json();
    console.log('C2B Validation Request:', JSON.stringify(body));

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify landlord has active M-Pesa settings with matching shortcode
    const { data: mpesaSettings, error: settingsError } = await supabase
      .from('mpesa_settings')
      .select('*')
      .eq('landlord_id', landlordId)
      .eq('status', 'ACTIVE')
      .single();

    if (settingsError || !mpesaSettings) {
      console.error('M-Pesa settings not found or inactive for landlord:', landlordId);
      // Reject the transaction if integration is not active
      return new Response(
        JSON.stringify({ 
          ResultCode: 'C2B00012', 
          ResultDesc: 'Rejected: Integration not active' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate shortcode matches
    if (body.BusinessShortCode !== mpesaSettings.shortcode && 
        body.BusinessShortCode !== mpesaSettings.paybill_or_till_number) {
      console.error('Shortcode mismatch:', body.BusinessShortCode, 'vs', mpesaSettings.shortcode);
      return new Response(
        JSON.stringify({ 
          ResultCode: 'C2B00013', 
          ResultDesc: 'Rejected: Invalid shortcode' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Basic validation - accept all valid amounts
    const amount = parseFloat(body.TransAmount || '0');
    if (amount <= 0) {
      return new Response(
        JSON.stringify({ 
          ResultCode: 'C2B00014', 
          ResultDesc: 'Rejected: Invalid amount' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the validation for debugging
    console.log(`Validating C2B payment: ${body.TransID}, Amount: ${amount}, From: ${body.MSISDN}, Ref: ${body.BillRefNumber}`);

    // Accept the transaction - confirmation will handle the actual recording
    return new Response(
      JSON.stringify({ 
        ResultCode: 0, 
        ResultDesc: 'Accepted' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Validation error:', error);
    // Accept on error to avoid blocking legitimate payments
    return new Response(
      JSON.stringify({ 
        ResultCode: 0, 
        ResultDesc: 'Accepted' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
