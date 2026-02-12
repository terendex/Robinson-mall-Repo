import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { placeholderUsers, findUserByCredentials } from "./Role";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const foundUser = findUserByCredentials(email, password);

    if (foundUser) {
      console.log("Login success:", foundUser);

      localStorage.setItem("currentUser", JSON.stringify(foundUser));

      alert(`Welcome back, ${foundUser.name}! Role: ${foundUser.role}`);

      if (foundUser.role === "admin") {
        navigate("/admin"); //admin dashboard
      } else if (foundUser.role === "moderator") {
        navigate("/moderate"); //moderator dashboard
      } else {
        navigate("/dashboard"); //regular user dashboard
      }
    } else {
      setError("Invalid email or password");
    }
  };

  return (
    <div style={{ maxWidth: "360px", margin: "40px auto" }}>
      <h2>Login</h2>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            required
            autoFocus
          />
        </div>

        <div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit">Login</button>
      </form>

      <p style={{ marginTop: "1.5rem" }}>
        No account? <Link to="/register">Register here</Link>
      </p>

      <small style={{ color: "#777", display: "block", marginTop: "2rem" }}>
        Test accounts:
        <br /> • user@example.com / 123456 (user)
        <br /> • admin@example.com / admin2026 (admin)
        <br /> • moderator@example.com / modpass (moderator)
      </small>
    </div>
  );
}