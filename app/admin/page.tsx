"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

type Ticket = {
  id: string;
  nome: string;
  cognome: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  createdAt: string;
  orderId: string | null;
};

type DashboardData = {
  stats: {
    inside: number;
    sold: number;
    outside: number;
    revenueCents: number;
  };

  tickets: Ticket[];
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] =
    useState<"all" | "inside" | "outside">("all");

  const loadData = useCallback(
    async (pwd?: string) => {
      const currentPassword = pwd ?? password;

      if (!currentPassword) {
        return;
      }

      try {
        const response = await fetch("/api/admin", {
          headers: {
            "x-admin-password":
              currentPassword
          },
          cache: "no-store"
        });

        const result =
          await response.json();

        if (!response.ok) {
          if (
            response.status === 401
          ) {
            setAuthenticated(false);
            setData(null);
          }

          setError(
            result.error ||
              "Errore dashboard."
          );

          return;
        }

        setAuthenticated(true);
        setError("");
        setData(result);
      } catch {
        setError(
          "Impossibile contattare il server."
        );
      }
    },
    [password]
  );

  async function login() {
    await loadData(password);
  }

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    const interval =
      window.setInterval(() => {
        loadData();
      }, 5000);

    return () =>
      window.clearInterval(interval);
  }, [
    authenticated,
    loadData
  ]);

  const visibleTickets =
    useMemo(() => {
      if (!data) return [];

      const normalized =
        query.trim().toLowerCase();

      return data.tickets.filter(
        ticket => {
          const matchesSearch =
            !normalized ||
            `${ticket.nome} ${ticket.cognome}`
              .toLowerCase()
              .includes(normalized);

          const matchesFilter =
            filter === "all" ||
            (filter === "inside" &&
              ticket.checkedIn) ||
            (filter === "outside" &&
              !ticket.checkedIn);

          return (
            matchesSearch &&
            matchesFilter
          );
        }
      );
    }, [data, query, filter]);

  if (!authenticated) {
    return (
      <main>
        <div className="logo">
          ADMIN
        </div>

        <p className="subtitle">
          Dashboard Brucia Moi
        </p>

        <div className="card">
          <input
            type="password"
            placeholder="Password admin"
            value={password}
            onChange={event =>
              setPassword(
                event.target.value
              )
            }
            onKeyDown={event => {
              if (
                event.key === "Enter"
              ) {
                login();
              }
            }}
          />

          <button
            className="pay"
            style={{
              marginTop: "12px"
            }}
            onClick={login}
          >
            Accedi
          </button>

          {error && (
            <p className="admin-error">
              {error}
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="admin-main">
      <div className="admin-header">
        <div>
          <div className="logo admin-logo">
            BRUCIA
            <br />
            MOI
          </div>

          <p className="subtitle">
            Live dashboard
          </p>
        </div>

        <div className="admin-live">
          <span className="admin-live-dot" />
          LIVE
        </div>
      </div>

      {data && (
        <>
          <section className="stats-grid">
            <div className="stat-card stat-primary">
              <span className="stat-label">
                Dentro
              </span>

              <strong>
                {data.stats.inside}
              </strong>

              <span className="stat-note">
                presenti alla festa
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-label">
                Venduti
              </span>

              <strong>
                {data.stats.sold}
              </strong>

              <span className="stat-note">
                biglietti pagati
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-label">
                Devono entrare
              </span>

              <strong>
                {data.stats.outside}
              </strong>

              <span className="stat-note">
                biglietti non usati
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-label">
                Incasso
              </span>

              <strong>
                {(
                  data.stats.revenueCents /
                  100
                ).toLocaleString(
                  "it-IT",
                  {
                    style: "currency",
                    currency: "EUR"
                  }
                )}
              </strong>

              <span className="stat-note">
                pagamenti registrati
              </span>
            </div>
          </section>

          <section className="admin-list-section">
            <div className="admin-list-head">
              <div>
                <h2>
                  Partecipanti
                </h2>

                <span>
                  {
                    visibleTickets.length
                  }{" "}
                  risultati
                </span>
              </div>

              <button
                className="admin-refresh"
                onClick={() =>
                  loadData()
                }
              >
                ↻ Aggiorna
              </button>
            </div>

            <input
              className="admin-search"
              placeholder="Cerca nome o cognome..."
              value={query}
              onChange={event =>
                setQuery(
                  event.target.value
                )
              }
            />

            <div className="admin-filters">
              <button
                className={
                  filter === "all"
                    ? "filter-active"
                    : ""
                }
                onClick={() =>
                  setFilter("all")
                }
              >
                Tutti
              </button>

              <button
                className={
                  filter === "inside"
                    ? "filter-active"
                    : ""
                }
                onClick={() =>
                  setFilter("inside")
                }
              >
                Dentro
              </button>

              <button
                className={
                  filter === "outside"
                    ? "filter-active"
                    : ""
                }
                onClick={() =>
                  setFilter("outside")
                }
              >
                Non entrati
              </button>
            </div>

            <div className="people-list">
              {visibleTickets.map(
                ticket => (
                  <div
                    className="person-row"
                    key={ticket.id}
                  >
                    <div className="person-avatar">
                      {ticket.nome
                        .charAt(0)
                        .toUpperCase()}
                      {ticket.cognome
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="person-info">
                      <strong>
                        {ticket.nome}{" "}
                        {
                          ticket.cognome
                        }
                      </strong>

                      <span>
                        {ticket.checkedIn &&
                        ticket.checkedInAt
                          ? `Entrato alle ${new Date(
                              ticket.checkedInAt
                            ).toLocaleTimeString(
                              "it-IT",
                              {
                                hour:
                                  "2-digit",
                                minute:
                                  "2-digit"
                              }
                            )}`
                          : "Non ancora entrato"}
                      </span>
                    </div>

                    <span
                      className={
                        ticket.checkedIn
                          ? "person-status inside"
                          : "person-status outside"
                      }
                    >
                      {ticket.checkedIn
                        ? "DENTRO"
                        : "FUORI"}
                    </span>
                  </div>
                )
              )}

              {visibleTickets.length ===
                0 && (
                <div className="empty-list">
                  Nessun partecipante
                  trovato.
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {error && (
        <p className="admin-error">
          {error}
        </p>
      )}
    </main>
  );
}
