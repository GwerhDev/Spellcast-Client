import React, { useState, useRef, useEffect } from 'react';
import s from './NumberStepper.module.css';
import { IconButton } from '../Buttons/IconButton';
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';

interface NumberStepperProps {
  value: number;
  min?: number;
  max?: number;
  suffix?: string;
  onChange: (value: number) => void;
}

export const NumberStepper: React.FC<NumberStepperProps> = ({ value, min = 1, max = 30, suffix, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const decrement = () => { if (value > min) onChange(value - 1); };
  const increment = () => { if (value < max) onChange(value + 1); };

  const startEditing = () => {
    setDraft(String(value));
    setEditing(true);
  };

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    const parsed = parseInt(draft, 10);
    if (!isNaN(parsed)) onChange(Math.min(max, Math.max(min, parsed)));
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') setEditing(false);
  };

  return (
    <div className={s.stepper}>
      <IconButton icon={faMinus} onClick={decrement} disabled={value <= min} />
      {editing ? (
        <input
          ref={inputRef}
          className={s.input}
          type="number"
          min={min}
          max={max}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <span className={s.value} onClick={startEditing} title="Click to edit">
          {value}{suffix ? ` ${suffix}` : ''}
        </span>
      )}
      <IconButton icon={faPlus} onClick={increment} disabled={value >= max} />
    </div>
  );
};
