import { useEffect, useState } from "react";

const SLIDES = [
  "This is Nira. She knows the paths between home, the market, and the river by heart.",
  "She lives in a green village in the hills, where every doorway has a story and every lantern has a little warmth.",
  "Today is a day for familiar things: a cup of tea, a walk through the village, and a few moments shared together.",
  "The morning is ready. Let us begin gently.",
];

export function LoadingIntro({ onDone, reducedMotion = false }: { onDone: () => void; reducedMotion?: boolean }) {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setTimeout(() => {
      if (slide >= SLIDES.length - 1) onDone();
      else setSlide((current) => current + 1);
    }, 4300);
    return () => window.clearTimeout(timer);
  }, [onDone, reducedMotion, slide]);

  return (
    <div className="loom-intro" role="dialog" aria-label="LOOM story introduction">
      <div className="loom-intro__flourish" aria-hidden="true">✦</div>
      <button className="loom-intro__skip" type="button" onClick={onDone}>
        Skip
      </button>
      <main className="loom-intro__story" key={slide}>
        <p className="loom-intro__chapter">A morning in the hills</p>
        <p className="loom-intro__text">{SLIDES[slide]}</p>
        <button className="loom-intro__next" type="button" onClick={() => (slide >= SLIDES.length - 1 ? onDone() : setSlide((current) => current + 1))}>
          {slide >= SLIDES.length - 1 ? "Enter the village" : "Go on"}
        </button>
      </main>
      <div className="loom-intro__dots" aria-label={`Story slide ${slide + 1} of ${SLIDES.length}`}>
        {SLIDES.map((_, index) => <span key={index} className={index === slide ? "is-active" : ""} />)}
      </div>
    </div>
  );
}