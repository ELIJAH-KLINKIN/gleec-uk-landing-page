// Lets other parts of the page talk to the waitlist form (WaitlistForm listens):
//   PREFILL_EVENT — a segment CTA pre-selects a business type;
//   JOINED_EVENT  — someone joined from the hero pill; the form continues at step 2.
export const PREFILL_EVENT = "gl:waitlist-prefill";

export function prefillWaitlist(businessType) {
  window.dispatchEvent(new CustomEvent(PREFILL_EVENT, { detail: { businessType } }));
}

export const JOINED_EVENT = "gl:waitlist-joined";

export function announceJoined(lead) {
  window.dispatchEvent(new CustomEvent(JOINED_EVENT, { detail: lead }));
}
