import "./EndorsementHistory.css";

const FIELD_LABELS = {
  make: "Make",
  model: "Model",
  year: "Year",
  vin: "VIN",
  registration: "Registration",
};

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString();
}

function changedFields(oldValues, newValues) {
  const a = oldValues || {};
  const b = newValues || {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].filter((k) => a[k] !== b[k]);
}

function EndorsementHistory({ items = [] }) {
  if (!items || items.length === 0) {
    return (
      <div className="endorsement-history empty-state">
        <div className="empty-icon">📭</div>
        <h3>No endorsement history yet</h3>
        <p>Vehicle update requests for this policy will appear here.</p>
      </div>
    );
  }

  return (
    <div className="endorsement-history">
      {items.map((item, index) => {
        const fields = changedFields(item.old_values, item.new_values);
        return (
          <div key={item.id} className="endorsement-row card">
            <div className="endorsement-row-head">
              <span className={`badge badge-${String(item.status).toLowerCase()}`}>
                {item.status}
              </span>
              <span className="endorsement-date">
                Requested {formatDate(item.request_date)}
              </span>
              {item.decision_date && (
                <span className="endorsement-date">
                  Decided {formatDate(item.decision_date)}
                </span>
              )}
            </div>
            {index === 0 ? (
              <ul className="endorsement-changes">
                {fields.map((field) => (
                  <li key={field}>
                    <span className="change-label">{FIELD_LABELS[field] || field}</span>
                    <span className="old-value">{String((item.old_values || {})[field] ?? "—")}</span>
                    <span className="change-arrow" aria-hidden="true">
                      →
                    </span>
                    <span className="new-value">{String((item.new_values || {})[field] ?? "—")}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="endorsement-changes-summary">
                {fields.map((f) => FIELD_LABELS[f] || f).join(", ")} update requested
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default EndorsementHistory;
