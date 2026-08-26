import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const people = body.people;

    if (!Array.isArray(people) || people.length < 1 || people.length > 20) {
      return NextResponse.json(
        { error: "Numero di partecipanti non valido." },
        { status: 400 }
      );
    }

    for (const person of people) {
      if (
        !person.nome ||
        !person.cognome ||
        typeof person.nome !== "string" ||
        typeof person.cognome !== "string"
      ) {
        return NextResponse.json(
          { error: "Nome e cognome sono obbligatori." },
          { status: 400 }
        );
      }
    }

    const price = Number(process.env.TICKET_PRICE_CENTS || 1500);

    const origin = new URL(request.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      line_items: [
        {
          quantity: people.length,
          price_data: {
            currency: "eur",
            unit_amount: price,
            product_data: {
              name: "BRUCIA MOI — Ingresso"
            }
          }
        }
      ],

      success_url:
        `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: origin
    });

    return NextResponse.json({
      url: session.url
    });
  } catch (error) {
    console.error("Stripe error:", error);

    return NextResponse.json(
      { error: "Errore durante la creazione del pagamento." },
      { status: 500 }
    );
  }
}
