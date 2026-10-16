"""Export the trained MangoLeafBD checkpoint for browser inference."""

from __future__ import annotations

import argparse
from pathlib import Path

import torch
from torchvision import models


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=Path, default=Path("models/mangoleafbd_mobilenet_v3_small.pt"))
    parser.add_argument("--output", type=Path, default=Path("public/models/mangoleafbd_mobilenet_v3_small.onnx"))
    args = parser.parse_args()

    checkpoint = torch.load(args.checkpoint, map_location="cpu", weights_only=False)
    model = models.mobilenet_v3_small(weights=None)
    model.classifier[-1] = torch.nn.Linear(model.classifier[-1].in_features, len(checkpoint["classes"]))
    model.load_state_dict(checkpoint["state_dict"])
    model.eval()

    args.output.parent.mkdir(parents=True, exist_ok=True)
    dummy_input = torch.randn(1, 3, checkpoint.get("image_size", 160), checkpoint.get("image_size", 160))
    torch.onnx.export(
        model,
        dummy_input,
        args.output,
        input_names=["input"],
        output_names=["logits"],
        opset_version=17,
        do_constant_folding=True,
        dynamo=False,
    )
    print(f"Exported {args.output} ({args.output.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
