import React, { useEffect, useState } from "react";

const API_URL =
  process.env.REACT_APP_API_URL ||
  "https://flask-render-iac-fumikage-darkshadow.onrender.com";

function App() {
  const [info, setInfo] = useState(null);
  const [dbStatus, setDbStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [nouveau, setNouveau] = useState("");
  const [chargement, setChargement] = useState(false);

  const charger = async () => {
    try {
      const i = await fetch(`${API_URL}/info`).then((r) => r.json());
      setInfo(i);
    } catch (e) { setInfo({ erreur: e.message }); }
    try {
      const s = await fetch(`${API_URL}/api/db-status`).then((r) => r.json());
      setDbStatus(s);
    } catch (e) { setDbStatus({ connected: false, reason: e.message }); }
    try {
      const m = await fetch(`${API_URL}/api/messages`).then((r) => r.json());
      if (Array.isArray(m)) setMessages(m);
    } catch (e) { /* ignore */ }
  };

  useEffect(() => { charger(); }, []);

  const initDb = async () => {
    setChargement(true);
    await fetch(`${API_URL}/api/init`, { method: "POST" });
    await charger();
    setChargement(false);
  };

  const ajouter = async (e) => {
    e.preventDefault();
    if (!nouveau.trim()) return;
    setChargement(true);
    await fetch(`${API_URL}/api/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenu: nouveau })
    });
    setNouveau("");
    await charger();
    setChargement(false);
  };

  return (
    <div className="app">
      <header>
        <h1>Atelier Render - Plateforme complete</h1>
        <p>React + Flask + PostgreSQL + Adminer</p>
      </header>

      <div className="card">
        <h2>Backend Flask</h2>
        {info ? <pre>{JSON.stringify(info, null, 2)}</pre> : <p>Chargement...</p>}
      </div>

      <div className="card">
        <h2>
          Base PostgreSQL{" "}
          {dbStatus === null && <span className="status wait">verification...</span>}
          {dbStatus && dbStatus.connected && <span className="status ok">connectee</span>}
          {dbStatus && !dbStatus.connected && <span className="status ko">non connectee</span>}
        </h2>
        {dbStatus && dbStatus.connected && (
          <pre>{dbStatus.version}</pre>
        )}
        {dbStatus && !dbStatus.connected && (
          <p style={{ color: "#fca5a5" }}>{dbStatus.reason}</p>
        )}
        {dbStatus && dbStatus.connected && (
          <button onClick={initDb} disabled={chargement}>
            Creer / verifier la table messages
          </button>
        )}
      </div>

      {dbStatus && dbStatus.connected && (
        <div className="card">
          <h2>Messages</h2>
          <form onSubmit={ajouter}>
            <input
              type="text"
              value={nouveau}
              onChange={(e) => setNouveau(e.target.value)}
              placeholder="Nouveau message..."
            />
            <button type="submit" disabled={chargement}>Ajouter</button>
          </form>
          <ul className="messages">
            {messages.length === 0 && <li><em>Aucun message</em></li>}
            {messages.map((m) => (
              <li key={m.id}>
                <span>{m.contenu}</span>
                <span className="date">{new Date(m.cree_le).toLocaleString("fr-FR")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <footer>
        API backend : <code>{API_URL}</code>
      </footer>
    </div>
  );
}

export default App;
