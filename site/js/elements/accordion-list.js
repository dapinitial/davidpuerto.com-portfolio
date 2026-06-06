// <accordion-list> — definition-list accordion (port of components/accordion).
// Markup (content stays in the light DOM):
//   <accordion-list bigger>
//     <dl>
//       <dt><em>Emma</em> — The Code Reviewer</dt>
//       <dd><ul><li>Role: ...</li><li>Bio: ...</li></ul></dd>
//       ...
//     </dl>
//   </accordion-list>
// `bigger` matches the old `bigger` prop (larger titles). One panel open at a
// time; clicking the open title closes it. Zero deps.
// Pair with css/elements/accordion-list.css.

class AccordionList extends HTMLElement {
  #ac;

  connectedCallback() {
    if (this.querySelector('.icon-wrap')) return; // already enhanced

    this.#ac = new AbortController();
    const titles = [...this.querySelectorAll('dt')];

    for (const dt of titles) {
      // Wrap the authored title in the old .titleText structure + icon.
      const titleText = document.createElement('span');
      titleText.className = 'title-text';
      const inner = document.createElement('div');
      inner.append(...dt.childNodes);
      titleText.append(inner);

      const iconWrap = document.createElement('div');
      iconWrap.className = 'icon-wrap';
      iconWrap.innerHTML = '<div class="button-icon"></div>';

      dt.append(titleText, iconWrap);

      dt.addEventListener(
        'click',
        () => {
          const wasOpen = dt.classList.contains('active');
          for (const t of titles) {
            t.classList.remove('active');
            t.nextElementSibling?.classList.remove('show');
          }
          if (!wasOpen) {
            dt.classList.add('active');
            dt.nextElementSibling?.classList.add('show');
          }
        },
        { signal: this.#ac.signal },
      );
    }
  }

  disconnectedCallback() {
    this.#ac?.abort();
  }
}

customElements.define('accordion-list', AccordionList);
