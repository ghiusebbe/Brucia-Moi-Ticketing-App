import { NextResponse } from "next/server";
import Stripe from "stripe";

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

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Pagamento non completato." },
        { status: 402 }
      );
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

    return NextResponse.json({
      id: session.id,
      amount: session.amount_total || 0,
      currency: session.currency || "eur",
      people
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Biglietto non trovato." },
      { status: 404 }
    );
  }
}
