import { useState } from "react";
import "./Auth.css";
import FormField from "../components/FormField";
import { apiFetch } from "../utils/apiClient";
import { isValidEmail } from "../utils/validation";
import { useToast } from "../context/ToastContext";

function Login({ onLoginSuccess, goToSignup }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");

  const validate = () => {
    const next = {};
    if (!email.trim()) next.email = "Email is required";
    else if (!isValidEmail(email)) next.email = "Enter a valid email address";

    if (!password) next.password = "Password is required";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;

    try {
      setLoading(true);

      const data = await apiFetch("/login", {
        method: "POST",
        body: { email: email.trim(), password },
      });

      localStorage.clear();
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("email", data.email);
      localStorage.setItem("is_admin", data.is_admin);

      toast.success(`Welcome back, ${data.email}!`);
      onLoginSuccess(data.user_id);
    } catch (err) {
      setFormError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-brand">
          <span className="auth-brand-icon" aria-hidden="true">🛡️</span>
          <h1 className="app-title">Edme Insurance</h1>
        </div>
        <p className="app-subtitle">Insurance Comparison &amp; Claim Assistant</p>

        <h2>Log in to your account</h2>

        {formError && (
          <div className="alert alert-error" role="alert">
            {formError}
          </div>
        )}

        <form onSubmit={handleLogin} noValidate>
          <FormField label="Email" required error={errors.email} htmlFor="login-email">
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
            />
          </FormField>

          <FormField label="Password" required error={errors.password} htmlFor="login-password">
            <div className="password-input-wrap">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!errors.password}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </FormField>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <span className="spinner" /> : null}
            {loading ? "Logging in…" : "Log In"}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account?{" "}
          <button className="btn-link" onClick={goToSignup} disabled={loading}>
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;
