"use client";

import { useEffect, useState } from "react";
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
  };

  tickets: Ticket[];
};

export default function SuccessPage() {
  const [data, setData] =
    useState<Data | null>(null);

  const [error, setError] =
    useState("");

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
                className="card"
              >
                <div
                  style={{
                    fontSize: "34px",
                    lineHeight: ".9",
                    fontWeight: 900,
                    letterSpacing: "-0.05em"
                  }}
                >
                  BRUCIA
                  <br />
                  MOI
                </div>

                <p className="small">
                  TICKET{" "}
                  {index + 1}/
                  {data.tickets.length}
                </p>

                <div
                  style={{
                    background: "white",
                    padding: "16px",
                    borderRadius: "18px",
                    width: "fit-content",
                    margin:
                      "28px auto"
                  }}
                >
                  <QRCodeCanvas
                    value={verifyUrl}
                    size={210}
                    level="H"
                  />
                </div>

                <div
                  style={{
                    textAlign: "center",
                    fontSize: "22px",
                    fontWeight: 900
                  }}
                >
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
