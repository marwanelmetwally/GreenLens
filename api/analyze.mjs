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

const TOMATO_ISSUES = [
  { keywords: ['early blight', 'alternaria solani', 'alternaria'], name: 'اللفحة المبكرة', summary: 'مرض فطري قد يسبب بقعًا بنية دائرية وحلقية على الأوراق السفلية ثم ينتشر تدريجيًا.', recommendations: ['إزالة الأوراق المصابة بشدة.', 'تحسين التهوية والمسافات بين النباتات.', 'تجنب بلل الأوراق أثناء الري.', 'متابعة الانتشار واستشارة متخصص عند زيادة الإصابة.'] },
  { keywords: ['late blight', 'phytophthora infestans', 'phytophthora'], name: 'اللفحة المتأخرة', summary: 'إصابة سريعة قد تظهر كبقع مائية داكنة على الأوراق والسيقان والثمار، خاصة مع الرطوبة العالية.', recommendations: ['إبعاد النباتات المصابة عن السليمة.', 'إزالة الأجزاء المصابة والتخلص منها بعيدًا عن التربة.', 'تقليل الرطوبة وبلل الأوراق.', 'طلب إرشاد زراعي سريع إذا انتشرت الإصابة.'] },
  { keywords: ['bacterial spot', 'xanthomonas'], name: 'التبقع البكتيري', summary: 'بقع صغيرة داكنة قد تظهر على الأوراق والثمار وتزداد مع الرطوبة وتناثر الماء.', recommendations: ['استخدام شتلات وبذور سليمة.', 'تجنب الري بالرش.', 'إزالة الأوراق شديدة الإصابة.', 'تعقيم الأدوات وتجنب العمل على النبات وهو مبلل.'] },
  { keywords: ['bacterial speck', 'pseudomonas syringae'], name: 'التبقع البكتيري الدقيق', summary: 'نقاط داكنة صغيرة على الأوراق والثمار قد تتسع مع الطقس البارد والرطب.', recommendations: ['تحسين التهوية وتقليل الرطوبة.', 'تجنب لمس النباتات وهي مبللة.', 'إزالة الأوراق المصابة بوضوح.', 'استخدام مصدر زراعة موثوق في الموسم التالي.'] },
  { keywords: ['septoria leaf spot', 'septoria lycopersici', 'septoria'], name: 'تبقع السبتوريا', summary: 'بقع دائرية صغيرة على الأوراق غالبًا مع مراكز فاتحة ونقاط سوداء دقيقة.', recommendations: ['إزالة الأوراق السفلية المصابة.', 'إبعاد الأوراق عن سطح التربة.', 'الري عند قاعدة النبات.', 'عدم نقل بقايا النبات المصاب إلى السماد.'] },
  { keywords: ['leaf mold', 'passalora fulva', 'fulvia fulva'], name: 'عفن أوراق الطماطم', summary: 'بقع صفراء أو باهتة أعلى الورقة مع نمو زغبي أسفلها في الأجواء الرطبة.', recommendations: ['خفض الرطوبة وتحسين حركة الهواء.', 'إزالة الأوراق المصابة.', 'تجنب ازدحام النباتات.', 'الري صباحًا ومن أسفل النبات.'] },
  { keywords: ['powdery mildew', 'oidium', 'leotiomycetes'], name: 'البياض الدقيقي', summary: 'طبقة بيضاء تشبه الدقيق على سطح الأوراق وقد تضعف نمو النبات.', recommendations: ['زيادة التهوية حول النبات.', 'إزالة الأوراق شديدة الإصابة.', 'تجنب الظل والرطوبة المستمرة.', 'استشارة متخصص قبل استخدام أي معاملة.'] },
  { keywords: ['gray mold', 'grey mold', 'botrytis cinerea', 'botrytis'], name: 'العفن الرمادي', summary: 'عفن رمادي قد يظهر على الأوراق أو السيقان أو الثمار مع الرطوبة والجروح.', recommendations: ['إزالة الأجزاء المتعفنة فورًا.', 'تقليل الرطوبة وتحسين التهوية.', 'تجنب جرح السيقان والثمار.', 'عدم ترك الثمار المتساقطة حول النبات.'] },
  { keywords: ['anthracnose', 'colletotrichum'], name: 'الأنثراكنوز', summary: 'بقع غائرة داكنة قد تظهر على الثمار الناضجة وتزداد مع الرطوبة.', recommendations: ['جمع الثمار المصابة والتخلص منها.', 'تجنب ملامسة الثمار للتربة.', 'الري عند قاعدة النبات.', 'تنظيف بقايا المحصول بعد نهاية الموسم.'] },
  { keywords: ['target spot', 'corynespora cassiicola'], name: 'التبقع الحلقي', summary: 'بقع بنية ذات حلقات متداخلة قد تظهر على الأوراق والثمار.', recommendations: ['إزالة الأوراق المصابة.', 'تحسين التهوية وتقليل البلل.', 'تجنب الزراعة الكثيفة.', 'متابعة الأعراض على الثمار.'] },
  { keywords: ['fusarium wilt', 'fusarium oxysporum', 'fusarium'], name: 'ذبول الفيوزاريوم', summary: 'ذبول تدريجي واصفرار قد يبدأ في جانب واحد من النبات بسبب فطر يعيش في التربة.', recommendations: ['عزل النبات شديد الإصابة.', 'تجنب إعادة استخدام التربة المصابة.', 'اختيار أصناف مقاومة عند الزراعة الجديدة.', 'استشارة متخصص لتأكيد التشخيص.'] },
  { keywords: ['verticillium wilt', 'verticillium'], name: 'ذبول الفرتيسيليوم', summary: 'اصفرار وذبول تدريجي للأوراق قد يظهر رغم توفر الماء.', recommendations: ['عدم نقل التربة الملوثة بين الأحواض.', 'إزالة النباتات شديدة الإصابة.', 'استخدام أصناف مقاومة.', 'فحص الجذور والتربة لدى متخصص.'] },
  { keywords: ['tomato mosaic virus', 'tomato yellow leaf curl virus', 'tomato spotted wilt virus', 'mosaic virus', 'tylcv', 'tswv'], name: 'مرض فيروسي محتمل', summary: 'قد تظهر موزاييك أو تجعد أو اصفرار وتشوه في الأوراق، وتحتاج الإصابة الفيروسية إلى تأكيد متخصص.', recommendations: ['إبعاد النبات المشتبه به عن السليم.', 'مكافحة الحشرات الناقلة مثل الذباب الأبيض والتربس.', 'تعقيم الأدوات وغسل اليدين.', 'إزالة النبات شديد الإصابة بعد استشارة متخصص.'] },
  { keywords: ['aphid', 'aphids'], name: 'حشرات المن', summary: 'حشرات صغيرة قد تتجمع على النموات الحديثة وتمتص العصارة وتسبب تجعد الأوراق.', recommendations: ['فحص ظهر الأوراق والنموات الجديدة.', 'غسل الحشرات بتيار ماء خفيف عند الإمكان.', 'تشجيع الحشرات النافعة.', 'استخدام أي معاملة مكافحة وفق إرشادات مختص.'] },
  { keywords: ['whitefly', 'whiteflies', 'bemisia'], name: 'الذبابة البيضاء', summary: 'حشرات صغيرة تطير عند هز النبات وقد تسبب اصفرارًا وإفرازًا لزجًا ونقل فيروسات.', recommendations: ['فحص أسفل الأوراق بانتظام.', 'إزالة الأوراق شديدة الإصابة.', 'تقليل الحشائش حول النبات.', 'متابعة المكافحة المتكاملة مع متخصص.'] },
  { keywords: ['thrips'], name: 'التربس', summary: 'حشرات دقيقة قد تسبب خدوشًا فضية وتشوهًا في الأوراق والزهور، وقد تنقل فيروسات.', recommendations: ['فحص الزهور والنموات الحديثة.', 'إزالة الأجزاء المتضررة بشدة.', 'استخدام مصائد لاصقة للمراقبة.', 'استشارة متخصص عند استمرار الانتشار.'] },
  { keywords: ['spider mite', 'spider mites', 'tetranychus', 'mite'], name: 'العنكبوت الأحمر أو الأكاروس', summary: 'آفة دقيقة قد تسبب تنقيطًا أصفر وشحوبًا وخيوطًا دقيقة على الأوراق في الجو الحار الجاف.', recommendations: ['فحص أسفل الأوراق بانتظام.', 'غسل الأوراق بلطف عند الإمكان.', 'تجنب الجفاف والغبار الشديد.', 'عدم استخدام مبيد عشوائي قد يضر بالأعداء الحيوية.'] },
  { keywords: ['leafminer', 'leaf miner', 'liriomyza'], name: 'حافرة الأوراق', summary: 'أنفاق متعرجة فاتحة داخل الورقة ناتجة عن يرقات صغيرة.', recommendations: ['إزالة الأوراق المصابة بشدة.', 'مراقبة الأوراق الجديدة.', 'التخلص من الأوراق بعيدًا عن النبات.', 'طلب إرشاد متخصص قبل أي مكافحة.'] },
  { keywords: ['tomato hornworm', 'manduca', 'hornworm'], name: 'دودة ورق الطماطم', summary: 'يرقة كبيرة قد تلتهم الأوراق بسرعة وتترك فضلات واضحة على النبات.', recommendations: ['فحص النبات مساءً أو صباحًا.', 'جمع اليرقات يدويًا عند قلة العدد.', 'حماية الحشرات النافعة.', 'استخدام مكافحة متخصصة عند الإصابة الشديدة.'] },
  { keywords: ['tomato fruitworm', 'helicoverpa', 'fruitworm'], name: 'دودة ثمار الطماطم', summary: 'يرقات قد تحفر داخل الثمار وتسبب ثقوبًا وتلفًا داخليًا.', recommendations: ['إزالة الثمار المصابة.', 'فحص الثمار الصغيرة بانتظام.', 'جمع اليرقات عند الإمكان.', 'استشارة متخصص لتحديد برنامج المكافحة.'] },
  { keywords: ['blossom end rot', 'calcium deficiency'], name: 'عفن الطرف الزهري', summary: 'بقعة داكنة غائرة في نهاية الثمرة غالبًا ترتبط بعدم انتظام الري وتوفر الكالسيوم للنبات.', recommendations: ['تثبيت مواعيد الري وتجنب التعطيش الشديد.', 'استخدام نشارة للحفاظ على رطوبة التربة.', 'عدم الإفراط في التسميد.', 'فحص التربة قبل إضافة أي كالسيوم.'] },
  { keywords: ['sunscald', 'sun scorch', 'light excess'], name: 'لفحة الشمس', summary: 'بقعة فاتحة أو بيضاء على الثمرة بسبب التعرض الشديد للشمس بعد فقدان الغطاء الورقي.', recommendations: ['الحفاظ على غطاء ورقي صحي.', 'تجنب إزالة أوراق سليمة دون حاجة.', 'توفير تظليل خفيف في الحر الشديد.', 'الحفاظ على انتظام الري.'] },
];

function normalizedIssueText(suggestion) {
  return [suggestion?.name, suggestion?.details?.local_name, suggestion?.details?.description]
    .filter((value) => typeof value === 'string')
    .join(' ')
    .toLowerCase();
}

function isTomatoPlant(suggestion) {
  const text = [suggestion?.name, ...(suggestion?.details?.common_names || [])]
    .filter((value) => typeof value === 'string')
    .join(' ')
    .toLowerCase();
  return text.includes('solanum lycopersicum') || text.includes('tomato') || text.includes('طماطم');
}

function tomatoIssueFrom(suggestion) {
  const text = normalizedIssueText(suggestion);
  return TOMATO_ISSUES.find((issue) => issue.keywords.some((keyword) => text.includes(keyword)));
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
  const tomatoIssue = tomatoIssueFrom(diseaseSuggestion);
  const tomatoNeedsReview = isTomatoPlant(plantSuggestion) && !healthy && !tomatoIssue;

  return {
    plantName: arabicPlantName(plantSuggestion),
    health: healthy ? 'healthy' : 'affected',
    healthLabel: healthy ? 'سليم' : 'مصاب أو متأثر',
    possibleIssue: tomatoIssue?.name || diseaseSuggestion?.name || (tomatoNeedsReview ? 'مؤشرات تحتاج إلى صورة أوضح' : (healthy ? 'لم تظهر مؤشرات مرض واضحة' : 'مؤشرات تحتاج إلى فحص متخصص')),
    summary: tomatoIssue?.summary || diseaseDetails.description || (tomatoNeedsReview ? 'تعرّفت الخدمة على نبات طماطم، لكن الصورة الحالية لا تكفي لتحديد مرض أو آفة بعينها.' : (healthy ? 'لم ترصد الخدمة مؤشرات واضحة على مشكلة صحية في الصورة.' : 'رصدت الخدمة مؤشرات صحية تحتاج إلى مراجعة.')),
    recommendations: tomatoIssue?.recommendations || (tomatoNeedsReview ? ['التقط صورة قريبة وواضحة للورقة أو الثمرة المصابة.', 'صوّر ظهر الورقة والسيقان إن وُجدت أعراض.', 'افحص النبات بحثًا عن حشرات صغيرة أو أنفاق أو بقع.', 'استشر متخصصًا قبل استخدام أي مبيد.'] : recommendationsFrom(diseaseDetails.treatment)),
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

export { arabicPlantName, isTomatoPlant, tomatoIssueFrom };
