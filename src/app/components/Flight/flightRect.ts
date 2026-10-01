// A place on screen, in viewport coordinates: where something flying starts or lands.
export interface FlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// An element's place on screen right now.
export const rectOf = (el: Element): FlightRect => {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
};

// Where an element is right now, while it's still on the page; otherwise where it last was.
export const liveRect = (el: Element | null | undefined, fallback: FlightRect | null): FlightRect | null =>
  el?.isConnected ? rectOf(el) : fallback;
