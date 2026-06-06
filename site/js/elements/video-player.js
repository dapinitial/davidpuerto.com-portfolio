// <video-player> — poster + pulsing play button over a native <video>.
//   <video-player title="..." poster="/images/....jpg" src="https://...mov" loop fit-content></video-player>
// Attributes: src (required), poster, title, loop, autoplay, fit-content
// (without fit-content the player caps itself at 75vw, matching the old
// React component's `fitContent` prop). Renders itself as a .card.results-table.
// Light DOM, zero deps. Pair with css/elements/video-player.css.

class VideoPlayer extends HTMLElement {
  #ac;

  connectedCallback() {
    const src = this.getAttribute('src') ?? '';
    const poster = this.getAttribute('poster');
    const title = this.getAttribute('title');

    this.classList.add('card', 'results-table');
    if (!this.hasAttribute('fit-content')) this.style.maxWidth = '75vw';

    this.innerHTML = `
      <div class="video-container">
        <button class="video-play-button" type="button" aria-label="Play video"><span></span></button>
        <video controls preload="metadata">
          <source type="video/mp4">
          Your browser does not support the video tag.
        </video>
      </div>`;

    const video = this.querySelector('video');
    const button = this.querySelector('.video-play-button');
    this.querySelector('source').src = src;
    if (poster) video.poster = poster;
    if (title) video.title = title;
    if (this.hasAttribute('loop')) video.loop = true;
    if (this.hasAttribute('autoplay')) {
      video.muted = true;
      video.autoplay = true;
    }

    this.#ac = new AbortController();
    const { signal } = this.#ac;
    button.addEventListener('click', () => video.play(), { signal });
    video.addEventListener('play', () => { button.hidden = true; }, { signal });
    video.addEventListener('pause', () => { button.hidden = false; }, { signal });
    video.addEventListener('ended', () => { button.hidden = false; }, { signal });
  }

  disconnectedCallback() {
    this.#ac?.abort();
    this.replaceChildren();
  }
}

customElements.define('video-player', VideoPlayer);
