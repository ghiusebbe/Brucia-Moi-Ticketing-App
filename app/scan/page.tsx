"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

type Person = {
  nome: string;
  cognome: string;
};

type Ticket = {
  valid: boolean;
  used: boolean;
  checkedInAt: string | null;
  people: Person[];
  amount: number;
  order: string;
};

export default function ScanPage() {
  const [password, setPassword] = useState("");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [message, setMessage] = useState("");
  const [scanning, setScanning] = useState(false);

  const scanner = useRef<Html5Qrcode | null>(null);

  async function verify(id: string) {
    setMessage("");
    setTicket(null);

    const response = await fetch(
      `/api/checkin?session_id=${encodeURIComponent(id)}`,
      {
        headers: {
          "x-staff-password": password
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || "Biglietto non valido.");
      return;
    }

    setSessionId(id);
    setTicket(data);
  }

  function parseQr(value: string) {
    try {
      const url = new URL(value);

      const id = url.searchParams.get("session_id");

      return id || value;
    } catch {
      return value;
    }
  }

  async function startScanner() {
    if (!password) {
      setMessage("Inserisci prima la password staff.");
      return;
    }

    setMessage("");
    setTicket(null);

    const instance = new Html5Qrcode("reader");

    scanner.current = instance;

    try {
      await instance.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: {
            width: 240,
            height: 240
          }
        },
        async (decodedText) => {
          const id = parseQr(decodedText);

          await instance.stop();

          setScanning(false);

          await verify(id);
        },
        () => {}
      );

      setScanning(true);
    } catch (error) {
      console.error(error);

      setMessage(
        "Impossibile aprire la fotocamera. Controlla i permessi."
      );
    }
  }

  async function checkIn() {
    if (!sessionId) return;

    const response = await fetch("/api/checkin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-staff-password": password
      },
      body: JSON.stringify({
        session_id: sessionId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || "Errore check-in");

      await verify(sessionId);

      return;
    }

    await verify(sessionId);
  }

  async function scanAnother() {
    setTicket(null);
    setSessionId("");
    setMessage("");

    await startScanner();
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const id = params.get("session_id");

    if (id) {
      setSessionId(id);
    }

    return () => {
      scanner.current?.stop().catch(() => {});
    };
  }, []);

  return (
    <main>
      <div className="logo">
        CHECK
        <br />
        IN
      </div>

      <p className="subtitle">
        Scanner staff Brucia Moi
      </p>

      <div className="card">
        <input
          type="password"
          placeholder="Password staff"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          className="pay"
          style={{ marginTop: "12px" }}
          onClick={startScanner}
          disabled={scanning}
        >
          {scanning
            ? "Scanner attivo..."
            : "Apri scanner QR"}
        </button>
      </div>

      <div
        id="reader"
        style={{
          width: "100%",
          marginTop: "18px",
          overflow: "hidden",
          borderRadius: "18px"
        }}
      />

      {message && (
        <div
          className="card"
          style={{
            marginTop: "18px",
            color: "#ff9999"
          }}
        >
          <strong>{message}</strong>
        </div>
      )}

      {ticket && (
        <div
          className="card"
          style={{ marginTop: "18px" }}
        >
          {ticket.used ? (
            <>
              <div
                style={{
                  fontSize: "32px",
                  fontWeight: 900,
                  color: "#ff8f8f"
                }}
              >
                ✕ GIÀ UTILIZZATO
              </div>

              {ticket.checkedInAt && (
                <p className="small">
                  Check-in:{" "}
                  {new Date(
                    ticket.checkedInAt
                  ).toLocaleString("it-IT")}
                </p>
              )}
            </>
          ) : (
            <div
              style={{
                fontSize: "32px",
                fontWeight: 900,
                color: "#9affae"
              }}
            >
              ✓ VALIDO
            </div>
          )}

          <p className="small">
            ORDINE {ticket.order}
          </p>

          <div
            style={{
              borderTop: "1px solid #333",
              marginTop: "18px"
            }}
          >
            {ticket.people.map((person, index) => (
              <div
                key={index}
                style={{
                  padding: "15px 0",
                  borderBottom: "1px solid #292929",
                  fontSize: "18px",
                  fontWeight: 700
                }}
              >
                {person.nome} {person.cognome}
              </div>
            ))}
          </div>

          <p>
            <strong>
              {ticket.people.length}{" "}
              {ticket.people.length === 1
                ? "ingresso"
                : "ingressi"}
            </strong>
          </p>

          {!ticket.used && (
            <button
              className="pay"
              onClick={checkIn}
            >
              ✓ CONFERMA INGRESSO
            </button>
          )}

          <button
            className="secondary"
            style={{
              width: "100%",
              marginTop: "10px"
            }}
            onClick={scanAnother}
          >
            Scansiona altro biglietto
          </button>
        </div>
      )}
    </main>
  );
}
