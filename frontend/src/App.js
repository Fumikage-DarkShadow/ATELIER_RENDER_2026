import React, { useEffect, useRef, useState } from "react";

const API_URL =
  process.env.REACT_APP_API_URL ||
  "https://flask-render-iac-fumikage-darkshadow.onrender.com";

const MAX_LEN = 280;

function tempsRelatif(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 5) return "a l'instant";
  if (sec < 60) return `il y a ${sec} s`;
  if (sec < 3600) return `il y a ${Math.floor(sec / 60)} min`;
  if (sec < 86400) return `il y a ${Math.floor(sec / 3600)} h`;
  if (sec < 604800) return `il y a ${Math.floor(sec / 86400)} j`;
  return date.toLocaleDateString("fr-FR");
}

function App() {
  const [info, setInfo] = useState(null);
  const [envValue, setEnvValue] = useState(null);
  const [dbStatus, setDbStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({ total: 0 });
  const [nouveau, setNouveau] = useState("");
  const [chargement, setChargement] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);
  const [tick, setTick] = useState(0);
  const inputRef = useRef(null);

  const notifier = (texte, type = "ok") => {
    setToast({ texte, type });
    setTimeout(() => setToast(null), 3500);
  };

  const chargerTout = async () => {
    setRefreshing(true);
    try {
      const [i, e, s, m, st] = await Promise.all([
        fetch(`${API_URL}/info`).then((r) => r.json()).catch(() => null),
        fetch(`${API_URL}/env`).then((r) => r.json()).catch(() => null),
        fetch(`${API_URL}/api/db-status`).then((r) => r.json()).catch(() => ({ connected: false, reason: "API injoignable" })),
        fetch(`${API_URL}/api/messages`).then((r) => r.json()).catch(() => []),
        fetch(`${API_URL}/api/stats`).then((r) => r.json()).catch(() => ({ total: 0 })),
      ]);
      setInfo(i);
      setEnvValue(e?.env);
      setDbStatus(s);
      if (Array.isArray(m)) setMessages(m);
      setStats(st);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    chargerTout();
    inputRef.current?.focus();
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const initDb = async () => {
    setChargement(true);
    try {
      const r = await fetch(`${API_URL}/api/init`, { method: "POST" }).then((x) => x.json());
      if (r.ok) notifier("Table messages prete", "ok");
      else notifier(r.reason || "Erreur init", "ko");
      await chargerTout();
    } finally {
      setChargement(false);
    }
  };

  const ajouter = async (e) => {
    e?.preventDefault();
    const texte = nouveau.trim();
    if (!texte) return;
    if (texte.length > MAX_LEN) {
      notifier(`Message trop long (max ${MAX_LEN} car.)`, "ko");
      return;
    }
    setChargement(true);
    try {
      const r = await fetch(`${API_URL}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenu: texte })
      });
      if (r.ok) {
        const data = await r.json();
        setMessages((prev) => [data, ...prev]);
        setStats((s) => ({ ...s, total: (s.total || 0) + 1 }));
        setNouveau("");
        notifier("Message ajoute", "ok");
        inputRef.current?.focus();
      } else {
        const err = await r.json().catch(() => ({}));
        notifier(err.error || "Erreur ajout", "ko");
      }
    } catch (e) {
      notifier("Reseau injoignable", "ko");
    } finally {
      setChargement(false);
    }
  };

  const supprimer = async (id) => {
    if (!window.confirm("Supprimer ce message ?")) return;
    setChargement(true);
    try {
      const r = await fetch(`${API_URL}/api/messages/${id}`, { method: "DELETE" });
      if (r.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        setStats((s) => ({ ...s, total: Math.max(0, (s.total || 0) - 1) }));
        notifier("Message supprime", "ok");
      } else {
        notifier("Suppression impossible", "ko");
      }
    } finally {
      setChargement(false);
    }
  };

  const versionLisible = dbStatus?.version
    ? dbStatus.version.split(" on ")[0].replace(/PostgreSQL\s+/, "")
    : "—";

  return (
    <div className="app">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.texte}</div>}

      <header className="hero">
        <div>
          <h1>Plateforme Atelier Render</h1>
          <p className="subtitle">React + Flask + PostgreSQL + Adminer - DevOps end to end</p>
        </div>
        <button
          className="btn-ghost"
          onClick={chargerTout}
          disabled={refreshing}
          title="Rafraichir toutes les donnees"
        >
          <span className={refreshing ? "spin" : ""}>↻</span> Rafraichir
        </button>
      </header>

      <section className="services">
        <ServiceTile icon="⚛" label="React" sub="Static Site" status="ok" />
        <ServiceTile
          icon="🐍"
          label="Flask"
          sub={info ? "API live" : "verification..."}
          status={info ? "ok" : "wait"}
        />
        <ServiceTile
          icon="🐘"
          label="PostgreSQL"
          sub={dbStatus?.connected ? versionLisible : "non connectee"}
          status={dbStatus?.connected ? "ok" : "ko"}
        />
        <ServiceTile icon="🛠" label="Adminer" sub="Web Service" status="ok" />
      </section>

      <section className="grid">
        <div className="card">
          <div className="card-head">
            <h2>Informations application</h2>
            <span className="pill">{envValue || "—"}</span>
          </div>
          {info ? (
            <dl className="kv">
              <dt>App</dt><dd>{info.app}</dd>
              <dt>Etudiant</dt><dd>{info.student}</dd>
              <dt>Version</dt><dd>{info.version}</dd>
              <dt>Environnement</dt><dd>{envValue || "—"}</dd>
              <dt>Endpoint</dt><dd className="mono">{API_URL.replace(/^https?:\/\//, "")}</dd>
            </dl>
          ) : (
            <div className="skeleton" />
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Base PostgreSQL</h2>
            {dbStatus === null && <span className="status wait">verification...</span>}
            {dbStatus?.connected && <span className="status ok">connectee</span>}
            {dbStatus && !dbStatus.connected && <span className="status ko">deconnectee</span>}
          </div>
          {dbStatus?.connected ? (
            <>
              <dl className="kv">
                <dt>Version</dt><dd>{versionLisible}</dd>
                <dt>Messages</dt><dd>{stats.total ?? 0}</dd>
              </dl>
              <button className="btn-secondary" onClick={initDb} disabled={chargement}>
                Initialiser la table messages
              </button>
            </>
          ) : (
            <p className="error-text">
              {dbStatus?.reason || "Verification en cours..."}
            </p>
          )}
        </div>
      </section>

      {dbStatus?.connected && (
        <section className="card card-messages">
          <div className="card-head">
            <h2>
              Messages <span className="count">{stats.total ?? messages.length}</span>
            </h2>
          </div>

          <form onSubmit={ajouter} className="message-form">
            <input
              ref={inputRef}
              type="text"
              value={nouveau}
              onChange={(e) => setNouveau(e.target.value.slice(0, MAX_LEN))}
              placeholder="Ecris un message et appuie sur Entree..."
              disabled={chargement}
              maxLength={MAX_LEN}
            />
            <button type="submit" disabled={chargement || !nouveau.trim()}>
              Envoyer
            </button>
          </form>
          <div className="char-count">
            {nouveau.length}/{MAX_LEN}
          </div>

          {messages.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">💬</div>
              <p>Aucun message pour l'instant. Tape ton premier message ci-dessus !</p>
            </div>
          ) : (
            <ul className="messages">
              {messages.map((m) => (
                <li key={m.id} className="message-item">
                  <div className="message-body">
                    <div className="message-text">{m.contenu}</div>
                    <div className="message-meta">
                      <span title={new Date(m.cree_le).toLocaleString("fr-FR")}>
                        {tempsRelatif(m.cree_le)}
                      </span>
                      <span className="dot">·</span>
                      <span className="mono">#{m.id}</span>
                    </div>
                  </div>
                  <button
                    className="btn-delete"
                    onClick={() => supprimer(m.id)}
                    disabled={chargement}
                    title="Supprimer"
                  >
                    Supprimer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <footer>
        <span>API backend : <code>{API_URL.replace(/^https?:\/\//, "")}</code></span>
        <span className="sep">·</span>
        <span>Atelier Render 2026 · Fumikage-DarkShadow</span>
      </footer>
    </div>
  );
}

function ServiceTile({ icon, label, sub, status }) {
  return (
    <div className={`service-tile s-${status}`}>
      <div className="service-icon">{icon}</div>
      <div className="service-text">
        <div className="service-label">{label}</div>
        <div className="service-sub">{sub}</div>
      </div>
      <div className={`service-dot d-${status}`} />
    </div>
  );
}

export default App;
