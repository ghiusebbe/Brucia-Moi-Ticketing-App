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

  function aggiorna(index: number, campo: keyof Person, valore: string) {
    setPersone(
      persone.map((persona, i) =>
        i === index ? { ...persona, [campo]: valore } : persona
      )
    );
  }

  function aggiungi() {
    setPersone([...persone, { nome: "", cognome: "" }]);
  }

  function rimuovi(index: number) {
    if (persone.length === 1) return;
    setPersone(persone.filter((_, i) => i !== index));
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
              onChange={(e) => aggiorna(index, "nome", e.target.value)}
            />

            <input
              placeholder="Cognome"
              value={persona.cognome}
              onChange={(e) => aggiorna(index, "cognome", e.target.value)}
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

        <button className="secondary" type="button" onClick={aggiungi}>
          + Aggiungi persona
        </button>

        <div className="total">
          <div>
            <div>
              {persone.length} {persone.length === 1 ? "ingresso" : "ingressi"}
            </div>
            <div className="small">{PREZZO} € a persona</div>
          </div>

          <strong>{persone.length * PREZZO} €</strong>
        </div>

        <button
          className="pay"
          onClick={() =>
            alert("Pagamento Stripe: lo colleghiamo nel prossimo passaggio.")
          }
        >
          Continua al pagamento
        </button>
      </div>
    </main>
  );
}
