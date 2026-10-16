"""Train a MangoLeafBD mango-leaf disease classifier.

The script downloads no data by itself. First place the Hugging Face parquet file at:
  data/mangoleafbd/train-00000-of-00001.parquet

It extracts the embedded images, creates a stratified train/validation split, fine-tunes
MobileNetV3-Small when pretrained weights are available, and writes a checkpoint plus metrics.
The checkpoint is deliberately kept local (models/ is git-ignored) because it is a
binary artifact and should be deployed to an inference service separately.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path
from typing import Any

import pyarrow.parquet as pq
import torch
from PIL import Image
from torch import nn
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms


CLASS_NAMES = [
    "Anthracnose",
    "Bacterial_Canker",
    "Cutting_Weevil",
    "Die_Back",
    "Gall_Midge",
    "Healthy",
    "Powdery_Mildew",
    "Sooty_Mold",
]

ARABIC_CLASS_NAMES = {
    "Anthracnose": "الأنثراكنوز",
    "Bacterial_Canker": "التقرح البكتيري",
    "Cutting_Weevil": "سوسة قطع الأوراق",
    "Die_Back": "جفاف الأفرع",
    "Gall_Midge": "ذبابة التدرن",
    "Healthy": "سليم",
    "Powdery_Mildew": "البياض الدقيقي",
    "Sooty_Mold": "العفن الهبابي",
}


def set_seed(seed: int) -> None:
    random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def image_bytes(image_value: Any) -> bytes:
    if isinstance(image_value, dict):
        content = image_value.get("bytes")
        if content is not None:
            return bytes(content)
        path = image_value.get("path")
        if path:
            return Path(path).read_bytes()
    if isinstance(image_value, (bytes, bytearray, memoryview)):
        return bytes(image_value)
    raise ValueError("The parquet image field does not contain embedded bytes")


def extract_dataset(parquet_path: Path, extracted_root: Path) -> list[tuple[Path, int]]:
    extracted_root.mkdir(parents=True, exist_ok=True)
    table = pq.read_table(parquet_path)
    rows: list[tuple[Path, int]] = []
    image_column = table.column("image")
    labels = table.column("label").to_pylist()
    images = image_column.to_pylist()

    for index, (image_value, label) in enumerate(zip(images, labels)):
        label_index = int(label)
        if label_index < 0 or label_index >= len(CLASS_NAMES):
            raise ValueError(f"Unexpected label index: {label_index}")
        class_dir = extracted_root / CLASS_NAMES[label_index]
        class_dir.mkdir(parents=True, exist_ok=True)
        output_path = class_dir / f"{index:05d}.png"
        if not output_path.exists():
            output_path.write_bytes(image_bytes(image_value))
        rows.append((output_path, label_index))

    return rows


def stratified_split(rows: list[tuple[Path, int]], validation_ratio: float, seed: int):
    random_generator = random.Random(seed)
    grouped: dict[int, list[tuple[Path, int]]] = {i: [] for i in range(len(CLASS_NAMES))}
    for row in rows:
        grouped[row[1]].append(row)

    train_rows: list[tuple[Path, int]] = []
    validation_rows: list[tuple[Path, int]] = []
    for label, class_rows in grouped.items():
        random_generator.shuffle(class_rows)
        validation_count = max(1, round(len(class_rows) * validation_ratio))
        validation_rows.extend(class_rows[:validation_count])
        train_rows.extend(class_rows[validation_count:])
    random_generator.shuffle(train_rows)
    random_generator.shuffle(validation_rows)
    return train_rows, validation_rows


class LeafDataset(Dataset):
    def __init__(self, rows: list[tuple[Path, int]], transform):
        self.rows = rows
        self.transform = transform

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, index: int):
        path, label = self.rows[index]
        with Image.open(path) as image:
            image = image.convert("RGB")
        return self.transform(image), label


def build_model(num_classes: int) -> tuple[nn.Module, bool]:
    try:
        model = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
        print("Using ImageNet-pretrained MobileNetV3-Small weights")
        pretrained = True
    except Exception as error:
        print(f"Pretrained weights unavailable ({error}); training MobileNetV3-Small from scratch")
        model = models.mobilenet_v3_small(weights=None)
        pretrained = False
    input_features = model.classifier[-1].in_features
    model.classifier[-1] = nn.Linear(input_features, num_classes)
    if pretrained:
        # A frozen feature extractor makes this practical on a normal laptop CPU.
        for parameter in model.features.parameters():
            parameter.requires_grad = False
    return model, pretrained


def evaluate(model, loader, device):
    model.eval()
    correct = 0
    total = 0
    loss_total = 0.0
    confusion = [[0 for _ in CLASS_NAMES] for _ in CLASS_NAMES]
    criterion = nn.CrossEntropyLoss()
    with torch.no_grad():
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            logits = model(images)
            loss_total += criterion(logits, labels).item() * labels.size(0)
            predictions = logits.argmax(dim=1)
            correct += (predictions == labels).sum().item()
            total += labels.size(0)
            for actual, predicted in zip(labels.cpu().tolist(), predictions.cpu().tolist()):
                confusion[actual][predicted] += 1
    return loss_total / max(total, 1), correct / max(total, 1), confusion


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--parquet", type=Path, default=Path("data/mangoleafbd/train-00000-of-00001.parquet"))
    parser.add_argument("--output", type=Path, default=Path("models"))
    parser.add_argument("--epochs", type=int, default=6)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--validation-ratio", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    if not args.parquet.exists():
        raise FileNotFoundError(f"Dataset not found: {args.parquet}")
    set_seed(args.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training device: {device}")

    extracted_root = args.parquet.parent / "images"
    rows = extract_dataset(args.parquet, extracted_root)
    train_rows, validation_rows = stratified_split(rows, args.validation_ratio, args.seed)
    print(f"Images: {len(rows)} | train: {len(train_rows)} | validation: {len(validation_rows)}")

    image_size = 160
    normalize = transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    train_transform = transforms.Compose([
        transforms.RandomResizedCrop(image_size, scale=(0.8, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(12),
        transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.15),
        transforms.ToTensor(),
        normalize,
    ])
    validation_transform = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(image_size),
        transforms.ToTensor(),
        normalize,
    ])

    train_loader = DataLoader(LeafDataset(train_rows, train_transform), batch_size=args.batch_size, shuffle=True, num_workers=0)
    validation_loader = DataLoader(LeafDataset(validation_rows, validation_transform), batch_size=args.batch_size, shuffle=False, num_workers=0)

    model, pretrained = build_model(len(CLASS_NAMES))
    model = model.to(device)
    criterion = nn.CrossEntropyLoss()
    trainable_parameters = [parameter for parameter in model.parameters() if parameter.requires_grad]
    optimizer = torch.optim.AdamW(trainable_parameters, lr=1e-3 if pretrained else 2e-4, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    best_accuracy = -1.0
    best_state = None
    history = []
    for epoch in range(1, args.epochs + 1):
        model.train()
        running_loss = 0.0
        total = 0
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad(set_to_none=True)
            logits = model(images)
            loss = criterion(logits, labels)
            loss.backward()
            optimizer.step()
            running_loss += loss.item() * labels.size(0)
            total += labels.size(0)
        scheduler.step()

        validation_loss, validation_accuracy, confusion = evaluate(model, validation_loader, device)
        train_loss = running_loss / max(total, 1)
        history.append({"epoch": epoch, "train_loss": train_loss, "validation_loss": validation_loss, "validation_accuracy": validation_accuracy})
        print(f"Epoch {epoch}/{args.epochs} | train loss {train_loss:.4f} | val loss {validation_loss:.4f} | val accuracy {validation_accuracy:.2%}")
        if validation_accuracy > best_accuracy:
            best_accuracy = validation_accuracy
            best_state = {key: value.detach().cpu().clone() for key, value in model.state_dict().items()}

    args.output.mkdir(parents=True, exist_ok=True)
    checkpoint_path = args.output / "mangoleafbd_mobilenet_v3_small.pt"
    torch.save({
        "model_name": "mobilenet_v3_small",
        "state_dict": best_state,
        "classes": CLASS_NAMES,
        "classes_ar": [ARABIC_CLASS_NAMES[name] for name in CLASS_NAMES],
        "image_size": image_size,
        "validation_accuracy": best_accuracy,
        "dataset": "MangoLeafBD",
    }, checkpoint_path)
    (args.output / "mangoleafbd_metrics.json").write_text(json.dumps({
        "dataset": "MangoLeafBD",
        "classes": CLASS_NAMES,
        "classes_ar": [ARABIC_CLASS_NAMES[name] for name in CLASS_NAMES],
        "images": len(rows),
        "train_images": len(train_rows),
        "validation_images": len(validation_rows),
        "best_validation_accuracy": best_accuracy,
        "history": history,
        "confusion_matrix": confusion,
        "seed": args.seed,
        "model": "MobileNetV3-Small transfer learning for MangoLeafBD",
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved checkpoint: {checkpoint_path}")
    print(f"Best validation accuracy: {best_accuracy:.2%}")


if __name__ == "__main__":
    main()
