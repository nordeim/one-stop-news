"use client";

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";
import { render } from "@testing-library/react";
import { RevealProvider } from "./RevealProvider";

function createRevealElement(id: string) {
  const el = document.createElement("div");
  el.className = "reveal";
  el.textContent = `Item ${id}`;
  el.id = id;
  return el;
}

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  static get last() {
    return MockIntersectionObserver.instances[
      MockIntersectionObserver.instances.length - 1
    ];
  }

  static reset() {
    MockIntersectionObserver.instances = [];
  }
}

describe("RevealProvider", () => {
  let matchMediaMock: (query: string) => MediaQueryList;

  beforeEach(() => {
    MockIntersectionObserver.reset();

    matchMediaMock = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as (query: string) => MediaQueryList;
    window.matchMedia = matchMediaMock;
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders children unchanged", () => {
    const { getByText } = render(
      <RevealProvider>
        <p>Child content</p>
      </RevealProvider>,
    );
    expect(getByText("Child content")).toBeDefined();
  });

  it("immediately adds .visible to .reveal elements when prefers-reduced-motion is active", () => {
    (matchMediaMock as unknown as Mock).mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const container = document.createElement("div");
    const revealEl = createRevealElement("r1");
    container.appendChild(revealEl);
    document.body.appendChild(container);

    render(
      <RevealProvider>
        <div />
      </RevealProvider>,
    );

    expect(revealEl.classList.contains("visible")).toBe(true);

    document.body.removeChild(container);
  });

  it("observes .reveal elements when motion is not reduced", () => {
    const container = document.createElement("div");
    const revealEl = createRevealElement("r2");
    container.appendChild(revealEl);
    document.body.appendChild(container);

    render(
      <RevealProvider>
        <div />
      </RevealProvider>,
    );

    const observer = MockIntersectionObserver.last;
    if (!observer) throw new Error("No observer created");
    expect(observer).toBeDefined();
    expect(observer.observe).toHaveBeenCalledWith(revealEl);

    document.body.removeChild(container);
  });

  it("adds .visible and unobserves when element intersects", () => {
    const container = document.createElement("div");
    const revealEl = createRevealElement("r3");
    container.appendChild(revealEl);
    document.body.appendChild(container);

    render(
      <RevealProvider>
        <div />
      </RevealProvider>,
    );

    const observer = MockIntersectionObserver.last;
    if (!observer) throw new Error("No observer created");
    const mockEntry = {
      isIntersecting: true,
      target: revealEl,
    } as unknown as IntersectionObserverEntry;
    observer.callback([mockEntry], {} as IntersectionObserver);

    expect(revealEl.classList.contains("visible")).toBe(true);
    expect(observer.unobserve).toHaveBeenCalledWith(revealEl);

    document.body.removeChild(container);
  });

  it("disconnects observer on unmount", () => {
    const { unmount } = render(
      <RevealProvider>
        <div />
      </RevealProvider>,
    );

    const observer = MockIntersectionObserver.last;
    if (!observer) throw new Error("No observer created");
    expect(observer.disconnect).not.toHaveBeenCalled();

    unmount();

    expect(observer.disconnect).toHaveBeenCalled();
  });
});
