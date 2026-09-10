import { useEffect, useState, useCallback } from "react";
import "./AdminDashboard.css";
import { BASE_URL } from "../api";
import { apiFetch, apiFetchBlob } from "../utils/apiClient";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";

function resolveDocUrl(fileUrl) {
  if (!fileUrl) return "";
  return fileUrl.startsWith("/") ? `${BASE_URL}${fileUrl}` : fileUrl;
}

function ClaimCardSkeleton() {
  return (
    <div className="card claim-card">
      <div className="skeleton" style={{ height: 16, width: "40%", marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 12, width: "30%", marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 22, width: "25%", marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 36, width: "100%" }} />
    </div>
  );
}

const AdminDashboard = () => {
  const toast = useToast();
  const confirm = useConfirm();

  const [claims, setClaims] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [sortBy, setSortBy] = useState("date");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [exporting, setExporting] = useState(false);

  const loadClaims = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await apiFetch("/admin/claims");
      setClaims(data || []);
    } catch (err) {
      setLoadError(err.message || "Failed to load claims");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  const updateStatus = async (claim, status) => {
    const labels = { approved: "approve", rejected: "reject", under_review: "mark under review" };
    const ok = await confirm({
      title: `${labels[status] || "Update"} claim ${claim.claim_number}?`,
      message:
        status === "rejected"
          ? "This will reject the claim. The applicant will see this status."
          : "This updates the claim status immediately.",
      confirmLabel: "Confirm",
      tone: status === "rejected" ? "danger" : "primary",
    });
    if (!ok) return;

    try {
      setUpdatingId(claim.id);
      await apiFetch(`/claims/${claim.id}/status`, {
        method: "PUT",
        body: { status },
      });
      toast.success(`Claim ${claim.claim_number} updated.`);
      await loadClaims();
      setExpanded(null);
    } catch (err) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const exportCSV = async () => {
    try {
      setExporting(true);
      const blob = await apiFetchBlob("/admin/export-claims");
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "claims_export.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const sortedClaims = [...claims].sort((a, b) => {
    if (sortBy === "amount") return b.amount_claimed - a.amount_claimed;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return (
    <div className="page-shell">
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h2>Insurance Claim Review Panel</h2>
            <p className="admin-subtitle">{claims.length} total claims</p>
          </div>

          <div className="header-actions">
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date">Sort by Date</option>
              <option value="amount">Sort by Amount</option>
            </select>

            <button className="btn btn-primary" onClick={exportCSV} disabled={exporting}>
              {exporting ? <span className="spinner" /> : null}
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
          </div>
        </div>

        {loading && (
          <div className="claims-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <ClaimCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && loadError && (
          <div className="empty-state">
            <div className="empty-icon">⚠️</div>
            <h3>Couldn't load claims</h3>
            <p>{loadError}</p>
            <button className="btn btn-primary" onClick={loadClaims}>
              Try again
            </button>
          </div>
        )}

        {!loading && !loadError && sortedClaims.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No claims submitted yet</h3>
          </div>
        )}

        {!loading && !loadError && sortedClaims.length > 0 && (
          <div className="claims-grid">
            {sortedClaims.map((claim) => (
              <div key={claim.id} className="card claim-card">
                <div className="claim-summary">
                  <div>
                    <h3>{claim.claim_number}</h3>
                    <p className="amount">₹ {claim.amount_claimed}</p>
                    <span className={`badge status-${claim.status}`}>
                      {claim.status.replace("_", " ")}
                    </span>
                  </div>
                </div>

                <div className="card-buttons">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setExpanded(expanded === claim.id ? null : claim.id)}
                  >
                    {expanded === claim.id ? "Hide Review" : "Check & Review"}
                  </button>

                  {claim.documents && claim.documents.length > 0 && (
                    <a
                      className="btn btn-secondary btn-sm"
                      href={resolveDocUrl(claim.documents[0].file_url)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View Document
                    </a>
                  )}
                </div>

                {expanded === claim.id && (
                  <div className="expand-section">
                    {claim.fraud_flags?.length > 0 ? (
                      <div className="fraud-box fraud-danger">
                        <h4>🚨 Fraud signals detected</h4>
                        <ul>
                          {claim.fraud_flags.map((flag, index) => (
                            <li key={index}>
                              <strong>{flag.rule_code}</strong> — {flag.details}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="fraud-box fraud-safe">
                        <h4>✅ No fraud signals</h4>
                      </div>
                    )}

                    <div className="decision-section">
                      <button
                        className="btn btn-success"
                        onClick={() => updateStatus(claim, "approved")}
                        disabled={updatingId === claim.id}
                      >
                        Approve
                      </button>

                      <button
                        className="btn btn-danger"
                        onClick={() => updateStatus(claim, "rejected")}
                        disabled={updatingId === claim.id}
                      >
                        Reject
                      </button>

                      <button
                        className="btn btn-warning"
                        onClick={() => updateStatus(claim, "under_review")}
                        disabled={updatingId === claim.id}
                      >
                        Mark Under Review
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
