/**
 * Shared type for model manifests — kept in a dedicated file so the
 * client and server modules don't form an import cycle.
 */
export type ModelFramework = "onnx" | "tfjs" | "tflite";