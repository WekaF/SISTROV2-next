import * as XLSX from "xlsx";

export function exportToExcel(data: any[], headers: string[], keys: string[], filename: string) {
  const wb = XLSX.utils.book_new();
  const rows = data.map((item, idx) => {
    const row: any = { No: idx + 1 };
    headers.forEach((header, index) => {
      row[header] = item[keys[index]] ?? "";
    });
    return row;
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Laporan");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToPdf(data: any[], headers: string[], keys: string[], title: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const logoSistroUrl = window.location.origin + "/images/logo/logosistro.png";
  const logoCompanyUrl = window.location.origin + "/images/logo/logocompany.png";

  const rowsHtml = data.map((item, idx) => `
    <tr>
      <td style="text-align: center; font-weight: 500;">${idx + 1}</td>
      ${keys.map(key => {
    let val = item[key] ?? "";
    // Check if value is number, format with thousand separators
    if (typeof val === 'number') {
      val = val.toLocaleString("id-ID");
    }
    return `<td>${val}</td>`;
  }).join("")}
    </tr>
  `).join("");

  const headersHtml = `
    <tr>
      <th style="width: 40px; text-align: center;">No</th>
      ${headers.map(header => `<th>${header}</th>`).join("")}
    </tr>
  `;

  const html = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            color: #1f2937;
            margin: 30px;
            font-size: 10px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #005FA4;
            padding-bottom: 16px;
          }
          .logo-container {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .logo-container img {
            height: 32px;
            object-fit: contain;
          }
          .logo-container img.company-logo {
            height: 40px;
          }
          .header-info {
            flex-grow: 1;
            margin-left: 24px;
          }
          .title {
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
            margin: 0 0 4px 0;
            text-transform: uppercase;
            letter-spacing: -0.01em;
          }
          .subtitle {
            font-size: 9px;
            font-weight: 600;
            color: #005FA4;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }
          .meta {
            text-align: right;
            font-size: 9px;
            color: #64748b;
            line-height: 1.5;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th {
            background-color: #f3f4f6;
            color: #1e3a8a;
            font-weight: 600;
            text-align: left;
            padding: 6px 8px;
            border: 1px solid #d1d5db;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          td {
            padding: 6px 8px;
            border: 1px solid #e5e7eb;
            word-break: break-word;
          }
          tr:nth-child(even) {
            background-color: #f9fafb;
          }
          @media print {
            body { margin: 15px; }
            @page { size: landscape; margin: 0.5cm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-container">
            <img src="${logoSistroUrl}" alt="Sistro Logo" />
            <img src="${logoCompanyUrl}" class="company-logo" alt="Pupuk Indonesia Logo" />
          </div>
          <div class="header-info">
            <h1 class="title">${title}</h1>
            <p class="subtitle">SISTRO</p>
          </div>
          <div class="meta">
            <p><strong>Dicetak pada:</strong> ${new Date().toLocaleString("id-ID")}</p>
            <p><strong>Jumlah data:</strong> ${data.length} records</p>
          </div>
        </div>
        <table>
          <thead>
            ${headersHtml}
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <script>
          (function() {
            var images = Array.prototype.slice.call(document.getElementsByTagName('img'));
            var loadedCount = 0;
            var totalImages = images.length;
            var printed = false;
            
            // Fallback timer to guarantee printing after 1 second under all circumstances
            var fallbackTimer = setTimeout(function() {
              doPrint();
            }, 1000);

            if (totalImages === 0) {
              doPrint();
              return;
            }

            images.forEach(function(img) {
              if (img.complete && img.naturalWidth !== 0) {
                onImageLoad();
              } else {
                img.onload = onImageLoad;
                img.onerror = onImageLoad;
              }
            });

            function onImageLoad() {
              loadedCount++;
              if (loadedCount === totalImages) {
                setTimeout(doPrint, 100);
              }
            }

            function doPrint() {
              if (printed) return;
              printed = true;
              clearTimeout(fallbackTimer);
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          })();
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
