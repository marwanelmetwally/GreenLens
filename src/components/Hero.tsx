import { ArrowDown, ScanLine } from 'lucide-react';

interface HeroProps {
  onStartAnalysis: () => void;
}

export function Hero({ onStartAnalysis }: HeroProps) {
  return (
    <section className="hero" id="top">
      <div className="hero-orb hero-orb-one" aria-hidden="true" />
      <div className="hero-orb hero-orb-two" aria-hidden="true" />
      <div className="container hero-content">
        <div className="eyebrow"><ScanLine size={15} /> مشروع جامعي تجريبي</div>
        <h1>اكتشف صحة نباتك بسهولة</h1>
        <p>ارفع صورة لنباتك، وتعرّف على الأمراض المحتملة واحصل على توصيات للعناية به.</p>
        <button className="hero-link" type="button" onClick={onStartAnalysis}>
          ابدأ من هنا <ArrowDown size={17} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
