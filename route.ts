import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function staffOk(req: Request) {
  return req.headers.get("x-staff-password") === process.env.STAFF_PASSWORD;
}

export async function GET(req: Request) {
  if (!staffOk(req)) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token mancante" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_token, amount_cents, tickets(id, first_name, last_name, status, checked_in_at)")
    .eq("order_token", token)
    .eq("payment_status", "paid")
    .single();

  if (error || !data) return NextResponse.json({ error: "QR non valido" }, { status: 404 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  if (!staffOk(req)) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const body = await req.json();
  const ticketId = String(body.ticketId || "");
  if (!ticketId) return NextResponse.json({ error: "Ticket mancante" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: current } = await supabase.from("tickets").select("status").eq("id", ticketId).single();
  if (!current) return NextResponse.json({ error: "Ticket non trovato" }, { status: 404 });
  if (current.status === "used") return NextResponse.json({ error: "Ticket già utilizzato" }, { status: 409 });

  const { error } = await supabase
    .from("tickets")
    .update({ status: "used", checked_in_at: new Date().toISOString() })
    .eq("id", ticketId)
    .eq("status", "valid");

  if (error) return NextResponse.json({ error: "Check-in fallito" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
