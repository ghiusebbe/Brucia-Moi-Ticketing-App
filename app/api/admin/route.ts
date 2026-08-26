import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function authorized(request: Request) {
  const received =
    request.headers.get("x-admin-password")?.trim();

  const expected =
    process.env.ADMIN_PASSWORD?.trim();

  if (!expected) {
    console.error("ADMIN_PASSWORD non configurata su Vercel");
    return false;
  }

  return received === expected;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { error: "Password admin non valida." },
      { status: 401 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: tickets, error } = await supabase
      .from("tickets")
      .select(`
        id,
        nome,
        cognome,
        checked_in,
        checked_in_at,
        created_at,
        orders (
          id,
          stripe_session_id,
          amount_cents,
          payment_status,
          created_at
        )
      `)
      .order("created_at", {
        ascending: false
      });

    if (error) {
      throw error;
    }

    const validTickets = (tickets || []).filter((ticket: any) => {
      const order = Array.isArray(ticket.orders)
        ? ticket.orders[0]
        : ticket.orders;

      return order?.payment_status === "paid";
    });

    const inside = validTickets.filter(
      (ticket: any) => ticket.checked_in
    );

    const outside = validTickets.filter(
      (ticket: any) => !ticket.checked_in
    );

    const revenue = validTickets.reduce(
      (sum: number, ticket: any) => {
        const order = Array.isArray(ticket.orders)
          ? ticket.orders[0]
          : ticket.orders;

        const orderTicketCount = validTickets.filter(
          (t: any) => {
            const tOrder = Array.isArray(t.orders)
              ? t.orders[0]
              : t.orders;

            return tOrder?.id === order?.id;
          }
        ).length;

        if (!order || !orderTicketCount) {
          return sum;
        }

        return sum +
          Number(order.amount_cents || 0) /
            orderTicketCount;
      },
      0
    );

    return NextResponse.json({
      stats: {
        inside: inside.length,
        sold: validTickets.length,
        outside: outside.length,
        revenueCents: Math.round(revenue)
      },

      tickets: validTickets.map((ticket: any) => {
        const order = Array.isArray(ticket.orders)
          ? ticket.orders[0]
          : ticket.orders;

        return {
          id: ticket.id,
          nome: ticket.nome,
          cognome: ticket.cognome,
          checkedIn: ticket.checked_in,
          checkedInAt: ticket.checked_in_at,
          createdAt: ticket.created_at,
          orderId: order?.id || null
        };
      })
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);

    return NextResponse.json(
      { error: "Impossibile caricare la dashboard." },
      { status: 500 }
    );
  }
}
