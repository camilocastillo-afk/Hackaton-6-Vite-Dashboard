// @ts-ignore-file
// Este archivo es para Supabase Edge Functions (Deno runtime)
import "https://deno.land/x/xhr@0.1.0/mod.ts";
// @ts-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
// @ts-ignore-file
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
// @ts-ignore-file
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY");

if (!SERVICE_ROLE_KEY) {
  console.error("SERVICE_ROLE_KEY is not set");
}
// @ts-ignore-file
serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decode JWT to get caller user id (verify_jwt=true already validated it)
    let callerId: string | null = null;
    try {
      const payloadPart = token.split(".")[1];
      const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(base64.length + (4 - (base64.length % 4 || 4)) % 4, "=");
      const json = atob(padded);
      const payload = JSON.parse(json);
      callerId = payload.sub as string;
    } catch (_) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "SERVICE_ROLE_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Check admin role
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    if (rolesError) throw rolesError;
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, roles: newRoles, display_name } = await req.json();
    if (!email || !password || !Array.isArray(newRoles) || newRoles.length === 0) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowedRoles = ["admin", "hr"];
    const rolesToAssign = newRoles.filter((r: string) => allowedRoles.includes(r));
    if (rolesToAssign.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid roles" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create auth user
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) throw createError;
    const newUser = created.user;

    // Insert profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({ id: newUser.id, email, display_name: display_name ?? null });
    if (profileError) throw profileError;

    // Assign roles
    const rolesRows = rolesToAssign.map((role: string) => ({ user_id: newUser.id, role }));
    const { error: rolesInsertError } = await supabaseAdmin.from("user_roles").insert(rolesRows);
    if (rolesInsertError && rolesInsertError.code !== "23505") throw rolesInsertError; // ignore duplicates

    return new Response(JSON.stringify({ user_id: newUser.id, email, roles: rolesToAssign }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("admin-create-user error", error);
    return new Response(JSON.stringify({ error: error?.message ?? "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
