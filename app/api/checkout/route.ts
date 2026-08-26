import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const people = body.people;
    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    if (!Array.isArray(people) || people.length < 1 || people.length > 20) {
      return NextResponse.json(
        { error: "Numero di partecipanti non valido." },
        { status: 400 }
      );
    }

    if (
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        { error: "Email non valida." },
        { status: 400 }
      );
    }

    const cleanPeople = people.map((person) => ({
      nome: String(person.nome || "").trim().slice(0, 60),
      cognome: String(person.cognome || "").trim().slice(0, 60)
    }));

    if (cleanPeople.some((p) => !p.nome || !p.cognome)) {
      return NextResponse.json(
        { error: "Nome e cognome sono obbligatori." },
        { status: 400 }
      );
    }

    const price = Number(process.env.TICKET_PRICE_CENTS || 1500);
    const origin = new URL(request.url).origin;

    const metadata: Record<string, string> = {
      people_count: String(cleanPeople.length),
      ticket_email: email
    };

    cleanPeople.forEach((person, index) => {
      metadata[`person_${index}`] = JSON.stringify(person);
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,

      line_items: [
        {
          quantity: cleanPeople.length,
          price_data: {
            currency: "eur",
            unit_amount: price,
            product_data: {
              name: "BRUCIA MOI — Ingresso"
            }
          }
        }
      ],

      metadata,

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
