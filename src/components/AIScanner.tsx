import React, { useState, useRef, useEffect } from "react";
import { Camera, Image as ImageIcon, X, Upload, Wifi, WifiOff, Zap, CheckCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { User } from "../types";
import { localModelRunner, LOCAL_MODELS, LocalModelType } from "../services/localModelRunner";

interface AIScannerProps {
  user: User;
  onUpdatePoints: (newPoints: number) => void;
  onClose: () => void;
}

type ScanMode = "cloud" | "local";

export function AIScanner({ user, onUpdatePoints, onClose }: AIScannerProps) {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [scanMode, setScanMode] = useState<ScanMode>("cloud");
  const [selectedModel, setSelectedModel] = useState<LocalModelType>("mobilenet_v2");
  const [modelLoading, setModelLoading] = useState(false);
  const [lastMetrics, setLastMetrics] = useState<{ model: string; latencyMs: number; confidence: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  // Pre-load local models on mount
  useEffect(() => {
    const model = localModelRunner.getModelInfo(selectedModel);
    if (model && !localModelRunner.isLoaded(selectedModel) && !localModelRunner.isLoading(selectedModel)) {
      setModelLoading(true);
      localModelRunner.loadModel(selectedModel).finally(() => setModelLoading(false));
    }
  }, [selectedModel]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult("");
        setLastMetrics(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(mediaStream);
      setShowCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      alert("Không thể truy cập camera. Vui lòng cấp quyền hoặc tải ảnh lên.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setImage(dataUrl);
        stopCamera();
        setResult("");
        setLastMetrics(null);
      }
    }
  };

  const analyzeWithLocal = async (imageDataUrl: string) => {
    const img = new Image();
    img.src = imageDataUrl;
    await new Promise<void>((res) => { img.onload = () => res(); });

    const canvas = document.createElement("canvas");
    canvas.width = 224;
    canvas.height = 224;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, 224, 224);
    const imageData = ctx.getImageData(0, 0, 224, 224);

    const result = await localModelRunner.classify(imageData, selectedModel);

    const labels: Record<string, string> = {
      plastic: "Nhua",
      paper: "Giay",
      glass: "Thuy tinh",
      metal: "Kim loai",
      organic: "Huu co",
      hazard: "Nguy hai",
    };
    const instructions: Record<string, string> = {
      plastic: "Rua sach, vat det, bo vao thung tai che mau xanh duong.",
      paper: "Gap phang, loai bo cac phan dinh, bo vao thung tai che giay.",
      glass: "Rua sach, khong de vo, bo vao thung tai chenh rieng cho thuy tinh.",
      metal: "Rua sach, co the bop det de tiet kiem khong gian, bo vao thung tai che.",
      organic: "Bo vao thung rac huu co hoac u lam phan bon tu nhien.",
      hazard: "KHONG bo chung rac thuong. Mang den diem thu gom rac nguy hai.",
    };

    const analysis = `**Phan loai: ${labels[result.category] || result.category}**\n\n${result.category === "plastic" ? "Day la loai rac nhua co the tai che duoc." : result.category === "hazard" ? "Day la loai rac nguy hai can xu ly dac biet." : "Day la loai rac " + labels[result.category] + " co the tai che."}\n\n**Huong dan xu ly:**\n${instructions[result.category] || ""}`;

    return { analysis, metrics: { model: selectedModel, latencyMs: result.latencyMs, confidence: result.confidence } };
  };

  const analyzeImage = async () => {
    if (!image) return;
    setLoading(true);
    setResult("");
    setLastMetrics(null);
    try {
      if (scanMode === "local") {
        const { analysis, metrics } = await analyzeWithLocal(image);
        setLastMetrics(metrics);

        const updatedUser = await fetch("/api/user/" + user.account_id).then(r => r.json());
        const rewardText = "\n\n**Thuong 50 diem nho phan tich thanh cong! (Local AI)**";
        setResult(analysis + rewardText);
        onUpdatePoints(updatedUser.points + 50);

        // Log to backend
        try {
          await fetch("/api/research/log-event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.account_id,
              eventType: "scan_success",
              metadata: { eco_type: "local_ai", model: selectedModel },
            }),
          });
        } catch {}
      } else {
        const startTime = Date.now();
        const res = await fetch("/api/scan-garbage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: image, nickname: user.account_id }),
        });
        const data = await res.json();
        const latencyMs = Date.now() - startTime;
        if (res.ok) {
          let finalResult = data.analysis;
          if (data.rewarded) {
            finalResult += "\n\n**Thuong 50 diem nho (The Bai Rac) phan tich thanh cong!**";
            onUpdatePoints(data.points);
          }
          setResult(finalResult);
          if (data.aiMetrics) {
            setLastMetrics(data.aiMetrics);
          } else {
            setLastMetrics({ model: "gemini_2.5_flash", latencyMs, confidence: 0.85 });
          }
        } else {
          setResult("Loi phan tich: " + (data.error || "Unknown"));
        }
      }
    } catch (e) {
      setResult("Loi ket noi khi goi API AI.");
    }
    setLoading(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stream]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 relative flex flex-col max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 rounded-full p-2"
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-4">
          <Camera className="text-emerald-500" /> AI Nhan dien rac thai
        </h2>

        {/* AI Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setScanMode("cloud")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-bold text-sm transition-all ${
              scanMode === "cloud"
                ? "bg-blue-500 text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Wifi size={16} /> Cloud AI
          </button>
          <button
            onClick={() => setScanMode("local")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-bold text-sm transition-all ${
              scanMode === "local"
                ? "bg-emerald-500 text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Zap size={16} /> Local AI
          </button>
        </div>

        {/* Local Model Selector */}
        {scanMode === "local" && (
          <div className="mb-4 p-3 bg-emerald-50 rounded-xl">
            <p className="text-xs font-bold text-emerald-700 mb-2">Chon model:</p>
            <div className="grid grid-cols-3 gap-2">
              {LOCAL_MODELS.map((m) => (
                <button
                  key={m.type}
                  onClick={() => {
                    setSelectedModel(m.type);
                    setModelLoading(true);
                    localModelRunner.loadModel(m.type).finally(() => setModelLoading(false));
                  }}
                  className={`p-2 rounded-lg text-xs font-bold transition-all text-left ${
                    selectedModel === m.type
                      ? "bg-emerald-500 text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:border-emerald-300"
                  }`}
                  title={m.description}
                >
                  <div>{m.displayName}</div>
                  <div className="text-[10px] opacity-70 font-normal">{m.inputSize.join("x")}</div>
                </button>
              ))}
            </div>
            {modelLoading && (
              <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600">
                <div className="w-3 h-3 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                Dang tai model...
              </div>
            )}
          </div>
        )}

        {/* AI Metrics Display */}
        {lastMetrics && (
          <div className="mb-4 flex gap-4 p-3 bg-gray-50 rounded-xl text-xs">
            <div className="flex items-center gap-1">
              <span className="font-bold text-gray-600">Model:</span>
              <span className="text-gray-800">{lastMetrics.model}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-gray-600">Latency:</span>
              <span className={lastMetrics.latencyMs < 100 ? "text-emerald-600" : lastMetrics.latencyMs < 500 ? "text-amber-600" : "text-red-500"}>
                {lastMetrics.latencyMs}ms
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-gray-600">Confidence:</span>
              <span className={lastMetrics.confidence > 0.8 ? "text-emerald-600" : "text-amber-600"}>
                {(lastMetrics.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="ml-auto">
              <CheckCircle className="text-emerald-500" size={14} />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto mb-4 p-2">
          {!image && !showCamera && (
            <div className="flex flex-col gap-4 items-center justify-center p-8 border-2 border-dashed border-emerald-200 rounded-xl bg-emerald-50">
              <p className="text-gray-600 text-center mb-2">
                Chụp ảnh hoặc tải lên rác thải để được phân loại và hướng dẫn bỏ
                rác đúng chuẩn!
              </p>
              <div className="flex gap-4">
                <button
                  onClick={startCamera}
                  className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-100 transition-all text-emerald-600"
                >
                  <Camera size={32} />
                  <span className="text-sm font-medium">Chụp ảnh mới</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-100 transition-all text-blue-600"
                >
                  <ImageIcon size={32} />
                  <span className="text-sm font-medium">Tải ảnh lên</span>
                </button>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                />
              </div>
            </div>
          )}

          {showCamera && (
            <div className="flex flex-col gap-4">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex-shrink-0">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="flex justify-center gap-4">
                <button
                  onClick={captureImage}
                  className="bg-emerald-500 text-white px-6 py-2 rounded-full font-bold shadow hover:bg-emerald-600"
                >
                  Chụp
                </button>
                <button
                  onClick={stopCamera}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-full font-bold hover:bg-gray-300"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}

          {image && !showCamera && (
            <div className="flex flex-col gap-4">
              <div className="relative rounded-xl overflow-hidden shadow-sm border border-gray-200">
                <img
                  src={image}
                  alt="Garbage"
                  className="w-full h-auto max-h-64 object-contain bg-gray-50"
                />
                <button
                  onClick={() => {
                    setImage(null);
                    setResult("");
                  }}
                  className="absolute top-2 right-2 bg-white/80 p-1 rounded-full text-red-500 hover:bg-red-100"
                >
                  <X size={16} />
                </button>
              </div>

              {!result && (
                <button
                  onClick={analyzeImage}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold py-3 rounded-xl disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent flex-shrink-0 rounded-full animate-spin"></div>
                      Dang phan tich...
                    </>
                  ) : (
                    <>
                      <Upload size={20} />
                      AI Phan loai ngay (+50d) {scanMode === "local" ? `[${selectedModel}]` : "[Cloud]"}
                    </>
                  )}
                </button>
              )}

              {result && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-gray-800">
                  <div className="prose prose-sm prose-emerald max-w-none">
                    <ReactMarkdown>{result}</ReactMarkdown>
                  </div>
                  <button
                    onClick={() => {
                      setImage(null);
                      setResult("");
                    }}
                    className="mt-4 w-full bg-white border border-gray-200 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Quét ảnh khác
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
