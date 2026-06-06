import { useEffect, useLayoutEffect } from 'react';

// Custom hook to conditionally use useLayoutEffect only on the client-side
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;
