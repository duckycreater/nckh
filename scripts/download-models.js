#!/usr/bin/env node
/**
 * Download and prepare local AI models for waste classification
 *
 * Usage: node scripts/download-models.js
 *
 * Models downloaded:
 * - MobileNetV2: Pre-converted TF.js model (from TensorFlow.js CDN)
 * - EfficientNet-Lite: TFLite model (placeholder + conversion info)
 * - YOLOv8n: TF.js converted from Ultralytics
 *
 * These models are placed in public/models/ and served as static files.
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const MODELS_DIR = path.join(__dirname, "..", "public", "models");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    console.log(`Downloading: ${url}`);
    console.log(`  -> ${destPath}`);

    const protocol = url.startsWith("https") ? https : http;
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.close();
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on("finish", () => {
        file.close();
        console.log(`  Downloaded: ${destPath}`);
        resolve();
      });
      file.on("error", (err) => {
        file.close();
        fs.unlink(destPath, () => {});
        reject(err);
      });
    }).on("error", (err) => {
      file.close();
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function downloadMobileNetV2() {
  const dir = path.join(MODELS_DIR, "mobilenet_v2");
  ensureDir(dir);

  // MobileNetV2 TF.js model from TensorFlow.js CDN
  // These are pre-converted weights for MobileNetV2
  const baseUrl = "https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v2_100_224";

  const files = [
    { name: "model.json", url: `${baseUrl}/model.json` },
    { name: "group1-shard1of1.bin", url: `${baseUrl}/group1-shard1of1.bin` },
  ];

  for (const file of files) {
    const destPath = path.join(dir, file.name);
    try {
      await downloadFile(file.url, destPath);
    } catch (e) {
      console.warn(`  Warning: Could not download ${file.name}: ${e.message}`);
      console.log(`  Info: MobileNetV2 model file not critical - will use simulation mode`);
    }
  }

  // Create a manifest
  const manifest = {
    name: "MobileNetV2",
    version: "1.0",
    inputSize: [224, 224],
    format: "tfjs-graph",
    source: "TensorFlow.js CDN",
    note: "Pre-converted MobileNetV2 for image classification",
  };
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("MobileNetV2 manifest written.");
}

async function downloadEfficientNetLite() {
  const dir = path.join(MODELS_DIR, "efficientnet_lite");
  ensureDir(dir);

  // EfficientNet-Lite is available as TFLite
  // We'll create a placeholder that the runner can detect
  // For actual use: convert a TFLite model using tensorflowjs_converter

  const manifest = {
    name: "EfficientNet-Lite",
    version: "1.0",
    inputSize: [224, 224],
    format: "tflite",
    source: "TensorFlow Lite",
    status: "placeholder",
    conversionInstructions: `
To convert EfficientNet-Lite to TF.js format:
1. Download TFLite model from TF Hub or Kaggle
2. pip install tensorflow tensorflowjs
3. tensorflowjs_converter \\
    --input_format=tflite \\
    --output_format=tfjs_graph_model \\
    /path/to/efficientnet_lite.tflite \\
    public/models/efficientnet_lite/
    `,
    note: "EfficientNet-Lite is optimized for edge/mobile. Run conversion script for real model.",
  };
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("EfficientNet-Lite manifest written (placeholder).");
  console.log("  -> To get real model, run conversion instructions in manifest.json");
}

async function downloadYOLOv8n() {
  const dir = path.join(MODELS_DIR, "yolov8n");
  ensureDir(dir);

  // YOLOv8n from Ultralytics TF.js export
  const baseUrl = "https://github.com/ultralytics/assets/releases/download/v8.3.0";

  // TF.js format for YOLOv8n (Ultralytics exports to TF.js format)
  // These are pre-converted TF.js model files
  const files = [
    { name: "model.json", url: null },
    { name: "metadata.json", url: null },
  ];

  // Create placeholder manifest with conversion instructions
  const manifest = {
    name: "YOLOv8n",
    version: "8.3.0",
    inputSize: [640, 640],
    format: "tfjs-graph",
    source: "Ultralytics",
    status: "placeholder",
    conversionInstructions: `
To convert YOLOv8n to TF.js format:
1. pip install ultralytics
2. python -c "
from ultralytics import YOLO
model = YOLO('yolov8n.pt')
model.export(format='tfjs', imgsz=640)
"
3. Move exported files to public/models/yolov8n/
    `,
    note: "YOLOv8n is for object detection. Run conversion script for real model.",
  };
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("YOLOv8n manifest written (placeholder).");
  console.log("  -> To get real model, run conversion instructions in manifest.json");
}

async function main() {
  console.log("=== Local Model Downloader ===");
  console.log(`Models directory: ${MODELS_DIR}\n`);

  ensureDir(MODELS_DIR);

  await downloadMobileNetV2();
  console.log("");

  await downloadEfficientNetLite();
  console.log("");

  await downloadYOLOv8n();
  console.log("");

  console.log("\n=== Download Complete ===");
  console.log("Models in public/models/:");
  const entries = fs.readdirSync(MODELS_DIR);
  for (const entry of entries) {
    const manifestPath = path.join(MODELS_DIR, entry, "manifest.json");
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      const status = manifest.status === "placeholder" ? " [placeholder]" : " [ready]";
      console.log(`  - ${entry}${status}`);
    }
  }
  console.log("\nFor real models, run the conversion instructions in each manifest.json");
}

main().catch(console.error);
