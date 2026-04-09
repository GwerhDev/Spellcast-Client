import { useSelector } from 'react-redux';
import { DocumentCreateInput } from '../../Inputs/DocumentCreateInput';
import { RootState } from 'store/index';

export const CreateOption = () => {
  const document = useSelector((state: RootState) => state.document);

  return (
    <form onSubmit={(e) => e.preventDefault()} className='flex flex-col gap-4'>
      <DocumentCreateInput document={document} />
    </form>
  );
};
