// <case-study-nav> — prev/next links that fade in after scrolling 250px.
//   <case-study-nav prev="/case-studies/zillow/" next="/case-studies/facebook/"></case-study-nav>
// Light DOM, zero deps. Pair with css/elements/case-study-nav.css.

class CaseStudyNav extends HTMLElement {
  #ac;

  connectedCallback() {
    const prev = this.getAttribute('prev');
    const next = this.getAttribute('next');
    this.innerHTML = `
      ${prev ? `<a class="prev" href="${prev}">Previous Case Study</a>` : '<span></span>'}
      ${next ? `<a class="next" href="${next}">Next Case Study</a>` : '<span></span>'}`;

    this.#ac = new AbortController();
    const onScroll = () => this.classList.toggle('visible', window.scrollY > 250);
    window.addEventListener('scroll', onScroll, { passive: true, signal: this.#ac.signal });
    onScroll();
  }

  disconnectedCallback() {
    this.#ac?.abort();
    this.replaceChildren();
  }
}

customElements.define('case-study-nav', CaseStudyNav);
