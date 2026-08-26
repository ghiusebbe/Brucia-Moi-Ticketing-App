"use client";

import { useState } from "react";

type Person = {
  nome: string;
  cognome: string;
};

const PREZZO = 15;

export default function Home() {
  const [persone, setPersone] = useState<Person[]>([
    { nome: "", cognome: "" }
  ]);

  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState("");
  const [email, setEmail] = useState("");

  function aggiorna(
    index: number,
    campo: keyof Person,
    valore: string
  ) {
    setPersone(
      persone.map((persona, i) =>
        i === index
          ? { ...persona, [campo]: valore }
          : persona
      )
    );
  }

  function aggiungi() {
    if (persone.length >= 20) return;

    setPersone([
      ...persone,
      { nome: "", cognome: "" }
    ]);
  }

  function rimuovi(index: number) {
    if (persone.length === 1) return;

    setPersone(
      persone.filter((_, i) => i !== index)
    );
  }

  async function paga() {
    setErrore("");

    const clean = persone.map((persona) => ({
      nome: persona.nome.trim(),
      cognome: persona.cognome.trim()
    }));

    if (
      clean.some(
        (persona) =>
          !persona.nome || !persona.cognome
      )
    ) {
      setErrore(
        "Inserisci nome e cognome di tutti i partecipanti."
      );
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    if (
      !cleanEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      setErrore(
        "Inserisci un indirizzo email valido."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          people: clean,
          email: cleanEmail
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Errore nel pagamento."
        );
      }

      window.location.href = data.url;
    } catch (error) {
      setErrore(
        error instanceof Error
          ? error.message
          : "Errore nel pagamento."
      );

      setLoading(false);
    }
  }

  return (
    <main>
      <div className="logo">
        BRUCIA
        <br />
        MOI
      </div>

      <p className="subtitle">
        Inserisci i partecipanti e acquista gli ingressi.
      </p>

      <div className="card">
        {persone.map((persona, index) => (
          <div className="person" key={index}>
            <input
              placeholder="Nome"
              value={persona.nome}
              onChange={(e) =>
                aggiorna(
                  index,
                  "nome",
                  e.target.value
                )
              }
            />

            <input
              placeholder="Cognome"
              value={persona.cognome}
              onChange={(e) =>
                aggiorna(
                  index,
                  "cognome",
                  e.target.value
                )
              }
            />

            <button
              className="remove"
              type="button"
              onClick={() => rimuovi(index)}
            >
              Rimuovi
            </button>
          </div>
        ))}

        <button
          className="secondary"
          type="button"
          onClick={aggiungi}
        >
          + Aggiungi persona
        </button>

        <div className="checkout-email">
          <label htmlFor="ticket-email">
            Email per i biglietti
          </label>

          <input
            id="ticket-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="nome@email.it"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
          />

          <p className="small">
            Dopo il pagamento potrai inviare tutti i biglietti
            a questo indirizzo con un solo tocco.
          </p>
        </div>

        <div className="total">
          <div>
            <div>
              {persone.length}{" "}
              {persone.length === 1
                ? "ingresso"
                : "ingressi"}
            </div>

            <div className="small">
              {PREZZO} € a persona
            </div>
          </div>

          <strong>
            {persone.length * PREZZO} €
          </strong>
        </div>

        {errore && (
          <p style={{ color: "#ff9999" }}>
            {errore}
          </p>
        )}

        <button
          className="pay"
          onClick={paga}
          disabled={loading}
        >
          {loading
            ? "Apertura pagamento..."
            : "Continua al pagamento"}
        </button>

        <p className="small" style={{
          textAlign: "center",
          marginTop: "14px"
        }}>
          Pagamento sicuro tramite Stripe
        </p>
      </div>
    </main>
  );
}
