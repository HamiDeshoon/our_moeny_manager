import React, { useRef, useState } from 'react';

export interface DashboardCarouselProps {
  slides: readonly React.ReactNode[];
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
}

export function DashboardCarousel({ slides, initialIndex = 0, onIndexChange }: DashboardCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const updateIndex = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const next = Math.round(scroller.scrollLeft / Math.max(scroller.clientWidth, 1));
    if (next !== activeIndex) {
      setActiveIndex(next);
      onIndexChange?.(next);
    }
  };

  const select = (index: number) => {
    scrollerRef.current?.scrollTo({ left: scrollerRef.current.clientWidth * index, behavior: 'smooth' });
  };

  return (
    <section aria-label="نمای کلی خانه" className="space-y-3">
      <div ref={scrollerRef} onScroll={updateIndex} className="dashboard-carousel -mx-4 flex snap-x snap-mandatory overflow-x-auto px-4 pb-1" dir="ltr">
        {slides.map((slide, index) => (
          <div key={index} className="dashboard-slide w-full shrink-0 px-1" dir="rtl">
            {slide}
          </div>
        ))}
      </div>
      <div aria-label="صفحه‌های داشبورد" className="flex items-center justify-center gap-1.5">
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`رفتن به صفحه ${index + 1}`}
            aria-current={index === activeIndex ? 'true' : undefined}
            onClick={() => select(index)}
            className={`h-2 rounded-full transition-all ${index === activeIndex ? 'w-6 bg-teal-300' : 'w-2 bg-white/20'}`}
          />
        ))}
      </div>
    </section>
  );
}
