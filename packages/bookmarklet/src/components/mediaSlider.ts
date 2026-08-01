import { useRef } from "preact/hooks";

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  dragging: boolean;
  width: number;
  baseTranslate: number;
  offset: number;
  lastX: number;
  lastT: number;
  velocity: number;
};

// Drag-to-swipe + click-to-jump slide navigation, shared by the slider track and the
// numbered slider-controls dots. Owns the slider DOM ref since the drag handlers need
// direct style/transform access outside Preact's render cycle for a responsive feel.
export const useMediaSlider = (selectedIndex: number, slideCount: number, setSelectedIndex: (index: number) => void) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);

  const selectSlide = (index: number) => {
    const slider = sliderRef.current;
    if (slider && Math.abs(selectedIndex - index) > 1) {
      slider.style.transition = "none";
      setSelectedIndex(index);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        slider.style.transition = "";
      }));
      return;
    }
    setSelectedIndex(index);
  };

  const endDrag = (nextIndex: number) => {
    const slider = sliderRef.current;
    dragRef.current = null;
    if (!slider) return;
    slider.classList.remove("dragging");
    slider.style.transition = "";
    slider.style.transform = "translateX(-"+nextIndex*100+"%)";
    selectSlide(nextIndex);
  };

  const handleSliderPointerDown = (event: PointerEvent) => {
    if (slideCount <= 1 || event.button > 0) return;
    const slider = sliderRef.current;
    const width = slider?.getBoundingClientRect().width;
    if (!slider || !width) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
      width,
      baseTranslate: -selectedIndex * width,
      offset: 0,
      lastX: event.clientX,
      lastT: event.timeStamp,
      velocity: 0,
    };
  };

  const handleSliderPointerMove = (event: PointerEvent) => {
    const drag = dragRef.current;
    const slider = sliderRef.current;
    if (!drag || !slider || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.dragging) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
      drag.dragging = true;
      suppressClickRef.current = true;
      slider.classList.add("dragging");
      slider.style.transition = "none";
      slider.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    const dt = event.timeStamp - drag.lastT;
    if (dt > 0) drag.velocity = (event.clientX - drag.lastX) / dt;
    drag.lastX = event.clientX;
    drag.lastT = event.timeStamp;

    const atStart = selectedIndex === 0 && dx > 0;
    const atEnd = selectedIndex === slideCount - 1 && dx < 0;
    drag.offset = atStart || atEnd ? dx * 0.35 : dx;
    slider.style.transform = "translateX("+(drag.baseTranslate+drag.offset)+"px)";
  };

  const handleSliderPointerEnd = (event: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.dragging) {
      dragRef.current = null;
      return;
    }
    const ratio = drag.offset / drag.width;
    const flick = Math.abs(drag.velocity) > 0.35;
    let nextIndex = selectedIndex;
    if (flick || Math.abs(ratio) > 0.2) {
      nextIndex += drag.offset < 0 ? 1 : -1;
    }
    nextIndex = Math.max(0, Math.min(slideCount - 1, nextIndex));
    endDrag(nextIndex);
  };

  return {
    sliderRef,
    suppressClickRef,
    selectSlide,
    handleSliderPointerDown,
    handleSliderPointerMove,
    handleSliderPointerEnd,
  };
};
