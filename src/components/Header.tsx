import { Leaf, Menu, X } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  onStartAnalysis: () => void;
}

export function Header({ onStartAnalysis }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleStart = () => {
    setIsMenuOpen(false);
    onStartAnalysis();
  };

  return (
    <header className="site-header">
      <div className="container header-inner">
        <a className="brand" href="#top" aria-label="العودة إلى بداية GreenLens">
          <span className="brand-mark" aria-hidden="true">
            <Leaf size={21} strokeWidth={2.3} />
          </span>
          <span>GreenLens</span>
        </a>

        <nav id="main-navigation" className={`main-nav ${isMenuOpen ? 'is-open' : ''}`} aria-label="التنقل الرئيسي">
          <a href="#top" onClick={() => setIsMenuOpen(false)}>الرئيسية</a>
          <a href="#upload-area" onClick={() => setIsMenuOpen(false)}>تحليل النبات</a>
          <button className="header-cta mobile-only" type="button" onClick={handleStart}>
            ابدأ التحليل
          </button>
        </nav>

        <button className="header-cta desktop-only" type="button" onClick={handleStart}>
          ابدأ التحليل
        </button>

        <button
          className="menu-toggle"
          type="button"
          aria-expanded={isMenuOpen}
          aria-controls="main-navigation"
          aria-label={isMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </header>
  );
}
