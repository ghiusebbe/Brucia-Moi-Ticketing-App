"use client";

import {
  useRef,
  useState
} from "react";

import {
  Html5Qrcode
} from "html5-qrcode";

type TicketData = {
  valid: boolean;

  ticket: {
    id: string;
    nome: string;
    cognome: string;
    checkedIn: boolean;
    checkedInAt: string | null;
  };
};

export default function ScanPage() {
  const [password, setPassword] =
    useState("");

  const [token, setToken] =
    useState("");

  const [data, setData] =
    useState<TicketData | null>(null);

  const [message, setMessage] =
    useState("");

  const [scanning, setScanning] =
    useState(false);

  const scanner =
    useRef<Html5Qrcode | null>(null);

  function extractToken(
    value: string
  ) {
    try {
      const url = new URL(value);

      return (
        url.searchParams.get("token") ||
        value
      );
    } catch {
      return value;
    }
  }

  async function verify(
    qrToken: string
  ) {
    const response = await fetch(
      `/api/checkin?token=${encodeURIComponent(
        qrToken
      )}`,
      {
        headers: {
          "x-staff-password":
            password
        }
      }
    );

    const result =
      await response.json();

    if (!response.ok) {
      setData(null);

      setMessage(
        result.error ||
          "Biglietto non valido."
      );

      return;
    }

    setToken(qrToken);
    setData(result);
    setMessage("");
  }

  async function startScanner() {
    if (!password) {
      setMessage(
        "Inserisci la password staff."
      );

      return;
    }

    setData(null);
    setMessage("");

    const instance =
      new Html5Qrcode("reader");

    scanner.current =
      instance;

    try {
      await instance.start(
        {
          facingMode:
            "environment"
        },

        {
          fps: 10,

          qrbox: {
            width: 240,
            height: 240
          }
        },

        async (
          decodedText
        ) => {
          const qrToken =
            extractToken(
              decodedText
            );

          await instance.stop();

          setScanning(false);

          await verify(qrToken);
        },

        () => {}
      );

      setScanning(true);
    } catch {
      setMessage(
        "Impossibile aprire la fotocamera."
      );
    }
  }

  async function checkIn() {
    const response =
      await fetch(
        "/api/checkin",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "x-staff-password":
              password
          },

          body:
            JSON.stringify({
              token
            })
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      setMessage(
        result.error ||
          "Errore check-in."
      );

      await verify(token);

      return;
    }

    await verify(token);
  }

  async function another() {
    setData(null);
    setToken("");
    setMessage("");

    await startScanner();
  }

  return (
    <main>
      <div className="logo">
        CHECK
        <br />
        IN
      </div>

      <p className="subtitle">
        Brucia Moi Staff
      </p>

      <div className="card">
        <input
          type="password"
          placeholder="Password staff"
          value={password}
          onChange={(e) =>
            setPassword(
              e.target.value
            )
          }
        />

        <button
          className="pay"
          style={{
            marginTop: "12px"
          }}
          onClick={
            startScanner
          }
          disabled={
            scanning
          }
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
          borderRadius: "18px",
          overflow: "hidden"
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
          {message}
        </div>
      )}

      {data && (
        <div
          className="card"
          style={{
            marginTop: "18px"
          }}
        >
          {data.ticket
            .checkedIn ? (
            <>
              <div
                style={{
                  color:
                    "#ff8888",
                  fontSize:
                    "30px",
                  fontWeight:
                    900
                }}
              >
                ✕ GIÀ
                UTILIZZATO
              </div>

              <p className="small">
                {data.ticket
                  .checkedInAt
                  ? new Date(
                      data.ticket
                        .checkedInAt
                    ).toLocaleString(
                      "it-IT"
                    )
                  : ""}
              </p>
            </>
          ) : (
            <div
              style={{
                color:
                  "#92ffaa",
                fontSize:
                  "30px",
                fontWeight:
                  900
              }}
            >
              ✓ VALIDO
            </div>
          )}

          <div
            style={{
              margin:
                "26px 0",
              fontSize:
                "25px",
              fontWeight:
                900
            }}
          >
            {data.ticket.nome}{" "}
            {
              data.ticket
                .cognome
            }
          </div>

          {!data.ticket
            .checkedIn && (
            <button
              className="pay"
              onClick={
                checkIn
              }
            >
              ✓ CONFERMA
              INGRESSO
            </button>
          )}

          <button
            className="secondary"
            style={{
              width: "100%",
              marginTop:
                "10px"
            }}
            onClick={
              another
            }
          >
            Scansiona
            prossimo
          </button>
        </div>
      )}
    </main>
  );
}
