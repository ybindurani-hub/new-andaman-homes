import { RecaptchaVerifier } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth } from "./firebase.ts";

let recaptchaVerifier: RecaptchaVerifier | null = null;

export function getRecaptchaVerifier() {
  if (!recaptchaVerifier) {
    // Uses the stable container from index.html
    recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", { 
      size: "invisible" 
    });
  }
  return recaptchaVerifier;
}