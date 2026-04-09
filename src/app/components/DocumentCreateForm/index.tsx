import s from './index.module.css';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAppSelector } from '../../../store/hooks';
import { RootState } from 'store';
import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import { Spinner } from '../Spinner';
import { PageList } from './PageList';
import { DocumentEditor } from '../Editors/DocumentEditor';
import jsPDF from 'jspdf';
import { saveDocumentToDB } from '../../../db';
import { useNavigate } from 'react-router-dom';
import { JSONContent } from '@tiptap/core';
// The workerSrc import is important for pdfjs-dist to work
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
import { faCloud, faSave } from '@fortawesome/free-solid-svg-icons';
import { PrimaryButton } from '../Buttons/PrimaryButton';
import { resetDocumentState, setDocumentTitle as setDocumentTitleAction } from 'store/documentSlice';
import { resetPdfReader } from 'store/pdfReaderSlice';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

const emptyContent: JSONContent = {
  type: 'doc',
  content: [{
    type: 'paragraph',
  }]
};

export const DocumentCreateForm: React.FC = () => {
  const document = useSelector((state: RootState) => state.document);
  const { userData, logged } = useAppSelector((state: RootState) => state.session);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [documentTitle, setDocumentTitle] = useState(document.title || '');
  const [pagesContent, setPagesContent] = useState<JSONContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPageIndex, setEditingPageIndex] = useState<number>(0);

  useEffect(() => {
    if (document.title) {
      setDocumentTitle(document.title);
    }
  }, [document.title]);

  useEffect(() => {
    const extractTextFromPdf = async () => {
      if (!document.fileContent) {
        setPagesContent([emptyContent]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const pdfData = atob(document.fileContent.substring(document.fileContent.indexOf(',') + 1));
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        const numPages = pdf.numPages;

        const allPagesContent: JSONContent[] = [];

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const content = await page.getTextContent();
          
          if (content.items.length === 0) {
            allPagesContent.push(emptyContent);
            continue;
          }

          const items = content.items as TextItem[];
          items.sort((a, b) => {
            if (a.transform[5] > b.transform[5]) return -1;
            if (a.transform[5] < b.transform[5]) return 1;
            return a.transform[4] - b.transform[4];
          });

          // 1. Group into lines
          const lines: { items: TextItem[], y: number, height: number, x: number }[] = [];
          if (items.length > 0) {
            let currentLine: TextItem[] = [];
            let lastY = items[0].transform[5];
            for (const item of items) {
              if (Math.abs(item.transform[5] - lastY) > 1) {
                currentLine.sort((a, b) => a.transform[4] - b.transform[4]);
                lines.push({ 
                  items: currentLine, 
                  y: lastY, 
                  height: currentLine.reduce((max, i) => Math.max(max, i.height), 0),
                  x: currentLine[0]?.transform[4] || 0
                });
                currentLine = [];
              }
              currentLine.push(item);
              lastY = item.transform[5];
            }
            currentLine.sort((a, b) => a.transform[4] - b.transform[4]);
            lines.push({ 
              items: currentLine, 
              y: lastY, 
              height: currentLine.reduce((max, i) => Math.max(max, i.height), 0),
              x: currentLine[0]?.transform[4] || 0
            });
          }

          // 2. Group lines into paragraphs
          const allLineHeights = lines.map(l => l.height).filter(h => h > 0);
          const avgLineHeight = allLineHeights.reduce((sum, h) => sum + h, 0) / (allLineHeights.length || 1);
          const paragraphs: { lines: typeof lines }[] = [];
          if (lines.length > 0) {
            let currentParagraph: typeof lines = [];
            if(lines[0].items.length > 0) currentParagraph.push(lines[0]);

            for (let j = 1; j < lines.length; j++) {
              const prevLine = lines[j-1];
              const currLine = lines[j];
              const yDiff = prevLine.y - currLine.y;
              const paragraphThreshold = Math.max(prevLine.height, currLine.height, avgLineHeight) * 1.5;

              if (yDiff > paragraphThreshold) {
                paragraphs.push({ lines: currentParagraph });
                const numEmptyLines = Math.floor(yDiff / avgLineHeight) - 1;
                for (let k = 0; k < numEmptyLines; k++) {
                  paragraphs.push({ lines: [] });
                }
                currentParagraph = [];
                if(currLine.items.length > 0) currentParagraph.push(currLine);
              } else {
                if(currLine.items.length > 0) currentParagraph.push(currLine);
              }
            }
            paragraphs.push({ lines: currentParagraph });
          }

          // 3. Generate Tiptap JSON
          const pageContent: JSONContent = { type: 'doc', content: [] };

          for (const p of paragraphs) {

            if (p.lines.length === 0) {
              pageContent.content!.push({ type: 'paragraph' });
              continue;
            }

            const contentNodes: object[] = [];
            
            for (let i = 0; i < p.lines.length; i++) {
              const line = p.lines[i];
              if (i > 0) {
                contentNodes.push({ type: 'hardBreak' });
              }

              const indentation = line.x - (lines[0].x);
              if (indentation > 5) {
                const spaceWidth = 4; // Approximation
                const numSpaces = Math.round(indentation / spaceWidth);
                if (numSpaces > 0) {
                  contentNodes.push({ type: 'text', text: ' '.repeat(numSpaces) });
                }
              }

              for (const item of line.items) {
                if (item.str.length === 0) continue;

                const textNode: { type: 'text', text: string, marks?: object[] } = {
                  type: 'text',
                  text: item.str,
                  marks: []
                };

                const fontName = item.fontName.toLowerCase();
                if (fontName.includes('bold')) textNode.marks!.push({ type: 'bold' });
                if (fontName.includes('italic') || fontName.includes('oblique')) textNode.marks!.push({ type: 'italic' });
                
                if (textNode.marks?.length === 0) delete textNode.marks;
                contentNodes.push(textNode);
              }
            }

            if (contentNodes.length === 0) continue;

            const firstLineHeight = p.lines[0]?.height || 0;
            let nodeType = 'paragraph';
            let attrs = {};

            if (firstLineHeight > avgLineHeight * 1.8) {
              nodeType = 'heading';
              attrs = { level: 1 };
            } else if (firstLineHeight > avgLineHeight * 1.5) {
              nodeType = 'heading';
              attrs = { level: 2 };
            } else if (firstLineHeight > avgLineHeight * 1.2) {
              nodeType = 'heading';
              attrs = { level: 3 };
            }
            
            pageContent.content!.push({
              type: nodeType,
              attrs: attrs,
              content: contentNodes
            });
          }

          if (pageContent.content!.length > 0) {
            allPagesContent.push(pageContent);
          } else {
            allPagesContent.push(emptyContent);
          }
        }
        setPagesContent(allPagesContent);
      } catch (error) {
        console.error('Failed to extract text from PDF:', error);
      } finally {
        setIsLoading(false);
      }
    };

    extractTextFromPdf();
  }, [document.fileContent]);

  const handlePageClick = (pageIndex: number) => {
    setEditingPageIndex(pageIndex);
  };

  const handlePageDelete = (pageIndex: number) => {
    setPagesContent(pagesContent.filter((_, index) => index !== pageIndex));
  };

  const handleAddPage = () => {
    setPagesContent([...pagesContent, emptyContent]);
  };

  const handlePageContentChange = (newContent: JSONContent) => {
    const updatedPagesContent = [...pagesContent];
    updatedPagesContent[editingPageIndex] = newContent;
    setPagesContent(updatedPagesContent);
  };

  const handleSaveLocal = async () => {
    if (!documentTitle || pagesContent.length === 0) {
      alert('Please provide a title and have at least one page of content.');
      return;
    }

    if (!logged) {
      alert('You must be logged in to save a document.');
      return;
    }

    setIsSaving(true);
    try {
      const pdf = new jsPDF();
      const margin = 1;
      const startY = 1;
      const lineHeight = 1;

      pagesContent.forEach((pageContent, index) => {
        if (index > 0) {
          pdf.addPage();
        }
        
        const plainText = pageContent.content?.map(node => {
          if (node.type === 'paragraph' && node.content) {
            return node.content.map(item => 'text' in item ? item.text : '').join('');
          }
          return '';
        }).join('\n') || '';

        const lines = pdf.splitTextToSize(plainText, pdf.internal.pageSize.width - margin * 2);
        
        let y = startY;
        const pageHeight = pdf.internal.pageSize.height;

        for (const line of lines) {
          if (y + lineHeight > pageHeight - margin) {
            pdf.addPage();
            y = startY;
          }
          pdf.text(line, margin, y);
          y += lineHeight;
        }
      });

      const pdfBlob = pdf.output('blob');

      const newId = await saveDocumentToDB({
        title: documentTitle,
        pdf: pdfBlob,
        userId: userData.id,
        pagesContent: JSON.stringify(pagesContent),
      });

      dispatch(resetPdfReader());
      dispatch(resetDocumentState());
      navigate(`/document/${newId}/reader`);

    } catch (error) {
      console.error('Failed to save document locally:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Spinner isLoading />;
  }

  return (
    <div className={s.container}>
      <div className={s.titleGroup}>
        <h1 className={s.mainTitle}>Create Document</h1>
      </div>

      <input
        className={s.documentTitle}
        type="text"
        placeholder="Document title..."
        value={documentTitle}
        onChange={(e) => {
          setDocumentTitle(e.target.value);
          dispatch(setDocumentTitleAction(e.target.value));
        }}
      />

      <div className={s.editorContainer}>
        <DocumentEditor
          pageNumber={editingPageIndex + 1}
          pageContent={pagesContent[editingPageIndex]}
          onPageContentChange={handlePageContentChange}
        />

        <div className={s.pagesContainer}>
          <PageList
            pages={pagesContent.map(() => '')} // PageList still expects string[], so we map to empty strings
            currentPage={editingPageIndex}
            onPageClick={handlePageClick}
            onPageDelete={handlePageDelete}
            onAddPage={handleAddPage}
          />
        </div>
      </div>
      <div className={s.actions}>
        <PrimaryButton type="button" icon={faSave} className={s.saveButtonCloud} onClick={handleSaveLocal} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Local'}
        </PrimaryButton>
        <PrimaryButton type="button" icon={faCloud} className={s.saveButtonCloud} disabled>
          Save Cloud
        </PrimaryButton>
      </div>
    </div>
  );
};
