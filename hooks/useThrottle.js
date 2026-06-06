import { useRef } from 'react';

export const useThrottle = (callback, delay) => {
  const shouldWaitRef = useRef(false);

  const throttledFunction = (...args) => {
    if (shouldWaitRef.current) return;

    callback(...args);
    shouldWaitRef.current = true;
    setTimeout(() => {
      shouldWaitRef.current = false;
    }, delay);
  };

  return throttledFunction;
};