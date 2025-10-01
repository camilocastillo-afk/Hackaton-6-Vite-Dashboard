// supabase/functions/admin-delete-users/index.ts
// @ts-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { corsHeaders } from "../../cors";


console.log("Starting admin-delete-users function...");
// @ts-ignore-file
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// @ts-ignore-file
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

if (!SERVICE_ROLE_KEY) {
  console.error("SERVICE_ROLE_KEY is not set");
}

// @ts-ignore-file
serve(async (req) => {

    console.log("HeadersSent: ", corsHeaders);
  // 👇 Manejar preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        if (req.method !== "POST") {
            return new Response(JSON.stringify({ error: "Method not allowed" }), {
                status: 405,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
        }

        const { userId } = await req.json();
        if (!userId) {
            return new Response(JSON.stringify({ error: "Missing userId" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
        }

        // 1. Borrar en auth.users
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) throw authError;

        // 2. Borrar en profiles
        const { error: dbError } = await supabaseAdmin.from("profiles").delete().eq("id", userId);
        if (dbError) throw dbError;

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (err: any) {
        console.error("admin-delete-users error", err);
        return new Response(JSON.stringify({ error: err?.message ?? "Internal error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});