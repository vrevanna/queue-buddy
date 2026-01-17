import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConversationState {
  step: "MENU" | "AWAITING_NAME";
  phone: string;
}

// In-memory conversation state (for simple state management)
const conversations = new Map<string, ConversationState>();

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle Twilio webhook verification (GET request)
  if (req.method === "GET") {
    return new Response("WhatsApp Webhook Active", { headers: corsHeaders });
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
      console.error("Twilio credentials not configured");
      return new Response(
        JSON.stringify({ error: "Twilio not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse incoming WhatsApp message from Twilio
    const formData = await req.formData();
    const from = formData.get("From") as string; // e.g., "whatsapp:+919876543210"
    const body = (formData.get("Body") as string || "").trim().toUpperCase();
    const patientPhone = from.replace("whatsapp:", "");

    console.log(`Received message from ${patientPhone}: ${body}`);

    // Get doctor settings
    const { data: settings } = await supabase
      .from("doctor_settings")
      .select("*")
      .limit(1)
      .single();

    const today = new Date().toISOString().split("T")[0];

    // Helper function to send WhatsApp message via Twilio
    async function sendWhatsAppMessage(to: string, message: string) {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      
      const response = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: `whatsapp:${twilioPhoneNumber}`,
          To: `whatsapp:${to}`,
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

    // Check if within doctor hours
    function isWithinDoctorHours(): { available: boolean; message: string; closingSoon: boolean } {
      if (!settings || !settings.is_active) {
        return { 
          available: false, 
          message: "Doctor is not available currently. Please try again later.",
          closingSoon: false 
        };
      }

      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

      const morningStart = settings.start_time_morning;
      const morningEnd = settings.end_time_morning;
      const eveningStart = settings.start_time_evening;
      const eveningEnd = settings.end_time_evening;

      // Check morning slot
      const inMorning = currentTime >= morningStart && currentTime <= morningEnd;
      // Check evening slot
      const inEvening = currentTime >= eveningStart && currentTime <= eveningEnd;

      if (!inMorning && !inEvening) {
        return {
          available: false,
          message: `❌ Tokens are not being issued now.\n\n🕒 Doctor is available:\n• Morning: ${morningStart} - ${morningEnd}\n• Evening: ${eveningStart} - ${eveningEnd}`,
          closingSoon: false,
        };
      }

      // Check if within last 10 minutes of session
      const currentEnd = inMorning ? morningEnd : eveningEnd;
      const endParts = currentEnd.split(":").map(Number);
      const currentParts = currentTime.split(":").map(Number);
      
      const endMinutes = endParts[0] * 60 + endParts[1];
      const currentMinutes = currentParts[0] * 60 + currentParts[1];
      const minutesUntilClose = endMinutes - currentMinutes;

      if (minutesUntilClose <= 10) {
        return {
          available: false,
          message: "⚠️ Token issuance closed for this session.\nPlease try again in the next available slot.",
          closingSoon: true,
        };
      }

      return { available: true, message: "", closingSoon: false };
    }

    // Check for existing active token
    async function hasActiveToken(phone: string): Promise<{ hasToken: boolean; tokenNumber?: number }> {
      const { data } = await supabase
        .from("tokens")
        .select("token_number")
        .eq("phone_number", phone)
        .eq("queue_date", today)
        .in("status", ["WAITING", "RUNNING"])
        .limit(1);

      if (data && data.length > 0) {
        return { hasToken: true, tokenNumber: data[0].token_number };
      }
      return { hasToken: false };
    }

    // Generate new token
    async function generateToken(phone: string, name: string) {
      // Get or create queue state
      let { data: queueState } = await supabase
        .from("queue_state")
        .select("*")
        .eq("queue_date", today)
        .maybeSingle();

      const nextTokenNumber = (queueState?.total_tokens_today || 0) + 1;

      // Count waiting tokens for wait time calculation
      const { count } = await supabase
        .from("tokens")
        .select("*", { count: "exact", head: true })
        .eq("queue_date", today)
        .eq("status", "WAITING");

      const waitingCount = count || 0;
      const avgTime = settings?.avg_consultation_time || 7;
      const estimatedWait = waitingCount * avgTime;

      // Insert new token
      const { data: newToken, error } = await supabase
        .from("tokens")
        .insert({
          token_number: nextTokenNumber,
          patient_name: name,
          phone_number: phone,
          status: "WAITING",
          estimated_wait_time: estimatedWait,
          queue_date: today,
        })
        .select()
        .single();

      if (error) throw error;

      // Update queue state
      if (queueState) {
        await supabase
          .from("queue_state")
          .update({ total_tokens_today: nextTokenNumber })
          .eq("id", queueState.id);
      } else {
        await supabase
          .from("queue_state")
          .insert({
            queue_date: today,
            current_token_number: 0,
            total_tokens_today: nextTokenNumber,
          });
      }

      return { tokenNumber: nextTokenNumber, estimatedWait };
    }

    // Cancel token
    async function cancelToken(phone: string): Promise<{ cancelled: boolean; tokenNumber?: number }> {
      const { data } = await supabase
        .from("tokens")
        .update({ status: "CANCELLED" })
        .eq("phone_number", phone)
        .eq("queue_date", today)
        .in("status", ["WAITING", "RUNNING"])
        .select()
        .limit(1);

      if (data && data.length > 0) {
        return { cancelled: true, tokenNumber: data[0].token_number };
      }
      return { cancelled: false };
    }

    // Get conversation state
    const state = conversations.get(patientPhone) || { step: "MENU", phone: patientPhone };

    let responseMessage = "";

    // Handle CANCEL command from any state
    if (body === "CANCEL") {
      const result = await cancelToken(patientPhone);
      if (result.cancelled) {
        responseMessage = `❌ Your token #${result.tokenNumber} has been cancelled.\n\nThank you for letting us know.`;
      } else {
        responseMessage = "You don't have an active token to cancel.";
      }
      conversations.delete(patientPhone);
    }
    // Handle based on conversation state
    else if (state.step === "AWAITING_NAME") {
      // User is providing their name for token
      const patientName = (formData.get("Body") as string || "").trim();
      
      if (patientName.length < 2) {
        responseMessage = "Please enter a valid name (at least 2 characters).";
      } else {
        const { tokenNumber, estimatedWait } = await generateToken(patientPhone, patientName);
        
        responseMessage = `✅ *Token Generated!*\n\n🪪 Token No: *${tokenNumber}*\n⏳ Approx Waiting Time: *${estimatedWait} minutes*\n\nYou will be notified when your turn is near.\n\nType *CANCEL* to cancel your token.`;
        conversations.delete(patientPhone);
      }
    }
    // Menu options
    else if (body === "1" || body === "TIMINGS" || body === "DOCTOR TIMINGS") {
      if (settings) {
        responseMessage = `🕒 *Doctor Timings*\n\n📍 ${settings.clinic_name}\n\n• Morning: ${settings.start_time_morning} - ${settings.end_time_morning}\n• Evening: ${settings.start_time_evening} - ${settings.end_time_evening}\n\n📋 Average consultation: ~${settings.avg_consultation_time} mins`;
      } else {
        responseMessage = "Doctor timings are not configured yet. Please contact the clinic.";
      }
    }
    else if (body === "2" || body === "TOKEN" || body === "GET TOKEN") {
      // Check doctor hours first
      const hourCheck = isWithinDoctorHours();
      if (!hourCheck.available) {
        responseMessage = hourCheck.message;
      } else {
        // Check for existing token
        const existingToken = await hasActiveToken(patientPhone);
        if (existingToken.hasToken) {
          responseMessage = `⚠️ You already have an active token (No: ${existingToken.tokenNumber}).\n\nType *CANCEL* to cancel it if you want a new one.`;
        } else {
          responseMessage = "Please reply with your *name* to generate a token.";
          conversations.set(patientPhone, { step: "AWAITING_NAME", phone: patientPhone });
        }
      }
    }
    // Default welcome message
    else {
      const clinicName = settings?.clinic_name || "Our Clinic";
      responseMessage = `Welcome to ${clinicName} 👋\n\nPlease choose an option:\n\n1️⃣ Doctor Timings\n2️⃣ Get Token\n\nType *CANCEL* to cancel an existing token.`;
    }

    // Send response via Twilio
    await sendWhatsAppMessage(patientPhone, responseMessage);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});