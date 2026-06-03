import PDFDocument from 'pdfkit'
import ExcelJS from 'exceljs'
import Company from '../models/Company.js'

export const formatDateTime = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  }).format(new Date(date))
}

export const getCompanyName = async (companyId) => {
  const company = await Company.findById(companyId).select('name')
  return company?.name || 'HRM'
}

export const createDownloadHeaders = (res, filename, contentType) => {
  res.setHeader('Content-Type', contentType)
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
}

export const streamPdf = (res, filename, buildDocument) => {
  createDownloadHeaders(res, filename, 'application/pdf')
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true })
  doc.pipe(res)
  buildDocument(doc)
  doc.end()
}

export const streamExcel = async (res, filename, buildWorkbook) => {
  createDownloadHeaders(res, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  const workbook = new ExcelJS.Workbook()
  await buildWorkbook(workbook)
  await workbook.xlsx.write(res)
  res.end()
}

export const fitWorksheetColumns = (worksheet, minWidth = 10) => {
  worksheet.columns.forEach((column) => {
    let maxLength = minWidth
    column.eachCell({ includeEmpty: true }, (cell) => {
      const value = cell.value || ''
      const length = typeof value === 'string' ? value.length : String(value).length
      if (length > maxLength) maxLength = length
    })
    column.width = Math.min(maxLength + 2, 30)
  })
}
