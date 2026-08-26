"use client";

import { useEffect } from "react";

export default function VerifyPage() {
  useEffect(() => {
    window.location.replace(
      `/scan${window.location.search}`
    );
  }, []);

  return (
    <main>
      <div className="logo">
        BRUCIA
        <br />
        MOI
      </div>

      <p className="subtitle">
        Apertura scanner...
      </p>
    </main>
  );
}
