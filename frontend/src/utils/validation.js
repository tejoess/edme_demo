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

export function isPastDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() <= Date.now();
}
