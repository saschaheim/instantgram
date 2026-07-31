// Shared FLIP (First-Last-Invert-Play) grow/shrink animation, used both for the media
// modal's expand/collapse toggle and for the modal's initial open, so both look and feel
// exactly the same.
export const playFlipAnimation = (
  element: HTMLElement | null,
  firstRect: DOMRect | undefined,
  lastRect: DOMRect | undefined,
): Animation | null => {
  if (!element || !firstRect || !lastRect || !lastRect.width || !lastRect.height) {
    return null;
  }

  const scaleX = firstRect.width / lastRect.width;
  const scaleY = firstRect.height / lastRect.height;
  // Use a single uniform scale (not independent X/Y) so content never stretches out of
  // proportion for tall media; overflow:hidden (applied by the caller) clips whichever
  // axis doesn't line up exactly during the transition.
  const scale = Math.min(scaleX, scaleY);
  const translateX = firstRect.left - lastRect.left;
  const translateY = firstRect.top - lastRect.top;
  const noVisualChange = Math.abs(scale - 1) < 0.001
    && Math.abs(translateX) < 0.5
    && Math.abs(translateY) < 0.5;

  if (noVisualChange) {
    return null;
  }

  return element.animate([
    {
      transformOrigin: "top center",
      transform: "translate("+translateX+"px,"+translateY+"px) scale("+scale+")",
    },
    {
      transformOrigin: "top center",
      transform: "translate(0,0) scale(1,1)",
    },
  ], {
    duration: 280,
    easing: "cubic-bezier(.22,.61,.36,1)",
    fill: "both",
  });
};
