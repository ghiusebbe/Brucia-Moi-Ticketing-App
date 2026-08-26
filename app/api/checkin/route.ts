import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function authorized(request: Request) {
  return (
    request.headers.get("x-staff-password") ===
    process.env.STAFF_PASSWORD
  );
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { error: "Password staff non valida." },
      { status: 401 }
    );
  }

  try {
    const token =
      new URL(request.url).searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "QR non valido." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: ticket, error } = await supabase
      .from("tickets")
      .select(`
        id,
        nome,
        cognome,
        qr_token,
        checked_in,
        checked_in_at,
        orders (
          id,
          stripe_session_id,
          amount_cents,
          payment_status
        )
      `)
      .eq("qr_token", token)
      .maybeSingle();

    if (error || !ticket) {
      return NextResponse.json(
        { error: "Biglietto non trovato." },
        { status: 404 }
      );
    }

    const order: any = ticket.orders;

    if (!order || order.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Pagamento non valido." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      valid: true,

      ticket: {
        id: ticket.id,
        nome: ticket.nome,
        cognome: ticket.cognome,
        checkedIn: ticket.checked_in,
        checkedInAt: ticket.checked_in_at
      },

      order: {
        id: order.id,
        stripeSessionId:
          order.stripe_session_id
      }
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Errore verifica biglietto." },
      { status: 500 }
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

    const token = String(body.token || "");

    if (!token) {
      return NextResponse.json(
        { error: "Token mancante." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Update condizionale:
    // può essere usato solo se checked_in è ancora false.
    const checkedInAt = new Date().toISOString();

    const { data, error } = await supabase
      .from("tickets")
      .update({
        checked_in: true,
        checked_in_at: checkedInAt
      })
      .eq("qr_token", token)
      .eq("checked_in", false)
      .select(
        "id, nome, cognome, checked_in, checked_in_at"
      )
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const { data: existing } = await supabase
        .from("tickets")
        .select(
          "nome, cognome, checked_in, checked_in_at"
        )
        .eq("qr_token", token)
        .maybeSingle();

      if (!existing) {
        return NextResponse.json(
          { error: "Biglietto non trovato." },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          error: "Biglietto già utilizzato.",
          checkedInAt:
            existing.checked_in_at
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      ticket: data
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Check-in non riuscito." },
      { status: 500 }
    );
  }
}
