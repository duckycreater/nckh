import React, { useState, useRef, useEffect } from "react";
import { Camera, Image as ImageIcon, X, Upload, Wifi, Zap, CheckCircle, Sparkles, ShieldAlert } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { User } from "../types";
import { localModelRunner, LOCAL_MODELS, LocalModelType } from "../services/localModelRunner";
import { Badge, Button, Card, ModalShell, TabButton } from "../lib/ui";

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
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastMetrics, setLastMetrics] = useState<{ model: string; latencyMs: number; confidence: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);

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
        setCameraError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(mediaStream);
      setShowCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setCameraError("Không thể truy cập camera. Vui lòng cấp quyền hoặc tải ảnh từ thiết bị.");
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
      plastic: "Nhựa",
      paper: "Giấy",
      glass: "Thủy tinh",
      metal: "Kim loại",
      organic: "Hữu cơ",
      hazard: "Nguy hại",
    };
    const instructions: Record<string, string> = {
      plastic: "Rửa sạch, ép dẹt và bỏ vào thùng tái chế màu xanh dương.",
      paper: "Gấp gọn, loại bỏ phần ướt bẩn và bỏ vào thùng giấy tái chế.",
      glass: "Rửa sạch, tránh làm vỡ và thu gom riêng cho thủy tinh.",
      metal: "Làm sạch, có thể bóp dẹt để tiết kiệm không gian và cho vào ngăn tái chế.",
      organic: "Bỏ vào thùng hữu cơ hoặc ủ làm phân bón tự nhiên.",
      hazard: "Không bỏ cùng rác thường. Hãy mang đến điểm thu gom rác nguy hại.",
    };

    const analysis = `**Phân loại: ${labels[result.category] || result.category}**\n\n${result.category === "plastic" ? "Đây là loại rác nhựa có thể tái chế được." : result.category === "hazard" ? "Đây là loại rác nguy hại cần xử lý đặc biệt." : "Đây là loại rác " + labels[result.category] + " có thể được xử lý đúng quy trình."}\n\n**Hướng dẫn xử lý:**\n${instructions[result.category] || ""}`;

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

        const updatedUser = await fetch("/api/user/" + user.account_id).then((r) => r.json());
        const rewardText = "\n\n**Thưởng 50 điểm nhờ phân tích thành công bằng Local AI.**";
        setResult(analysis + rewardText);
        onUpdatePoints(updatedUser.points + 50);

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
            finalResult += "\n\n**Thưởng 50 điểm nhờ quét thành công bằng Cloud AI.**";
            onUpdatePoints(data.points);
          }
          setResult(finalResult);
          if (data.aiMetrics) {
            setLastMetrics(data.aiMetrics);
          } else {
            setLastMetrics({ model: "gemini_2.5_flash", latencyMs, confidence: 0.85 });
          }
        } else {
          setResult("Lỗi phân tích: " + (data.error || "Unknown"));
        }
      }
    } catch {
      setResult("Lỗi kết nối khi gọi AI. Vui lòng thử lại.");
    }
    setLoading(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stream]);

  return (
    <ModalShell onClose={onClose} className="max-w-4xl overflow-hidden p-0">
      <div className="grid max-h-[90vh] overflow-hidden lg:grid-cols-[1.1fr_0.9fr]">
        <div className="bg-[linear-gradient(160deg,#0f1720,#12352f_58%,#174c40)] p-6 text-white sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <Badge tone="success" className="bg-white/10 text-white border-white/10">AI Scanner</Badge>
              <h2 className="mt-4 text-3xl font-black tracking-tight">Quét rác thông minh</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-200/80">
                Chụp ảnh hoặc tải ảnh lên để nhận phân loại, hướng dẫn xử lý đúng chuẩn và tích thêm điểm thưởng.
              </p>
            </div>
            <button onClick={onClose} className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4 rounded-[26px] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
            <div className="flex gap-2 rounded-[20px] bg-white/8 p-1">
              <TabButton active={scanMode === "cloud"} onClick={() => setScanMode("cloud")} className={`flex-1 justify-center gap-2 ${scanMode === "cloud" ? "bg-white text-slate-900" : "text-white/75 hover:text-white"}`}>
                <Wifi size={16} /> Cloud AI
              </TabButton>
              <TabButton active={scanMode === "local"} onClick={() => setScanMode("local")} className={`flex-1 justify-center gap-2 ${scanMode === "local" ? "bg-white text-slate-900" : "text-white/75 hover:text-white"}`}>
                <Zap size={16} /> Local AI
              </TabButton>
            </div>

            {scanMode === "local" && (
              <div className="space-y-3 rounded-[22px] bg-black/15 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">Chọn mô hình</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {LOCAL_MODELS.map((m) => (
                    <button
                      key={m.type}
                      onClick={() => {
                        setSelectedModel(m.type);
                        setModelLoading(true);
                        localModelRunner.loadModel(m.type).finally(() => setModelLoading(false));
                      }}
                      className={`rounded-2xl border p-3 text-left text-xs transition-all ${
                        selectedModel === m.type
                          ? "border-emerald-300 bg-emerald-400/20 text-white"
                          : "border-white/10 bg-white/6 text-slate-200 hover:bg-white/10"
                      }`}
                      title={m.description}
                    >
                      <div className="font-bold">{m.displayName}</div>
                      <div className="mt-1 text-[10px] opacity-80">{m.inputSize.join("x")}</div>
                    </button>
                  ))}
                </div>
                {modelLoading && <p className="text-xs font-bold text-emerald-200">Đang tải mô hình cục bộ...</p>}
              </div>
            )}

            {lastMetrics && (
              <div className="grid gap-3 sm:grid-cols-3">
                <Card className="bg-white/8 p-4 text-white shadow-none border-white/10">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Model</p>
                  <p className="mt-2 font-black">{lastMetrics.model}</p>
                </Card>
                <Card className="bg-white/8 p-4 text-white shadow-none border-white/10">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Latency</p>
                  <p className="mt-2 font-black">{lastMetrics.latencyMs}ms</p>
                </Card>
                <Card className="bg-white/8 p-4 text-white shadow-none border-white/10">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Confidence</p>
                  <p className="mt-2 font-black">{(lastMetrics.confidence * 100).toFixed(0)}%</p>
                </Card>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: <Sparkles className="h-4 w-4" />, title: "Phân tích tức thì", desc: "Xử lý nhanh và trả về hướng dẫn rõ ràng." },
                { icon: <CheckCircle className="h-4 w-4" />, title: "Có thưởng điểm", desc: "Mỗi lượt quét thành công đều có phản hồi ngay." },
                { icon: <ShieldAlert className="h-4 w-4" />, title: "Giảm sai thao tác", desc: "Gợi ý đúng thùng rác và cách xử lý." },
              ].map((item) => (
                <div key={item.title} className="rounded-[22px] border border-white/10 bg-white/6 p-4">
                  <div className="mb-2 inline-flex rounded-full bg-white/10 p-2 text-emerald-200">{item.icon}</div>
                  <p className="font-bold text-white">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-200/75">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex min-h-[540px] flex-col bg-white p-6 sm:p-8">
          {cameraError && (
            <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
              {cameraError}
            </div>
          )}

          <div className="thin-scrollbar flex-1 overflow-y-auto">
            {!image && !showCamera && (
              <div className="flex h-full min-h-[440px] flex-col items-center justify-center rounded-[28px] border border-dashed border-emerald-200 bg-emerald-50/70 p-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                  <Camera size={28} />
                </div>
                <h3 className="text-xl font-black text-slate-900">Chọn nguồn ảnh</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  Chụp ảnh trực tiếp hoặc tải từ thiết bị để AI nhận diện loại rác và gợi ý cách xử lý phù hợp.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button onClick={startCamera} size="lg">
                    <Camera className="h-4 w-4" />
                    Chụp ảnh mới
                  </Button>
                  <Button onClick={() => fileInputRef.current?.click()} size="lg" variant="ghost">
                    <ImageIcon className="h-4 w-4" />
                    Tải ảnh lên
                  </Button>
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                </div>
              </div>
            )}

            {showCamera && (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-[28px] bg-black aspect-video">
                  <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button onClick={captureImage} className="flex-1">Chụp ngay</Button>
                  <Button onClick={stopCamera} variant="ghost" className="flex-1">Huỷ</Button>
                </div>
              </div>
            )}

            {image && !showCamera && (
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 shadow-sm">
                  <img src={image} alt="Garbage" className="h-auto max-h-72 w-full object-contain bg-slate-50" />
                  <button
                    onClick={() => {
                      setImage(null);
                      setResult("");
                    }}
                    className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-red-500 shadow-sm transition hover:bg-red-50"
                  >
                    <X size={16} />
                  </button>
                </div>

                {!result && (
                  <Button onClick={analyzeImage} loading={loading} size="lg" className="w-full">
                    {!loading && <Upload size={18} />}
                    {loading ? "Đang phân tích..." : `Phân loại ngay (+50 điểm) ${scanMode === "local" ? `[${selectedModel}]` : "[Cloud]"}`}
                  </Button>
                )}

                {result && (
                  <Card className="rounded-[28px] border border-indigo-100 bg-indigo-50/60 p-5">
                    <div className="prose prose-sm prose-emerald max-w-none text-slate-800">
                      <ReactMarkdown>{result}</ReactMarkdown>
                    </div>
                    <div className="mt-5 flex gap-3">
                      <Button
                        onClick={() => {
                          setImage(null);
                          setResult("");
                        }}
                        variant="ghost"
                        className="flex-1"
                      >
                        Quét ảnh khác
                      </Button>
                      <Button onClick={onClose} variant="secondary" className="flex-1">
                        Hoàn tất
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
