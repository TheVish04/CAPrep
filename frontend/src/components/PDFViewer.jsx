import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './PDFViewer.css';

// Set up the worker source - use a local path instead of unpkg
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

const PDFViewer = ({ fileUrl, onClose, title }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Handle document load success
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  // Handle document load error with more detailed information
  const onDocumentLoadError = (err) => {
    console.error('Error while loading PDF:', err);
    
    let errorMessage = 'Failed to load PDF. Please try downloading it instead.';
    if (err.message) {
      errorMessage = `Error: ${err.message}`;
    }
    
    setError(errorMessage);
    setLoading(false);
  };

  // Retry loading on error
  useEffect(() => {
    if (error && retryCount < 2) {
      const timer = setTimeout(() => {
        setRetryCount(prevCount => prevCount + 1);
        setLoading(true);
        setError(null);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [error, retryCount]);

  // Navigation functions
  const changePage = (offset) => {
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset;
      return Math.min(Math.max(1, newPageNumber), numPages || 1);
    });
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  // Zoom functions
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
                disabled={scale <= 0.6 || loading || error}
                title="Zoom Out"
              >
                -
              </button>
              <button 
                onClick={resetZoom} 
                className="pdf-control-btn"
                title="Reset Zoom"
                disabled={loading || error}
              >
                {Math.round(scale * 100)}%
              </button>
              <button 
                onClick={zoomIn} 
                className="pdf-control-btn"
                disabled={scale >= 3.0 || loading || error}
                title="Zoom In"
              >
                +
              </button>
            </div>
            <div className="pdf-controls-group">
              <button 
                onClick={previousPage} 
                className="pdf-control-btn"
                disabled={pageNumber <= 1 || loading || error}
                title="Previous Page"
              >
                ←
              </button>
              <span className="pdf-page-indicator">
                {loading ? '--' : error ? '--' : `${pageNumber} of ${numPages || '--'}`}
              </span>
              <button 
                onClick={nextPage} 
                className="pdf-control-btn"
                disabled={pageNumber >= numPages || loading || error}
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
          {error && (
            <div className="pdf-error">
              <p>{error}</p>
              <p>This may be due to CORS restrictions or server configuration.</p>
              <p>Please try the download option below.</p>
              {retryCount >= 2 && (
                <button 
                  onClick={() => window.open(fileUrl, '_blank')}
                  className="pdf-download-btn"
                  style={{ marginTop: '20px' }}
                >
                  Download PDF
                </button>
              )}
            </div>
          )}
          {!error && (
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={<div className="pdf-loading">Loading PDF...</div>}
              error={<div className="pdf-error">Failed to load PDF. Please try downloading it instead.</div>}
              options={{
                cMapUrl: 'https://unpkg.com/pdfjs-dist@3.4.120/cmaps/',
                cMapPacked: true,
                standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@3.4.120/standard_fonts/',
                withCredentials: true
              }}
            >
              {!loading && !error && (
                <Page 
                  key={`page_${pageNumber}_scale_${scale}`}
                  pageNumber={pageNumber} 
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  loading={<div className="pdf-page-loading">Loading page...</div>}
                />
              )}
            </Document>
          )}
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