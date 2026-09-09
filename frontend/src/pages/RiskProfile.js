import { useEffect, useState } from "react";
import "./Auth.css";
import FormField from "../components/FormField";
import { apiFetch } from "../utils/apiClient";
import { useToast } from "../context/ToastContext";

function RiskProfile({ userId, onSubmitSuccess }) {
  const toast = useToast();
  const [age, setAge] = useState("");
  const [income, setIncome] = useState("");
  const [dependents, setDependents] = useState("");
  const [health, setHealth] = useState("none");

  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let active = true;
    const loadExisting = async () => {
      try {
        const data = await apiFetch(`/users/${userId}/risk-profile`);
        const profile = data?.risk_profile;
        if (active && profile) {
          setAge(profile.age ?? "");
          setIncome(profile.annual_income ?? "");
          setDependents(profile.dependents ?? "");
          setHealth(profile.health_condition ?? "none");
        }
      } catch {
        // No existing profile yet — fine, start blank.
      } finally {
        if (active) setLoadingExisting(false);
      }
    };
    if (userId) loadExisting();
    else setLoadingExisting(false);
    return () => {
      active = false;
    };
  }, [userId]);

  const validate = () => {
    const next = {};
    const ageNum = Number(age);
    const incomeNum = Number(income);
    const dependentsNum = Number(dependents);

    if (age === "") next.age = "Age is required";
    else if (!Number.isInteger(ageNum) || ageNum < 18 || ageNum > 100) {
      next.age = "Enter an age between 18 and 100";
    }

    if (income === "") next.income = "Annual income is required";
    else if (Number.isNaN(incomeNum) || incomeNum < 0) {
      next.income = "Enter a valid, non-negative income";
    }

    if (dependents === "") next.dependents = "Number of dependents is required";
    else if (!Number.isInteger(dependentsNum) || dependentsNum < 0 || dependentsNum > 20) {
      next.dependents = "Enter a whole number between 0 and 20";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;

    try {
      setLoading(true);

      await apiFetch(`/users/${userId}/risk-profile`, {
        method: "POST",
        body: {
          age: Number(age),
          annual_income: Number(income),
          dependents: Number(dependents),
          health_condition: health,
        },
      });

      toast.success("Preferences saved.");
      onSubmitSuccess("recommendations");
    } catch (err) {
      setFormError(err.message || "Unable to save preferences.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-content" style={{ maxWidth: 480 }}>
        <div className="auth-container" style={{ margin: "0 auto" }}>
          <h2>Insurance Preferences</h2>
          <p className="app-subtitle" style={{ marginTop: -12 }}>
            Used to calculate your risk level and personalize recommendations.
          </p>

          {formError && (
            <div className="alert alert-error" role="alert">
              {formError}
            </div>
          )}

          {loadingExisting ? (
            <div className="page-loader" style={{ minHeight: 160 }}>
              <span className="spinner spinner-dark" />
              Loading your profile…
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <FormField label="Age" required error={errors.age} htmlFor="risk-age">
                <input
                  id="risk-age"
                  type="number"
                  min="18"
                  max="100"
                  placeholder="e.g. 32"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  aria-invalid={!!errors.age}
                />
              </FormField>

              <FormField label="Annual income (₹)" required error={errors.income} htmlFor="risk-income">
                <input
                  id="risk-income"
                  type="number"
                  min="0"
                  placeholder="e.g. 600000"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  aria-invalid={!!errors.income}
                />
              </FormField>

              <FormField
                label="Number of dependents"
                required
                error={errors.dependents}
                htmlFor="risk-dependents"
              >
                <input
                  id="risk-dependents"
                  type="number"
                  min="0"
                  max="20"
                  placeholder="e.g. 2"
                  value={dependents}
                  onChange={(e) => setDependents(e.target.value)}
                  aria-invalid={!!errors.dependents}
                />
              </FormField>

              <FormField label="Health condition" htmlFor="risk-health">
                <select id="risk-health" value={health} onChange={(e) => setHealth(e.target.value)}>
                  <option value="none">No health issues</option>
                  <option value="minor">Minor issues</option>
                  <option value="major">Major issues</option>
                  <option value="critical">Critical condition</option>
                </select>
              </FormField>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? <span className="spinner" /> : null}
                {loading ? "Saving…" : "Save Preferences"}
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-block"
                style={{ marginTop: 10 }}
                onClick={() => onSubmitSuccess("policies")}
                disabled={loading}
              >
                Back to Policies
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default RiskProfile;
