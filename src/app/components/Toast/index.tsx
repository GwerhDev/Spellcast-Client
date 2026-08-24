import s from './index.module.css';
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import { removeApiResponse } from '../../../store/apiResponsesSlice';
import { removeSignalNotice } from '../../../store/signalSlice';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTriangleExclamation, faHeadphones } from '@fortawesome/free-solid-svg-icons';

export const Toast: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const { responses } = useSelector((state: RootState) => state.apiResponses);
  const { notices } = useSelector((state: RootState) => state.signal);

  useEffect(() => {
    if (responses.length > 0) {
      const timer = setTimeout(() => {
        dispatch(removeApiResponse(responses[0].id));
      }, 1000); // Remove after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [responses, dispatch]);

  useEffect(() => {
    if (notices.length > 0) {
      const timer = setTimeout(() => {
        dispatch(removeSignalNotice(notices[0].id));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [notices, dispatch]);

  return (
    <div data-testid="toast-container" className={s.toastContainer}>
      {responses.map((response) => (
        <div
          key={response.id}
          data-testid={`toast-${response.id}`}
          className={`${s.toast} ${response.type === 'error' ? s.error : s.success}`}
          onClick={() => dispatch(removeApiResponse(response.id))}
        >
          <span>
            <FontAwesomeIcon icon={response.type === 'error' ? faTriangleExclamation : faCheckCircle} />
          </span>
          {response.message}
        </div>
      ))}
      {notices.map((notice) => (
        <div
          key={notice.id}
          data-testid={`toast-${notice.id}`}
          className={`${s.toast} ${s.success}`}
          onClick={() => dispatch(removeSignalNotice(notice.id))}
        >
          <span>
            <FontAwesomeIcon icon={faHeadphones} />
          </span>
          {notice.message}
        </div>
      ))}
    </div>
  );
};
