import { CheckCircle2, CircleAlert, Info, Leaf, ShieldCheck } from 'lucide-react';
import type { PlantAnalysis } from '../types/plant';

interface AnalysisResultProps {
  result: PlantAnalysis;
  onTryAgain: () => void;
}

export function AnalysisResult({ result, onTryAgain }: AnalysisResultProps) {
  const isHealthy = result.health === 'healthy';

  return (
    <section className="result-section" aria-labelledby="result-heading">
      <div className="container narrow-container">
        <div className="result-card">
          <div className="result-header">
            <div className="result-title-wrap">
              <span className="result-icon" aria-hidden="true"><ShieldCheck size={23} /></span>
              <div>
                <div className="result-kicker">02 · ملخص النتيجة</div>
                <h2 id="result-heading">نتيجة تحليل النبات</h2>
              </div>
            </div>
            <span className="mock-badge"><Info size={14} /> {result.isMock ? 'نتيجة تجريبية' : 'نتيجة من خدمة التحليل'}</span>
          </div>

          <div className="result-grid">
            <div className="result-item">
              <span className="result-label">اسم النبات أو نوعه</span>
              <strong><Leaf size={17} /> {result.plantName}</strong>
            </div>
            <div className="result-item">
              <span className="result-label">حالة النبات</span>
              <strong className={`status-badge ${isHealthy ? 'status-healthy' : 'status-affected'}`}>
                {isHealthy ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}
                {result.healthLabel}
              </strong>
            </div>
            <div className="result-item result-item-wide">
              <span className="result-label">المرض أو الآفة المحتملة</span>
              <strong>{result.possibleIssue}</strong>
            </div>
            <div className="result-item result-item-wide">
              <span className="result-label">وصف مختصر للمشكلة</span>
              <p>{result.summary}</p>
            </div>
            <div className="result-item result-item-wide recommendation-item">
              <span className="result-label">نصائح العلاج والعناية</span>
              <ul>
                {result.recommendations.map((recommendation) => <li key={recommendation}>{recommendation}</li>)}
              </ul>
            </div>
          </div>

          <div className="result-disclaimer">
            <Info size={17} aria-hidden="true" />
            <span>{result.isMock ? 'هذه نتيجة تجريبية لعرض فكرة المشروع وليست تشخيصًا حقيقيًا.' : 'هذه النتيجة للمساعدة الأولية وليست تشخيصًا زراعيًا نهائيًا.'}</span>
          </div>
          <button className="try-again" type="button" onClick={onTryAgain}>تجربة صورة أخرى</button>
        </div>
      </div>
    </section>
  );
}
