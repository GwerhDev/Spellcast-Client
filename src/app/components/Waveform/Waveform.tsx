import s from './Waveform.module.css';

interface WaveformProps {
  active?: boolean;
  bars?: number;
  color?: string;
  height?: number;
  // Bar thickness and spacing, for larger renderings (defaults fit the inline status size).
  barWidth?: number;
  gap?: number;
}

export const Waveform = ({ active = true, bars = 4, color = 'var(--color-primary)', height = 14, barWidth = 2.5, gap = 2 }: WaveformProps) => (
  <div
    className={`${s.waveform} ${active ? s.active : s.idle}`}
    data-testid="waveform"
    style={{ '--wf-color': color, '--wf-height': `${height}px`, '--wf-bar-width': `${barWidth}px`, '--wf-gap': `${gap}px` } as React.CSSProperties}
  >
    {Array.from({ length: bars }).map((_, i) => (
      <span key={i} className={`${s.bar} ${s[`bar${i % 3}`]}`} />
    ))}
  </div>
);
