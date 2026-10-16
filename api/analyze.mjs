const PLANT_ID_ENDPOINT = 'https://api.plant.id/v3/identification';
const MAX_BODY_SIZE = 8 * 1024 * 1024;

const ARABIC_PLANT_NAMES = {
  'Solanum lycopersicum': 'الطماطم',
  'Solanum tuberosum': 'البطاطس',
  'Capsicum annuum': 'الفلفل',
  'Cucumis sativus': 'الخيار',
  'Cucumis melo': 'الشمام',
  'Citrullus lanatus': 'البطيخ',
  'Zea mays': 'الذرة',
  'Triticum aestivum': 'القمح',
  'Oryza sativa': 'الأرز',
  'Phaseolus vulgaris': 'الفاصوليا',
  'Vicia faba': 'الفول',
  'Pisum sativum': 'البازلاء',
  'Solanum melongena': 'الباذنجان',
  'Citrus sinensis': 'البرتقال',
  'Citrus limon': 'الليمون',
  'Mangifera indica': 'المانجو',
  'Musa acuminata': 'الموز',
  'Olea europaea': 'الزيتون',
  'Vitis vinifera': 'العنب',
  'Fragaria × ananassa': 'الفراولة',
  'Fragaria x ananassa': 'الفراولة',
  'Malus domestica': 'التفاح',
  'Coffea arabica': 'البن العربي',
  'Nicotiana tabacum': 'التبغ',
  'Rosa': 'الورد',
  'Ocimum basilicum': 'الريحان',
  'Mentha': 'النعناع',
  'Zingiber officinale': 'الزنجبيل',
  'Allium cepa': 'البصل',
  'Allium sativum': 'الثوم',
  'Daucus carota': 'الجزر',
  'Lactuca sativa': 'الخس',
  'Brassica oleracea': 'الكرنب',
  'Spinacia oleracea': 'السبانخ',
};

function arabicPlantName(suggestion) {
  const scientificName = typeof suggestion?.name === 'string' ? suggestion.name.trim() : '';
  return ARABIC_PLANT_NAMES[scientificName]
    || suggestion?.details?.common_names?.[0]
    || scientificName
    || 'نبات غير محدد';
}

function recommendationsFrom(value) {
  const text = Array.isArray(value) ? value.join(String.fromCharCode(10)) : typeof value === 'string' ? value : '';
  const recommendations = text
    .split('•')
    .flatMap((part) => part.split(String.fromCharCode(10)))
    .map((item) => item.replace(/^[-*]/, '').trim())
    .filter(Boolean);

  return recommendations.length ? recommendations.slice(0, 6) : ['متابعة حالة النبات واستشارة متخصص عند الحاجة.'];
}

async function readBody(request) {
  if (request.body && typeof request.body === 'object') return request.body;
  if (typeof request.body === 'string') return JSON.parse(request.body);

  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (Buffer.byteLength(raw) > MAX_BODY_SIZE) throw new Error('حجم الصورة كبير جدًا.');
  }
  return JSON.parse(raw || '{}');
}

async function analyzePlantImage(image) {
  const apiKey = process.env.PLANT_ID_API_KEY;
  if (!apiKey) {
    const error = new Error('مفتاح خدمة التحليل غير مضبوط على الخادم.');
    error.status = 503;
    throw error;
  }

  const commaIndex = image.indexOf(',');
  const imageBase64 = commaIndex >= 0 ? image.slice(commaIndex + 1) : image;
  const query = new URLSearchParams({
    details: 'common_names,description,url',
    health: 'all',
    disease_details: 'local_name,description,treatment,cause',
  });
  const apiResponse = await fetch(PLANT_ID_ENDPOINT + '?' + query, {
    method: 'POST',
    headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ images: [imageBase64] }),
  });

  const rawResponse = await apiResponse.text();
  let data = null;
  try { data = JSON.parse(rawResponse); } catch { /* handled below */ }
  if (!apiResponse.ok) {
    let message = 'رفضت خدمة التحليل الصورة أو الطلب.';
    if (apiResponse.status === 401 || apiResponse.status === 403) message = 'مفتاح خدمة Plant.id غير صالح أو غير مفعّل.';
    else if (apiResponse.status === 413) message = 'الصورة أكبر من الحد المسموح به لدى خدمة التحليل.';
    else if (apiResponse.status === 429) message = 'تم تجاوز حد الاستخدام في خدمة التحليل. حاول لاحقًا.';
    else if (typeof data?.message === 'string') message = 'خدمة Plant.id: ' + data.message;
    else if (typeof data?.error === 'string') message = 'خدمة Plant.id: ' + data.error;
    const error = new Error(message);
    error.status = apiResponse.status;
    throw error;
  }

  const result = data?.result || {};
  const plantSuggestion = result.classification?.suggestions?.[0];
  const diseaseSuggestion = result.disease?.suggestions?.[0];
  const healthy = result.is_healthy?.binary === true;
  const diseaseDetails = diseaseSuggestion?.details || {};

  return {
    plantName: arabicPlantName(plantSuggestion),
    health: healthy ? 'healthy' : 'affected',
    healthLabel: healthy ? 'سليم' : 'مصاب أو متأثر',
    possibleIssue: diseaseSuggestion?.name || (healthy ? 'لم تظهر مؤشرات مرض واضحة' : 'مؤشرات تحتاج إلى فحص متخصص'),
    summary: diseaseDetails.description || (healthy ? 'لم ترصد الخدمة مؤشرات واضحة على مشكلة صحية في الصورة.' : 'رصدت الخدمة مؤشرات صحية تحتاج إلى مراجعة.'),
    recommendations: recommendationsFrom(diseaseDetails.treatment),
    isMock: false,
  };
}

export default async function handler(request, response) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Vary', 'Origin');

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }
  if (request.method !== 'POST') {
    response.status(405).json({ message: 'المسار غير متاح بهذه الطريقة.' });
    return;
  }

  try {
    const body = await readBody(request);
    if (typeof body.image !== 'string' || !body.image.startsWith('data:image/')) {
      response.status(400).json({ message: 'لم يتم إرسال صورة صالحة للتحليل.' });
      return;
    }
    response.status(200).json(await analyzePlantImage(body.image));
  } catch (error) {
    response.status(Number.isInteger(error.status) ? error.status : 500).json({
      message: error.message || 'حدث خطأ أثناء تحليل الصورة.',
    });
  }
}
