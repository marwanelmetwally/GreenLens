# تدريب نموذج MangoLeafBD

هذا المسار يدرب نموذجًا منفصلًا لأمراض وآفات أوراق المانجو باستخدام مجموعة MangoLeafBD. لا يتم رفع صور البيانات أو ملف النموذج أو مكتبات التدريب إلى GitHub؛ مجلدات `data/` و`models/*.pt` و`ml/.packages/` مستبعدة من Git.

البيانات الأصلية: [MangoLeafBD على Mendeley](https://data.mendeley.com/datasets/hxsnvwty3r/1). النسخة المستخدمة للتدريب متاحة كملف Parquet عام على Hugging Face.

## الإعداد

```powershell
New-Item -ItemType Directory -Force data/mangoleafbd, ml/.packages | Out-Null
python -m pip install --target ml/.packages torch torchvision --index-url https://download.pytorch.org/whl/cpu
python -m pip install --target ml/.packages pyarrow Pillow
Invoke-WebRequest `
  -Uri "https://huggingface.co/datasets/Project-AgML/mango_leaf_disease_classification/resolve/main/data/train-00000-of-00001.parquet" `
  -OutFile "data/mangoleafbd/train-00000-of-00001.parquet"
```

## التدريب

```powershell
$env:PYTHONPATH=(Resolve-Path 'ml/.packages').Path
python ml/train_mango.py --epochs 6 --batch-size 64
python ml/export_mango_onnx.py
```

الناتج:

- `models/mangoleafbd_mobilenet_v3_small.pt`: checkpoint للنموذج.
- `models/mangoleafbd_metrics.json`: الدقة وسجل الحِقب ومصفوفة الالتباس.

## اختبار صورة محلية

```powershell
$env:PYTHONPATH=(Resolve-Path 'ml/.packages').Path
python ml/predict_mango.py path/to/leaf.jpg
```

النموذج مناسب كبداية أكاديمية. قبل استخدامه في تشخيص فعلي، يجب اختبار صور من مصادر مستقلة وربطه بواجهة API مع تنبيه واضح أنه ليس تشخيصًا نهائيًا.
