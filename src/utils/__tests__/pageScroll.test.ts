import { describe, it, expect, afterEach } from 'vitest';
import { pageStickyTop, scrollParentOf } from '../pageScroll';

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.style.removeProperty('--page-sticky-top');
});

describe('scrollParentOf', () => {
  it('is the nearest ancestor that scrolls', () => {
    document.body.innerHTML = '<div id="outer" style="overflow-y: auto"><div id="inner" style="overflow-y: scroll"><p id="el"></p></div></div>';
    expect(scrollParentOf(document.getElementById('el'))?.id).toBe('inner');
  });

  it('is null when nothing around it scrolls: the document does', () => {
    document.body.innerHTML = '<div style="overflow: visible"><p id="el"></p></div>';
    expect(scrollParentOf(document.getElementById('el'))).toBeNull();
  });
});

describe('pageStickyTop', () => {
  it('is --page-sticky-top, in px', () => {
    document.documentElement.style.setProperty('--page-sticky-top', '25px');
    expect(pageStickyTop()).toBe(25);
  });

  it('is none when it is not set', () => {
    expect(pageStickyTop()).toBe(0);
  });
});
