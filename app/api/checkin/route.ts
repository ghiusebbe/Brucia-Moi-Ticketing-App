import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function authorized(request: Request) {
  return (
    request.headers.get("x-staff-password") ===
    process.env.STAFF_PASSWORD
  );
}

async function getTicket(sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    throw new Error("PAYMENT_NOT_VALID");
  }

  const count = Number(session.metadata?.people_count || 0);

  const people = [];

  for (let i = 0; i < count; i++) {
    const raw = session.metadata?.[`person_${i}`];

    if (raw) {
      try {
        people.push(JSON.parse(raw));
      } catch {}
    }
  }

  return {
    session,
    people
  };
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { error: "Password staff non valida." },
      { status: 401 }
    );
  }

  try {
    const sessionId =
      new URL(request.url).searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Biglietto mancante." },
        { status: 400 }
      );
    }

    const { session, people } = await getTicket(sessionId);

    const supabase = getSupabaseAdmin();

    const { data: checkin } = await supabase
      .from("checkins")
      .select("checked_in_at")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    return NextResponse.json({
      valid: true,
      used: Boolean(checkin),
      checkedInAt: checkin?.checked_in_at || null,
      people,
      amount: session.amount_total || 0,
      order: session.id.slice(-12).toUpperCase()
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "QR non valido o pagamento non trovato." },
      { status: 404 }
    );
  }
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { error: "Password staff non valida." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const sessionId = String(body.session_id || "");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Biglietto mancante." },
        { status: 400 }
      );
    }

    await getTicket(sessionId);

    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from("checkins")
      .select("checked_in_at")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          error: "Biglietto già utilizzato.",
          checkedInAt: existing.checked_in_at
        },
        { status: 409 }
      );
    }

    const checkedInAt = new Date().toISOString();

    const { error } = await supabase
      .from("checkins")
      .insert({
        stripe_session_id: sessionId,
        checked_in_at: checkedInAt
      });

    if (error) {
      // La UNIQUE evita che due telefoni facciano check-in
      // contemporaneamente sullo stesso biglietto.
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Biglietto già utilizzato." },
          { status: 409 }
        );
      }

      throw error;
    }

    return NextResponse.json({
      ok: true,
      checkedInAt
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Impossibile effettuare il check-in." },
      { status: 500 }
    );
  }
}
