function FormField({
  label,
  error,
  hint,
  required,
  children,
  htmlFor,
}) {
  return (
    <div className="field">
      {label && (
        <label htmlFor={htmlFor}>
          {label}
          {required && <span className="required-mark">*</span>}
        </label>
      )}
      {children}
      {error && (
        <div className="field-error" role="alert">
          <span aria-hidden="true">⚠</span> {error}
        </div>
      )}
      {!error && hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

export default FormField;
