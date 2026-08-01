import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { officeFormats as defaultFormats } from '../shared/officeFormats'

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [officeFormats, setOfficeFormats] = useState(defaultFormats)
  const [sourceFormatChoice, setSourceFormatChoice] = useState('')
  const [targetFormat, setTargetFormat] = useState('pdf')
  const [outputName, setOutputName] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isConverting, setIsConverting] = useState(false)

  useEffect(() => {
    const loadFormats = async () => {
      try {
        const response = await fetch('/api/formats')
        if (!response.ok) {
          return
        }
        const payload = await response.json()
        if (Array.isArray(payload.formats) && payload.formats.length > 0) {
          setOfficeFormats(payload.formats)
        }
      } catch {
        // fallback to defaults
      }
    }

    loadFormats()
  }, [])

  const sourceFormat = useMemo(
    () => selectedFile?.name.split('.').pop()?.toLowerCase() || '',
    [selectedFile],
  )

  useEffect(() => {
    setSourceFormatChoice(sourceFormat)
  }, [sourceFormat])

  const targetOptions = useMemo(
    () => officeFormats.filter((format) => format !== sourceFormat),
    [officeFormats, sourceFormat],
  )

  useEffect(() => {
    if (targetOptions.length === 0) {
      setTargetFormat('')
      return
    }

    if (!targetOptions.includes(targetFormat)) {
      setTargetFormat(targetOptions[0])
    }
  }, [targetFormat, targetOptions])

  const applyFile = (file) => {
    if (!file) {
      return
    }
    setSelectedFile(file)
    setErrorMessage('')
    setStatusMessage(`تم اختيار: ${file.name}`)

    const inferredName = file.name.replace(/\.[^.]+$/, '')
    setOutputName(inferredName)

    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    setSourceFormatChoice(extension)
    const fallback = extension === 'pdf' ? 'docx' : 'pdf'
    const nextTarget = officeFormats.includes(fallback) ? fallback : officeFormats[0]
    setTargetFormat(extension === nextTarget ? officeFormats[0] : nextTarget)
  }

  const onDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    applyFile(file)
  }

  const onConvert = async () => {
    if (!selectedFile) {
      setErrorMessage('الرجاء رفع ملف أولاً.')
      return
    }

    if (!targetFormat) {
      setErrorMessage('اختر نوع التحويل المطلوب.')
      return
    }

    setIsConverting(true)
    setErrorMessage('')
    setStatusMessage('جارٍ التحويل بدقة عالية...')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('targetFormat', targetFormat)
      formData.append('outputName', outputName)

      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'تعذّر إتمام عملية التحويل.')
      }

      const blob = await response.blob()
      const fileUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const cleanName = outputName.trim() || selectedFile.name.replace(/\.[^.]+$/, '')
      const finalName = cleanName.endsWith(`.${targetFormat}`)
        ? cleanName
        : `${cleanName}.${targetFormat}`

      link.href = fileUrl
      link.download = finalName
      link.click()
      URL.revokeObjectURL(fileUrl)

      setStatusMessage('تم التحويل بنجاح. بدأ تنزيل الملف.')
    } catch (error) {
      setErrorMessage(error.message)
      setStatusMessage('')
    } finally {
      setIsConverting(false)
    }
  }

  return (
    <main className="page">
      <header className="header">
        <p className="eyebrow">Office Converter Pro</p>
        <h1>تحويل احترافي لملفات أوفيس</h1>
        <p className="subtitle">
          حوّل ملفاتك بين صيغ Office المختلفة مع واجهة سحب وإسقاط، وإعادة تسمية قبل التحميل.
        </p>
      </header>

      <section className="card">
        <div
          className={`dropzone ${isDragging ? 'dragging' : ''}`}
          onDragEnter={() => setIsDragging(true)}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
        >
          <p className="drop-title">اسحب الملف وأفلته هنا</p>
          <p className="drop-note">أو اختر الملف يدويًا</p>
          <label className="upload-btn" htmlFor="file-upload">
            اختيار ملف
          </label>
          <input
            id="file-upload"
            type="file"
            onChange={(event) => applyFile(event.target.files?.[0])}
          />
          {selectedFile ? (
            <p className="selected">
              الملف الحالي: <strong>{selectedFile.name}</strong>
            </p>
          ) : null}
        </div>

        <div className="controls">
          <div className="field">
            <label htmlFor="sourceFormat">من</label>
            <select
              id="sourceFormat"
              value={sourceFormatChoice}
              onChange={(event) => setSourceFormatChoice(event.target.value)}
              disabled
            >
              <option value="">اختر ملفًا أولًا</option>
              {officeFormats.map((format) => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}
            </select>
            </div>

            <div className="field">
            <label htmlFor="targetFormat">إلى</label>
            <select
              id="targetFormat"
              value={targetFormat}
              onChange={(event) => setTargetFormat(event.target.value)}
            >
              {targetOptions.map((format) => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="outputName">اسم الملف قبل التحميل</label>
            <input
              id="outputName"
              value={outputName}
              onChange={(event) => setOutputName(event.target.value)}
              placeholder="اكتب الاسم المطلوب"
            />
          </div>
        </div>

        <button className="convert-btn" type="button" onClick={onConvert} disabled={isConverting}>
          {isConverting ? 'جارٍ التحويل...' : 'تحويل وتحميل'}
        </button>

        {statusMessage ? <p className="status ok">{statusMessage}</p> : null}
        {errorMessage ? <p className="status error">{errorMessage}</p> : null}

        <div className="formats">
          <h2>الصيغ المدعومة</h2>
          <p>{officeFormats.join(' • ')}</p>
        </div>
      </section>
    </main>
  )
}

export default App
