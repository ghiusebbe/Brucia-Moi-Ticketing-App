"use client";

import { useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

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

type BannerState =
  | {
      type: "valid";
      title: string;
      subtitle: string;
    }
  | {
      type: "used";
      title: string;
      subtitle: string;
    }
  | {
      type: "error";
      title: string;
      subtitle: string;
    }
  | null;

export default function ScanPage() {
  const [password, setPassword] = useState("");
  const [scanning, setScanning] = useState(false);
  const [banner, setBanner] = useState<BannerState>(null);

  const scanner = useRef<Html5Qrcode | null>(null);
  const processing = useRef(false);
  const lastToken = useRef("");
  const lastScanAt = useRef(0);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function extractToken(value: string) {
    try {
      const url = new URL(value);
      return url.searchParams.get("token") || value;
    } catch {
      return value;
    }
  }

  function showBanner(value: BannerState) {
    if (bannerTimer.current) {
      clearTimeout(bannerTimer.current);
    }

    setBanner(value);

    bannerTimer.current = setTimeout(() => {
      setBanner(null);
    }, 2600);
  }

  function playSuccessSound() {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as any).webkitAudioContext;

      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";

      // Doppio ding stile gate / aeroporto
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1175, ctx.currentTime + 0.13);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.18,
        ctx.currentTime + 0.01
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + 0.11
      );
      gain.gain.setValueAtTime(
        0.0001,
        ctx.currentTime + 0.13
      );
      gain.gain.exponentialRampToValueAtTime(
        0.16,
        ctx.currentTime + 0.14
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + 0.32
      );

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (error) {
      console.error("Audio error:", error);
    }
  }

  async function verifyAndCheckIn(token: string) {
    const verifyResponse = await fetch(
      `/api/checkin?token=${encodeURIComponent(token)}`,
      {
        headers: {
          "x-staff-password": password
        }
      }
    );

    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok) {
      showBanner({
        type: "error",
        title: "QR NON VALIDO",
        subtitle: verifyData.error || "Biglietto non trovato"
      });

      return;
    }

    const data = verifyData as TicketData;

    if (data.ticket.checkedIn) {
      showBanner({
        type: "used",
        title: "GIÀ UTILIZZATO",
        subtitle: `${data.ticket.nome} ${data.ticket.cognome}`
      });

      return;
    }

    const checkinResponse = await fetch("/api/checkin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-staff-password": password
      },
      body: JSON.stringify({
        token
      })
    });

    const checkinData = await checkinResponse.json();

    if (!checkinResponse.ok) {
      if (checkinResponse.status === 409) {
        showBanner({
          type: "used",
          title: "GIÀ UTILIZZATO",
          subtitle: `${data.ticket.nome} ${data.ticket.cognome}`
        });

        return;
      }

      showBanner({
        type: "error",
        title: "ERRORE CHECK-IN",
        subtitle: checkinData.error || "Riprova"
      });

      return;
    }

    playSuccessSound();

    showBanner({
      type: "valid",
      title: "INGRESSO OK",
      subtitle: `${data.ticket.nome} ${data.ticket.cognome}`
    });
  }

  async function startScanner() {
    if (!password) {
      showBanner({
        type: "error",
        title: "PASSWORD MANCANTE",
        subtitle: "Inserisci la password staff"
      });

      return;
    }

    if (scanner.current) {
      return;
    }

    const instance = new Html5Qrcode("reader");
    scanner.current = instance;

    try {
      await instance.start(
        {
          facingMode: "environment"
        },
        {
          fps: 12,
          qrbox: {
            width: 250,
            height: 250
          }
        },
        async (decodedText) => {
          const token = extractToken(decodedText);
          const now = Date.now();

          // Evita letture duplicate dello stesso QR mentre
          // il telefono è ancora puntato sul codice.
          if (
            token === lastToken.current &&
            now - lastScanAt.current < 3500
          ) {
            return;
          }

          if (processing.current) {
            return;
          }

          processing.current = true;
          lastToken.current = token;
          lastScanAt.current = now;

          try {
            await verifyAndCheckIn(token);
          } finally {
            // Lo scanner NON viene fermato.
            // Dopo un breve intervallo può leggere il QR successivo.
            setTimeout(() => {
              processing.current = false;
            }, 900);
          }
        },
        () => {}
      );

      setScanning(true);
    } catch (error) {
      console.error(error);

      scanner.current = null;

      showBanner({
        type: "error",
        title: "FOTOCAMERA NON DISPONIBILE",
        subtitle: "Controlla i permessi del browser"
      });
    }
  }

  async function stopScanner() {
    if (!scanner.current) return;

    try {
      await scanner.current.stop();
    } catch {}

    try {
      await scanner.current.clear();
    } catch {}

    scanner.current = null;
    setScanning(false);
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

      {!scanning && (
        <div className="card">
          <input
            type="password"
            placeholder="Password staff"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            className="pay"
            style={{
              marginTop: "12px"
            }}
            onClick={startScanner}
          >
            Apri scanner QR
          </button>
        </div>
      )}

      {scanning && (
        <button
          className="secondary"
          style={{
            width: "100%",
            marginBottom: "12px"
          }}
          onClick={stopScanner}
        >
          Ferma scanner
        </button>
      )}

      <div
        id="reader"
        style={{
          width: "100%",
          overflow: "hidden",
          borderRadius: "18px"
        }}
      />

      {banner && (
        <div
          style={{
            marginTop: "12px",
            borderRadius: "14px",
            padding: "12px 14px",
            border: "1px solid #333",
            background:
              banner.type === "valid"
                ? "#102519"
                : banner.type === "used"
                ? "#291919"
                : "#2b2114"
          }}
        >
          <div
            style={{
              fontSize: "16px",
              fontWeight: 900,
              color:
                banner.type === "valid"
                  ? "#92ffaa"
                  : banner.type === "used"
                  ? "#ff9696"
                  : "#ffd28a"
            }}
          >
            {banner.type === "valid"
              ? "✓ "
              : banner.type === "used"
              ? "✕ "
              : "⚠ "}
            {banner.title}
          </div>

          <div
            style={{
              marginTop: "3px",
              color: "#bbb",
              fontSize: "13px"
            }}
          >
            {banner.subtitle}
          </div>
        </div>
      )}

      {scanning && (
        <p
          className="small"
          style={{
            textAlign: "center",
            marginTop: "12px"
          }}
        >
          Scanner attivo — inquadra il prossimo QR
        </p>
      )}
    </main>
  );
}