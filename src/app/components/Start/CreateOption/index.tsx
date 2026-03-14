import { useSelector } from 'react-redux';
import { DocumentCard } from '../../Cards/DocumentCard';
import { RootState } from 'store/index';

export const CreateOption = () => {
  const document = useSelector((state: RootState) => state.document);

  return (
    <form onSubmit={(e) => e.preventDefault()} className='flex flex-col gap-4'>
      <DocumentCard document={document} />
    </form>
  );
};
