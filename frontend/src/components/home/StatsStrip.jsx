'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const stats = [
  { value: 10, label: 'FLEX PRINTERS', suffix: 'k+' },
  { value: 9, label: 'DIGITAL PRINTERS', suffix: 'k+' },
  { value: 20, label: 'T-SHIRT PRINTERS', suffix: 'k+' },
  { value: 50, label: 'CITIES COVERED', suffix: '+' },
];

export default function StatsStrip() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.stat-num').forEach((target) => {
        const endValue = parseInt(target.getAttribute('data-value'), 10);
        gsap.to(target, {
          innerHTML: endValue,
          duration: 2,
          ease: 'power2.out',
          snap: { innerHTML: 1 },
          scrollTrigger: { trigger: sectionRef.current, start: 'top 90%', once: true }
        });
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="bg-brand-orange py-12">
      <div className="max-w-screen-xl mx-auto px-6 text-center mb-10">
        <h2 className="text-[28px] md:text-[38px] font-extrabold text-white tracking-tight">
          Our Goals &amp; Mission
        </h2>
        <div className="w-16 h-1 bg-white/60 rounded-full mx-auto mt-4" />
      </div>
      <div className="max-w-screen-xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/20 text-center">
        {stats.map((stat, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="text-[32px] md:text-[36px] font-extrabold text-white mb-1 flex items-baseline">
              <span className="stat-num" data-value={stat.value}>0</span>
              <span>{stat.suffix}</span>
            </div>
            <div className="text-[11px] font-bold text-white/90 tracking-widest uppercase">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
