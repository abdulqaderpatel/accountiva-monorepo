export interface PrintDocumentOptions {
  orientation?: "portrait" | "landscape" | "auto";
}

/**
 * printDocument: Prints an isolated DOM element via a hidden sandboxed iframe.
 *
 * This completely isolates the printable document (e.g. invoice, estimate)
 * so that no parent web page chrome (#root, topbar, sidebars, background UI)
 * can ever bleed into the browser's print dialog.
 */
export function printDocument(
  elementOrSelector: HTMLElement | string,
  documentTitle = "Document",
  options?: PrintDocumentOptions
) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const targetElement: HTMLElement | null =
    typeof elementOrSelector === "string"
      ? document.querySelector(elementOrSelector)
      : elementOrSelector;

  if (!targetElement) {
    window.print();
    return;
  }

  // Remove any previously leftover print iframes
  const oldIframe = document.getElementById("accountiva-print-frame");
  if (oldIframe && oldIframe.parentNode) {
    oldIframe.parentNode.removeChild(oldIframe);
  }

  // Use real offscreen layout dimensions so Chromium does not fall back to parent window
  const iframe = document.createElement("iframe");
  iframe.id = "accountiva-print-frame";
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "-10000px";
  iframe.style.width = "1024px";
  iframe.style.height = "1400px";
  iframe.style.border = "none";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.zIndex = "-100";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    window.print();
    return;
  }

  // Collect all stylesheets and style blocks from current document
  let stylesHtml = "";
  const styleNodes = document.querySelectorAll('link[rel="stylesheet"], style');
  styleNodes.forEach((node) => {
    stylesHtml += node.outerHTML;
  });

  const cloned = targetElement.cloneNode(true) as HTMLElement;
  cloned.style.display = "block";
  cloned.removeAttribute("hidden");

  const requestedOrientation = options?.orientation || "auto";
  const pageRule =
    requestedOrientation === "landscape"
      ? "@page { size: landscape; margin: 4mm 6mm; }"
      : requestedOrientation === "portrait"
        ? "@page { size: portrait; margin: 5mm 8mm; }"
        : "@page { size: auto; margin: 5mm 8mm; }";

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html class="light" lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${documentTitle}</title>
        ${stylesHtml}
        <style>
          ${pageRule}
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .printable-document {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          tr, .avoid-page-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print\\:hidden, [data-slot="sidebar"], [data-slot="topbar"], .chat-widget {
            display: none !important;
          }
          @media print and (orientation: landscape) {
            @page {
              size: landscape;
              margin: 4mm 6mm;
            }
            html, body {
              font-size: 11px !important;
            }
            .printable-document {
              font-size: 11px !important;
            }
            .printable-document table th,
            .printable-document table td {
              padding-top: 2px !important;
              padding-bottom: 2px !important;
            }
          }
        </style>
      </head>
      <body class="bg-white text-black p-0 m-0">
        ${cloned.outerHTML}
      </body>
    </html>
  `);
  iframeDoc.close();

  let hasPrinted = false;
  const triggerPrint = () => {
    if (hasPrinted) return;
    hasPrinted = true;
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Print execution failed, falling back to window.print():", e);
      window.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 2000);
    }
  };

  if (iframe.contentWindow) {
    iframe.contentWindow.onload = () => {
      setTimeout(triggerPrint, 100);
    };
    // Fallback timer if onload fired synchronously
    setTimeout(triggerPrint, 350);
  } else {
    triggerPrint();
  }
}
