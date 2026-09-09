export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  return EMAIL_REGEX.test(String(value).trim());
}

export function passwordChecks(password) {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
}

export function passwordScore(password) {
  const checks = passwordChecks(password);
  return Object.values(checks).filter(Boolean).length;
}

export function isStrongPassword(password) {
  const checks = passwordChecks(password);
  return checks.length && checks.upper && checks.lower && checks.number;
}

export function calculateAge(dobString) {
  const dob = new Date(dobString);
  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

// EPT-13 — vehicle endorsement payload checks (mirrors backend vehicle_validation.py).
const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;

export function vehicleChecks(payload = {}) {
  const errors = {};
  const currentYear = new Date().getFullYear();

  ["make", "model"].forEach((field) => {
    const value = String(payload[field] ?? "").trim();
    if (!value) errors[field] = `${field[0].toUpperCase() + field.slice(1)} is required`;
    else if (value.length > 50) errors[field] = "Must be 50 characters or fewer";
  });

  const yearNum = Number(payload.year);
  if (payload.year === undefined || payload.year === null || payload.year === "" || Number.isNaN(yearNum)) {
    errors.year = "Year is required";
  } else if (yearNum < 1900 || yearNum > currentYear + 1) {
    errors.year = `Year must be between 1900 and ${currentYear + 1}`;
  }

  const vin = String(payload.vin ?? "").trim().toUpperCase();
  if (!vin) errors.vin = "VIN is required";
  else if (!VIN_REGEX.test(vin)) errors.vin = "VIN must be 17 characters (A-Z except I, O, Q and 0-9)";

  const registration = String(payload.registration ?? "").trim();
  if (!registration) errors.registration = "Registration is required";
  else if (registration.length > 20) errors.registration = "Must be 20 characters or fewer";

  return errors;
}

export function isPastDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() <= Date.now();
}
