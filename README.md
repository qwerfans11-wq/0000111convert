# Office Converter Pro

تطبيق ويب تفاعلي لتحويل ملفات أوفيس بين صيغ متعددة مع:

- سحب وإسقاط الملفات
- اختيار صيغة التحويل (من وإلى صيغ أوفيس المدعومة)
- إعادة تسمية الملف قبل التحميل
- تنزيل تلقائي للملف الناتج بعد التحويل
- واجهة احترافية وسلسة

## المتطلبات

- Node.js 20+
- LibreOffice مثبت على الجهاز (يوفر أمر `soffice`)

## التشغيل

```bash
npm install
npm run dev
```

- الواجهة الأمامية: `http://localhost:5173`
- واجهة التحويل الخلفية: `http://localhost:3001`

## الأوامر

- `npm run dev` تشغيل الواجهة والخادم معًا
- `npm run build` بناء نسخة الإنتاج للواجهة
- `npm run start` تشغيل خادم التحويل فقط
- `NODE_ENV=production npm run start` تشغيل نسخة الإنتاج (API + الواجهة المبنية في `dist`)
- `npm run lint` فحص الشيفرة

## الصيغ المدعومة

`doc`, `docx`, `docm`, `dot`, `dotx`, `odt`, `ott`, `rtf`, `txt`, `html`, `pdf`, `xls`, `xlsx`, `xlsm`, `xlt`, `xltx`, `ods`, `ots`, `csv`, `ppt`, `pptx`, `pptm`, `pps`, `ppsx`, `pot`, `potx`, `odp`, `otp`

> ملاحظة: دقة التحويل وجودة العناصر تعتمد على مدى دعم LibreOffice لكل زوج تحويل.
