import http from 'node:http';
import fs from 'node:fs';

const envPath = new URL('../.env', import.meta.url);
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  for (const line of envFile.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const MAX_BODY_SIZE = 8 * 1024 * 1024;
const PLANT_ID_ENDPOINT = 'https://api.plant.id/v3/identification';

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > MAX_BODY_SIZE) {
        reject(new Error('حجم الصورة كبير جدًا.'));
        request.destroy();
        return;
      }
      body += chunk;
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('تعذر قراءة بيانات الصورة.'));
      }
    });
    request.on('error', reject);
  });
}

function recommendationsFrom(value) {
  const text = Array.isArray(value) ? value.join('\n') : typeof value === 'string' ? value : '';
  const recommendations = text
    .split(/\n|•|(?<=\.)\s+/)
    .map((item) => item.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);

  return recommendations.length ? recommendations.slice(0, 6) : ['متابعة حالة النبات واستشارة متخصص عند الحاجة.'];
}

async function analyzePlantImage(image) {
  const apiKey = process.env.PLANT_ID_API_KEY;
  if (!apiKey || apiKey === 'ضع_المفتاح_هنا') {
    const error = new Error('أضف مفتاح PLANT_ID_API_KEY في ملف البيئة ثم أعد تشغيل التطبيق.');
    error.status = 503;
    throw error;
  }

  const imageBase64 = image.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
  const query = new URLSearchParams({
    details: 'common_names,description,url',
    health: 'all',
    disease_details: 'local_name,description,treatment,cause',
  });

  const apiResponse = await fetch(`${PLANT_ID_ENDPOINT}?${query}`, {
    method: 'POST',
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ images: [imageBase64] }),
  });

  const rawResponse = await apiResponse.text();
  let data = null;
  try {
    data = JSON.parse(rawResponse);
  } catch {
    data = null;
  }
  if (!apiResponse.ok) {
    let message = 'رفضت خدمة التحليل الصورة أو الطلب.';
    if (apiResponse.status === 401 || apiResponse.status === 403) {
      message = 'مفتاح خدمة Plant.id غير صالح أو غير مفعّل.';
    } else if (apiResponse.status === 413) {
      message = 'الصورة أكبر من الحد المسموح به لدى خدمة التحليل.';
    } else if (apiResponse.status === 429) {
      message = 'تم تجاوز حد الاستخدام في خدمة التحليل. حاول لاحقًا.';
    } else if (typeof data?.message === 'string') {
      message = `خدمة Plant.id: ${data.message}`;
    } else if (typeof data?.error === 'string') {
      message = `خدمة Plant.id: ${data.error}`;
    }
    console.error(`Plant.id request failed (${apiResponse.status})`, data || rawResponse.slice(0, 300));
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
    plantName: plantSuggestion?.name || 'نبات غير محدد',
    health: healthy ? 'healthy' : 'affected',
    healthLabel: healthy ? 'سليم' : 'مصاب أو متأثر',
    possibleIssue: diseaseSuggestion?.name || (healthy ? 'لم تظهر مؤشرات مرض واضحة' : 'مؤشرات تحتاج إلى فحص متخصص'),
    summary: diseaseDetails.description || (healthy ? 'لم ترصد الخدمة مؤشرات واضحة على مشكلة صحية في الصورة.' : 'رصدت الخدمة مؤشرات صحية تحتاج إلى مراجعة.'),
    recommendations: recommendationsFrom(diseaseDetails.treatment),
    isMock: false,
  };
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    });
    response.end();
    return;
  }

  if (request.method !== 'POST' || request.url !== '/api/analyze') {
    sendJson(response, 404, { message: 'المسار غير موجود.' });
    return;
  }

  try {
    const body = await readJson(request);
    if (typeof body.image !== 'string' || !body.image.startsWith('data:image/')) {
      sendJson(response, 400, { message: 'لم يتم إرسال صورة صالحة للتحليل.' });
      return;
    }

    const result = await analyzePlantImage(body.image);
    sendJson(response, 200, result);
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    sendJson(response, status, { message: error.message || 'حدث خطأ أثناء تحليل الصورة.' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`GreenLens API proxy listening on ${HOST}:${PORT}`);
});
