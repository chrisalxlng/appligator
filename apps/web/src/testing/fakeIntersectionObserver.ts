const observed = new Map<Element, IntersectionObserverCallback>();

export class FakeIntersectionObserver {
  readonly #callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.#callback = callback;
  }

  observe(target: Element) {
    observed.set(target, this.#callback);
  }

  disconnect() {
    observed.forEach((callback, target) => {
      if (callback === this.#callback) observed.delete(target);
    });
  }
}

function reportIntersection(isIntersecting: boolean) {
  observed.forEach((callback, target) => {
    const entry = { target, isIntersecting } as IntersectionObserverEntry;
    callback([entry], {} as IntersectionObserver);
  });
}

export function scrollObservedElementsIntoView() {
  reportIntersection(true);
}

export function scrollObservedElementsOutOfView() {
  reportIntersection(false);
}
