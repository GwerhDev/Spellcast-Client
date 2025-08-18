import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store';
import { removeApiResponse } from '../../../store/apiResponsesSlice';
import s from './Toast.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

export const Toast: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const { responses } = useSelector((state: RootState) => state.apiResponses);

  useEffect(() => {
    if (responses.length > 0) {
      const timer = setTimeout(() => {
        dispatch(removeApiResponse(responses[0].id));
      }, 1000); // Remove after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [responses, dispatch]);

  return (
    <div className={s.toastContainer}>
      {responses.map((response) => (
        <div
          key={response.id}
          className={`${s.toast} ${response.type === 'error' ? s.error : s.success}`}
          onClick={() => dispatch(removeApiResponse(response.id))}
        >
          <span>
            <FontAwesomeIcon icon={response.type === 'error' ? faTriangleExclamation : faCheckCircle} />
          </span>
          {response.message}
        </div>
      ))}
    </div>
  );
};
