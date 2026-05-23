import { describe, it, expect } from 'vitest';
import reducer, {
  enqueueUpload,
  setUploadProcessing,
  setUploadProgress,
  setUploadDone,
  setUploadError,
  setUploadCover,
  dismissUpload,
} from '../pdfUploadSlice';

const initial = reducer(undefined, { type: '@@INIT' });

const baseJob = {
  id: 'job-1',
  title: 'Test Doc',
  fileContent: 'data:application/pdf;base64,abc',
  saveOriginal: true,
  userId: 'user-1',
};

describe('pdfUploadSlice', () => {
  describe('enqueueUpload', () => {
    it('adds job with queued status', () => {
      const state = reducer(initial, enqueueUpload(baseJob));
      expect(state.queue).toHaveLength(1);
      expect(state.queue[0].status).toBe('queued');
      expect(state.queue[0].progress).toBeNull();
    });

    it('can enqueue multiple jobs', () => {
      const s1 = reducer(initial, enqueueUpload({ ...baseJob, id: 'job-1' }));
      const s2 = reducer(s1, enqueueUpload({ ...baseJob, id: 'job-2' }));
      expect(s2.queue).toHaveLength(2);
    });
  });

  describe('setUploadProcessing', () => {
    it('transitions job to processing', () => {
      const queued = reducer(initial, enqueueUpload(baseJob));
      const state = reducer(queued, setUploadProcessing('job-1'));
      expect(state.queue[0].status).toBe('processing');
    });

    it('ignores unknown job id', () => {
      const queued = reducer(initial, enqueueUpload(baseJob));
      const state = reducer(queued, setUploadProcessing('unknown'));
      expect(state.queue[0].status).toBe('queued');
    });
  });

  describe('setUploadProgress', () => {
    it('updates progress on the correct job', () => {
      const processing = reducer(
        reducer(initial, enqueueUpload(baseJob)),
        setUploadProcessing('job-1')
      );
      const state = reducer(processing, setUploadProgress({ id: 'job-1', current: 3, total: 10 }));
      expect(state.queue[0].progress).toEqual({ current: 3, total: 10 });
    });
  });

  describe('setUploadDone', () => {
    it('marks job done and stores resultDocId', () => {
      const s = reducer(
        reducer(initial, enqueueUpload(baseJob)),
        setUploadDone({ id: 'job-1', resultDocId: 'doc-99' })
      );
      expect(s.queue[0].status).toBe('done');
      expect(s.queue[0].resultDocId).toBe('doc-99');
      expect(s.queue[0].progress).toBeNull();
    });
  });

  describe('setUploadError', () => {
    it('marks job as error with message', () => {
      const s = reducer(
        reducer(initial, enqueueUpload(baseJob)),
        setUploadError({ id: 'job-1', message: 'Network failure' })
      );
      expect(s.queue[0].status).toBe('error');
      expect(s.queue[0].errorMessage).toBe('Network failure');
    });
  });

  describe('setUploadCover', () => {
    it('stores coverUrl on job', () => {
      const s = reducer(
        reducer(initial, enqueueUpload(baseJob)),
        setUploadCover({ id: 'job-1', coverUrl: 'data:image/png;base64,xyz' })
      );
      expect(s.queue[0].coverUrl).toBe('data:image/png;base64,xyz');
    });
  });

  describe('dismissUpload', () => {
    it('removes job from queue', () => {
      const s1 = reducer(initial, enqueueUpload({ ...baseJob, id: 'job-1' }));
      const s2 = reducer(s1, enqueueUpload({ ...baseJob, id: 'job-2' }));
      const s3 = reducer(s2, dismissUpload('job-1'));
      expect(s3.queue).toHaveLength(1);
      expect(s3.queue[0].id).toBe('job-2');
    });
  });
});
