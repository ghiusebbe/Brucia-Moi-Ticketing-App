import { NextResponse } from "next/server";
import { Resend } from "resend";
import QRCode from "qrcode";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const resend = new Resend(
  process.env.RESEND_API_KEY!
);

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Ordine mancante." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: order, error: orderError } =
      await supabase
        .from("orders")
        .select(
          "id, email, amount_cents, payment_status"
        )
        .eq("id", orderId)
        .single();

    if (
      orderError ||
      !order ||
      order.payment_status !== "paid"
    ) {
      return NextResponse.json(
        { error: "Ordine non valido." },
        { status: 404 }
      );
    }

    if (!order.email) {
      return NextResponse.json(
        { error: "Email non presente nell'ordine." },
        { status: 400 }
      );
    }

    const { data: tickets, error: ticketError } =
      await supabase
        .from("tickets")
        .select(
          "id, nome, cognome, qr_token"
        )
        .eq("order_id", order.id)
        .order("created_at");

    if (ticketError || !tickets?.length) {
      return NextResponse.json(
        { error: "Nessun biglietto trovato." },
        { status: 404 }
      );
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      new URL(request.url).origin;

    const attachments = await Promise.all(
      tickets.map(async (ticket) => {
        const verifyUrl =
          `${appUrl}/verify?token=${ticket.qr_token}`;

        const qr = await QRCode.toBuffer(
          verifyUrl,
          {
            type: "png",
            width: 900,
            margin: 2,
            errorCorrectionLevel: "H"
          }
        );

        return {
          filename:
            `brucia-moi-${ticket.nome}-${ticket.cognome}.png`
              .replace(/[^a-zA-Z0-9._-]/g, "-"),
          content: qr
        };
      })
    );

    const peopleHtml = tickets
      .map(
        ticket => `
          <tr>
            <td style="
              padding:14px 0;
              border-bottom:1px solid #282828;
              font-size:16px;
              font-weight:600;
            ">
              ${escapeHtml(ticket.nome)}
              ${escapeHtml(ticket.cognome)}
            </td>
          </tr>
        `
      )
      .join("");

    const { error: sendError } =
      await resend.emails.send({
        from:
          process.env.TICKETS_FROM_EMAIL ||
          "Brucia Moi <onboarding@resend.dev>",

        to: order.email,

        subject:
          `${tickets.length === 1 ? "Il tuo biglietto" : "I tuoi biglietti"} Brucia Moi 🔥`,

        html: `
          <div style="
            margin:0;
            padding:32px 18px;
            background:#0b0710;
            color:#fff8ef;
            font-family:Arial,Helvetica,sans-serif;
          ">
            <div style="
              max-width:560px;
              margin:auto;
            ">
              <div style="
                font-size:52px;
                line-height:.82;
                font-weight:900;
                letter-spacing:-4px;
                margin-bottom:28px;
              ">
                BRUCIA<br>MOI
              </div>

              <h1 style="
                font-size:24px;
                margin:0 0 8px;
              ">
                You're in 🔥
              </h1>

              <p style="
                color:#b5a9b8;
                line-height:1.5;
                margin:0 0 28px;
              ">
                Il pagamento è completato.
                In allegato trovi un QR individuale
                per ogni partecipante.
              </p>

              <table
                width="100%"
                cellspacing="0"
                cellpadding="0"
                style="
                  border-top:1px solid #282828;
                  margin-bottom:28px;
                "
              >
                ${peopleHtml}
              </table>

              <p style="
                color:#8f8492;
                font-size:13px;
                line-height:1.5;
              ">
                Ogni QR è personale e può essere
                utilizzato una sola volta all'ingresso.
                Puoi inoltrare il relativo allegato
                direttamente alla persona interessata.
              </p>
            </div>
          </div>
        `,

        attachments
      });

    if (sendError) {
      console.error(sendError);

      return NextResponse.json(
        {
          error:
            "Non è stato possibile inviare l'email."
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      email: order.email
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Errore durante l'invio dei biglietti."
      },
      { status: 500 }
    );
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
