import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../utils/apiClient";
import "./Recommendations.css";

function RecommendationSkeleton() {
  return (
    <div className="card recommendation-card">
      <div className="skeleton" style={{ height: 18, width: "50%", marginBottom: 14 }} />
      <div className="skeleton" style={{ height: 14, width: "30%", marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 14, width: "30%", marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 28, width: "35%" }} />
    </div>
  );
}

function Recommendations({ userId }) {
  const [recommendations, setRecommendations] = useState([]);
  const [riskLevel, setRiskLevel] = useState("");
  const [annualIncome, setAnnualIncome] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsProfile, setNeedsProfile] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError("");
    setNeedsProfile(false);
    try {
      const data = await apiFetch(`/users/${userId}/recommendations`);
      setRiskLevel(data.risk_level || "");
      setAnnualIncome(data.annual_income || 0);
      setRecommendations(data.top_recommendations || []);
    } catch (err) {
      if (String(err.message).toLowerCase().includes("risk profile")) {
        setNeedsProfile(true);
      } else {
        setError(err.message || "Unable to load recommendations");
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) fetchRecommendations();
  }, [userId, fetchRecommendations]);

  const riskBadgeClass =
    riskLevel === "high" ? "badge-danger" : riskLevel === "low" ? "badge-success" : "badge-neutral";

  return (
    <div className="page-shell">
      <div className="page-content">
        <div className="page-heading">
          <div>
            <h2>Recommended for You</h2>
            <p>Ranked using your risk profile and policy affordability.</p>
          </div>
        </div>

        {loading && (
          <div className="recommendation-list">
            {Array.from({ length: 3 }).map((_, i) => (
              <RecommendationSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && needsProfile && (
          <div className="empty-state">
            <div className="empty-icon">🧭</div>
            <h3>Set your preferences first</h3>
            <p>We need a few details about you to personalize recommendations.</p>
          </div>
        )}

        {!loading && error && (
          <div className="empty-state">
            <div className="empty-icon">⚠️</div>
            <h3>Couldn't load recommendations</h3>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={fetchRecommendations}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && !needsProfile && (
          <>
            <div className="risk-summary card">
              <div>
                <div className="risk-summary-label">Your risk level</div>
                <span className={`badge ${riskBadgeClass}`}>{riskLevel || "unknown"}</span>
              </div>
              <div>
                <div className="risk-summary-label">Annual income</div>
                <div className="risk-summary-value">₹{annualIncome.toLocaleString()}</div>
              </div>
            </div>

            {recommendations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3>No recommendations yet</h3>
                <p>Check back once more policies are available.</p>
              </div>
            ) : (
              <div className="recommendation-list">
                {recommendations.map((policy) => (
                  <div key={policy.id} className="card recommendation-card">
                    <div className="recommendation-top">
                      <div className="policy-name">{policy.title}</div>
                      <span className="badge badge-success">Score {policy.score}/100</span>
                    </div>

                    <div className="policy-details-row">
                      <span className="badge badge-info">{policy.policy_type}</span>
                      <span>Premium: ₹{policy.premium}</span>
                      <span>Deductible: ₹{policy.deductible}</span>
                    </div>

                    <div className="reason-text">{policy.reason}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Recommendations;
