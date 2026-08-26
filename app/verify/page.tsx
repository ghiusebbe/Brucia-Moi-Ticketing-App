"use client";

import { useEffect } from "react";

export default function VerifyPage() {
  useEffect(() => {
    const query = window.location.search;

    window.location.replace(`/scan${query}`);
  }, []);

  return (
    <main>
      <div className="logo">
        BRUCIA
        <br />
        MOI
      </div>

      <p className="subtitle">
        Apertura verifica biglietto...
      </p>
    </main>
  );
}
