// Configure PDF.js worker only on client side
if (typeof window !== 'undefined') {
  import('pdfjs-dist').then(({ GlobalWorkerOptions }) => {
    // Use local worker file from public directory
    GlobalWorkerOptions.workerSrc = new URL('pdf.worker.mjs', window.location.origin).toString();
  });
}
