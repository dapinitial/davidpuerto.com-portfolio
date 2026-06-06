'use client';
import { useEffect } from 'react';
import { gsap } from 'gsap';
import EventEmitter from 'events';

class Cursor extends EventEmitter {
  constructor(el) {
    super();
    this.DOM = { el };
    this.DOM.el.style.opacity = 0;
    this.DOM.circleInner = this.DOM.el.querySelector('.cursor__inner');
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
      radius: { previous: 20, current: 20, amt: 0.4 },
    };
    this.listen();
    this.onMouseMoveEv = this.onMouseMoveEv.bind(this);
  }

  onMouseMoveEv(e) {
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    this.renderedStyles.tx.previous = this.renderedStyles.tx.current =
      mouseX - this.bounds.width / 2;
    this.renderedStyles.ty.previous = this.renderedStyles.ty.previous =
      mouseY - this.bounds.height / 2;

    gsap.to(this.DOM.el, { duration: 0.4, ease: 'Power3.easeOut', opacity: 1 });
    requestAnimationFrame(() => this.render());
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

  enter() {
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
    this.tl.restart();
  }

  leave() {
    this.renderedStyles.radius.current = 20;
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
  }

  listen() {
    this.on('enter', () => this.enter());
    this.on('leave', () => this.leave());
  }

  lerp(a, b, n) {
    return (1 - n) * a + n * b;
  }
}

export default function SuperCursor() {
  useEffect(() => {
    const cursorEl = document.querySelector('.cursor');
    const cursor = new Cursor(cursorEl);

    const applyHoverListeners = () => {
      document.querySelectorAll('a').forEach((el) => {
        el.addEventListener('mouseenter', () => cursor.emit('enter'));
        el.addEventListener('mouseleave', () => cursor.emit('leave'));
      });
    };

    applyHoverListeners();

    const handleMouseMove = (e) => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      cursorEl.style.left = `${mouseX - 70}px`;
      cursorEl.style.top = `${mouseY - 71}px`;
    };

    const createSplash = (x, y) => {
      const splash = document.createElement('div');
      splash.classList.add('splash');

      splash.style.left = `${x}px`;
      splash.style.top = `${y}px`;

      document.body.appendChild(splash);

      for (let i = 0; i < 3; i++) {
        const ripple = document.createElement('div');
        ripple.classList.add('splash', 'ripple');

        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;

        ripple.style.animationDelay = `${i * 0.2}s`;

        document.body.appendChild(ripple);

        setTimeout(() => {
          ripple.remove();
        }, 2000);
      }

      setTimeout(() => {
        splash.remove();
      }, 1750);
    };

    const handleClick = (e) => {
      cursor.emit('enter');
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      createSplash(mouseX, mouseY);
      setTimeout(() => cursor.emit('leave'), 500);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);

    const observer = new MutationObserver(() => {
      applyHoverListeners();
    });

    observer.observe(document.body, { childList: true, subtree: false });

    return () => {
      observer.disconnect();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
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
      <circle className="cursor__inner" cx="140" cy="140" r="20"></circle>
    </svg>
  );
}
