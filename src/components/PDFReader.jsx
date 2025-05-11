import { useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export const PDFReader = () => {
  const [text, setText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const utteranceRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setIsLoading(true);
      const fileReader = new FileReader();
      fileReader.onload = async () => {
        try {
          const typedArray = new Uint8Array(fileReader.result);
          const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
          setPdfDoc(pdf);
          setTotalPages(pdf.numPages);
          setCurrentPage(1);
          await loadPage(pdf, 1);
        } catch (error) {
          console.error('Error reading PDF:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fileReader.readAsArrayBuffer(file);
    }
  };

  const loadPage = async (pdf, pageNumber, shouldSpeak = false) => {
    setIsLoading(true);
    try {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const extractedText = content.items.map((item) => item.str).join(' ');
      setText(extractedText);

      if (shouldSpeak) {
        setTimeout(() => speakText(extractedText), 100);
      }
    } catch (error) {
      console.error('Error loading page:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stopSpeaking = () => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const pauseSpeaking = () => {
    speechSynthesis.pause();
    setIsPaused(true);
  };

  const resumeSpeaking = () => {
    speechSynthesis.resume();
    setIsPaused(false);
  };

  const goToPreviousPage = () => {
    if (pdfDoc && currentPage > 1) {
      stopSpeaking();
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      loadPage(pdfDoc, newPage);
    }
  };

  const goToNextPage = () => {
    if (pdfDoc && currentPage < totalPages) {
      stopSpeaking();
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      loadPage(pdfDoc, newPage);
    }
  };

  const speakText = (overrideText = null) => {
    if (!(overrideText || text) || isLoading) return;

    const toRead = overrideText || text;
    const utterance = new SpeechSynthesisUtterance(toRead);
    utterance.rate = 1.1;

    utterance.onend = () => {
      if (currentPage < totalPages) {
        const nextPage = currentPage + 1;
        setCurrentPage(nextPage);
        loadPage(pdfDoc, nextPage, true);
      } else {
        setIsSpeaking(false);
        setIsPaused(false);
      }
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    setIsSpeaking(true);
    setIsPaused(false);
    speechSynthesis.speak(utterance);
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem' }}>
      <h2>Spellcast PDF Reader</h2>
      <input type="file" accept="application/pdf" onChange={handleFile} />

      <div style={{ marginTop: '1rem' }}>
        {isLoading ? (
          <p>Loading page...</p>
        ) : (
          <div style={{ whiteSpace: 'pre-wrap', minHeight: '120px', height: 200, overflowY: 'auto' }}>
            {text || 'Extracted text will appear here...'}
          </div>
        )}
      </div>

      {pdfDoc && (
        <div style={{ marginTop: '1rem' }}>
          <button onClick={goToPreviousPage} disabled={currentPage === 1 || isLoading}>
            ⬅ Previous Page
          </button>
          <span style={{ margin: '0 1rem' }}>
            Page {currentPage} of {totalPages}
          </span>
          <button onClick={goToNextPage} disabled={currentPage === totalPages || isLoading}>
            Next Page ➡
          </button>
        </div>
      )}

      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
        <button
          onClick={() => {
            if (isSpeaking && !isPaused) pauseSpeaking();
            else if (isPaused) resumeSpeaking();
            else speakText();
          }}
          disabled={!text || isLoading}
        >
          {isSpeaking && !isPaused ? 'Pause' : isPaused ? 'Resume' : 'Play'}
        </button>

        <button onClick={stopSpeaking} disabled={!isSpeaking && !isPaused}>
          Stop
        </button>
      </div>
    </div>
  );
};
