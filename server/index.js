import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import multer from 'multer'
import os from 'node:os'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { officeFormats } from '../shared/officeFormats.js'

const app = express()
const port = Number(process.env.PORT || 3001)
const tempRoot = path.join(os.tmpdir(), 'office-converter-web')
const currentDir = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(currentDir, '..', 'dist')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
})

app.use(cors())
app.use(express.json())

const conversionRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'عدد طلبات التحويل كبير جدًا. يرجى المحاولة بعد دقيقة.',
  },
})

const webRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
})

const sanitizeFileName = (value) =>
  value
    .replace(/[^\p{L}\p{N}._\-\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()

const runLibreOffice = (inputPath, targetFormat, outputDir) =>
  new Promise((resolve, reject) => {
    execFile(
      'soffice',
      ['--headless', '--convert-to', targetFormat, '--outdir', outputDir, inputPath],
      { timeout: 120000 },
      (error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      },
    )
  })

const findConvertedFile = async (sourceBaseName, outputDir, targetFormat) => {
  const expectedPath = path.join(outputDir, `${sourceBaseName}.${targetFormat}`)
  try {
    await fs.access(expectedPath)
    return expectedPath
  } catch {
    const convertedFiles = await fs.readdir(outputDir)
    return convertedFiles
      .map((fileName) => path.join(outputDir, fileName))
      .find((filePath) => path.extname(filePath).slice(1).toLowerCase() === targetFormat)
  }
}

app.get('/api/formats', (_req, res) => {
  res.json({ formats: officeFormats })
})

app.post('/api/convert', conversionRateLimit, upload.single('file'), async (req, res) => {
  const sessionId = randomUUID()
  const sessionDir = path.join(tempRoot, sessionId)
  const inputDir = path.join(sessionDir, 'input')
  const outputDir = path.join(sessionDir, 'output')

  try {
    const targetFormat = req.body.targetFormat?.toLowerCase()
    const desiredName = req.body.outputName ? sanitizeFileName(req.body.outputName) : ''

    if (!req.file) {
      res.status(400).json({ error: 'Please upload a file first.' })
      return
    }

    const extension = path.extname(req.file.originalname).slice(1).toLowerCase()
    if (!officeFormats.includes(extension)) {
      res.status(400).json({ error: 'Only Office-compatible files are supported.' })
      return
    }

    if (!targetFormat || !officeFormats.includes(targetFormat)) {
      res.status(400).json({ error: 'Please choose a valid target format.' })
      return
    }

    await fs.mkdir(inputDir, { recursive: true })
    await fs.mkdir(outputDir, { recursive: true })

    const safeInputName = sanitizeFileName(path.basename(req.file.originalname, path.extname(req.file.originalname))) || 'source-file'
    const inputPath = path.join(inputDir, `${safeInputName}.${extension}`)
    await fs.writeFile(inputPath, req.file.buffer)

    await runLibreOffice(inputPath, targetFormat, outputDir)

    const convertedPath = await findConvertedFile(safeInputName, outputDir, targetFormat)
    if (!convertedPath) {
      res.status(500).json({ error: 'Conversion completed but output file was not found.' })
      return
    }

    const outputBaseName = desiredName || safeInputName
    const downloadName = outputBaseName.endsWith(`.${targetFormat}`)
      ? outputBaseName
      : `${outputBaseName}.${targetFormat}`

    res.download(convertedPath, downloadName, async () => {
      await fs.rm(sessionDir, { recursive: true, force: true })
    })

    if (process.env.NODE_ENV === 'production') {
      app.use(webRateLimit, express.static(distDir))
      app.get(/^(?!\/api).*/, webRateLimit, (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'))
      })
    }
  } catch (error) {
    if (error?.code === 'ENOENT') {
      res.status(500).json({
        error:
          'LibreOffice is not installed. Install LibreOffice to enable file conversion.',
      })
      return
    }

    res.status(500).json({
      error: 'Conversion failed. Please check file compatibility and try again.',
    })

    await fs.rm(sessionDir, { recursive: true, force: true })
  }
})

app.listen(port, () => {
  console.log(`Converter API running on http://localhost:${port}`)
})
