/** Exact UW domain boundary, shared by the form and server enforcement. */
export function isUWEmail(email: string) {
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-z0-9-]+\.)*wisc\.edu$/i.test(
    email,
  );
}
