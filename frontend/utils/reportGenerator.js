// utils/reportGenerator.js
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export const generatePDF = async (elementId, filename = 'report.pdf') => {
  const element = document.getElementById(elementId)
  if (!element) return

  const canvas = await html2canvas(element, {
    scale: 2,
    logging: false,
    useCORS: true
  })
  
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })
  
  const imgWidth = 210
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
  pdf.save(filename)
}

export const generateCSV = (data, filename = 'report.csv') => {
  if (!data || !data.length) return
  
  const headers = Object.keys(data[0])
  const csvRows = [headers.join(',')]
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header] || ''
      return `"${String(value).replace(/"/g, '""')}"`
    })
    csvRows.push(values.join(','))
  }
  
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const generateElectionResultsReport = (election, results) => {
  return {
    reportId: `RPT-${Date.now()}`,
    title: election.title,
    generatedAt: new Date().toISOString(),
    results: results,
    hash: generateHash(JSON.stringify(results))
  }
}

export const generateHash = (data) => {
  const crypto = require('crypto')
  return crypto.createHash('sha256').update(data).digest('hex')
}

export const exportToExcel = (data, filename) => {
  const XLSX = require('xlsx')
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Report')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}