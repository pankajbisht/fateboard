import { useEffect, useState } from "react";

export const ColorSlider = ({ scrollRef }) => {
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  // Update button state whenever scroll changes
  const updateButtons = () => {
    const el = scrollRef.current;
    if (!el) return;

    setCanScrollUp(el.scrollTop > 0);
    setCanScrollDown(el.scrollTop < el.scrollHeight - el.clientHeight);
  };

  // Add scroll listener to update buttons dynamically
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateButtons(); // initial check
    el.addEventListener("scroll", updateButtons);
    return () => el.removeEventListener("scroll", updateButtons);
  }, [scrollRef]);

  const scroll = (delta: number) => {
    const el = scrollRef.current;
    if (!el) return;

    const maxScroll = el.scrollHeight - el.clientHeight;
    let next = el.scrollTop + delta;

    if (next < 0) next = 0;
    if (next > maxScroll) next = maxScroll;

    el.scrollTop = next;

    // Ensure buttons update correctly
    requestAnimationFrame(() => {
      el.scrollTop = next;
      updateButtons();
    });
  };

  return (
    <div className="flex flex-row items-center gap-1">
      <button
        className="h-10 w-8 flex items-center justify-center rounded hover:bg-stone-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={!canScrollUp}
        onClick={() => scroll(-20)}
      >
        <i className="fa-solid fa-chevron-up"></i>
      </button>

      <button
        className="h-10 w-8 flex items-center justify-center rounded hover:bg-stone-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={!canScrollDown}
        onClick={() => scroll(20)}
      >
        <i className="fa-solid fa-chevron-down"></i>
      </button>
    </div>
  );
};
