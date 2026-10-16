import { AlertCircle, CheckCircle2, Image as ImageIcon, LoaderCircle, RefreshCw, UploadCloud } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

interface ImageUploaderProps {
  onFileChange: (file: File | null) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  analysisError: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const IS_STATIC_PAGES_BUILD = !import.meta.env.VITE_API_URL && import.meta.env.BASE_URL !== '/';

export function ImageUploader({ onFileChange, onAnalyze, isAnalyzing, analysisError }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const resetInput = () => {
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    setError('');

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setSelectedFile(null);
      onFileChange(null);
      resetInput();
      setError('يرجى اختيار صورة بصيغة JPG أو PNG أو WEBP.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      onFileChange(null);
      resetInput();
      setError('حجم الصورة يتجاوز 5 ميجابايت. يرجى اختيار صورة أصغر.');
      return;
    }

    setSelectedFile(file);
    onFileChange(file);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0]);
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setError('');
    onFileChange(null);
    resetInput();
  };

  return (
    <section className="upload-section" id="upload-area" aria-labelledby="upload-heading">
      <div className="container narrow-container">
        <div className="section-heading">
          <span className="section-number">01</span>
          <div>
            <h2 id="upload-heading">حمّل صورة النبات</h2>
            <p>اختر صورة واضحة لورقة أو نبات حتى نعرض لك نموذج النتيجة.</p>
          </div>
        </div>

        <div className={`uploader-card ${selectedFile ? 'has-file' : ''}`}>
          <input
            ref={inputRef}
            className="sr-only"
            id="plant-image"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            onChange={handleInputChange}
            aria-describedby="upload-hint"
          />

          {!selectedFile ? (
            <label className="dropzone" htmlFor="plant-image">
              <span className="upload-icon" aria-hidden="true"><UploadCloud size={30} /></span>
              <span className="dropzone-title">ارفع صورة النبات</span>
              <span className="dropzone-subtitle" id="upload-hint">JPG أو PNG أو WEBP، بحد أقصى 5 ميجابايت</span>
              <span className="button button-secondary">اختر صورة</span>
            </label>
          ) : (
            <div className="preview-state">
              <div className="preview-image-wrap">
                {previewUrl && <img src={previewUrl} alt="معاينة الصورة المختارة للنبات" />}
                <span className="preview-check" aria-label="الصورة جاهزة للتحليل"><CheckCircle2 size={17} /></span>
              </div>
              <div className="preview-copy">
                <span className="preview-title">الصورة جاهزة للتحليل</span>
                <span className="preview-file-name" title={selectedFile.name}>{selectedFile.name}</span>
                <span className="preview-meta"><ImageIcon size={14} /> {(selectedFile.size / (1024 * 1024)).toFixed(2)} ميجابايت</span>
              </div>
              <button className="replace-button" type="button" onClick={() => inputRef.current?.click()}>
                <RefreshCw size={16} /> استبدال الصورة
              </button>
              <button className="remove-button" type="button" onClick={handleRemove} aria-label="إزالة الصورة">×</button>
            </div>
          )}

          {error && (
            <div className="feedback-error" role="alert">
              <AlertCircle size={17} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="analysis-action">
          <button className="button button-primary analyze-button" type="button" disabled={!selectedFile || isAnalyzing} onClick={onAnalyze}>
            {isAnalyzing ? <><LoaderCircle className="spin" size={18} /> جارٍ تحليل الصورة</> : 'تحليل الصورة'}
          </button>
          <p>{IS_STATIC_PAGES_BUILD ? 'سيتم تجهيز نتيجة تجريبية للعرض على الموقع العام.' : 'سيتم إرسال الصورة إلى خدمة التحليل لمعالجة النتيجة.'}</p>
        </div>

        {isAnalyzing && (
          <div className="loading-message" role="status" aria-live="polite">
            <LoaderCircle className="spin" size={20} aria-hidden="true" />
            <span>{IS_STATIC_PAGES_BUILD ? 'جارٍ تجهيز النتيجة التجريبية...' : 'جارٍ تحليل الصورة عبر خدمة النباتات...'}</span>
          </div>
        )}

        {analysisError && (
          <div className="feedback-error analysis-error" role="alert">
            <AlertCircle size={17} aria-hidden="true" />
            <span>{analysisError}</span>
          </div>
        )}
      </div>
    </section>
  );
}
