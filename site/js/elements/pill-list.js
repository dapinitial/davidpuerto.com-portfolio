// <pill-list> — row of pills that light up one-by-one (180ms stagger).
//   <pill-list>
//     <li>HTML</li>
//     <li>CSS</li>
//   </pill-list>
// Items are authored as light-DOM <li> children; the element only staggers
// an .active class onto them (port of the old React PillList).
// Light DOM, zero deps. Pair with css/elements/pill-list.css.

class PillList extends HTMLElement {
  #interval;

  connectedCallback() {
    const pills = [...this.children];
    if (!pills.length) return;

    let index = 0;
    this.#interval = setInterval(() => {
      if (index < pills.length) {
        pills[index].classList.add('active');
        index += 1;
      } else {
        clearInterval(this.#interval);
      }
    }, 180);
  }

  disconnectedCallback() {
    clearInterval(this.#interval);
    for (const pill of this.children) pill.classList.remove('active');
  }
}

customElements.define('pill-list', PillList);
