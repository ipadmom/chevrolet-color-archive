import type { ArchiveModel } from "./archive-data";

export type ModelThumbnailPaint = {
  colorId?: string;
  swatch: string;
  year?: string;
};

export type ModelThumbnailPalette = {
  colors: {
    colorId: string;
    swatch: string;
  }[];
  year?: string;
};

const fallbackPaint: ModelThumbnailPaint = {
  swatch: "var(--ia-gold)",
};

function stableIndex(seed: string, length: number) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % length;
}

export function latestThumbnailPalette(
  models: ArchiveModel[],
): ModelThumbnailPalette {
  let latestYear = Number.NEGATIVE_INFINITY;
  const colorsByYear = new Map<
    number,
    Map<string, { colorId: string; swatch: string }>
  >();

  for (const model of models) {
    for (const generation of model.generations) {
      for (const color of generation.colors) {
        for (const [year, availability] of Object.entries(color.availability)) {
          const numericYear = Number(year);
          if (
            !availability ||
            !Number.isInteger(numericYear) ||
            !generation.years.includes(year)
          ) {
            continue;
          }
          const candidates =
            colorsByYear.get(numericYear) ??
            new Map<string, { colorId: string; swatch: string }>();
          const existing = candidates.get(color.swatch);
          if (!existing || color.id.localeCompare(existing.colorId) < 0) {
            candidates.set(color.swatch, {
              colorId: color.id,
              swatch: color.swatch,
            });
          }
          colorsByYear.set(numericYear, candidates);
          latestYear = Math.max(latestYear, numericYear);
        }
      }
    }
  }

  if (!Number.isFinite(latestYear)) return { colors: [] };

  const candidates = [...(colorsByYear.get(latestYear)?.values() ?? [])].sort(
    (left, right) =>
      left.swatch.localeCompare(right.swatch) ||
      left.colorId.localeCompare(right.colorId),
  );
  return {
    colors: candidates,
    year: String(latestYear),
  };
}

export function modelThumbnailPaint(
  model: ArchiveModel,
  archiveFallback?: ModelThumbnailPalette,
): ModelThumbnailPaint {
  const modelPalette = latestThumbnailPalette([model]);
  const palette = modelPalette.colors.length ? modelPalette : archiveFallback;
  if (!palette?.colors.length || !palette.year) return fallbackPaint;

  const selected =
    palette.colors[
      stableIndex(`${model.id}:${palette.year}`, palette.colors.length)
    ];
  return {
    colorId: selected.colorId,
    swatch: selected.swatch,
    year: palette.year,
  };
}
