import s from './Waveform.module.css';

interface WaveformProps {
  active?: boolean;
  bars?: number;
  color?: string;
  height?: number;
}

export const Waveform = ({ active = true, bars = 4, color = 'var(--color-primary)', height = 14 }: WaveformProps) => (
  <div
    className={`${s.waveform} ${active ? s.active : s.idle}`}
    style={{ '--wf-color': color, '--wf-height': `${height}px` } as React.CSSProperties}
  >
    {Array.from({ length: bars }).map((_, i) => (
      <span key={i} className={`${s.bar} ${s[`bar${i % 3}`]}`} />
    ))}
  </div>
);
