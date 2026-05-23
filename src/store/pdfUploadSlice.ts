import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type UploadStatus = 'queued' | 'processing' | 'done' | 'error';

export interface PdfUploadJob {
  id: string;
  title: string;
  fileContent: string;       // base64 data URL
  saveOriginal: boolean;
  userId: string;
  status: UploadStatus;
  progress: { current: number; total: number } | null;
  coverUrl?: string;         // data URL set during processing
  resultDocId?: string;      // set when done (create flow)
  targetDocId?: string;      // set for editor replace flow
  errorMessage?: string;
}

interface PdfUploadState {
  queue: PdfUploadJob[];
}

const initialState: PdfUploadState = {
  queue: [],
};

const pdfUploadSlice = createSlice({
  name: 'pdfUpload',
  initialState,
  reducers: {
    enqueueUpload(state, action: PayloadAction<Omit<PdfUploadJob, 'status' | 'progress'>>) {
      state.queue.push({ ...action.payload, status: 'queued', progress: null });
    },
    setUploadProcessing(state, action: PayloadAction<string>) {
      const job = state.queue.find(j => j.id === action.payload);
      if (job) { job.status = 'processing'; job.progress = null; }
    },
    setUploadProgress(state, action: PayloadAction<{ id: string; current: number; total: number }>) {
      const job = state.queue.find(j => j.id === action.payload.id);
      if (job) job.progress = { current: action.payload.current, total: action.payload.total };
    },
    setUploadCover(state, action: PayloadAction<{ id: string; coverUrl: string }>) {
      const job = state.queue.find(j => j.id === action.payload.id);
      if (job) job.coverUrl = action.payload.coverUrl;
    },
    setUploadDone(state, action: PayloadAction<{ id: string; resultDocId?: string }>) {
      const job = state.queue.find(j => j.id === action.payload.id);
      if (job) {
        job.status = 'done';
        job.progress = null;
        if (action.payload.resultDocId) job.resultDocId = action.payload.resultDocId;
      }
    },
    setUploadError(state, action: PayloadAction<{ id: string; message: string }>) {
      const job = state.queue.find(j => j.id === action.payload.id);
      if (job) { job.status = 'error'; job.errorMessage = action.payload.message; }
    },
    dismissUpload(state, action: PayloadAction<string>) {
      state.queue = state.queue.filter(j => j.id !== action.payload);
    },
  },
});

export const {
  enqueueUpload,
  setUploadProcessing,
  setUploadProgress,
  setUploadCover,
  setUploadDone,
  setUploadError,
  dismissUpload,
} = pdfUploadSlice.actions;

export default pdfUploadSlice.reducer;
