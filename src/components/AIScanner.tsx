import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Camera,
  Check,
  ChevronRight,
  Image as ImageIcon,
  Flag,
  History,
  Loader2,
  Save,
  ShieldCheck,
  Upload,
  WifiOff,
  X,
} from "lucide-react";
import type { CardPreview, MaterialCard, ScanAnalysis } from "../../shared/materialCards";
import { getAuthHeaders } from "../lib/auth";
import { Badge, Button, ModalHeader, ModalShell } from "../lib/ui";
import { localModelRunner } from "../services/localModelRunner";
import {
  enqueue as enqueuePendingScan,
  list as listPendingScans,
  type PendingScan,
  remove as removePendingScan,
} from "../services/pendingScanQueue";
import type { User } from "../types";
import { setAppCriticalActivity } from "../services/appUpdateManager";
import { toUserMessage } from "../lib/userFacingError";

interface AIScannerProps {
  user: User;
  onUpdatePoints: (newPoints: number) => void;
  onClose: () => void;
  onCardCreated?: (card: MaterialCard) => void;
  mode?: "modal" | "page";
}

interface ScanResponse {
  scan: ScanAnalysis;
  cardPreview: CardPreview | null;
  rewarded: boolean;
  rewardAmount: number;
  points: number | null;
  reason?: string;
}

interface LocalPreview {
  category: string;
  confidence: number;
  abstained: boolean;
  latencyMs: number;
}

interface ScanHistoryItem {
  id: string;
  imageUrl: string | null;
  analysis: ScanAnalysis;
  cardPreview: CardPreview | null;
  cardId: string | null;
  createdAt: number;
  expiresAt: number;
}

const CATEGORY_LABEL: Record<string, string> = {
  plastic: "Nhựa",
  paper: "Giấy",
  glass: "Thủy tinh",
  metal: "Kim loại",
  organic: "Hữu cơ",
  hazard: "Cần thu gom riêng",
};

const SOURCE_LABEL = {
  visual_observation: "Quan sát từ ảnh",
  material_library: "Thư viện vật liệu",
  unknown: "Chưa xác định",
};

const VERDICT_GUIDANCE: Record<Exclude<ScanAnalysis["verdict"], "single_waste">, { title: string; description: string }> = {
  not_waste: {
    title: "Không phát hiện một vật thể rác",
    description: "Chụp lại một vật thể cần phân loại, đặt riêng trên nền rõ và đủ sáng.",
  },
  multiple_objects: {
    title: "Ảnh có nhiều vật thể",
    description: "Tách một vật thể vào giữa khung hình để thuộc tính và kỹ năng có căn cứ rõ ràng.",
  },
  uncertain: {
    title: "Chưa đủ bằng chứng để kết luận",
    description: "Chụp gần hơn, giữ ảnh nét và để lộ ký hiệu vật liệu nếu có.",
  },
};

function errorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const value = (payload as { error?: unknown }).error;
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

export function AIScanner({
  user,
  onUpdatePoints,
  onClose,
  onCardCreated,
  mode = "modal",
}: AIScannerProps) {
  const { t } = useTranslation();
  const [image, setImage] = useState<string | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [scanning, setScanning] = useState(false);
  const [creating, setCreating] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ScanResponse | null>(null);
  const [localPreview, setLocalPreview] = useState<LocalPreview | null>(null);
  const [createdCard, setCreatedCard] = useState<MaterialCard | null>(null);
  const [pending, setPending] = useState<PendingScan[]>([]);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("classification_incorrect");
  const [reportNote, setReportNote] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const scanRequestId = useRef<string>(crypto.randomUUID());
  const stableUserId = user.userId || user.account_id;

  const refreshPending = useCallback(
    async () => setPending(await listPendingScans(stableUserId)),
    [stableUserId],
  );

  const refreshHistory = useCallback(async () => {
    try {
      const request = await fetch("/api/material-scans?limit=12", {
        headers: getAuthHeaders(),
      });
      const payload = (await request.json().catch(() => null)) as {
        scans?: ScanHistoryItem[];
        error?: string;
      } | null;
      if (!request.ok || !payload?.scans) {
        throw new Error(errorMessage(payload, "Không tải được nhật ký quét."));
      }
      setScanHistory(payload.scans);
      setHistoryError(null);
    } catch (cause) {
      setHistoryError(toUserMessage(cause, "Không tải được nhật ký quét."));
    }
  }, []);

  useEffect(() => {
    void refreshPending();
    void refreshHistory();
    const becameOnline = () => setOnline(true);
    const becameOffline = () => setOnline(false);
    window.addEventListener("online", becameOnline);
    window.addEventListener("offline", becameOffline);
    return () => {
      window.removeEventListener("online", becameOnline);
      window.removeEventListener("offline", becameOffline);
    };
  }, [refreshHistory, refreshPending]);

  useEffect(() => {
    if (video.current && stream) {
      video.current.srcObject = stream;
      void video.current.play().catch(() => undefined);
    }
  }, [stream]);

  useEffect(() => () => stream?.getTracks().forEach((track) => track.stop()), [stream]);

  useEffect(() => {
    const hasUncommittedImage = Boolean(
      image && (!response && !localPreview || response?.cardPreview && !createdCard),
    );
    setAppCriticalActivity("material-scan", scanning || creating || hasUncommittedImage);
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!scanning && !creating && !hasUncommittedImage) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      setAppCriticalActivity("material-scan", false);
    };
  }, [createdCard, creating, image, localPreview, response, scanning]);

  const resetResult = () => {
    setResponse(null);
    setLocalPreview(null);
    setCreatedCard(null);
    setError(null);
    setReportOpen(false);
    setReportNote("");
    setReportSent(false);
  };

  const normalizeImage = async (source: CanvasImageSource, width: number, height: number) => {
    const limit = 1280;
    const scale = Math.min(1, limit / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Trình duyệt không thể xử lý ảnh.");
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  };

  const loadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      setError("Chỉ nhận ảnh dưới 10 MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    const source = new Image();
    source.onload = () => {
      void normalizeImage(source, source.naturalWidth, source.naturalHeight)
        .then((nextImage) => {
          scanRequestId.current = crypto.randomUUID();
          setImage(nextImage);
          resetResult();
        })
        .catch((cause) => setError(toUserMessage(cause, "Không đọc được ảnh.")))
        .finally(() => URL.revokeObjectURL(url));
    };
    source.onerror = () => {
      URL.revokeObjectURL(url);
      setError("Không đọc được ảnh này.");
    };
    source.src = url;
    event.target.value = "";
  };

  const openCamera = async () => {
    try {
      setError(null);
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      setStream(media);
      setCameraOpen(true);
    } catch {
      setError("Không mở được camera. Hãy cấp quyền hoặc tải ảnh lên.");
    }
  };

  const closeCamera = () => {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    setCameraOpen(false);
  };

  const capture = async () => {
    if (!video.current || !video.current.videoWidth) return;
    try {
      scanRequestId.current = crypto.randomUUID();
      setImage(
        await normalizeImage(video.current, video.current.videoWidth, video.current.videoHeight),
      );
      resetResult();
      closeCamera();
    } catch (cause) {
      setError(toUserMessage(cause, "Không chụp được ảnh."));
    }
  };

  const analyzeLocally = async (imageData: string) => {
    const source = new Image();
    source.src = imageData;
    await new Promise<void>((resolve, reject) => {
      source.onload = () => resolve();
      source.onerror = () => reject(new Error("Không giải mã được ảnh."));
    });
    const canvas = document.createElement("canvas");
    canvas.width = 224;
    canvas.height = 224;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Trình duyệt không thể xử lý ảnh.");
    context.drawImage(source, 0, 0, 224, 224);
    if (!localModelRunner.isLoaded("onnx_waste_v1")) {
      const loaded = await localModelRunner.loadModel("onnx_waste_v1");
      if (!loaded) throw new Error("Mô hình sơ bộ chưa tải được.");
    }
    const result = await localModelRunner.classify(
      context.getImageData(0, 0, 224, 224),
      "onnx_waste_v1",
    );
    setLocalPreview({
      category: result.category,
      confidence: result.confidence,
      abstained: Boolean(result.abstained),
      latencyMs: result.latencyMs,
    });
  };

  const queueForVerification = async () => {
    if (!image) return;
    const requestId = scanRequestId.current || crypto.randomUUID();
    scanRequestId.current = requestId;
    await enqueuePendingScan(
      "/api/scan-garbage",
      { imageBase64: image, requestId, locale: "vi" },
      stableUserId,
      requestId,
    );
    await refreshPending();
  };

  const scan = async () => {
    if (!image) return;
    setScanning(true);
    setError(null);
    setResponse(null);
    setCreatedCard(null);
    try {
      await queueForVerification().catch(() => undefined);
      if (!online) {
        try {
          await analyzeLocally(image);
        } catch (cause) {
          setError(
            `${toUserMessage(cause, "Không thể nhận diện sơ bộ.")} Ảnh vẫn được lưu để xác minh khi có mạng.`,
          );
        }
        return;
      }
      const request = await fetch("/api/scan-garbage", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          imageBase64: image,
          requestId: scanRequestId.current,
          locale: "vi",
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const payload = (await request.json().catch(() => null)) as ScanResponse | null;
      if (!request.ok || !payload?.scan) {
        throw new Error(errorMessage(payload, `Không thể xác minh ảnh (HTTP ${request.status}).`));
      }
      setResponse(payload);
      await removePendingScan(scanRequestId.current).catch(() => undefined);
      await refreshPending();
      await refreshHistory();
      if (typeof payload.points === "number" && Number.isFinite(payload.points)) {
        onUpdatePoints(payload.points);
      }
    } catch (cause) {
      setError(
        cause instanceof DOMException && cause.name === "TimeoutError"
          ? "Phân tích quá 30 giây. Ảnh của bạn vẫn còn ở đây; hãy thử gửi lại."
          : toUserMessage(cause, "Không thể kết nối máy chủ."),
      );
    } finally {
      setScanning(false);
    }
  };

  const createCard = async () => {
    const preview = response?.cardPreview;
    if (!preview || createdCard) return;
    setCreating(true);
    setError(null);
    try {
      const request = await fetch("/api/material-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          scanId: preview.scanId,
          idempotencyKey: `create-card:${stableUserId}:${preview.scanId}`,
        }),
      });
      const payload = (await request.json().catch(() => null)) as {
        card?: MaterialCard;
        points?: number;
        error?: string;
      } | null;
      if (!request.ok || !payload?.card) {
        throw new Error(errorMessage(payload, `Không tạo được hộ chiếu (HTTP ${request.status}).`));
      }
      setCreatedCard(payload.card);
      if (Number.isFinite(payload.points)) onUpdatePoints(payload.points as number);
      onCardCreated?.(payload.card);
      await refreshHistory();
    } catch (cause) {
      setError(toUserMessage(cause, "Không tạo được hộ chiếu."));
    } finally {
      setCreating(false);
    }
  };

  const restorePending = async (record: PendingScan) => {
    try {
      const body = JSON.parse(record.body) as { imageBase64?: string; requestId?: string };
      if (!body.imageBase64) throw new Error();
      scanRequestId.current = body.requestId || record.id;
      setImage(body.imageBase64);
      resetResult();
    } catch {
      setError("Bản quét chờ không còn hợp lệ.");
    }
  };

  const restoreHistory = (record: ScanHistoryItem) => {
    scanRequestId.current = record.id;
    setImage(record.imageUrl);
    setLocalPreview(null);
    setCreatedCard(null);
    setError(null);
    setReportOpen(false);
    setReportSent(false);
    setResponse({
      scan: record.analysis,
      cardPreview: record.cardPreview,
      rewarded: false,
      rewardAmount: 0,
      points: user.points,
    });
  };

  const reportScan = async () => {
    if (!scanResult || reporting) return;
    setReporting(true);
    setError(null);
    try {
      const request = await fetch(
        "/api/material-scans/" + encodeURIComponent(scanResult.scanId) + "/report",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({ reason: reportReason, note: reportNote.trim() }),
        },
      );
      const payload = (await request.json().catch(() => null)) as { error?: string } | null;
      if (!request.ok) {
        throw new Error(errorMessage(payload, "Không gửi được góp ý."));
      }
      setReportSent(true);
      setReportOpen(false);
      setReportNote("");
    } catch (cause) {
      setError(toUserMessage(cause, "Không gửi được góp ý."));
    } finally {
      setReporting(false);
    }
  };

  const scanResult = response?.scan;
  const cardPreview = response?.cardPreview;

  const scannerContent = (
    <div
      className={
        mode === "page"
          ? "relative flex min-h-[660px] flex-col overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface)]"
          : "relative flex max-h-[calc(100dvh-1rem)] flex-col overflow-hidden"
      }
    >
      {mode === "modal" && (
        <ModalHeader
          title={t("lab.scanner.dialogTitle")}
          subtitle={t("lab.scanner.dialogSubtitle")}
          badge={<Badge tone={online ? "success" : "warning"}>{online ? t("lab.scanner.online") : t("lab.scanner.offline")}</Badge>}
          onClose={onClose}
        />
      )}

      <div className="thin-scrollbar grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[0.88fr_1.12fr]">
        <section className="border-b border-slate-200 bg-slate-950 p-5 text-white lg:border-b-0 lg:border-r lg:p-7">
          <div className="overflow-hidden rounded-[14px] border border-white/10 bg-slate-900">
            {image ? (
              <img
                src={image}
                alt="Vật thể đang được phân tích"
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 text-slate-400">
                <ImageIcon size={36} />
                <p className="max-w-xs text-center text-sm">
                  Đặt một vật thể trong khung, đủ sáng và không lẫn nhiều loại rác.
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button
              variant="ghost"
              className="border border-white/15 bg-white/5 text-white hover:bg-white/10"
              onClick={() => fileInput.current?.click()}
            >
              <Upload size={16} /> Tải ảnh
            </Button>
            <Button
              variant="ghost"
              className="border border-white/15 bg-white/5 text-white hover:bg-white/10"
              onClick={openCamera}
            >
              <Camera size={16} /> Camera
            </Button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={loadFile}
            className="hidden"
          />

          <Button className="mt-3 w-full" size="lg" onClick={scan} disabled={!image || scanning}>
            {scanning ? (
              <Loader2 className="animate-spin" size={17} />
            ) : online ? (
              <ShieldCheck size={17} />
            ) : (
              <Save size={17} />
            )}
            {scanning
              ? "Đang phân tích…"
              : online
                ? "Phân tích vật thể"
                : "Phân loại sơ bộ và lưu chờ"}
          </Button>

          <details className="mt-4 border-t border-white/10 pt-3 text-xs leading-5 text-slate-400">
            <summary className="cursor-pointer font-semibold text-slate-300">{t("lab.scanner.imageDetails")}</summary>
            <p className="mt-2">{t("lab.scanner.imageDetailsBody")}</p>
          </details>

          {pending.length > 0 && (
            <div className="mt-5 rounded-[10px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">
                {pending.length} ảnh của bạn đang chờ
              </p>
              <button
                className="mt-2 text-left text-sm text-slate-200 hover:text-white"
                onClick={() => void restorePending(pending[0])}
              >
                Mở ảnh gần nhất để xác minh <ChevronRight className="inline" size={14} />
              </button>
            </div>
          )}
        </section>

        <section className="bg-slate-50 p-5 lg:p-7">
          {error && (
            <div
              role="alert"
              className="mb-4 flex gap-3 rounded-[10px] border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <AlertTriangle className="mt-0.5 shrink-0" size={18} />
              <span>{error}</span>
            </div>
          )}

          {!scanResult && !localPreview && !scanning && (
            <div className="flex min-h-52 flex-col items-center justify-center rounded-[14px] border border-dashed border-slate-300 bg-white p-8 text-center">
              <ImageIcon size={28} className="text-slate-400" />
              <h3 className="mt-4 font-semibold text-slate-950">{t("lab.scanner.emptyTitle")}</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">{t("lab.scanner.emptyDescription")}</p>
            </div>
          )}

          {localPreview && (
            <div className="rounded-[14px] border border-amber-200 bg-amber-50 p-6">
              <div className="flex items-center gap-2 text-amber-900">
                <WifiOff size={18} />
                <h3 className="font-black">Kết quả sơ bộ, chưa xác minh</h3>
              </div>
              <p className="mt-4 text-2xl font-black text-slate-950">
                {CATEGORY_LABEL[localPreview.category] ?? localPreview.category}
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                Độ tin cậy mô hình: {Math.round(localPreview.confidence * 100)}%. Mô hình local học
                từ dữ liệu tổng hợp; kết quả này không cộng điểm và không tạo hộ chiếu.
              </p>
              <p className="mt-3 text-sm font-semibold text-amber-950">
                Ảnh đã được lưu riêng cho tài khoản này. Khi online, mở lại ảnh chờ và bấm xác minh.
              </p>
            </div>
          )}

          {scanResult && (
            <div className="space-y-4">
              <div className="rounded-[14px] border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-950">
                      {scanResult.objectName}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-cyan-700">
                      {scanResult.category ? CATEGORY_LABEL[scanResult.category] : "Chưa phân loại"}
                    </p>
                  </div>
                  <Badge tone={scanResult.eligibleForCard ? "success" : "warning"}>
                    {scanResult.eligibleForCard ? "Đủ điều kiện" : "Cần ảnh khác"}
                  </Badge>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">{scanResult.description}</p>
                {!scanResult.eligibleForCard && scanResult.verdict !== "single_waste" && (
                  <div className="mt-4 rounded-[10px] border border-amber-200 bg-amber-50 p-4 text-amber-950">
                    <p className="font-semibold">{VERDICT_GUIDANCE[scanResult.verdict].title}</p>
                    <p className="mt-1 text-sm leading-6">{VERDICT_GUIDANCE[scanResult.verdict].description}</p>
                    <Button variant="ghost" size="sm" className="mt-3 border-amber-300 bg-amber-50" onClick={() => fileInput.current?.click()}>
                      <Upload size={14} /> Chọn ảnh khác
                    </Button>
                  </div>
                )}
                {scanResult.uncertaintyReason && (
                  <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                    {scanResult.uncertaintyReason}
                  </p>
                )}
                <div className="mt-4 rounded-[10px] bg-slate-100 p-4 text-sm leading-6 text-slate-700">
                  <strong>Cách xử lý:</strong> {scanResult.disposalInstructions}
                </div>
                {response?.rewarded && (
                  <p className="mt-3 text-sm font-bold text-emerald-700">
                    +{response.rewardAmount} điểm cho lần nhận diện hợp lệ.
                  </p>
                )}
                <div className="mt-4 border-t border-slate-100 pt-4">
                  {reportSent ? (
                    <p className="text-sm font-semibold text-emerald-700">
                      Cảm ơn bạn. Kết quả đã được gửi để xem xét.
                    </p>
                  ) : reportOpen ? (
                    <div className="space-y-3">
                      <select
                        value={reportReason}
                        onChange={(event) => setReportReason(event.target.value)}
                        className="min-h-11 w-full rounded-[10px] border border-slate-200 bg-white px-3 text-sm"
                        aria-label="Lý do báo kết quả sai"
                      >
                        <option value="classification_incorrect">Nhận diện sai vật thể hoặc vật liệu</option>
                        <option value="properties_incorrect">Thuộc tính chưa chính xác</option>
                        <option value="disposal_incorrect">Hướng xử lý chưa phù hợp</option>
                      </select>
                      <textarea
                        value={reportNote}
                        onChange={(event) => setReportNote(event.target.value.slice(0, 1000))}
                        placeholder="Mô tả thêm để người duyệt có thể kiểm tra"
                        rows={3}
                        className="w-full resize-y rounded-[10px] border border-slate-200 p-3 text-sm outline-none focus:border-emerald-600"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => void reportScan()} disabled={reporting}>
                          {reporting && <Loader2 className="animate-spin" size={14} />}
                          Gửi góp ý
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setReportOpen(false)}>
                          Hủy
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setReportOpen(true)}
                      className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
                    >
                      <Flag size={15} /> Báo kết quả chưa chính xác
                    </button>
                  )}
                </div>
              </div>

              {scanResult.properties.length > 0 && (
                <div className="rounded-[14px] border border-slate-200 bg-white p-5">
                  <h4 className="font-black text-slate-950">Thuộc tính và căn cứ</h4>
                  <div className="mt-4 space-y-3">
                    {scanResult.properties.map((property) => (
                      <div
                        key={property.id}
                        className="grid gap-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0 sm:grid-cols-[1fr_9rem]"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900">{property.label}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {property.evidence}
                          </p>
                        </div>
                        <span className="self-start rounded-full bg-slate-100 px-3 py-1 text-center text-[11px] font-bold text-slate-600">
                          {SOURCE_LABEL[property.source]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cardPreview && (
                <div className="overflow-hidden rounded-[14px] border border-slate-800 bg-slate-950 text-white">
                  <div className="border-b border-white/10 p-5">
                    <p className="text-xs font-semibold text-cyan-300">{t("lab.scanner.cardPreview")}</p>
                    <h4 className="mt-2 text-xl font-semibold">{cardPreview.objectName}</h4>
                  </div>
                  <div className="grid gap-3 p-5 sm:grid-cols-2">
                    {[
                      { label: "Nội tại", ability: cardPreview.passive },
                      { label: "Chủ động", ability: cardPreview.active },
                    ].map(({ label, ability }) => (
                      <div
                        key={label}
                        className="rounded-[10px] border border-white/10 bg-white/5 p-4"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                          {label}
                        </p>
                        <p className="mt-2 font-black">{ability.name}</p>
                        <p className="mt-2 text-xs leading-5 text-slate-300">
                          {ability.description}
                        </p>
                        <p className="mt-3 border-t border-white/10 pt-3 text-xs text-slate-400">
                          <strong className="text-slate-200">Vì sao?</strong> {ability.rule}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs text-slate-400">{t("lab.scanner.price")}</p>
                      <p className="text-xl font-black">{cardPreview.cost} điểm</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {t("lab.scanner.balanceAfter", { points: Math.max(0, user.points - cardPreview.cost).toLocaleString("vi-VN") })}
                      </p>
                    </div>
                    <Button
                      onClick={createCard}
                      disabled={creating || !!createdCard || user.points < cardPreview.cost}
                    >
                      {creating ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : createdCard ? (
                        <Check size={16} />
                      ) : null}
                      {createdCard
                        ? "Đã thêm vào bộ sưu tập"
                        : user.points < cardPreview.cost
                          ? "Không đủ điểm"
                          : "Tạo hộ chiếu"}
                    </Button>
                  </div>
                  <details className="border-t border-white/10 px-5 py-4 text-xs text-slate-400">
                    <summary className="cursor-pointer font-semibold text-slate-300">{t("lab.scanner.technicalDetails")}</summary>
                    <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div><dt>{t("lab.scanner.ruleset")}</dt><dd className="font-telemetry mt-1 text-slate-200">{cardPreview.rulesetVersion}</dd></div>
                      <div><dt>{t("lab.scanner.scanId")}</dt><dd className="font-telemetry mt-1 break-all text-slate-200">{scanResult.scanId}</dd></div>
                    </dl>
                  </details>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 rounded-[14px] border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <History size={17} className="text-emerald-700" />
                  <h3 className="font-semibold text-slate-950">Nhật ký quét</h3>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Mở lại kết quả để xem chi tiết hoặc tiếp tục tạo hộ chiếu.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => void refreshHistory()}>
                Làm mới
              </Button>
            </div>
            {historyError ? (
              <div className="mt-4 rounded-[10px] border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <p>{historyError}</p>
                <button
                  type="button"
                  className="mt-2 font-semibold underline"
                  onClick={() => void refreshHistory()}
                >
                  Thử lại
                </button>
              </div>
            ) : scanHistory.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Chưa có lần quét nào.</p>
            ) : (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {scanHistory.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => restoreHistory(record)}
                    className="flex min-h-16 items-center gap-3 rounded-[10px] border border-slate-200 p-2.5 text-left transition-colors hover:border-emerald-500"
                  >
                    {record.imageUrl ? (
                      <img
                        src={record.imageUrl}
                        alt=""
                        className="h-12 w-12 rounded-md bg-slate-100 object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-100 text-slate-400">
                        <ImageIcon size={18} />
                      </div>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">
                        {record.analysis.objectName}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {new Date(record.createdAt).toLocaleDateString("vi-VN")}
                        {record.cardId ? " · Đã tạo hộ chiếu" : " · Chưa tạo hộ chiếu"}
                      </span>
                    </span>
                    <ChevronRight size={15} className="shrink-0 text-slate-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {cameraOpen && (
        <div className="absolute inset-0 z-50 flex flex-col bg-black">
          <button
            onClick={closeCamera}
            className="absolute right-4 top-4 z-10 rounded-full bg-black/60 p-3 text-white"
            aria-label="Đóng camera"
          >
            <X />
          </button>
          <video ref={video} autoPlay muted playsInline className="min-h-0 flex-1 object-contain">
            <track
              kind="captions"
              src="data:text/vtt,WEBVTT"
              srcLang="vi"
              label="Không có âm thanh"
            />
          </video>
          <div className="p-5">
            <Button onClick={() => void capture()} className="mx-auto w-full max-w-sm">
              <Camera size={17} /> Chụp ảnh
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  if (mode === "page") return scannerContent;

  return (
    <ModalShell
      onClose={onClose}
      title="Quét vật thể"
      className="max-w-6xl overflow-hidden p-0"
    >
      {scannerContent}
    </ModalShell>
  );
}
