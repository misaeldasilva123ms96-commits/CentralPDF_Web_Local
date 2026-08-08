import { decode as jpegDecode, encode as jpegEncode } from 'jpeg-js';

export type CompressionQuality = 'high' | 'balanced' | 'auto';

export const QUALITY_RATINGS: Record<CompressionQuality, number> = {
  high: 0.8,
  balanced: 0.6,
  auto: 0.45
};

export interface RecompressOptions {
  /** Qualidade JPEG de destino (0-1). */
  quality: number;
  /** Redimensiona para que a maior dimensão não ultrapasse este valor. */
  maxDimension?: number;
  /** Ignora imagens menores que este tamanho em bytes. */
  minBytes?: number;
}

export interface RecompressSummary {
  recompressed: boolean;
  skippedBySize: boolean;
  bytesIn: number;
  bytesOut: number;
  /** Stream JPEG recodificado (presente quando recompressed === true). */
  bytes?: Uint8Array;
  /** Dimensões do JPEG de saída (após recodificação/redimensionamento). */
  width?: number;
  height?: number;
}

/**
 * Converts a quality value to a supported compression quality preset.
 *
 * @param value - The requested compression quality
 * @returns The supported quality value, or `balanced` for unsupported input
 */
export function toCompressionQuality(value: string): CompressionQuality {
  return value === 'high' || value === 'balanced' || value === 'auto' ? value : 'balanced';
}

/**
 * Recompresses a JPEG, optionally resizing it to fit within a maximum dimension.
 *
 * @param jpegBytes - The source JPEG bytes
 * @param options - Recompression quality and size constraints
 * @returns Recompression status, input and output sizes, and output dimensions; includes output bytes when recompression occurs
 */
export function recompressJpeg(
  jpegBytes: Uint8Array,
  options: RecompressOptions
): RecompressSummary {
  if (options.minBytes !== undefined && jpegBytes.byteLength < options.minBytes) {
    return {
      recompressed: false,
      skippedBySize: true,
      bytesIn: jpegBytes.byteLength,
      bytesOut: 0
    };
  }

  const decoded = jpegDecode(jpegBytes, { useTArray: true });
  const channels = decoded.data.byteLength / (decoded.width * decoded.height) >= 4 ? 4 : 3;

  let width = decoded.width;
  let height = decoded.height;
  const divisor = Math.max(1, Math.max(width, height) / (options.maxDimension ?? Infinity));

  if (divisor > 1) {
    width = Math.max(1, Math.round(width / divisor));
    height = Math.max(1, Math.round(height / divisor));
  }

  const resized = new Uint8Array(width * height * channels);
  if (width === decoded.width && height === decoded.height) {
    resized.set(decoded.data.subarray(0, resized.length));
  } else {
    // Redimensionamento por vizinho mais próximo (rápido, sem canvas).
    for (let y = 0; y < height; y += 1) {
      const srcY = Math.floor((y / height) * decoded.height);
      for (let x = 0; x < width; x += 1) {
        const srcX = Math.floor((x / width) * decoded.width);
        const s = (srcY * decoded.width + srcX) * channels;
        const d = (y * width + x) * channels;
        for (let c = 0; c < channels; c += 1) resized[d + c] = decoded.data[s + c];
      }
    }
  }

  const encoded = jpegEncode({ width, height, data: resized }, options.quality * 100);
  const outBytes = Uint8Array.from(encoded.data);

  return {
    recompressed: true,
    skippedBySize: false,
    bytesIn: jpegBytes.byteLength,
    bytesOut: outBytes.byteLength,
    bytes: outBytes,
    width,
    height
  };
}