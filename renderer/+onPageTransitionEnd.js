export function onPageTransitionEnd() {
  const pageReady = new Promise((resolve) => {
    setTimeout(resolve, 1000); // Simulate content readiness
  });

  const minimumTime = new Promise((resolve) => {
    setTimeout(resolve, 1500); // Ensure 1500ms transition for PreloaderInfinite
  });

  Promise.all([pageReady, minimumTime]).then(() => {
    document.body.classList.remove('page-is-transitioning');
    document.getElementById('main-content').style.pointerEvents = 'all'; // Restore interactivity
    const event = new Event('spaTransitionEnd');
    window.dispatchEvent(event);
  });
}