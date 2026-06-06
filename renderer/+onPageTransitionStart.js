export function onPageTransitionStart() {
  if (!document.body.classList.contains('page-is-transitioning')) {
    document.body.classList.add('page-is-transitioning');
    const event = new Event('spaTransitionStart');
    window.dispatchEvent(event);
  }
}
