import { PdfReader } from '../components/Start/PdfReader/PdfReader';
import s from './New.module.css';

export function New() {
  return (
    <div className={s.container}>
      <PdfReader />
    </div>
  );
}
