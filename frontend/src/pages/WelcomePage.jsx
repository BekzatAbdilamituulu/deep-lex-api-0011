import { Link } from "react-router-dom";

export default function WelcomePage() {
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Cortex</h1>
      <p>Learn words daily. Native → Learning.</p>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <Link to="/login">Login</Link>
        <Link to="/register">Register</Link>
      </div>
    </div>
  );
}