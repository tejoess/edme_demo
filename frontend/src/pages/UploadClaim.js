import { useRef, useState } from "react";
import { apiFetch } from "../utils/apiClient";
import { useToast } from "../context/ToastContext";
import "./UploadClaim.css";

const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
const ALLOWED_EXT = [".pdf", ".png", ".jpg", ".jpeg"];

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadClaim({ claimId, onBack }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const validateFile = (candidate) => {
    const ext = candidate.name.slice(candidate.name.lastIndexOf(".")).toLowerCase();
    const typeOk = ALLOWED_TYPES.includes(candidate.type) || ALLOWED_EXT.includes(ext);

    if (!typeOk) {
      return "Only PDF, PNG, or JPG files are allowed.";
    }
    if (candidate.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File is too large. Maximum size is ${MAX_SIZE_MB}MB.`;
    }
    return "";
  };

  const applyFile = (candidate) => {
    setMessage("");
    if (!candidate) return;
    const validationError = validateFile(candidate);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setError("");
    setFile(candidate);
  };

  const handleUpload = async () => {
    setError("");
    setMessage("");

    if (!file) {
      setError("Please select a file to upload");
      return;
    }
    if (!claimId) {
      setError("Invalid claim — go back and file a claim first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      await apiFetch(`/claims/${Number(claimId)}/upload`, {
        method: "POST",
        body: formData,
      });

      setMessage("Document uploaded successfully.");
      toast.success("Claim document uploaded.");
      setFile(null);
    } catch (err) {
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-content" style={{ maxWidth: 520 }}>
        <div className="card upload-card">
          <h2>Upload Claim Document</h2>
          <p className="upload-subtitle">
            {claimId ? `Attach supporting documents for claim #${claimId}.` : "No claim selected."}
          </p>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}
          {message && (
            <div className="alert alert-success" role="status">
              {message}
            </div>
          )}

          <div
            className={`dropzone ${dragOver ? "dropzone-active" : ""} ${file ? "dropzone-filled" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              applyFile(e.dataTransfer.files?.[0]);
            }}
            role="button"
            tabIndex={0}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              hidden
              onChange={(e) => applyFile(e.target.files?.[0])}
            />

            {file ? (
              <>
                <div className="dropzone-icon">📎</div>
                <div className="dropzone-filename">{file.name}</div>
                <div className="dropzone-hint">{formatSize(file.size)} — click to replace</div>
              </>
            ) : (
              <>
                <div className="dropzone-icon">⬆️</div>
                <div className="dropzone-hint">
                  Drag &amp; drop a file here, or click to browse
                </div>
                <div className="dropzone-hint">PDF, PNG, or JPG — up to {MAX_SIZE_MB}MB</div>
              </>
            )}
          </div>

          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 20 }}
            onClick={handleUpload}
            disabled={loading || !file}
          >
            {loading ? <span className="spinner" /> : null}
            {loading ? "Uploading…" : "Upload Document"}
          </button>

          <button
            className="btn btn-secondary btn-block"
            style={{ marginTop: 10 }}
            onClick={onBack}
            disabled={loading}
          >
            Back to My Claims
          </button>
        </div>
      </div>
    </div>
  );
}

export default UploadClaim;
