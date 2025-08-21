import { createSlice } from '@reduxjs/toolkit';

interface PdfReaderState {
  // No PDF-related state here, as it will be managed locally in PdfReader component
}

const initialState: PdfReaderState = {
};

const pdfReaderSlice = createSlice({
  name: 'pdfReader',
  initialState,
  reducers: {
    // No reducers for PDF state, as it will be managed locally in PdfReader component
  },
});

export default pdfReaderSlice.reducer;
