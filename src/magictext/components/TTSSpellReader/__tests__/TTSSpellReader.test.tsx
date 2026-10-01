import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TTSSpellReader } from '../index';

const doc = (...content: object[]) => ({ type: 'doc', content });
const paragraph = (attrs: object, ...content: object[]) => ({ type: 'paragraph', attrs, content });
const text = (value: string, marks?: object[]) => ({ type: 'text', text: value, ...(marks ? { marks } : {}) });

describe('TTSSpellReader', () => {
  it('writes the text as it is: no space added inside "7.415.604-5"', () => {
    const { container } = render(<TTSSpellReader content={doc(paragraph({}, text('Rut: 7.415.604-5 y más.')))} currentSentenceIndex={-1} />);
    expect(container.textContent?.trim()).toBe('Rut: 7.415.604-5 y más.');
  });

  it('still spaces sentences that had a space between them', () => {
    const { container } = render(<TTSSpellReader content={doc(paragraph({}, text('One. Two.')))} currentSentenceIndex={-1} />);
    expect(container.textContent?.trim()).toBe('One. Two.');
  });

  it('gives each text its own size', () => {
    const { container } = render(<TTSSpellReader content={doc(paragraph({}, text('Small', [{ type: 'textStyle', attrs: { fontSize: '12px' } }])))} currentSentenceIndex={-1} />);
    const sized = Array.from(container.querySelectorAll<HTMLElement>('span')).find(el => el.style.fontSize);
    expect(sized?.style.fontSize).toBe('12px');
  });

  it('a block with its real space before it uses that instead of its margins, with its line spacing', () => {
    const { container } = render(<TTSSpellReader content={doc(paragraph({ spaceBefore: 24, lineHeight: 1.3 }, text('Spaced.')))} currentSentenceIndex={-1} />);
    const p = container.querySelector('p')!;
    expect(p.style.marginTop).toBe('24px');
    expect(p.style.marginBottom).toBe('0px');
    expect(p.style.lineHeight).toBe('1.3');
  });

  it('an image is as wide as it was on the page', () => {
    const { container } = render(<TTSSpellReader content={doc({ type: 'image', attrs: { src: 'data:image/png;base64,', width: 61 } })} currentSentenceIndex={-1} />);
    expect(container.querySelector('img')!.style.width).toBe('61px');
  });

  it('breaks the line wherever the source does, even in the middle of a sentence', () => {
    const { container } = render(<TTSSpellReader content={doc(paragraph({}, text('Procedimiento'), { type: 'hardBreak' }, text('Folio: 39')))} currentSentenceIndex={-1} />);
    const p = container.querySelector('p')!;
    expect(p.querySelectorAll('br')).toHaveLength(1);
    // The break stands where the source has it: right after "Procedimiento".
    expect(p.innerHTML).toMatch(/Procedimiento<br>Folio: 39/);
  });

  it('draws columns side by side, numbering their sentences column by column', () => {
    const columns = {
      type: 'columns',
      content: [
        { type: 'column', attrs: { width: 200 }, content: [paragraph({}, text('Left one.')), paragraph({}, text('Left two.'))] },
        { type: 'column', attrs: {}, content: [paragraph({}, text('Right one.'))] },
      ],
    };
    const { container } = render(<TTSSpellReader content={doc(paragraph({}, text('Before.')), columns)} currentSentenceIndex={-1} />);
    const sentences = Array.from(container.querySelectorAll<HTMLElement>('[data-sentence-index]'))
      .map(el => [el.dataset.sentenceIndex, el.textContent?.trim()]);
    expect(sentences).toEqual([['0', 'Before.'], ['1', 'Left one.'], ['2', 'Left two.'], ['3', 'Right one.']]);
    const [first, second] = Array.from(container.querySelectorAll<HTMLElement>('[class*="column"]')).filter(el => !el.className.includes('columns'));
    expect(first.style.width).toBe('200px');
    expect(second.style.flex).toContain('1');
  });

  it('draws a colored box around its blocks, keeping their sentences in order', () => {
    const box = { type: 'box', attrs: { background: '#e9e9e9', width: 300 }, content: [paragraph({}, text('Inside.'))] };
    const { container } = render(<TTSSpellReader content={doc(box, paragraph({}, text('After.')))} currentSentenceIndex={-1} />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.width).toBe('300px');
    expect(wrapper.textContent).toContain('Inside.');
    const indices = Array.from(container.querySelectorAll<HTMLElement>('[data-sentence-index]')).map(el => el.dataset.sentenceIndex);
    expect(indices).toEqual(['0', '1']);
  });
});

