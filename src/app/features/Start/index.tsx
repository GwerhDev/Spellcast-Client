import s from '../../components/Start/index.module.css';
import { useState } from 'react';
import { TextOption } from './TextOption';
import { SegmentedTabs } from '../../components/Tabs/SegmentedTabs';
import { ImportOption } from './ImportOption';
import { useDispatch } from 'react-redux';
import { resetSpellState } from '../../../store/spellSlice';
import { useLanguage } from '../../../i18n';
import { faPen, faUpload } from '@fortawesome/free-solid-svg-icons';

export const Start = () => {
  const [inputType, setInputType] = useState('text');
  const dispatch = useDispatch();
  const { t } = useLanguage();

  const handleInputTypeChange = (type: string) => {
    setInputType(type);
    dispatch(resetSpellState());
  };

  const getSubtitle = () => {
    switch (inputType) {
      case 'import': return t.start.importSubtitle;
      case 'text':   return t.start.textSubtitle;
      default:       return;
    }
  };

  const inputTypeTabs = [
    { id: 'text', label: t.start.textTab, icon: faPen },
    { id: 'import', label: t.start.importTab, icon: faUpload },
  ];

  return (
    <div data-testid="start" className={s.container}>
      <div className={s.createContainer}>
        <h1 className="featured-glow">{t.start.castSpell}</h1>
        <p>{getSubtitle()}</p>

        <SegmentedTabs tabs={inputTypeTabs} active={inputType} onChange={handleInputTypeChange} />

        <div className={s.optionContainer}>
          {inputType === 'import' && <ImportOption />}
          {inputType === 'text' && <TextOption />}
        </div>
      </div>
    </div>
  );
};
