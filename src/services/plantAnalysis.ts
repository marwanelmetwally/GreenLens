import * as ort from 'onnxruntime-web/wasm';
import type { PlantAnalysis, PlantCrop } from '../types/plant';

const MAX_API_PIXELS = 2_000_000;
const MANGO_IMAGE_SIZE = 160;
const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const IS_STATIC_PAGES_BUILD = !API_BASE_URL && import.meta.env.BASE_URL !== '/';

const STATIC_DEMO_RESULT: PlantAnalysis = {
  plantName: 'الطماطم (مثال تجريبي)', health: 'affected', healthLabel: 'مصاب', possibleIssue: 'اللفحة المبكرة',
  summary: 'قد تظهر بقع بنية على الأوراق، وتزداد مع تطور الإصابة.',
  recommendations: ['إزالة الأوراق شديدة الإصابة.', 'تحسين التهوية حول النبات.', 'تجنب بلل الأوراق عند الري.', 'متابعة حالة النبات واستشارة متخصص عند الحاجة.'],
  isMock: true,
};

const MANGO_CLASSES = [
  { name: 'Anthracnose', arabic: 'الأنثراكنوز', summary: 'مرض فطري قد يسبب بقعًا داكنة على الأوراق والثمار ويزداد مع الرطوبة.', recommendations: ['إزالة الأجزاء المصابة بشدة.', 'تحسين التهوية وتقليل بلل الأوراق.', 'جمع بقايا الأوراق والثمار بعيدًا عن النبات.', 'استشارة متخصص قبل استخدام أي معاملة.'] },
  { name: 'Bacterial_Canker', arabic: 'التقرح البكتيري', summary: 'إصابة بكتيرية قد تسبب بقعًا وتقرحات على الأوراق والأفرع والثمار.', recommendations: ['إزالة الأجزاء المصابة وتعقيم الأدوات.', 'تجنب الري بالرش ولمس النبات وهو مبلل.', 'استخدام شتلات سليمة.', 'استشارة متخصص لتأكيد الإصابة.'] },
  { name: 'Cutting_Weevil', arabic: 'سوسة قطع الأوراق', summary: 'آفة قد تترك حواف مقطوعة أو ثقوبًا في أوراق المانجو.', recommendations: ['فحص حواف الأوراق والنموات الحديثة.', 'إزالة الأجزاء المتضررة عند قلة الإصابة.', 'مراقبة النبات ليلًا عند ظهور قضم واضح.', 'استخدام مكافحة متكاملة بإرشاد متخصص.'] },
  { name: 'Die_Back', arabic: 'جفاف الأفرع', summary: 'جفاف تدريجي للأفرع قد يرتبط بإصابة فطرية أو إجهاد في الجذور أو الأفرع.', recommendations: ['تقليم الأفرع الجافة حتى الجزء السليم.', 'تعقيم أدوات التقليم.', 'تجنب جروح الأفرع وتحسين الصرف.', 'فحص الجذور والتربة لدى متخصص.'] },
  { name: 'Gall_Midge', arabic: 'ذبابة التدرن', summary: 'حشرة قد تسبب تشوهات أو تدرنات صغيرة في الأوراق والنموات الحديثة.', recommendations: ['فحص النموات الحديثة وظهر الأوراق.', 'إزالة الأوراق شديدة التشوه.', 'التخلص من الأجزاء المصابة بعيدًا عن النبات.', 'طلب إرشاد متخصص قبل المكافحة.'] },
  { name: 'Healthy', arabic: 'سليم', summary: 'لم تظهر في الصورة مؤشرات واضحة على الإصابة ضمن فئات النموذج.', recommendations: ['الاستمرار في الري المتوازن.', 'فحص الأوراق وظهرها دوريًا.', 'الحفاظ على التهوية والنظافة حول النبات.', 'مراقبة أي تغير جديد في اللون أو النمو.'] },
  { name: 'Powdery_Mildew', arabic: 'البياض الدقيقي', summary: 'طبقة بيضاء تشبه الدقيق على الأوراق وقد تضعف النمو عند استمرار الإصابة.', recommendations: ['زيادة التهوية وتقليل الرطوبة.', 'إزالة الأوراق شديدة الإصابة.', 'تجنب ازدحام الأشجار والنباتات.', 'استشارة متخصص قبل أي معاملة.'] },
  { name: 'Sooty_Mold', arabic: 'العفن الهبابي', summary: 'طبقة سوداء سطحية قد ترتبط بإفرازات حشرات ماصة للعصارة مثل المن أو الذباب الأبيض.', recommendations: ['فحص النبات بحثًا عن حشرات ماصة للعصارة.', 'غسل الطبقة السطحية بلطف عند الإمكان.', 'مكافحة الحشرة المسببة بإرشاد متخصص.', 'تحسين التهوية ومتابعة الأوراق الجديدة.'] },
];

let mangoSessionPromise: Promise<ort.InferenceSession> | null = null;

function configureMangoRuntime() {
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = new URL(`${import.meta.env.BASE_URL}onnxruntime/`, window.location.origin).toString();
}

function getMangoSession() {
  if (!mangoSessionPromise) {
    configureMangoRuntime();
    const modelUrl = new URL(`${import.meta.env.BASE_URL}models/mangoleafbd_mobilenet_v3_small.onnx`, window.location.origin).toString();
    mangoSessionPromise = ort.InferenceSession.create(modelUrl, { executionProviders: ['wasm'] });
  }
  return mangoSessionPromise;
}

async function fileToDataUrl(file: File): Promise<string> {
  const originalDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('تعذر قراءة الصورة المختارة.'));
    reader.onerror = () => reject(new Error('تعذر قراءة الصورة المختارة.'));
    reader.readAsDataURL(file);
  });
  const image = new Image();
  image.src = originalDataUrl;
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('تعذر تجهيز الصورة للتحليل.')); });
  const scale = Math.min(1, Math.sqrt(MAX_API_PIXELS / (image.naturalWidth * image.naturalHeight)));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('تعذر تجهيز الصورة للتحليل.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.9);
}

async function imageToMangoTensor(file: File): Promise<ort.Tensor> {
  const dataUrl = await fileToDataUrl(file);
  const image = new Image();
  image.src = dataUrl;
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('تعذر تجهيز الصورة لنموذج المانجو.')); });
  const resized = document.createElement('canvas');
  resized.width = 256;
  resized.height = 256;
  const resizedContext = resized.getContext('2d');
  if (!resizedContext) throw new Error('تعذر تجهيز الصورة لنموذج المانجو.');
  const scale = Math.max(256 / image.naturalWidth, 256 / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  resizedContext.drawImage(image, (256 - width) / 2, (256 - height) / 2, width, height);
  const crop = document.createElement('canvas');
  crop.width = MANGO_IMAGE_SIZE;
  crop.height = MANGO_IMAGE_SIZE;
  const cropContext = crop.getContext('2d');
  if (!cropContext) throw new Error('تعذر تجهيز الصورة لنموذج المانجو.');
  cropContext.drawImage(resized, 48, 48, MANGO_IMAGE_SIZE, MANGO_IMAGE_SIZE, 0, 0, MANGO_IMAGE_SIZE, MANGO_IMAGE_SIZE);
  const pixels = cropContext.getImageData(0, 0, MANGO_IMAGE_SIZE, MANGO_IMAGE_SIZE).data;
  const input = new Float32Array(3 * MANGO_IMAGE_SIZE * MANGO_IMAGE_SIZE);
  const planeSize = MANGO_IMAGE_SIZE * MANGO_IMAGE_SIZE;
  const means = [0.485, 0.456, 0.406];
  const stds = [0.229, 0.224, 0.225];
  for (let index = 0; index < planeSize; index += 1) {
    input[index] = (pixels[index * 4] / 255 - means[0]) / stds[0];
    input[planeSize + index] = (pixels[index * 4 + 1] / 255 - means[1]) / stds[1];
    input[planeSize * 2 + index] = (pixels[index * 4 + 2] / 255 - means[2]) / stds[2];
  }
  return new ort.Tensor('float32', input, [1, 3, MANGO_IMAGE_SIZE, MANGO_IMAGE_SIZE]);
}

async function analyzeMangoLeaf(image: File): Promise<PlantAnalysis> {
  const session = await getMangoSession();
  const input = await imageToMangoTensor(image);
  const output = await session.run({ input });
  const logits = output[session.outputNames[0]].data as Float32Array;
  const maxLogit = Math.max(...logits);
  const probabilities = logits.map((value) => Math.exp(value - maxLogit));
  const total = probabilities.reduce((sum, value) => sum + value, 0);
  const predictedIndex = probabilities.indexOf(Math.max(...probabilities));
  const prediction = MANGO_CLASSES[predictedIndex] || MANGO_CLASSES[0];
  const score = probabilities[predictedIndex] / total;
  const isHealthy = prediction.name === 'Healthy';
  return {
    plantName: 'المانجو', health: isHealthy ? 'healthy' : 'affected', healthLabel: isHealthy ? 'سليم' : 'مصاب أو متأثر',
    possibleIssue: prediction.arabic, summary: prediction.summary,
    recommendations: [...prediction.recommendations, `درجة ثقة النموذج الداخلية: ${Math.round(score * 100)}٪.`], isMock: false,
  };
}

/** Uses the local MangoLeafBD model for mango and the protected Plant.id proxy for tomato. */
export async function analyzePlantImage(image: File, crop: PlantCrop = 'tomato'): Promise<PlantAnalysis> {
  if (crop === 'mango') return analyzeMangoLeaf(image);
  const dataUrl = await fileToDataUrl(image);
  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: dataUrl }),
    });
    const payload = await response.json().catch(() => null) as { message?: string } | null;
    if (!response.ok) throw new Error(payload?.message || 'تعذر الوصول إلى خدمة تحليل النباتات.');
    return payload as PlantAnalysis;
  } catch (error) {
    if (IS_STATIC_PAGES_BUILD) return STATIC_DEMO_RESULT;
    throw error;
  }
}
