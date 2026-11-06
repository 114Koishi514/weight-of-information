// The hosted site uses the installed printer driver through the browser's
// print dialog. The loopback Windows station keeps its silent RAW print path.
export function createBrowserPrinter(document, printWindow) {
  let printing = false;

  function prepare(receipt) {
    if (!receipt?.canvas || receipt.width !== 384 ||
        !Number.isInteger(receipt.height) || receipt.height < 1 || receipt.height > 4096) {
      throw new Error('INVALID_PRINT_RECEIPT');
    }

    let root = document.getElementById('print-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'print-root';
      root.setAttribute('aria-hidden', 'true');
      document.body.append(root);
    }
    // This canvas sits outside the scaled 1920 x 1080 exhibition interface.
    // Copy the full receipt, not its clipped on-screen preview.
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = receipt.height;
    canvas.getContext('2d').drawImage(receipt.canvas, 0, 0);
    root.replaceChildren(canvas);

    let page = document.getElementById('receipt-page-size');
    if (!page) {
      page = document.createElement('style');
      page.id = 'receipt-page-size';
      document.head.append(page);
    }
    // 384 printer dots occupy 48 mm. Allow 5 mm around the receipt on
    // 58 mm paper and round height up to avoid a blank overflow page.
    const heightMm = Math.ceil(receipt.height / 8 + 10);
    page.textContent = `@media print { @page { size: 58mm ${heightMm}mm; margin: 5mm; } }`;
  }

  return {
    get printing() { return printing; },
    prepare,
    print(receipt) {
      if (printing) return false;
      prepare(receipt);
      printing = true;
      try {
        printWindow.print();
        // A closed print dialog does not tell us whether the user printed
        // or cancelled. Never mark this as a confirmed or queued receipt.
        return true;
      } finally {
        printing = false;
      }
    },
  };
}
