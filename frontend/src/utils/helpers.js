/** Builds a CSV string from an array of flat objects and triggers a browser download. */
export function downloadCSV(data, filename) {
  if (!data || !data.length) return
  const headers = Object.keys(data[0])
  const escape = (v) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const rows = data.map((row) => headers.map((h) => escape(row[h])).join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Same shape as downloadCSV but names the file .xlsx for spreadsheet apps that open CSV as Excel. */
export function downloadExcel(data, filename) {
  downloadCSV(data, filename.endsWith('.xlsx') ? filename : `${filename.replace(/\.[^.]+$/, '')}.xlsx`)
}

/** Opens the browser print dialog so the current page (or a report preview) can be saved as PDF. */
export function downloadPDF() {
  window.print()
}
