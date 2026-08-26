"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import html2canvas from "html2canvas";

type Person = {
  nome: string;
  cognome: string;
};

type Ticket = {
  id: string;
  amount: number;
  currency: string;
  people: Person[];
};

export default function SuccessPage() {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sessionId = new URLSearchParams(
      window.location.search
    ).get("session_id");

    if (!sessionId) {
      setError("Sessione di pagamento mancante.");
      return;
    }

    async function loadTicket() {
      try {
        const response = await fetch(
          `/api/session?session_id=${encodeURIComponent(sessionId!)}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Biglietto non disponibile.");
        }

        setTicket(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Errore nel caricamento del biglietto."
        );
      }
    }

    loadTicket();
  }, []);

  async function downloadTicket() {
    if (!ticketRef.current || !ticket) return;

    setDownloading(true);

    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 3,
        backgroundColor: "#0b0b0b"
      });

      const link = document.createElement("a");

      link.download =
        `brucia-moi-${ticket.id.slice(-8)}.png`;

      link.href = canvas.toDataURL("image/png");

      link.click();
    } finally {
      setDownloading(false);
    }
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

  if (!ticket) {
    return (
      <main>
        <div className="logo">
          BRUCIA
          <br />
          MOI
        </div>

        <p className="subtitle">
          Generazione del biglietto...
        </p>
      </main>
    );
  }

  const verificationUrl =
    `${window.location.origin}/verify?session_id=${encodeURIComponent(ticket.id)}`;

  return (
    <main>
      <div className="logo">
        YOU'RE
        <br />
        IN 🔥
      </div>

      <p className="subtitle">
        Pagamento completato. Conserva questo biglietto.
      </p>

      <div
        ref={ticketRef}
        style={{
          background: "#111",
          border: "1px solid #333",
          borderRadius: "24px",
          padding: "28px",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            fontSize: "38px",
            lineHeight: ".9",
            fontWeight: 900,
            letterSpacing: "-0.05em"
          }}
        >
          BRUCIA
          <br />
          MOI
        </div>

        <p
          style={{
            marginTop: "28px",
            color: "#999",
            fontSize: "13px",
            letterSpacing: ".15em"
          }}
        >
          ADMIT ONE / TICKET
        </p>

        <div
          style={{
            background: "white",
            padding: "18px",
            borderRadius: "18px",
            width: "fit-content",
            margin: "28px auto"
          }}
        >
          <QRCodeCanvas
            value={verificationUrl}
            size={210}
            level="H"
            includeMargin={false}
          />
        </div>

        <div
          style={{
            textAlign: "center",
            fontWeight: 800,
            marginBottom: "26px"
          }}
        >
          {ticket.people.length}{" "}
          {ticket.people.length === 1
            ? "INGRESSO"
            : "INGRESSI"}
        </div>

        <div
          style={{
            borderTop: "1px solid #333"
          }}
        >
          {ticket.people.map((person, index) => (
            <div
              key={index}
              style={{
                padding: "14px 0",
                borderBottom: "1px solid #292929",
                fontSize: "17px",
                fontWeight: 700
              }}
            >
              {person.nome} {person.cognome}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "24px",
            gap: "12px"
          }}
        >
          <div>
            <div
              style={{
                color: "#777",
                fontSize: "11px"
              }}
            >
              ORDER
            </div>

            <div
              style={{
                fontFamily: "monospace",
                fontSize: "12px"
              }}
            >
              {ticket.id.slice(-12).toUpperCase()}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div
              style={{
                color: "#777",
                fontSize: "11px"
              }}
            >
              TOTAL
            </div>

            <strong>
              {(ticket.amount / 100).toFixed(2)} €
            </strong>
          </div>
        </div>
      </div>

      <button
        className="pay"
        style={{ marginTop: "18px" }}
        onClick={downloadTicket}
        disabled={downloading}
      >
        {downloading
          ? "Preparazione..."
          : "↓ Scarica biglietto"}
      </button>

      <p
        className="small"
        style={{
          textAlign: "center",
          marginTop: "14px"
        }}
      >
        Mostra il QR all'ingresso.
      </p>
    </main>
  );
}
