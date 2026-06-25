import { API_URL } from './api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface GeneratePDFOptions {
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  currency: string;
}

async function loadImageAsBase64(url: string): Promise<string> {
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  const response = await fetch(url);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function generateInvoicePDF(options: GeneratePDFOptions): Promise<void> {
  const { invoiceId, invoiceNumber, clientName, currency } = options;
  const token = localStorage.getItem('token');

  const invoiceElement = document.getElementById('invoice-preview');
  if (!invoiceElement) {
    throw new Error('Invoice preview element not found');
  }

  // Convert all images to base64
  const images = invoiceElement.querySelectorAll('img');
  await Promise.all(
    Array.from(images).map(async (img) => {
      if (!(img instanceof HTMLImageElement)) return;
      try {
        let imgUrl = img.getAttribute('src') || '';
        if (!imgUrl) return;
        if (imgUrl.startsWith('data:') || imgUrl.startsWith('blob:')) {
          return;
        }
        if (imgUrl.startsWith('/')) {
          imgUrl = `${window.location.origin}${imgUrl}`;
        }
        const base64 = await loadImageAsBase64(imgUrl);
        img.src = base64;
      } catch (error) {
        console.error('Failed to load image:', img.src, error);
      }
    })
  );

  // Save original styles
  const originalWidth = invoiceElement.style.width;
  const originalMaxWidth = invoiceElement.style.maxWidth;
  const originalPosition = invoiceElement.style.position;

  // Force element to render at exactly 1280px regardless of screen/page context
  invoiceElement.style.width = '1280px';
  invoiceElement.style.maxWidth = '1280px';
  invoiceElement.style.position = 'relative';

  // Wait for reflow after style change
  await new Promise((resolve) => setTimeout(resolve, 100));

  const canvas = await html2canvas(invoiceElement, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 1280,
    width: 1280,
    windowHeight: invoiceElement.scrollHeight,
  });

  // Restore original styles
  invoiceElement.style.width = originalWidth;
  invoiceElement.style.maxWidth = originalMaxWidth;
  invoiceElement.style.position = originalPosition;

  const imgData = canvas.toDataURL('image/png');

  // A4 dimensions in mm
  const pdfWidth = 210;
  const pdfHeight = 297;

  // Canvas is captured at scale:2 so actual pixel width is 1280*2 = 2560
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // Fit full width to A4, let height flow naturally
  const scaledWidth = pdfWidth;
  const scaledHeight = (imgHeight * pdfWidth) / imgWidth;

  // Create PDF — if content is taller than A4, use actual height
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: scaledHeight > pdfHeight ? [pdfWidth, scaledHeight] : 'a4',
  });

  // Set metadata
  pdf.setProperties({
    title: invoiceNumber,
    subject: `Invoice for ${clientName}`,
    author: 'Shivohini TechAI',
    creator: 'Apna Invoice System',
  });

  // Add image to PDF — full width, no centering offset needed
  pdf.addImage(imgData, 'PNG', 0, 0, scaledWidth, scaledHeight);

  // Generate filename
  const safeClientName = (clientName || 'user').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filename = `${invoiceNumber}-${safeClientName}-${currency}.pdf`;

  // Save PDF metadata in database
  if (invoiceId && token) {
    await fetch(`${API_URL}/invoices/${invoiceId}/pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        file_name: filename,
      }),
    });
  }

  // Download PDF
  pdf.save(filename);
}