"use client";

import { useEffect, useRef, useState } from "react";
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
      type: "valid" | "used" | "error";
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

  const bannerTimer =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const audioContext =
    useRef<AudioContext | null>(null);

  function extractToken(value: string) {
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

  function showBanner(value: BannerState) {
    if (bannerTimer.current) {
      clearTimeout(bannerTimer.current);
    }

    setBanner(value);

    bannerTimer.current = setTimeout(() => {
      setBanner(null);
    }, 4500);
  }

  async function unlockAudio() {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as any).webkitAudioContext;

      if (!AudioContextClass) return;

      if (!audioContext.current) {
        audioContext.current =
          new AudioContextClass();
      }

      if (
        audioContext.current.state ===
        "suspended"
      ) {
        await audioContext.current.resume();
      }
    } catch (error) {
      console.error(
        "Audio unlock error",
        error
      );
    }
  }

  async function playSuccessSound() {
    try {
      const ctx = audioContext.current;

      if (!ctx) return;

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const now = ctx.currentTime;

      const tones = [
        {
          frequency: 880,
          start: 0
        },
        {
          frequency: 1175,
          start: 0.16
        }
      ];

      tones.forEach(
        ({ frequency, start }) => {
          const osc =
            ctx.createOscillator();

          const gain =
            ctx.createGain();

          osc.type = "sine";
          osc.frequency.value =
            frequency;

          gain.gain.setValueAtTime(
            0.0001,
            now + start
          );

          gain.gain.exponentialRampToValueAtTime(
            0.25,
            now + start + 0.015
          );

          gain.gain.exponentialRampToValueAtTime(
            0.0001,
            now + start + 0.18
          );

          osc.connect(gain);
          gain.connect(
            ctx.destination
          );

          osc.start(now + start);
          osc.stop(
            now + start + 0.2
          );
        }
      );
    } catch (error) {
      console.error(
        "Success sound error",
        error
      );
    }
  }

  async function playUsedSound() {
    try {
      const ctx = audioContext.current;

      if (!ctx) return;

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const now = ctx.currentTime;

      const tones = [
        {
          frequency: 320,
          start: 0
        },
        {
          frequency: 240,
          start: 0.18
        }
      ];

      tones.forEach(
        ({ frequency, start }) => {
          const osc =
            ctx.createOscillator();

          const gain =
            ctx.createGain();

          osc.type = "square";
          osc.frequency.value =
            frequency;

          gain.gain.setValueAtTime(
            0.0001,
            now + start
          );

          gain.gain.exponentialRampToValueAtTime(
            0.12,
            now + start + 0.01
          );

          gain.gain.exponentialRampToValueAtTime(
            0.0001,
            now + start + 0.16
          );

          osc.connect(gain);
          gain.connect(
            ctx.destination
          );

          osc.start(now + start);
          osc.stop(
            now + start + 0.18
          );
        }
      );
    } catch (error) {
      console.error(
        "Used sound error",
        error
      );
    }
  }

  async function verifyAndCheckIn(
    token: string
  ) {
    try {
      const verifyResponse =
        await fetch(
          `/api/checkin?token=${encodeURIComponent(
            token
          )}`,
          {
            headers: {
              "x-staff-password":
                password
            }
          }
        );

      const verifyData =
        await verifyResponse.json();

      if (!verifyResponse.ok) {
        showBanner({
          type: "error",
          title: "QR NON VALIDO",
          subtitle:
            verifyData.error ||
            "Biglietto non trovato"
        });

        return;
      }

      const data =
        verifyData as TicketData;

      if (
        data.ticket.checkedIn
      ) {
        await playUsedSound();

        showBanner({
          type: "used",
          title: "GIÀ UTILIZZATO",
          subtitle:
            `${data.ticket.nome} ${data.ticket.cognome}`
        });

        return;
      }

      const checkinResponse =
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

            body: JSON.stringify({
              token
            })
          }
        );

      const checkinData =
        await checkinResponse.json();

      if (!checkinResponse.ok) {
        if (
          checkinResponse.status ===
          409
        ) {
          await playUsedSound();

          showBanner({
            type: "used",
            title:
              "GIÀ UTILIZZATO",
            subtitle:
              `${data.ticket.nome} ${data.ticket.cognome}`
          });

          return;
        }

        showBanner({
          type: "error",
          title:
            "ERRORE CHECK-IN",
          subtitle:
            checkinData.error ||
            "Riprova"
        });

        return;
      }

      await playSuccessSound();

      showBanner({
        type: "valid",
        title: "INGRESSO OK",
        subtitle:
          `${data.ticket.nome} ${data.ticket.cognome}`
      });
    } catch (error) {
      console.error(error);

      showBanner({
        type: "error",
        title: "ERRORE",
        subtitle:
          "Impossibile controllare il biglietto"
      });
    }
  }

  async function startScanner() {
    if (!password.trim()) {
      showBanner({
        type: "error",
        title: "PASSWORD MANCANTE",
        subtitle:
          "Inserisci la password staff"
      });

      return;
    }

    if (scanner.current) {
      return;
    }

    await unlockAudio();

    const instance =
      new Html5Qrcode("reader");

    scanner.current = instance;

    try {
      await instance.start(
        {
          facingMode:
            "environment"
        },

        {
          fps: 10,

          qrbox: {
            width: 250,
            height: 250
          }
        },

        async decodedText => {
          const token =
            extractToken(
              decodedText
            );

          const now =
            Date.now();

          if (
            token ===
              lastToken.current &&
            now -
              lastScanAt.current <
              3500
          ) {
            return;
          }

          if (
            processing.current
          ) {
            return;
          }

          processing.current =
            true;

          lastToken.current =
            token;

          lastScanAt.current =
            now;

          try {
            await verifyAndCheckIn(
              token
            );
          } finally {
            setTimeout(() => {
              processing.current =
                false;
            }, 700);
          }
        },

        () => {}
      );

      setScanning(true);
    } catch (error) {
      console.error(
        "Camera error:",
        error
      );

      scanner.current = null;

      showBanner({
        type: "error",
        title:
          "FOTOCAMERA NON DISPONIBILE",
        subtitle:
          "Controlla i permessi della fotocamera"
      });
    }
  }

  async function stopScanner() {
    const current =
      scanner.current;

    if (!current) return;

    try {
      if (current.isScanning) {
        await current.stop();
      }

      await current.clear();
    } catch (error) {
      console.error(
        "Stop scanner error:",
        error
      );
    } finally {
      scanner.current = null;
      setScanning(false);
    }
  }

  useEffect(() => {
    return () => {
      if (bannerTimer.current) {
        clearTimeout(
          bannerTimer.current
        );
      }

      if (
        scanner.current?.isScanning
      ) {
        scanner.current
          .stop()
          .catch(() => {});
      }
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
        Brucia Moi Staff
      </p>

      {!scanning && (
        <div className="card">
          <input
            type="password"
            placeholder="Password staff"
            value={password}
            onChange={e =>
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
          className={`scan-banner ${banner.type}`}
        >
          <div className="scan-banner-title">
            {banner.type === "valid"
              ? "✓ "
              : banner.type ===
                "used"
              ? "✕ "
              : "⚠ "}

            {banner.title}
          </div>

          <div className="scan-banner-name">
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
          Scanner attivo —
          inquadra il prossimo QR
        </p>
      )}
    </main>
  );
}
