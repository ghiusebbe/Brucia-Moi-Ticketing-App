"use client";

import { useRef, useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import html2canvas from "html2canvas";

type Ticket = {
  id: string;
  nome: string;
  cognome: string;
  qr_token: string;
  checked_in: boolean;
  checked_in_at: string | null;
};

type Data = {
  order: {
    id: string;
    stripe_session_id: string;
    amount: number;
    email: string;
  };

  tickets: Ticket[];
};

export default function SuccessPage() {
  const [data, setData] =
    useState<Data | null>(null);

  const [error, setError] =
    useState("");

  const [sendingEmail, setSendingEmail] =
    useState(false);

  const [emailSent, setEmailSent] =
    useState(false);

  const [emailError, setEmailError] =
    useState("");

  const automaticEmailSent = useRef(false);

  useEffect(() => {
    const sessionId =
      new URLSearchParams(
        window.location.search
      ).get("session_id");

    if (!sessionId) {
      setError("Sessione mancante.");
      return;
    }

    async function load() {
      const response = await fetch(
        `/api/session?session_id=${encodeURIComponent(
          sessionId!
        )}`
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Impossibile generare i biglietti."
        );

        return;
      }

      setData(result);
    }

    load();
  }, []);

  async function sendTicketsByEmail() {
    if (!data || sendingEmail) return;

    setSendingEmail(true);
    setEmailError("");

    try {
      const response = await fetch(
        "/api/tickets/email",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            orderId: data.order.id
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
          "Invio email non riuscito."
        );
      }

      setEmailSent(true);
    } catch (error) {
      setEmailError(
        error instanceof Error
          ? error.message
          : "Invio email non riuscito."
      );
    } finally {
      setSendingEmail(false);
    }
  }

  async function download(
    ticket: Ticket
  ) {
    const element =
      document.getElementById(
        `ticket-${ticket.id}`
      );

    if (!element) return;

    const canvas = await html2canvas(
      element,
      {
        scale: 3,
        backgroundColor: "#111111"
      }
    );

    const link =
      document.createElement("a");

    link.download =
      `brucia-moi-${ticket.nome}-${ticket.cognome}.png`;

    link.href =
      canvas.toDataURL("image/png");

    link.click();
  }

  if (error) {
    return (
      <main>
        <div className="logo">
          BRUCIA
          <br />
          MOI
        </div>

        <p style={{ color: "#ff9999" }}>
          {error}
        </p>
      </main>
    );
  }


  useEffect(() => {
    if (
      !data ||
      !data.order?.id ||
      !data.order?.email ||
      !data.tickets?.length ||
      automaticEmailSent.current
    ) {
      return;
    }

    automaticEmailSent.current = true;

    void sendTicketsByEmail();
  }, [data]);

  if (!data) {
    return (
      <main>
        <div className="logo">
          BRUCIA
          <br />
          MOI
        </div>

        <p className="subtitle">
          Generazione dei biglietti...
        </p>
      </main>
    );
  }

  return (
    <main>
      <div className="logo">
        YOU'RE
        <br />
        IN 🔥
      </div>

      <p className="subtitle">
        {data.tickets.length} biglietti
        generati. Ogni partecipante ha
        il proprio QR.
      </p>

      <section className="email-ticket-panel">
        <div className="email-ticket-icon">
          ✉
        </div>

        <div className="email-ticket-copy">
          <strong>
            Biglietti via email
          </strong>

          <span>
            {data.order.email}
          </span>
        </div>

        <button
          className={
            emailSent
              ? "email-ticket-button sent"
              : "email-ticket-button"
          }
          onClick={sendTicketsByEmail}
          disabled={sendingEmail}
        >
          {emailSent
            ? "✓ Inviati"
            : sendingEmail
            ? "Invio..."
            : "Reinvia"}
        </button>
      </section>

      {emailError && (
        <p className="email-ticket-error">
          {emailError}
        </p>
      )}

      {data.tickets.map(
        (ticket, index) => {

          const verifyUrl =
            `${window.location.origin}` +
            `/verify?token=${ticket.qr_token}`;

          return (
            <div
              key={ticket.id}
              style={{
                marginBottom: "38px"
              }}
            >
              <div
                id={`ticket-${ticket.id}`}
                className="ticket-card"
              >
                <div className="ticket-title">
                  BRUCIA
                  <br />
                  MOI
                </div>

                <p className="ticket-meta">
                  TICKET {index + 1}/{data.tickets.length}
                </p>

                <div className="qr-frame">
                  <QRCodeCanvas
                    value={verifyUrl}
                    size={210}
                    level="H"
                  />
                </div>

                <div className="ticket-name">
                  {ticket.nome}{" "}
                  {ticket.cognome}
                </div>

                <p
                  className="small"
                  style={{
                    textAlign: "center"
                  }}
                >
                  QR INDIVIDUALE
                </p>
              </div>

              <button
                className="pay"
                style={{
                  marginTop: "10px"
                }}
                onClick={() =>
                  download(ticket)
                }
              >
                ↓ Scarica biglietto di{" "}
                {ticket.nome}
              </button>
            </div>
          );
        }
      )}
    </main>
  );
}
