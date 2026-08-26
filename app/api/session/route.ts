import { NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Sessione mancante." },
        { status: 400 }
      );
    }

    // 1. Verifichiamo il pagamento direttamente con Stripe
    const session =
      await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Pagamento non completato." },
        { status: 402 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 2. Recuperiamo eventuale ordine già creato
    let { data: order } = await supabase
      .from("orders")
      .select("id, stripe_session_id, amount_cents")
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    // 3. Se non esiste, creiamo ordine + ticket
    if (!order) {
      const { data: newOrder, error: orderError } =
        await supabase
          .from("orders")
          .insert({
            stripe_session_id: session.id,
            amount_cents: session.amount_total || 0,
            payment_status: "paid"
          })
          .select(
            "id, stripe_session_id, amount_cents"
          )
          .single();

      if (orderError) {
        // Se due richieste arrivano contemporaneamente,
        // proviamo a recuperare l'ordine creato dall'altra.
        const { data: existingOrder } = await supabase
          .from("orders")
          .select(
            "id, stripe_session_id, amount_cents"
          )
          .eq("stripe_session_id", session.id)
          .maybeSingle();

        if (!existingOrder) throw orderError;

        order = existingOrder;
      } else {
        order = newOrder;

        const count = Number(
          session.metadata?.people_count || 0
        );

        const tickets = [];

        for (let i = 0; i < count; i++) {
          const raw =
            session.metadata?.[`person_${i}`];

          if (!raw) continue;

          try {
            const person = JSON.parse(raw);

            tickets.push({
              order_id: order.id,
              nome: String(person.nome || "").trim(),
              cognome: String(
                person.cognome || ""
              ).trim(),

              qr_token:
                crypto.randomBytes(24).toString("hex")
            });
          } catch {}
        }

        if (tickets.length > 0) {
          const { error: ticketsError } =
            await supabase
              .from("tickets")
              .insert(tickets);

          if (ticketsError) throw ticketsError;
        }
      }
    }

    // 4. Recuperiamo tutti i ticket dell'ordine
    const { data: tickets, error: ticketsError } =
      await supabase
        .from("tickets")
        .select(
          "id, nome, cognome, qr_token, checked_in, checked_in_at"
        )
        .eq("order_id", order.id)
        .order("created_at");

    if (ticketsError) throw ticketsError;

    return NextResponse.json({
      order: {
        id: order.id,
        stripe_session_id: order.stripe_session_id,
        amount: order.amount_cents
      },

      tickets: tickets || []
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Impossibile generare i biglietti." },
      { status: 500 }
    );
  }
}
