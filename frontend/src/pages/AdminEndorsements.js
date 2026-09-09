import { useCallback, useEffect, useState } from "react";
import "./AdminEndorsements.css";
import { apiFetch } from "../utils/apiClient";
import { useToast } from "../context/ToastContext";

const FIELDS = ["make", "model", "year", "vin", "registration"];
const LABELS = {
  make: "Make",
  model: "Model",
  year: "Year",
  vin: "VIN",
  registration: "Registration",
};

function RowSkeleton() {
  return (
    <div className="card endorsement-admin-card">
      <div className="skeleton" style={{ height: 16, width: "40%", marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 12, width: "60%", marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 34, width: "100%" }} />
    </div>
  );
}

function AdminEndorsements({ onBack }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await apiFetch("/admin/endorsements?status=pending");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err.message || "Failed to load endorsements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (id, action) => {
    try {
      setBusyId(id);
      await apiFetch(`/admin/endorsements/${id}/${action}`, { method: "POST" });
      toast.success(`Endorsement ${action === "approve" ? "approved" : "rejected"}.`);
      await load();
    } catch (err) {
      toast.error(err.message || `Failed to ${action} endorsement`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page-shell">
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h2>Policy Endorsement Requests</h2>
            <p className="admin-subtitle">{rows.length} pending</p>
          </div>
          <button className="btn btn-secondary" onClick={onBack}>
            Back
          </button>
        </div>

        {loading && (
          <div className="endorsement-admin-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && loadError && (
          <div className="empty-state">
            <div className="empty-icon">⚠️</div>
            <h3>Couldn't load endorsements</h3>
            <p>{loadError}</p>
            <button className="btn btn-primary" onClick={load}>
              Try again
            </button>
          </div>
        )}

        {!loading && !loadError && rows.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No pending endorsements</h3>
          </div>
        )}

        {!loading && !loadError && rows.length > 0 && (
          <div className="endorsement-admin-grid">
            {rows.map((row) => {
              const oldV = row.old_values || {};
              const newV = row.new_values || {};
              return (
                <div key={row.id} className="card endorsement-admin-card">
                  <h3>Endorsement #{row.id}</h3>
                  <p className="endorsement-admin-meta">
                    {row.policy_number ? `${row.policy_number} · ` : ""}
                    {row.requested_by_email || row.requested_by_name || `User ${row.requested_by}`}
                  </p>
                  <ul className="endorsement-admin-changes">
                    {FIELDS.filter((f) => oldV[f] !== newV[f]).map((f) => (
                      <li key={f}>
                        <strong>{LABELS[f]}:</strong>{" "}
                        <span className="old-value">{String(oldV[f] ?? "—")}</span>
                        {" → "}
                        <span className="new-value">{String(newV[f] ?? "—")}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="endorsement-admin-actions">
                    <button
                      className="btn btn-success"
                      onClick={() => decide(row.id, "approve")}
                      disabled={busyId === row.id}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => decide(row.id, "reject")}
                      disabled={busyId === row.id}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminEndorsements;
