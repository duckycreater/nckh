import React, { useState, useRef, useEffect } from "react";
import { Camera, Image as ImageIcon, X, Upload, Wifi, Zap, CheckCircle, Sparkles, ShieldAlert } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { User } from "../types";
import { localModelRunner, LOCAL_MODELS, LocalModelType } from "../services/localModelRunner";
import { Badge, Button, Card, LoadingSpinner, ModalHeader, ModalShell, TabButton } from "../lib/ui";
import { useTranslation } from "react-i18next";

interface AIScannerProps {
  user: User;
  onUpdatePoints: (newPoints: number) => void;
  onClose: () => void;
}

type ScanMode = "cloud" | "local";

export function AIScanner({ user, onUpdatePoints, onClose }: AIScannerProps) {
  const { t } = useTranslation();
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
      setCameraError(t("aiScanner.cameraError"));
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
      plastic: t("aiScanner.categories.plastic"),
      paper: t("aiScanner.categories.paper"),
      glass: t("aiScanner.categories.glass"),
      metal: t("aiScanner.categories.metal"),
      organic: t("aiScanner.categories.organic"),
      hazard: t("aiScanner.categories.hazardous"),
    };
    const instructions: Record<string, string> = {
      plastic: t("aiScanner.disposal.plastic"),
      paper: t("aiScanner.disposal.paper"),
      glass: t("aiScanner.disposal.glass"),
      metal: t("aiScanner.disposal.metal"),
      organic: t("aiScanner.disposal.organic"),
      hazard: t("aiScanner.disposal.hazard"),
    };

    const analysis = `**Phân loại: ${labels[result.category] || result.category}**\n\n${result.category === "plastic" ? "Đây là loại rác nhựa có thể tái chế được." : result.category === "hazard" ? "Đây là loại rác nguy hại cần xử lý đặc biệt." : "Đây là loại rác " + labels[result.category] + " có thể được xử lý đúng quy trình."}\n\n**Hướng dẫn xử lý:**
${instructions[result.category] || ""}`;

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
        const rewardText = "\n\n**" + t("aiScanner.localReward") + "**";
        setResult(analysis + rewardText);
        onUpdatePoints(updatedUser.points + 50);

        // Auto-complete challenges 1 & 3 on first successful scan
        try {
          await fetch("/api/user-progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nickname: user.account_id, type: "challenge", data: 1 }),
          });
          await fetch("/api/user-progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nickname: user.account_id, type: "challenge", data: 3 }),
          });
        } catch (e) {
          console.warn('[AIScanner] Failed to auto-complete challenges:', e);
        }

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
        } catch (e) {
          console.warn('[AIScanner] Failed to log scan event:', e);
        }
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
            finalResult += "\n\n**" + t("aiScanner.cloudReward") + "**";
            onUpdatePoints(data.points);

            // Auto-complete challenges 1 & 3 on first successful scan
            try {
              await fetch("/api/user-progress", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nickname: user.account_id, type: "challenge", data: 1 }),
              });
              await fetch("/api/user-progress", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nickname: user.account_id, type: "challenge", data: 3 }),
              });
            } catch (e) {
              console.warn('[AIScanner] Failed to auto-complete challenges:', e);
            }
          }
          setResult(finalResult);
          if (data.aiMetrics) {
            setLastMetrics(data.aiMetrics);
          } else {
            setLastMetrics({ model: "gemini_2.5_flash", latencyMs, confidence: 0.85 });
          }
        } else {
          setResult(t("aiScanner.analyzeError", { error: data.error || "Unknown" }));
        }
      }
    } catch {
      setResult(t("aiScanner.connectionError"));
    }
    setLoading(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stream]);

  return (
    <ModalShell onClose={onClose} className="max-w-5xl overflow-hidden p-0" title="AI Scanner">
      <ModalHeader
        title={t("aiScanner.title")}
        subtitle={t("aiScanner.subtitle")}
        badge={<Badge tone="success">AI Scanner</Badge>}
        onClose={onClose}
      />

      <div className="grid max-h-[88vh] overflow-hidden lg:grid-cols-[1.02fr_0.98fr]">
        <div className="surface-card p-6 sm:p-8">
          <div className="space-y-4 rounded-[26px] border border-gray-100 bg-gray-50 p-4">
            <div className="flex gap-2 rounded-[20px] bg-gray-100 p-1">
              <TabButton active={scanMode === "cloud"} onClick={() => setScanMode("cloud")} className={`flex-1 justify-center gap-2 ${scanMode === "cloud" ? "bg-white text-slate-900" : "text-gray-500 hover:text-gray-700"}`}>
                <Wifi size={16} /> {t("aiScanner.cloudAI")}
              </TabButton>
              <TabButton active={scanMode === "local"} onClick={() => setScanMode("local")} className={`flex-1 justify-center gap-2 ${scanMode === "local" ? "bg-white text-slate-900" : "text-gray-500 hover:text-gray-700"}`}>
                <Zap size={16} /> {t("aiScanner.localAI")}
              </TabButton>
            </div>

            <div className="rounded-[24px] border border-gray-100 bg-gray-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600">{t("aiScanner.status")}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {scanMode === "cloud"
                  ? t("aiScanner.cloudStatus")
                  : modelLoading
                  ? t("aiScanner.localLoading")
                  : t("aiScanner.localReady")}
              </p>
              {scanMode === "local" && modelLoading && (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <LoadingSpinner message={t("aiScanner.loadingModel")} subtitle={t("aiScanner.loadingModelHint")} />
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={() => fileInputRef.current?.click()} variant="ghost" className="border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-800">
                <Upload size={16} /> {t("aiScanner.uploadImage")}
              </Button>
              <Button onClick={startCamera} variant="ghost" className="border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-800">
                <Camera size={16} /> {t("aiScanner.openCamera")}
              </Button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

            {cameraError && (
              <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{cameraError}</p>
                </div>
              </div>
            )}

            {showCamera && (
              <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-gray-100">
                <video ref={videoRef} autoPlay playsInline className="aspect-video w-full object-cover" />
                <div className="flex gap-3 p-4">
                  <Button onClick={captureImage} className="flex-1">
                    <Camera size={16} /> {t("aiScanner.capture")}
                  </Button>
                  <Button onClick={stopCamera} variant="ghost" className="flex-1 border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100">
                    <X size={16} /> {t("aiScanner.closeCamera")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="thin-scrollbar overflow-y-auto bg-gray-50 p-6 sm:p-8">
          {!image && !loading && !result && (
            <Card className="rounded-[28px] border-dashed bg-white/80 p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                <ImageIcon className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-xl font-black text-slate-900">{t("aiScanner.startWithImage")}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {t("aiScanner.startImageHint")}
              </p>
            </Card>
          )}

          {image && (
            <div className="space-y-4">
              <Card className="overflow-hidden rounded-[28px] p-0">
                <img src={image} alt="Ảnh rác cần phân tích" className="aspect-[4/3] w-full object-cover" />
              </Card>
              <Button onClick={analyzeImage} loading={loading} className="w-full" size="lg" disabled={scanMode === "local" && modelLoading}>
                <Sparkles size={16} />
                {loading ? t("aiScanner.analyzing") : t("aiScanner.analyzeNow")}
              </Button>
            </div>
          )}

          {loading && (
            <Card className="mt-4 rounded-[28px] p-6">
              <LoadingSpinner
                message={t("aiScanner.aiAnalyzing")}
                subtitle={scanMode === "cloud" ? t("aiScanner.cloudAnalyzing") : t("aiScanner.localAnalyzing")}
              />
            </Card>
          )}

          {result && !loading && (
            <Card className="mt-4 rounded-[28px] p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <Badge tone="success">{t("aiScanner.result")}</Badge>
                  <h3 className="mt-3 text-xl font-black text-slate-900">{t("aiScanner.suggestion")}</h3>
                </div>
                <div className="rounded-full bg-emerald-50 p-2 text-emerald-500">
                  <CheckCircle size={18} />
                </div>
              </div>
              <div className="prose prose-sm max-w-none text-slate-700 prose-headings:text-slate-900 prose-strong:text-slate-900">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
              {lastMetrics && (
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{t("aiScanner.model")}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{lastMetrics.model}</p>
                  </div>
                  <div className="rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{t("aiScanner.latency")}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{lastMetrics.latencyMs} ms</p>
                  </div>
                  <div className="rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{t("aiScanner.confidence")}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{Math.round(lastMetrics.confidence * 100)}%</p>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </ModalShell>
  );
}
