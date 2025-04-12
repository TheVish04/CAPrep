import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './PDFViewer.css';

// Set up the worker source for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const PDFViewer = ({ fileUrl, onClose, title }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = (error) => {
    console.error('Error while loading PDF:', error);
    setError('Failed to load PDF. Please try again later.');
    setLoading(false);
  };

  const changePage = (offset) => {
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset;
      return Math.min(Math.max(1, newPageNumber), numPages);
    });
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  const zoomIn = () => setScale(prevScale => Math.min(prevScale + 0.2, 3.0));
  const zoomOut = () => setScale(prevScale => Math.max(prevScale - 0.2, 0.6));
  const resetZoom = () => setScale(1.0);

  return (
    <div className="pdf-viewer-overlay">
      <div className="pdf-viewer-container">
        <div className="pdf-viewer-header">
          <h2>{title || 'PDF Document'}</h2>
          <div className="pdf-viewer-controls">
            <div className="pdf-controls-group">
              <button 
                onClick={zoomOut} 
                className="pdf-control-btn"
                disabled={scale <= 0.6}
                title="Zoom Out"
              >
                -
              </button>
              <button 
                onClick={resetZoom} 
                className="pdf-control-btn"
                title="Reset Zoom"
              >
                {Math.round(scale * 100)}%
              </button>
              <button 
                onClick={zoomIn} 
                className="pdf-control-btn"
                disabled={scale >= 3.0}
                title="Zoom In"
              >
                +
              </button>
            </div>
            <div className="pdf-controls-group">
              <button 
                onClick={previousPage} 
                className="pdf-control-btn"
                disabled={pageNumber <= 1}
                title="Previous Page"
              >
                ←
              </button>
              <span className="pdf-page-indicator">
                {pageNumber} of {numPages || '--'}
              </span>
              <button 
                onClick={nextPage} 
                className="pdf-control-btn"
                disabled={pageNumber >= numPages}
                title="Next Page"
              >
                →
              </button>
            </div>
            <button 
              onClick={onClose} 
              className="pdf-close-btn"
              title="Close"
            >
              ×
            </button>
          </div>
        </div>
        <div className="pdf-viewer-content">
          {loading && <div className="pdf-loading">Loading PDF...</div>}
          {error && <div className="pdf-error">{error}</div>}
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<div className="pdf-loading">Loading PDF...</div>}
            error={<div className="pdf-error">Failed to load PDF. Please try downloading it instead.</div>}
          >
            <Page 
              pageNumber={pageNumber} 
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              loading={<div className="pdf-page-loading">Loading page...</div>}
            />
          </Document>
        </div>
        <div className="pdf-viewer-footer">
          <button 
            onClick={() => window.open(fileUrl, '_blank')}
            className="pdf-download-btn"
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer; 