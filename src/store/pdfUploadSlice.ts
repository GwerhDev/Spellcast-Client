import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type UploadStatus = 'queued' | 'processing' | 'done' | 'error';
export type QueueUiState = 'open' | 'minimized' | 'closed';

export interface PdfUploadJob {
  id: string;
  title: string;
  fileContent: string;
  saveOriginal: boolean;
  userId: string;
  status: UploadStatus;
  progress: { current: number; total: number } | null;
  coverUrl?: string;
  resultDocId?: string;
  targetDocId?: string;
  errorMessage?: string;
}

export interface UploadHistoryEntry {
  id: string;
  title: string;
  status: 'done' | 'error';
  resultDocId?: string;
  errorMessage?: string;
  completedAt: number;
}

interface PdfUploadState {
  queue: PdfUploadJob[];
  uiState: QueueUiState;
  history: UploadHistoryEntry[];
  unreadHistory: number;
}

const initialState: PdfUploadState = {
  queue: [],
  uiState: 'open',
  history: [],
  unreadHistory: 0,
};

const pdfUploadSlice = createSlice({
  name: 'pdfUpload',
  initialState,
  reducers: {
    enqueueUpload(state, action: PayloadAction<Omit<PdfUploadJob, 'status' | 'progress'>>) {
      state.queue.push({ ...action.payload, status: 'queued', progress: null });
      state.uiState = 'open';
    },
    setQueueUiState(state, action: PayloadAction<QueueUiState>) {
      state.uiState = action.payload;
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
        state.history.unshift({
          id: job.id,
          title: job.title,
          status: 'done',
          resultDocId: action.payload.resultDocId,
          completedAt: Date.now(),
        });
        if (state.uiState === 'closed') state.unreadHistory++;
      }
    },
    setUploadError(state, action: PayloadAction<{ id: string; message: string }>) {
      const job = state.queue.find(j => j.id === action.payload.id);
      if (job) {
        job.status = 'error';
        job.errorMessage = action.payload.message;
        state.history.unshift({
          id: job.id,
          title: job.title,
          status: 'error',
          errorMessage: action.payload.message,
          completedAt: Date.now(),
        });
        if (state.uiState === 'closed') state.unreadHistory++;
      }
    },
    dismissUpload(state, action: PayloadAction<string>) {
      state.queue = state.queue.filter(j => j.id !== action.payload);
    },
    markHistoryRead(state) {
      state.unreadHistory = 0;
    },
    clearHistory(state) {
      state.history = [];
      state.unreadHistory = 0;
    },
  },
});

export const {
  enqueueUpload,
  setQueueUiState,
  setUploadProcessing,
  setUploadProgress,
  setUploadCover,
  setUploadDone,
  setUploadError,
  dismissUpload,
  markHistoryRead,
  clearHistory,
} = pdfUploadSlice.actions;

export default pdfUploadSlice.reducer;
