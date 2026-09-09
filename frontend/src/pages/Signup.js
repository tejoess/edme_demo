import { useState } from "react";
import "./Auth.css";
import FormField from "../components/FormField";
import { apiFetch } from "../utils/apiClient";
import { useToast } from "../context/ToastContext";
import {
  isValidEmail,
  passwordChecks,
  passwordScore,
  isStrongPassword,
  calculateAge,
} from "../utils/validation";

const todayISO = () => new Date().toISOString().split("T")[0];

function Signup({ goToLogin }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");

  const checks = passwordChecks(password);
  const score = passwordScore(password);
  const strengthLabel = ["Very weak", "Weak", "Fair", "Good", "Strong"][score];
  const strengthColor = ["#dc2626", "#f97316", "#d97706", "#22c55e", "#16a34a"][score];

  const validate = () => {
    const next = {};

    if (!name.trim()) next.name = "Full name is required";
    else if (name.trim().length < 2) next.name = "Name looks too short";

    if (!email.trim()) next.email = "Email is required";
    else if (!isValidEmail(email)) next.email = "Enter a valid email address";

    if (!dob) {
      next.dob = "Date of birth is required";
    } else {
      const age = calculateAge(dob);
      if (age === null) next.dob = "Enter a valid date";
      else if (age < 18) next.dob = "You must be at least 18 years old";
      else if (age > 120) next.dob = "Enter a valid date of birth";
    }

    if (!password) next.password = "Password is required";
    else if (!isStrongPassword(password)) {
      next.password = "Password doesn't meet the requirements below";
    }

    if (!confirmPassword) next.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword) next.confirmPassword = "Passwords do not match";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;

    try {
      setLoading(true);

      await apiFetch("/signup", {
        method: "POST",
        body: { name: name.trim(), email: email.trim(), dob, password },
      });

      toast.success("Account created — please log in.");
      goToLogin();
    } catch (err) {
      setFormError(err.message || "Unable to sign up. Please try again.");
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

        <h2>Create your account</h2>

        {formError && (
          <div className="alert alert-error" role="alert">
            {formError}
          </div>
        )}

        <form onSubmit={handleSignup} noValidate>
          <FormField label="Full name" required error={errors.name} htmlFor="signup-name">
            <input
              id="signup-name"
              autoComplete="name"
              autoFocus
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!errors.name}
            />
          </FormField>

          <FormField label="Email" required error={errors.email} htmlFor="signup-email">
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
            />
          </FormField>

          <FormField label="Date of birth" required error={errors.dob} htmlFor="signup-dob">
            <input
              id="signup-dob"
              type="date"
              max={todayISO()}
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              aria-invalid={!!errors.dob}
            />
          </FormField>

          <FormField label="Password" required error={errors.password} htmlFor="signup-password">
            <div className="password-input-wrap">
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Create a password"
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

            {password && (
              <>
                <div className="password-strength" aria-hidden="true">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="password-strength-bar"
                      style={{ background: i < score ? strengthColor : undefined }}
                    />
                  ))}
                </div>
                <ul className="password-checklist">
                  <li className={checks.length ? "met" : ""}>
                    {checks.length ? "✓" : "○"} At least 8 characters
                  </li>
                  <li className={checks.upper ? "met" : ""}>
                    {checks.upper ? "✓" : "○"} An uppercase letter
                  </li>
                  <li className={checks.lower ? "met" : ""}>
                    {checks.lower ? "✓" : "○"} A lowercase letter
                  </li>
                  <li className={checks.number ? "met" : ""}>
                    {checks.number ? "✓" : "○"} A number
                  </li>
                </ul>
                <div className="field-hint" style={{ color: strengthColor, fontWeight: 600 }}>
                  {strengthLabel}
                </div>
              </>
            )}
          </FormField>

          <FormField
            label="Confirm password"
            required
            error={errors.confirmPassword}
            htmlFor="signup-confirm-password"
          >
            <input
              id="signup-confirm-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={!!errors.confirmPassword}
            />
          </FormField>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <span className="spinner" /> : null}
            {loading ? "Creating account…" : "Sign Up"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <button className="btn-link" onClick={goToLogin} disabled={loading}>
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}

export default Signup;
