'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * A skip link for an app whose pages each draw their own <main>, some only after data loads.
 * It watches the document, tags whichever <main> is on screen (an existing id is kept) and makes it a focus target.
 * Render it once, first in <body>. Styles assume Tailwind; swap the classes for your own "visible on focus" rule.
 */
export function SkipToContent() {
  const pathname = usePathname();
  const [target, setTarget] = useState('content');

  useEffect(() => {
    const tag = () => {
      const main = document.querySelector('main');
      if (!main) return;
      if (!main.id) main.id = 'content';
      if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
      setTarget(main.id);
    };
    tag();
    const watch = new MutationObserver(tag);
    watch.observe(document.body, { childList: true, subtree: true });
    return () => watch.disconnect();
  }, [pathname]);

  return (
    <a
      href={`#${target}`}
      onClick={(e) => {
        const main = document.getElementById(target);
        if (!main) return;
        e.preventDefault();
        main.focus();
        main.scrollIntoView();
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground"
    >
      Skip to main content
    </a>
  );
}
