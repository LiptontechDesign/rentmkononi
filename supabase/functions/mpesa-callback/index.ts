// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// M-Pesa C2B callback payload types
interface MpesaCallbackBody {
  Body?: {
    stkCallback?: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{ Name: string; Value?: string | number }>;
      };
    };
  };
  // C2B Confirmation payload
  TransactionType?: string;
  TransID?: string;
  TransTime?: string;
  TransAmount?: string;
  BusinessShortCode?: string;
  BillRefNumber?: string;
  InvoiceNumber?: string;
  OrgAccountBalance?: string;
  ThirdPartyTransID?: string;
  MSISDN?: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
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
      console.error('Missing landlord_id in callback URL');
      return new Response(
        JSON.stringify({ ResultCode: 1, ResultDesc: 'Missing landlord_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse callback body
    const body: MpesaCallbackBody = await req.json();
    console.log('M-Pesa Callback received:', JSON.stringify(body));

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify landlord has active M-Pesa settings
    const { data: mpesaSettings, error: settingsError } = await supabase
      .from('mpesa_settings')
      .select('*')
      .eq('landlord_id', landlordId)
      .eq('status', 'ACTIVE')
      .single();

    if (settingsError || !mpesaSettings) {
      console.error('M-Pesa settings not found or inactive for landlord:', landlordId);
      return new Response(
        JSON.stringify({ ResultCode: 1, ResultDesc: 'Integration not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle STK Push callback (Lipa Na M-Pesa Online)
    if (body.Body?.stkCallback) {
      const callback = body.Body.stkCallback;
      
      if (callback.ResultCode !== 0) {
        console.log('STK Push failed:', callback.ResultDesc);
        return new Response(
          JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Extract payment details from callback metadata
      const metadata = callback.CallbackMetadata?.Item || [];
      const amount = metadata.find(i => i.Name === 'Amount')?.Value as number;
      const mpesaReceiptNumber = metadata.find(i => i.Name === 'MpesaReceiptNumber')?.Value as string;
      const phoneNumber = metadata.find(i => i.Name === 'PhoneNumber')?.Value?.toString();

      if (amount && mpesaReceiptNumber) {
        // Create payment record
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            landlord_id: landlordId,
            amount: Math.round(amount),
            source: 'MPESA',
            mpesa_trans_id: mpesaReceiptNumber,
            phone_number: phoneNumber,
            paid_at: new Date().toISOString(),
            is_matched: false,
          });

        if (paymentError) {
          console.error('Failed to save payment:', paymentError);
        } else {
          console.log('Payment saved successfully:', mpesaReceiptNumber);
        }
      }
    }
    // Handle C2B Confirmation (Customer to Business - Paybill/Till)
    else if (body.TransID) {
      const amount = parseFloat(body.TransAmount || '0');
      const phoneNumber = body.MSISDN;
      const transId = body.TransID;
      const reference = body.BillRefNumber; // This is what tenant enters as account number

      if (amount > 0 && transId) {
        // Check for duplicate transaction
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('mpesa_trans_id', transId)
          .single();

        if (existingPayment) {
          console.log('Duplicate transaction ignored:', transId);
          return new Response(
            JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Try to auto-match to tenancy based on reference (account number)
        let tenancyId: string | null = null;
        let isMatched = false;

        if (reference) {
          // Try matching by unit code
          const { data: unit } = await supabase
            .from('units')
            .select('id')
            .eq('landlord_id', landlordId)
            .ilike('unit_code', reference)
            .single();

          if (unit) {
            // Find active tenancy for this unit
            const { data: tenancy } = await supabase
              .from('tenancies')
              .select('id')
              .eq('landlord_id', landlordId)
              .eq('unit_id', unit.id)
              .in('status', ['ACTIVE', 'NOTICE'])
              .single();

            if (tenancy) {
              tenancyId = tenancy.id;
              isMatched = true;
            }
          }

          // If not matched by unit, try matching by tenant phone
          if (!isMatched && phoneNumber) {
            const formattedPhone = phoneNumber.replace(/^254/, '0');
            const { data: tenants } = await supabase
              .from('tenants')
              .select('id')
              .eq('landlord_id', landlordId)
              .contains('phone_numbers', [{ number: formattedPhone }]);

            if (tenants && tenants.length === 1) {
              // Find active tenancy for this tenant
              const { data: tenancy } = await supabase
                .from('tenancies')
                .select('id')
                .eq('landlord_id', landlordId)
                .eq('tenant_id', tenants[0].id)
                .in('status', ['ACTIVE', 'NOTICE'])
                .single();

              if (tenancy) {
                tenancyId = tenancy.id;
                isMatched = true;
              }
            }
          }
        }

        // Create payment record
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            landlord_id: landlordId,
            tenancy_id: tenancyId,
            amount: Math.round(amount),
            source: 'MPESA',
            mpesa_trans_id: transId,
            phone_number: phoneNumber,
            raw_reference: reference,
            paid_at: new Date().toISOString(),
            is_matched: isMatched,
          });

        if (paymentError) {
          console.error('Failed to save payment:', paymentError);
        } else {
          console.log('Payment saved successfully:', transId, 'Matched:', isMatched);
        }
      }
    }

    // Always respond with success to M-Pesa
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Callback processing error:', error);
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
