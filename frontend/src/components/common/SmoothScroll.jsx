"use client";
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ReactLenis } from 'lenis/react';

export default function SmoothScrolling({ children }) {
  const lenisRef = useRef(null);
  const pathname = usePathname();

  // Opening/closing a profile is a route change. If the Lenis instance was
  // ever left stopped, wheel input stays dead and the page looks frozen —
  // so make sure it is running after every navigation. start() on an
  // already-running instance is a no-op.
  useEffect(() => {
    const inst = lenisRef.current?.lenis ?? lenisRef.current;
    try {
      inst?.start?.();
    } catch {
      /* ignore */
    }
  }, [pathname]);

  return (
    <ReactLenis ref={lenisRef} root options={{ lerp: 0.08, duration: 1.5, smoothTouch: false }}>
      {children}
    </ReactLenis>
  );
}
