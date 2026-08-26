# Brucia Moi Tickets — MVP

Web app Next.js per:
- inserimento multiplo di nome/cognome
- pagamento Stripe
- Apple Pay / Google Pay quando disponibili tramite Stripe Checkout
- generazione QR ordine
- verifica staff
- check-in singolo per ogni partecipante
- protezione da doppio utilizzo

## 1. Requisiti

- Node.js 20+
- account Stripe
- progetto Supabase
- account Vercel (opzionale, per deploy)

## 2. Supabase

Apri SQL Editor in Supabase ed esegui tutto il file:

`supabase.sql`

Poi copia:
- Project URL
- anon key
- service_role key

nella `.env.local`.

## 3. Variabili ambiente

Copia `.env.example` in `.env.local`.

Imposta almeno:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
EVENT_NAME=BRUCIA MOI
TICKET_PRICE_CENTS=1500
STAFF_PASSWORD=una-password-lunga
```

## 4. Avvio

```bash
npm install
npm run dev
```

Vai su:

http://localhost:3000

## 5. Webhook Stripe locale

Installa Stripe CLI, autenticati e poi:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Stripe CLI mostrerà un valore tipo:

`whsec_...`

Inseriscilo come `STRIPE_WEBHOOK_SECRET`.

## 6. Flusso

### Cliente
1. apre `/`
2. inserisce uno o più partecipanti
3. paga su Stripe Checkout
4. Stripe richiama il webhook
5. ordine e ticket vengono creati
6. ritorna su `/ticket`
7. vede QR + nomi

### Staff
Il QR punta a:

`/checkin?token=<token-ordine>`

Lo staff inserisce la password e vede i partecipanti.
Ogni persona può essere marcata individualmente come entrata.

## 7. Apple Pay / Google Pay

Stripe Checkout mostra automaticamente i wallet compatibili quando:
- browser/dispositivo li supportano
- il wallet è configurato
- il dominio/HTTPS soddisfa i requisiti Stripe

In locale alcuni wallet potrebbero non apparire.

## 8. Prima della produzione

Questo MVP va rafforzato con:
- login staff vero (Supabase Auth) al posto della password statica
- event_id e pannello per più eventi
- rate limiting
- privacy policy / termini / informativa trattamento dati
- email con biglietto e link QR
- gestione rimborsi
- capacità massima evento
- dashboard venduti / incasso / ingressi
- scanner fotocamera integrato nella pagina staff
- controllo atomico più forte lato database per check-in concorrenti
