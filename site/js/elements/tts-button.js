// <tts-button target="#article"> — reads the target element aloud via the
// SpeechSynthesis API. Light DOM, zero deps.
// Pair with css/elements/tts-button.css.

const SPEAKER_SVG = `
  <svg height="24" width="24" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05A4.47 4.47 0 0 0 16.5 12zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
  </svg>`;

class TtsButton extends HTMLElement {
  #ac;
  #speaking = false;

  connectedCallback() {
    if (!('speechSynthesis' in window)) return; // unsupported: render nothing

    this.innerHTML = `<button type="button" class="tts">${SPEAKER_SVG}</button>`;
    const button = this.querySelector('button');
    this.#ac = new AbortController();

    button.addEventListener(
      'click',
      () => {
        if (this.#speaking) {
          speechSynthesis.cancel();
          this.#setSpeaking(false, button);
          return;
        }
        const target = document.querySelector(this.getAttribute('target') ?? 'main');
        const text = target?.textContent?.trim();
        if (!text) return;

        const utterance = new SpeechSynthesisUtterance(text);
        const voices = speechSynthesis.getVoices();
        utterance.voice = voices.find((v) => v.name === 'Aaron') ?? voices[0] ?? null;
        utterance.addEventListener('end', () => this.#setSpeaking(false, button));
        speechSynthesis.speak(utterance);
        this.#setSpeaking(true, button);
      },
      { signal: this.#ac.signal },
    );
  }

  #setSpeaking(on, button) {
    this.#speaking = on;
    button.classList.toggle('speaking', on);
  }

  disconnectedCallback() {
    this.#ac?.abort();
    speechSynthesis.cancel();
    this.replaceChildren();
  }
}

customElements.define('tts-button', TtsButton);
