'use client';
import { useEffect } from 'react';
import { gsap } from 'gsap';

class Cursor {
  constructor(el) {
    this.DOM = { el };
    this.DOM.el.style.opacity = 0;
    this.DOM.circleInner = this.DOM.el.querySelector('.cursor__inner');
    this.DOM.textElement = this.DOM.el.querySelector('.cursor__text'); // Reference the text element
    this.filterId = '#filter-1';
    this.DOM.feDisplacementMap = document.querySelector(
      `${this.filterId} > feDisplacementMap`
    );
    this.primitiveValues = { scale: 0 };
    this.createTimeline();
    this.bounds = this.DOM.el.getBoundingClientRect();
    this.renderedStyles = {
      tx: { previous: 0, current: 0, amt: 0.4 },
      ty: { previous: 0, current: 0, amt: 0.4 },
      radius: { previous: 75, current: 75, amt: 0.4 },
    };
    this.initListeners();
  }

  createTimeline() {
    this.tl = gsap
      .timeline({
        paused: true,
        onStart: () => {
          this.DOM.circleInner.style.filter = `url(${this.filterId})`;
        },
        onUpdate: () => {
          this.DOM.feDisplacementMap.scale.baseVal = this.primitiveValues.scale;
        },
        onComplete: () => {
          this.DOM.circleInner.style.filter = 'none';
        },
      })
      .to(this.primitiveValues, {
        duration: 0.1,
        ease: 'Expo.easeOut',
        startAt: { scale: 1 },
        scale: 90,
      })
      .to(this.primitiveValues, {
        duration: 0.3,
        ease: 'Power3.easeOut',
        scale: 4,
      });
  }

  render() {
    for (const key in this.renderedStyles) {
      this.renderedStyles[key].previous = this.lerp(
        this.renderedStyles[key].previous,
        this.renderedStyles[key].current,
        this.renderedStyles[key].amt
      );
    }
    this.DOM.el.style.transform = `translate(${this.renderedStyles.tx.previous}px, ${this.renderedStyles.ty.previous}px)`;
    this.DOM.circleInner.setAttribute('r', this.renderedStyles.radius.previous);
    requestAnimationFrame(() => this.render());
  }

  enter(scale = 75) {
    this.renderedStyles.radius.current = scale;
    gsap.to(this.renderedStyles.radius, {
      duration: 0.3,
      ease: 'Power3.easeOut',
      previous: this.renderedStyles.radius.current,
      onUpdate: () =>
        this.DOM.circleInner.setAttribute(
          'r',
          this.renderedStyles.radius.previous
        ),
    });
    this.tl.restart();
  }

  leave() {
    this.renderedStyles.radius.current = 75;
    gsap.to(this.renderedStyles.radius, {
      duration: 0.3,
      ease: 'Power3.easeOut',
      previous: this.renderedStyles.radius.current,
      onUpdate: () =>
        this.DOM.circleInner.setAttribute(
          'r',
          this.renderedStyles.radius.previous
        ),
    });
    this.tl.progress(1).kill();
    this.updateCursorText(''); // Clear text on leave
  }

  clickEffect() {
    this.tl.restart(); // Trigger the SVG effect on click
  }

  hideCursor() {
    gsap.to(this.DOM.el, { duration: 0.3, opacity: 0 });
  }

  showCursor() {
    gsap.to(this.DOM.el, { duration: 0.3, opacity: 1 });
  }

  updateCursorText(text) {
    const existingText = this.DOM.el.querySelector('text');
    if (existingText) existingText.remove(); // Clear any existing text
    const textElement = document.createElement('text');
    textElement.className = 'center-first';
    textElement.textContent = text;
    this.DOM.circleInner.appendChild(textElement); // Append new text inside cursor__inner
  }

  initListeners() {
    document.addEventListener('click', this.clickEffect.bind(this));
  }

  lerp(a, b, n) {
    return (1 - n) * a + n * b;
  }
}

export default function SuperCursor() {
  useEffect(() => {
    const cursorEl = document.querySelector('.cursor');
    const cursor = new Cursor(cursorEl);

    const handleMouseMove = (e) => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      cursorEl.style.left = `${mouseX - 70}px`;
      cursorEl.style.top = `${mouseY - 71}px`;
    };

    // Handle hover, scaling, and text updates via `data-cursortext`
    document.querySelectorAll('[data-cursortext]').forEach((el) => {
      el.addEventListener('mouseenter', () => {
        const cursorText = el.getAttribute('data-cursortext');
        if (cursorText) {
          cursor.updateCursorText(cursorText);
        }
        cursor.enter(85); // scale up when hovering
      });

      el.addEventListener('mouseleave', () => {
        cursor.updateCursorText(''); // Remove text on leave
        cursor.leave(); // return to original size
      });
    });

    // Add mouse movement globally to follow the cursor
    document.addEventListener('mousemove', handleMouseMove);

    // Cleanup event listeners on unmount
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <svg className="cursor" width="140" height="140" viewBox="0 0 280 280">
      <defs>
        <filter
          id="filter-1"
          x="-50%"
          y="-50%"
          width="300%"
          height="300%"
          filterUnits="objectBoundingBox"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.04 0.025"
            numOctaves="2"
            result="warp"
          />
          <feDisplacementMap
            xChannelSelector="R"
            yChannelSelector="G"
            scale="3"
            in="SourceGraphic"
            in2="warp"
          />
        </filter>
      </defs>
      <circle className="cursor__inner" cx="140" cy="140" r="75"></circle>
      <text className="cursor__text" x="140" y="140" textAnchor="middle" dominantBaseline="middle"></text>
    </svg>
  );
}
