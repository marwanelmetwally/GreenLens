"""Run a local prediction with the trained MangoLeafBD checkpoint."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import torch
from PIL import Image
from torchvision import models, transforms


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("image", type=Path)
    parser.add_argument("--checkpoint", type=Path, default=Path("models/mangoleafbd_mobilenet_v3_small.pt"))
    args = parser.parse_args()

    checkpoint = torch.load(args.checkpoint, map_location="cpu", weights_only=False)
    model = models.mobilenet_v3_small(weights=None)
    model.classifier[-1] = torch.nn.Linear(model.classifier[-1].in_features, len(checkpoint["classes"]))
    model.load_state_dict(checkpoint["state_dict"])
    model.eval()

    preprocess = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(checkpoint.get("image_size", 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    with Image.open(args.image) as image:
        tensor = preprocess(image.convert("RGB")).unsqueeze(0)
    with torch.no_grad():
        probability = torch.softmax(model(tensor), dim=1)[0]
    index = int(probability.argmax())
    print({
        "class": checkpoint["classes"][index],
        "class_ar": checkpoint["classes_ar"][index],
        "score": round(float(probability[index]), 4),
        "note": "النتيجة من نموذج MangoLeafBD المحلي وليست تشخيصًا زراعيًا نهائيًا.",
    })


if __name__ == "__main__":
    main()
