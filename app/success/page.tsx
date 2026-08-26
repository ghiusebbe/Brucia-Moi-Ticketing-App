export default function SuccessPage() {
  return (
    <main>
      <div className="logo">
        YOU'RE
        <br />
        IN 🔥
      </div>

      <p className="subtitle">
        Pagamento completato con successo.
      </p>

      <div className="card">
        <h2>Ingresso acquistato</h2>

        <p>
          Il pagamento è stato ricevuto.
        </p>

        <p className="small">
          Nel prossimo passaggio qui comparirà
          il QR code del tuo biglietto.
        </p>
      </div>
    </main>
  );
}
