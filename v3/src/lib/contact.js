// Rules for the "about you" fields shared by the waitlist details step and
// "Talk to a human": first and last name are required, the rest optional.
// Messages say how to fix the problem (HIG: plain, direct, no blame).
const PHONE_RE = /^[0-9 +().-]*$/;
const SITE_RE = /^(https?:\/\/)?([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(\/\S*)?$/i;
const len = (s) => (s || "").trim().length;

export function validateContactDetails(v) {
  const errors = {};
  if (!len(v.firstName)) errors.firstName = "Enter your first name.";
  else if (len(v.firstName) > 60) errors.firstName = "Shorten your first name to 60 characters or fewer.";
  if (!len(v.lastName)) errors.lastName = "Enter your last name.";
  else if (len(v.lastName) > 60) errors.lastName = "Shorten your last name to 60 characters or fewer.";
  if (len(v.phone) > 40 || !PHONE_RE.test(v.phone || "")) errors.phone = "Use only digits, spaces and + ( ) -.";
  else if (len(v.phone) && (v.phone.match(/\d/g) || []).length < 5)
    errors.phone = "Enter a full phone number, including the area code.";
  if (len(v.company) > 160) errors.company = "Shorten the company name to 160 characters or fewer.";
  if (len(v.companyWebsite) && (!SITE_RE.test(v.companyWebsite.trim()) || len(v.companyWebsite) > 200))
    errors.companyWebsite = "Enter a website like acme.com.";
  if (len(v.message) > 2000) errors.message = "Keep your message to 2,000 characters or fewer.";
  return errors;
}
