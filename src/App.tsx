import { useState } from 'react';
import { AnalysisResult } from './components/AnalysisResult';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ImageUploader } from './components/ImageUploader';
import { analyzePlantImage } from './services/plantAnalysis';
import type { PlantAnalysis } from './types/plant';

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<PlantAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  const scrollToUploader = () => {
    document.getElementById('upload-area')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
    setResult(null);
    setAnalysisError('');
  };

  const handleAnalyze = async () => {
    if (!selectedFile || isAnalyzing) return;
    setResult(null);
    setAnalysisError('');
    setIsAnalyzing(true);
    try {
      const analysis = await analyzePlantImage(selectedFile);
      setResult(analysis);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'حدث خطأ غير متوقع أثناء التحليل.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="app-shell">
      <Header onStartAnalysis={scrollToUploader} />
      <main>
        <Hero onStartAnalysis={scrollToUploader} />
        <ImageUploader
          onFileChange={handleFileChange}
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
          analysisError={analysisError}
        />
        {result && <AnalysisResult result={result} onTryAgain={scrollToUploader} />}
      </main>
      <Footer />
    </div>
  );
}

export default App;
