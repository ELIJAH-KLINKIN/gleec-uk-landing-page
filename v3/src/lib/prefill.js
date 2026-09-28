// Lets CTAs elsewhere on the page pre-select a business type in the waitlist
// form. WaitlistForm listens for PREFILL_EVENT.
export const PREFILL_EVENT = "gl:waitlist-prefill";

export function prefillWaitlist(businessType) {
  window.dispatchEvent(new CustomEvent(PREFILL_EVENT, { detail: { businessType } }));
}
