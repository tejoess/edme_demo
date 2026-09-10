import { createContext, useCallback, useContext, useState } from "react";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setState({
        title: options.title || "Are you sure?",
        message: options.message || "",
        confirmLabel: options.confirmLabel || "Confirm",
        cancelLabel: options.cancelLabel || "Cancel",
        tone: options.tone || "primary",
        resolve,
      });
    });
  }, []);

  const handleClose = (result) => {
    if (state) state.resolve(result);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) handleClose(false);
          }}
        >
          <div className="modal-box" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
            <h3 id="confirm-title">{state.title}</h3>
            <p className="modal-message">{state.message}</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => handleClose(false)}>
                {state.cancelLabel}
              </button>
              <button
                className={`btn ${state.tone === "danger" ? "btn-danger" : "btn-primary"}`}
                onClick={() => handleClose(true)}
                autoFocus
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return ctx;
}
