import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      return new Response(
        JSON.stringify({ error: "Twilio not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { currentTokenNumber } = await req.json();
    const today = new Date().toISOString().split("T")[0];

    // Get doctor settings for clinic name
    const { data: settings } = await supabase
      .from("doctor_settings")
      .select("clinic_name")
      .limit(1)
      .single();

    const clinicName = settings?.clinic_name || "The Clinic";

    // Helper function to send WhatsApp message
    async function sendWhatsAppMessage(to: string, message: string) {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      
      // Strip any existing whatsapp: prefix and re-add it cleanly
      const cleanFromNumber = twilioPhoneNumber!.replace(/^whatsapp:/, '');
      const cleanToNumber = to.replace(/^whatsapp:/, '');
      const fromNumber = `whatsapp:${cleanFromNumber}`;
      const toNumber = `whatsapp:${cleanToNumber}`;
      
      const response = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: fromNumber,
          To: toNumber,
          Body: message,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Twilio error:", error);
        throw new Error("Failed to send WhatsApp message");
      }

      return response.json();
    }

    // Get waiting tokens that need to be notified (next 3 in queue)
    const { data: waitingTokens, error } = await supabase
      .from("tokens")
      .select("*")
      .eq("queue_date", today)
      .eq("status", "WAITING")
      .eq("notified", false)
      .order("token_number", { ascending: true })
      .limit(3);

    if (error) throw error;

    const notifications = [];

    for (const token of waitingTokens || []) {
      const positionInQueue = token.token_number - currentTokenNumber;
      
      if (positionInQueue <= 3 && positionInQueue > 0) {
        let message = "";
        
        if (positionInQueue === 1) {
          message = `🔔 *Alert from ${clinicName}*\n\n⚡ Your turn is NEXT!\nToken No: *${token.token_number}*\n\nPlease proceed to the clinic immediately.`;
        } else {
          message = `🔔 *Alert from ${clinicName}*\n\nYour token (No: *${token.token_number}*) is coming up.\nYou are *${positionInQueue}${positionInQueue === 2 ? "nd" : "rd"}* in line.\n\nPlease be ready.`;
        }

        try {
          await sendWhatsAppMessage(token.phone_number, message);
          
          // Mark as notified
          await supabase
            .from("tokens")
            .update({ notified: true })
            .eq("id", token.id);

          notifications.push({
            tokenNumber: token.token_number,
            phone: token.phone_number,
            position: positionInQueue,
            success: true,
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          console.error(`Failed to notify token ${token.token_number}:`, err);
          notifications.push({
            tokenNumber: token.token_number,
            phone: token.phone_number,
            position: positionInQueue,
            success: false,
            error: errorMessage,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, notifications }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Send alert error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});