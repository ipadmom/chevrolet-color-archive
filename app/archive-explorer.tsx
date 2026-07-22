"use client";
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import specialtyColorSourceData from "../data/sources/specialty-color-source-candidates.json";
import {
  defaultColorId,
  defaultModelId,
  defaultYear,
  models,
} from "./archive-data";
import type {
  ArchiveModel,
  Generation,
  YearSource,
  YearSourceCitation,
} from "./archive-data";
import { VehicleProfileSvg } from "./vehicle-profile-svg";
import {
  buildArchiveSearchRecords,
  buildArchiveMatrix,
  buildArchiveTimelineSegments,
  buildArchiveYearIndexBands,
  compileSafeArchivePattern,
  nearbyYearThumbnails,
  recordMatchesPattern,
  resolveStructuredColorChoice,
  structuredColorChoiceLabel,
} from "./archive-search";
import type {
  ArchiveMatrixColor,
  ArchiveSearchRecord,
  ArchiveTimelineSegment,
} from "./archive-search";
import {
  archivedColorPhotos,
  archivedModelYearPhotos,
  archivedPhotoStats,
  isExactYearPhoto,
} from "./release-photo-data";

type ArchiveView = "models" | "years" | "archive";
type ArchiveSearchMode = "structured" | "all-fields";

type ApiPhoto = {
  id: number;
  colorId: string;
  year: string;
  credit: string;
  license: string;
  status: string;
  imageUrl: string;
  fileName: string;
};

type ApiPhotoPage = {
  items: ApiPhoto[];
  nextCursor: number | null;
};

type StagedPhoto = {
  optionId: string;
  receipt: string;
  receiptExpiresAt: string;
  previewUrl?: string;
  model: string;
  year: string;
  colorId: string;
  fileName: string;
  credit: string;
  license: string;
  status: string;
};

type UploadReceipt = {
  receipt?: string;
  receiptExpiresAt?: string;
  alreadyPublished?: boolean;
  imageUrl?: string;
  candidate?: {
    fileName: string;
    credit: string;
    license: string;
    status: string;
  };
  error?: string;
};

type SelectionReceipt = {
  recorded?: boolean;
  queued?: boolean;
  selectionId?: number;
  created?: boolean;
  archivedCandidateCount?: number;
  uploadCandidateCount?: number;
  error?: string;
};

const apiBase = (process.env.NEXT_PUBLIC_ARCHIVE_API_BASE ?? "").replace(
  /\/$/,
  "",
);
const stagedStorageKey = "chevrolet-color-archive:staged-receipts:v1";
const receiptPattern = /^[A-Za-z0-9_-]{43}$/;
const publishedGenerations = models.flatMap((model) =>
  model.generations.map((generation) => ({ model, generation })),
);
const archiveListingCount = publishedGenerations.reduce(
  (total, { generation }) => total + generation.listingCount,
  0,
);
const archiveModelYearCount = models.reduce(
  (total, model) =>
    total + new Set(model.generations.flatMap((generation) => generation.years)).size,
  0,
);
const archiveSearchRecords = buildArchiveSearchRecords(
  models,
  specialtyColorSourceData.search_leads,
);
const archiveSearchYears = [
  ...new Set(
    models.flatMap((item) =>
      item.generations.flatMap((generation) => generation.years),
    ),
  ),
].sort((left, right) => Number(right) - Number(left));

function structuredColorValue(modelId: string, year: string, colorId: string) {
  const record = archiveSearchRecords.find(
    (candidate) =>
      candidate.recordKind === "availability" &&
      candidate.modelId === modelId &&
      candidate.year === year &&
      candidate.colorId === colorId,
  );
  return record ? structuredColorChoiceLabel(record) : "";
}

function apiUrl(path: string) {
  return `${apiBase}${path}`;
}

function shortYear(year: string) {
  return year.slice(-2);
}

function loadStagedReceipts(): StagedPhoto[] {
  try {
    const parsed = JSON.parse(
      window.sessionStorage.getItem(stagedStorageKey) ?? "[]",
    );
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed
      .filter(
        (entry) =>
          entry &&
          typeof entry === "object" &&
          typeof entry.optionId === "string" &&
          receiptPattern.test(entry.receipt) &&
          typeof entry.receiptExpiresAt === "string" &&
          Date.parse(entry.receiptExpiresAt) > now &&
          typeof entry.model === "string" &&
          typeof entry.year === "string" &&
          typeof entry.colorId === "string" &&
          typeof entry.fileName === "string" &&
          typeof entry.credit === "string" &&
          typeof entry.license === "string" &&
          typeof entry.status === "string",
      )
      .slice(0, 100)
      .map((entry) => ({
        optionId: entry.optionId,
        receipt: entry.receipt,
        receiptExpiresAt: entry.receiptExpiresAt,
        model: entry.model,
        year: entry.year,
        colorId: entry.colorId,
        fileName: entry.fileName,
        credit: entry.credit,
        license: entry.license,
        status: entry.status,
      }));
  } catch {
    return [];
  }
}

function sourceCitations(source: YearSource | undefined): YearSourceCitation[] {
  return source ? [source, ...(source.supportingSources ?? [])] : [];
}

function rangeLabel(segment: ArchiveTimelineSegment) {
  const first = shortYear(segment.years[0]);
  const last = shortYear(segment.years.at(-1) ?? segment.years[0]);
  return first === last ? first : `${first}-${last}`;
}

function modelAccent(model: ArchiveModel) {
  const firstColor = model.generations[0]?.colors[0];
  return firstColor?.swatch ?? "#737f95";
}

function modelProfileYear(model: ArchiveModel) {
  return model.generations.at(-1)?.years.at(-1);
}

function modelHasAuditedRows(model: ArchiveModel) {
  return model.generations.some((generation) => generation.listingCount > 0);
}

function generationAccent(generation: Generation, year: string) {
  return (
    generation.colors.find((color) => color.availability[year])?.swatch ??
    "#737f95"
  );
}

function generationsForYear(model: ArchiveModel, year: string) {
  return model.generations.filter((generation) =>
    generation.years.includes(year),
  );
}

function generationForRecord(
  model: ArchiveModel,
  year: string,
  preferredColorId?: string | null,
) {
  const candidates = generationsForYear(model, year);
  return (
    candidates.find((generation) =>
      generation.colors.some(
        (color) =>
          color.id === preferredColorId && Boolean(color.availability[year]),
      ),
    ) ??
    candidates.find(
      (generation) =>
        generation.sources[year]?.evidenceClass !== "specialty_palette_subset",
    ) ??
    candidates[0]
  );
}

function searchChoice(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function ArchiveExplorer() {
  const [view, setView] = useState<ArchiveView>("models");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modelId, setModelId] = useState(defaultModelId);
  const [year, setYear] = useState(defaultYear);
  const [colorId, setColorId] = useState(defaultColorId);
  const [showAll, setShowAll] = useState(true);
  const [apiPhotos, setApiPhotos] = useState<ApiPhoto[]>([]);
  const [stagedPhotos, setStagedPhotos] = useState<StagedPhoto[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [photoMessage, setPhotoMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [queueing, setQueueing] = useState(false);
  const [stagedStorageLoaded, setStagedStorageLoaded] = useState(false);
  const [searchMode, setSearchMode] =
    useState<ArchiveSearchMode>("structured");
  const [structuredYear, setStructuredYear] = useState(defaultYear);
  const [structuredModel, setStructuredModel] = useState("Camaro");
  const [structuredColor, setStructuredColor] = useState(
    structuredColorValue(defaultModelId, defaultYear, defaultColorId),
  );
  const [structuredSearchError, setStructuredSearchError] = useState("");
  const [allFieldQuery, setAllFieldQuery] = useState("");
  const previewUrls = useRef(new Set<string>());

  const model = models.find((item) => item.id === modelId) ?? models[0];
  const generation = generationForRecord(model, year, colorId) ?? model.generations[0];
  const yearIndexGenerations = buildArchiveYearIndexBands(model);
  const generationColors = generation?.colors ?? [];
  const matrix = buildArchiveMatrix(model, year);
  const years = matrix.years;
  const colors = matrix.colors;
  const visibleColors = showAll
    ? colors
    : colors.filter((color) => color.availability[year]);
  const selectedColor =
    generationColors.find(
      (color) => color.id === colorId && Boolean(color.availability[year]),
    ) ?? generationColors.find((color) => color.availability[year]);
  const selectedMatrixColor = selectedColor
    ? colors.find(
        (color) => color.sourceColorIdsByYear[year] === selectedColor.id,
      )
    : undefined;
  const yearSource = generation?.sources[year];
  const selectedAvailability = selectedColor?.availability[year];
  const selectedSourceIds = new Set(selectedAvailability?.sourceIds ?? []);
  const selectedClaimSources = sourceCitations(yearSource).filter(
    (source) =>
      selectedSourceIds.size === 0 ||
      (source.sourceId ? selectedSourceIds.has(source.sourceId) : false),
  );
  const yearSourceIsIncompleteSubset =
    yearSource?.evidenceClass === "qualified_palette_union" ||
    yearSource?.evidenceClass === "specialty_palette_subset" ||
    yearSource?.evidenceClass === "qualified_exact_program_palette";
  const yearSourceIsReviewedNoChart = Boolean(
    yearSource && generation?.listingCount === 0,
  );
  const yearAccuracyNote = (() => {
    if (yearSourceIsReviewedNoChart) {
      return "THE COMPLETE OFFICIAL KIT WAS REVIEWED, BUT NO EXTERIOR-COLOR TABLE WAS PRESENT. NO COLORS ARE INFERRED FROM ADJACENT YEARS OR RELATED VEHICLES.";
    }
    if (yearSource?.evidenceClass === "specialty_palette_subset") {
      return "THIS IS AN EXACT, REVIEWED SPECIALTY-PAINT SUBSET FOR THE CITED MODEL VARIANT. IT IS NOT THE COMPLETE MODEL-YEAR EXTERIOR-COLOR PALETTE.";
    }
    if (yearSource?.evidenceClass === "qualified_exact_program_palette") {
      return "THIS IS AN EXACT, REVIEWED PROGRAM-SPECIFIC PALETTE FROM A MANUFACTURER DOCUMENT CARRIED BY THE CITED ARCHIVAL HOST. IT IS NOT AN UNQUALIFIED ALL-TAHOE PALETTE.";
    }
    if (yearSource?.evidenceClass === "qualified_palette_union") {
      return "THIS IS A REVIEWED OFFICIAL PALETTE UNION. THE ONLINE ORDER GUIDE REMAINS CONTROLLING FOR CODES, TRIM RESTRICTIONS, AND COMPLETENESS.";
    }
    return yearSource
      ? "ALL PUBLISHED AVAILABILITY CLAIMS CITE REVIEWED SOURCE CHARTS. THE SELECTED YEAR IS SHADED. STRIPED BARS CARRY A MODEL, PACKAGE, OR SOURCE QUALIFICATION."
      : "THIS MODEL YEAR IS CATALOGUED, BUT ITS COLOR CHART IS NOT YET VERIFIED. NO AVAILABILITY IS INFERRED FROM ADJACENT YEARS.";
  })();
  const staticPhotos = selectedColor
    ? archivedColorPhotos(model.id, year, selectedColor.id)
    : [];
  const visibleStagedPhotos = stagedPhotos.filter(
    (photo) =>
      photo.model === model.id &&
      photo.year === year &&
      photo.colorId === selectedColor?.id,
  );
  const selectedArchivedPhotoCount = staticPhotos.filter((photo) =>
    selectedPhotos.includes(`archive-${photo.id}`),
  ).length;
  const selectedStagedPhotoCount = visibleStagedPhotos.filter((photo) =>
    selectedPhotos.includes(photo.optionId),
  ).length;
  const selectedSubmissionCount =
    selectedArchivedPhotoCount + selectedStagedPhotoCount;
  const relevantBandYears = matrix.years;
  const displayedYearThumbnails = nearbyYearThumbnails(
    relevantBandYears,
    year,
  );
  const modelReferencePhotos = archivedModelYearPhotos(model.id, year);
  const selectedYearIndex = relevantBandYears.indexOf(year);
  const previousYear = relevantBandYears[selectedYearIndex - 1];
  const nextYear = relevantBandYears[selectedYearIndex + 1];
  const structuredModelOptions = useMemo(
    () =>
      models.filter((item) =>
        item.generations.some((itemGeneration) =>
          itemGeneration.years.includes(structuredYear.trim()),
        ),
      ),
    [structuredYear],
  );
  const structuredModelMatch = structuredModelOptions.find(
    (item) =>
      searchChoice(item.name) === searchChoice(structuredModel) ||
      searchChoice(item.id) === searchChoice(structuredModel),
  );
  const structuredColorOptions = useMemo(() => {
    if (!structuredModelMatch) return [];
    const unique = new Map<string, ArchiveSearchRecord>();
    for (const record of archiveSearchRecords) {
      if (
        record.modelId === structuredModelMatch.id &&
        record.year === structuredYear.trim() &&
        record.colorId
      ) {
        unique.set(record.colorId, record);
      }
    }
    return [...unique.values()].sort((left, right) =>
      (left.colorName ?? "").localeCompare(right.colorName ?? ""),
    );
  }, [structuredModelMatch, structuredYear]);
  const allFieldSearch = useMemo(() => {
    const compiled = compileSafeArchivePattern(allFieldQuery);
    if (!compiled.regex || compiled.error) {
      return {
        error: compiled.error,
        records: [] as ArchiveSearchRecord[],
        total: 0,
      };
    }
    const matches = archiveSearchRecords.filter((record) =>
      recordMatchesPattern(record, compiled.regex!),
    );
    return {
      error: null,
      records: matches.slice(0, 80),
      total: matches.length,
    };
  }, [allFieldQuery]);

  useEffect(() => {
    const routeTimer = window.setTimeout(() => {
      const params = new URLSearchParams(
        window.location.hash.replace(/^#/, ""),
      );
      const requestedModel = models.find(
        (item) => item.id === params.get("model"),
      );
      if (!requestedModel) return;
      setModelId(requestedModel.id);
      setStructuredModel(requestedModel.name);

      const requestedYear = params.get("year");
      const requestedColorId = params.get("color");
      const requestedGeneration = requestedYear
        ? generationForRecord(requestedModel, requestedYear, requestedColorId)
        : undefined;
      if (!requestedYear || !requestedGeneration) {
        setView("years");
        return;
      }

      setYear(requestedYear);
      setStructuredYear(requestedYear);
      const requestedColor = requestedGeneration.colors.find(
        (color) => color.id === requestedColorId,
      );
      const firstListed = requestedGeneration.colors.find(
        (color) => color.availability[requestedYear],
      );
      if (requestedColor?.availability[requestedYear]) {
        setColorId(requestedColor.id);
        setStructuredColor(
          structuredColorValue(
            requestedModel.id,
            requestedYear,
            requestedColor.id,
          ),
        );
      } else if (firstListed) {
        setColorId(firstListed.id);
        setStructuredColor(
          structuredColorValue(requestedModel.id, requestedYear, firstListed.id),
        );
      } else {
        setStructuredColor("");
      }
      setView("archive");
    }, 0);
    return () => window.clearTimeout(routeTimer);
  }, []);

  useEffect(() => {
    if (
      view !== "archive" ||
      !selectedColor ||
      !selectedColor.availability[year]
    ) {
      const clearTimer = window.setTimeout(() => setApiPhotos([]), 0);
      return () => window.clearTimeout(clearTimer);
    }
    const controller = new AbortController();
    fetch(
      apiUrl(
        `/api/photos?model=${encodeURIComponent(model.id)}&year=${encodeURIComponent(year)}&color_id=${encodeURIComponent(selectedColor.id)}`,
      ),
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) return { items: [], nextCursor: null };
        return (await response.json()) as ApiPhotoPage;
      })
      .then((page) => setApiPhotos(page.items))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setApiPhotos([]);
        }
      });
    return () => controller.abort();
  }, [model.id, selectedColor, view, year]);

  useEffect(
    () => () => {
      for (const url of previewUrls.current) URL.revokeObjectURL(url);
      previewUrls.current.clear();
    },
    [],
  );

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      setStagedPhotos(loadStagedReceipts());
      setStagedStorageLoaded(true);
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, []);

  useEffect(() => {
    if (!stagedStorageLoaded) return;
    const persisted = stagedPhotos.map((photo) => ({
      optionId: photo.optionId,
      receipt: photo.receipt,
      receiptExpiresAt: photo.receiptExpiresAt,
      model: photo.model,
      year: photo.year,
      colorId: photo.colorId,
      fileName: photo.fileName,
      credit: photo.credit,
      license: photo.license,
      status: photo.status,
    }));
    if (persisted.length) {
      window.sessionStorage.setItem(stagedStorageKey, JSON.stringify(persisted));
    } else {
      window.sessionStorage.removeItem(stagedStorageKey);
    }
  }, [stagedPhotos, stagedStorageLoaded]);

  function clearLocalPhotoState() {
    setApiPhotos([]);
    setSelectedPhotos([]);
    setPhotoMessage("");
  }

  function openArchiveRecord(
    nextModelId: string,
    nextYear: string,
    nextColorId: string | null = null,
  ) {
    const nextModel = models.find((item) => item.id === nextModelId);
    const nextGeneration = nextModel
      ? generationForRecord(nextModel, nextYear, nextColorId)
      : undefined;
    if (!nextModel || !nextGeneration) return;
    const requestedColor = nextGeneration.colors.find(
      (color) =>
        color.id === nextColorId && Boolean(color.availability[nextYear]),
    );
    const firstListed = nextGeneration.colors.find(
      (color) => color.availability[nextYear],
    );
    const nextColor = requestedColor ?? firstListed;

    setModelId(nextModel.id);
    setYear(nextYear);
    setColorId(nextColor?.id ?? "");
    setView("archive");
    setSidebarOpen(false);
    setShowAll(true);
    setStructuredYear(nextYear);
    setStructuredModel(nextModel.name);
    setStructuredColor(
      nextColor ? structuredColorValue(nextModel.id, nextYear, nextColor.id) : "",
    );
    setStructuredSearchError("");
    clearLocalPhotoState();

    const params = new URLSearchParams({ model: nextModel.id, year: nextYear });
    if (nextColor) params.set("color", nextColor.id);
    window.history.replaceState(null, "", `#${params.toString()}`);
    window.setTimeout(
      () => document.querySelector(".archive-title")?.scrollIntoView(),
      0,
    );
  }

  function submitStructuredSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestedYear = structuredYear.trim();
    if (!archiveSearchYears.includes(requestedYear)) {
      setStructuredSearchError("Choose a catalogued four-digit model year.");
      return;
    }
    if (!structuredModelMatch) {
      setStructuredSearchError("Choose a Chevrolet model offered in that model year.");
      return;
    }

    let requestedColor: ArchiveSearchRecord | undefined;
    if (structuredColor.trim()) {
      const resolution = resolveStructuredColorChoice(
        structuredColorOptions,
        structuredColor,
      );
      if (resolution.error || !resolution.record) {
        setStructuredSearchError(resolution.error ?? "Choose a verified color suggestion.");
        return;
      }
      requestedColor = resolution.record;
    }

    openArchiveRecord(
      structuredModelMatch.id,
      requestedYear,
      requestedColor?.colorId ?? null,
    );
  }

  function chooseModel(nextModelId: string) {
    setModelId(nextModelId);
    setView("years");
    setSidebarOpen(false);
    setShowAll(true);
    clearLocalPhotoState();
    const next = models.find((item) => item.id === nextModelId);
    if (next?.generations[0]) {
      const nextYear = next.generations[0].years.at(-1) ?? "";
      const nextColor = next.generations[0].colors.find(
        (color) => color.availability[nextYear],
      );
      setYear(nextYear);
      setStructuredYear(nextYear);
      setStructuredModel(next.name);
      if (nextColor) {
        setColorId(nextColor.id);
        setStructuredColor(
          structuredColorValue(next.id, nextYear, nextColor.id),
        );
      } else {
        setColorId("");
        setStructuredColor("");
      }
    }
    setStructuredSearchError("");
    window.history.replaceState(null, "", `#model=${nextModelId}`);
  }

  function chooseYear(nextYear: string) {
    const nextSourceColorId = selectedMatrixColor?.sourceColorIdsByYear[nextYear];
    const nextGeneration = generationForRecord(
      model,
      nextYear,
      nextSourceColorId,
    );
    const nextColors = generationsForYear(model, nextYear).flatMap(
      (item) => item.colors,
    );
    const stillAvailable = nextColors.find(
      (color) => color.id === nextSourceColorId && color.availability[nextYear],
    );
    const firstListed = nextGeneration?.colors.find(
      (color) => color.availability[nextYear],
    );
    const nextColor = stillAvailable ?? firstListed;

    setYear(nextYear);
    setView("archive");
    setSidebarOpen(false);
    setShowAll(true);
    clearLocalPhotoState();
    setStructuredYear(nextYear);
    setStructuredModel(model.name);
    if (nextColor) {
      setColorId(nextColor.id);
      setStructuredColor(
        structuredColorValue(model.id, nextYear, nextColor.id),
      );
    } else {
      setColorId("");
      setStructuredColor("");
    }
    setStructuredSearchError("");

    const params = new URLSearchParams({
      model: model.id,
      year: nextYear,
    });
    if (nextColor) params.set("color", nextColor.id);
    window.history.replaceState(null, "", `#${params.toString()}`);
  }

  function chooseColor(nextColorId: string) {
    setColorId(nextColorId);
    const nextColor = colors.find((color) => color.id === nextColorId);
    if (nextColor?.availability[year]) {
      setStructuredColor(
        structuredColorValue(model.id, year, nextColorId),
      );
    }
    setStructuredSearchError("");
    clearLocalPhotoState();
    const params = new URLSearchParams({
      color: nextColorId,
      model: model.id,
      year,
    });
    window.history.replaceState(null, "", `#${params.toString()}`);
  }

  function chooseMatrixColor(
    matrixColor: ArchiveMatrixColor,
    preferredYear = year,
  ) {
    const targetYear = matrixColor.sourceColorIdsByYear[preferredYear]
      ? preferredYear
      : years.find((itemYear) => matrixColor.sourceColorIdsByYear[itemYear]);
    if (!targetYear) return;
    const targetColorId = matrixColor.sourceColorIdsByYear[targetYear];
    if (targetYear === year) {
      chooseColor(targetColorId);
      return;
    }
    openArchiveRecord(model.id, targetYear, targetColorId);
  }

  function showModelIndex() {
    setView("models");
    setSidebarOpen(false);
    window.history.replaceState(null, "", "#models");
  }

  function showYearIndex() {
    setView("years");
    setSidebarOpen(false);
    window.history.replaceState(null, "", `#model=${model.id}`);
  }

  function openPhotoQueue() {
    const photo = archivedColorPhotos("camaro", "1969", "hugger-orange")[0];
    if (!photo) {
      chooseModel("camaro");
      return;
    }

    setModelId("camaro");
    setYear("1969");
    setColorId("hugger-orange");
    setView("archive");
    setSidebarOpen(false);
    setShowAll(true);
    setStructuredYear("1969");
    setStructuredModel("Camaro");
    setStructuredColor(structuredColorValue("camaro", "1969", "hugger-orange"));
    clearLocalPhotoState();
    const params = new URLSearchParams({
      color: "hugger-orange",
      model: "camaro",
      year: "1969",
    });
    window.history.replaceState(null, "", `#${params.toString()}`);
    window.setTimeout(
      () => document.querySelector(".photo-box")?.scrollIntoView(),
      0,
    );
  }

  function togglePhoto(id: string) {
    setSelectedPhotos((current) =>
      current.includes(id)
        ? current.filter((candidateId) => candidateId !== id)
        : [...current, id],
    );
  }

  async function queueSelection() {
    if (!selectedColor) return;
    const selectedArchived = staticPhotos.filter((photo) =>
      selectedPhotos.includes(`archive-${photo.id}`),
    );
    const selectedStaged = stagedPhotos.filter(
      (photo) =>
        photo.model === model.id &&
        photo.year === year &&
        photo.colorId === selectedColor.id &&
        selectedPhotos.includes(photo.optionId),
    );
    const expiredStaged = selectedStaged.filter(
      (photo) => Date.parse(photo.receiptExpiresAt) <= Date.now(),
    );
    if (expiredStaged.length) {
      const expiredOptions = new Set(
        expiredStaged.map((photo) => photo.optionId),
      );
      for (const photo of expiredStaged) {
        if (photo.previewUrl) {
          URL.revokeObjectURL(photo.previewUrl);
          previewUrls.current.delete(photo.previewUrl);
        }
      }
      setStagedPhotos((current) =>
        current.filter((photo) => !expiredOptions.has(photo.optionId)),
      );
      setSelectedPhotos((current) =>
        current.filter((id) => !expiredOptions.has(id)),
      );
      setPhotoMessage(
        "A staged receipt expired. Upload the same file again to issue a fresh one-use receipt.",
      );
      return;
    }

    const receipts = selectedStaged.map((photo) => photo.receipt);
    const candidateIds = selectedArchived.map((photo) => photo.id);
    if (!candidateIds.length && !receipts.length) {
      setPhotoMessage("Choose at least one photo or staged upload first.");
      return;
    }

    setQueueing(true);
    try {
      const response = await fetch(apiUrl("/api/selections"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: model.id,
          year,
          colorId: selectedColor.id,
          candidateIds,
          receipts,
        }),
      });
      const payload = (await response.json()) as SelectionReceipt;
      if (!response.ok) {
        setPhotoMessage(
          payload.error ??
            "The selection could not be queued. The archive record is unchanged.",
        );
        return;
      }
      const queuedOptions = new Set(
        [
          ...selectedStaged.map((photo) => photo.optionId),
          ...selectedArchived.map((photo) => `archive-${photo.id}`),
        ],
      );
      for (const photo of selectedStaged) {
        if (photo.previewUrl) {
          URL.revokeObjectURL(photo.previewUrl);
          previewUrls.current.delete(photo.previewUrl);
        }
      }
      setStagedPhotos((current) =>
        current.filter((photo) => !queuedOptions.has(photo.optionId)),
      );
      setSelectedPhotos((current) =>
        current.filter((id) => !queuedOptions.has(id)),
      );
      const archivedCount = payload.archivedCandidateCount ?? candidateIds.length;
      const uploadCount = payload.uploadCandidateCount ?? receipts.length;
      const archiveMessage = archivedCount
        ? `${archivedCount} archived photo choice${archivedCount === 1 ? "" : "s"} recorded with a pinned Release receipt`
        : "";
      const uploadMessage = uploadCount
        ? `${uploadCount} upload${uploadCount === 1 ? "" : "s"} queued for review`
        : "";
      setPhotoMessage(
        `${[archiveMessage, uploadMessage].filter(Boolean).join("; ")}.`,
      );
    } catch {
      setPhotoMessage("The selection service is unavailable.");
    } finally {
      setQueueing(false);
    }
  }

  async function uploadPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedColor) return;
    const form = event.currentTarget;
    const body = new FormData(form);
    const photo = body.get("photo");
    if (!(photo instanceof File)) {
      setPhotoMessage("Choose an image file.");
      return;
    }

    body.set("model", model.id);
    body.set("year", year);
    body.set("colorId", selectedColor.id);
    setUploading(true);
    setPhotoMessage("");
    try {
      const response = await fetch(apiUrl("/api/photos"), {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as UploadReceipt;
      if (!response.ok) {
        setPhotoMessage(payload.error ?? "Upload failed.");
        return;
      }
      if (payload.alreadyPublished) {
        form.reset();
        const refreshed = await fetch(
          apiUrl(
            `/api/photos?model=${encodeURIComponent(model.id)}&year=${encodeURIComponent(year)}&color_id=${encodeURIComponent(selectedColor.id)}`,
          ),
        );
        if (refreshed.ok) {
          const page = (await refreshed.json()) as ApiPhotoPage;
          setApiPhotos(page.items);
        }
        setPhotoMessage(
          "This exact photograph is already published. No private receipt or duplicate review item was created.",
        );
        return;
      }

      const { candidate, receipt, receiptExpiresAt } = payload;
      if (
        !candidate ||
        !receipt ||
        !receiptPattern.test(receipt) ||
        !receiptExpiresAt ||
        Number.isNaN(Date.parse(receiptExpiresAt))
      ) {
        setPhotoMessage(
          "Upload succeeded, but no valid selection receipt was returned.",
        );
        return;
      }

      const previewUrl = URL.createObjectURL(photo);
      previewUrls.current.add(previewUrl);
      const optionId = `staged-${crypto.randomUUID()}`;
      setStagedPhotos((current) => [
        {
          optionId,
          receipt,
          receiptExpiresAt,
          previewUrl,
          model: model.id,
          year,
          colorId: selectedColor.id,
          fileName: candidate.fileName,
          credit: candidate.credit,
          license: candidate.license,
          status: candidate.status,
        },
        ...current,
      ]);
      setSelectedPhotos((current) => [optionId, ...current]);
      form.reset();
      setPhotoMessage(
        "Photograph staged privately. This browser preview is not public; queue it for review when ready.",
      );
    } catch {
      setPhotoMessage("Upload storage is unavailable in this preview.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="ia-shell">
      <header className="ia-topbar">
        <button
          aria-expanded={sidebarOpen}
          aria-label="Open archive menu"
          className="ia-menu-button"
          onClick={() => setSidebarOpen((current) => !current)}
          type="button"
        >
          ≡
        </button>
        <button className="ia-brand" onClick={showModelIndex} type="button">
          CHEVROLET COLOR ARCHIVE
        </button>
        <span className="ia-top-count">
          {models.length} MODELS · {archiveModelYearCount.toLocaleString("en-US")} MODEL YEARS · {archiveListingCount} LISTINGS
        </span>
      </header>

      <nav
        aria-label="Archive navigation"
        className={`ia-sidebar ${sidebarOpen ? "open" : ""}`}
      >
        <button className="ia-sidebar-home" onClick={showModelIndex} type="button">
          Chevrolet Models
        </button>
        <div className="ia-sidebar-label">ALL MODELS</div>
        {models.map((item) => (
          <button
            aria-current={item.id === model.id && view !== "models" ? "page" : undefined}
            className={item.id === model.id && view !== "models" ? "active" : ""}
            key={item.id}
            onClick={() => chooseModel(item.id)}
            type="button"
          >
            <span aria-hidden="true" className="ia-sidebar-profile">
              <VehicleProfileSvg
                accent={modelAccent(item)}
                label={item.name}
                modelId={item.id}
                vehicleClass={item.vehicleClass}
                year={modelProfileYear(item)}
              />
            </span>
            <span className="ia-sidebar-copy">
              <strong>{item.name}</strong>
              <small>{item.era}</small>
            </span>
          </button>
        ))}
        <div className="ia-sidebar-label">ARCHIVE</div>
        <a href="https://www.gm.com/heritage/archive/vehicle-information-kits">
          Official GM source kits
        </a>
        <a href="https://github.com/ipadmom/chevrolet-color-archive">
          Public source and audits
        </a>
        <a href={archivedPhotoStats.releaseUrl}>
          Archived Commons originals
        </a>
        <button onClick={openPhotoQueue} type="button">
          Photo contribution queue
        </button>
        <div className="ia-sidebar-summary">
          <strong>{archiveModelYearCount.toLocaleString("en-US")}</strong> model-year records
          <br />
          <strong>{archiveListingCount}</strong> source-linked color listings
          <br />
          <strong>{archivedPhotoStats.assetCount}</strong> Release-archived originals across{" "}
          <strong>{archivedPhotoStats.modelCount}</strong> models
          <br />
          Facts cite official charts. Swatches and photographs are interpretive.
        </div>
      </nav>

      <button
        aria-label="Close archive menu"
        className={`ia-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
        type="button"
      />

      <div className="ia-maincontainer">
        <div className="ia-content">
          <section aria-label="Search the Chevrolet color archive" className="archive-search-panel">
            <div className="archive-search-heading">
              <strong>FIND A COLOR RECORD</strong>
              <label>
                <span>MODE</span>
                <select
                  aria-label="Archive search mode"
                  onChange={(event) => {
                    setSearchMode(event.target.value as ArchiveSearchMode);
                    setStructuredSearchError("");
                  }}
                  value={searchMode}
                >
                  <option value="structured">YEAR / MODEL / COLOR</option>
                  <option value="all-fields">ALL FIELDS / REGEX</option>
                </select>
              </label>
            </div>

            {searchMode === "structured" ? (
              <form className="archive-structured-search" onSubmit={submitStructuredSearch}>
                <label>
                  <span>1 YEAR</span>
                  <input
                    aria-invalid={Boolean(structuredSearchError)}
                    autoComplete="off"
                    list="archive-year-options"
                    onChange={(event) => {
                      setStructuredYear(event.target.value);
                      setStructuredModel("");
                      setStructuredColor("");
                      setStructuredSearchError("");
                    }}
                    placeholder="1969"
                    value={structuredYear}
                  />
                  <datalist id="archive-year-options">
                    {archiveSearchYears.map((itemYear) => (
                      <option key={itemYear} value={itemYear} />
                    ))}
                  </datalist>
                </label>
                <label>
                  <span>2 MODEL</span>
                  <input
                    aria-invalid={Boolean(structuredSearchError)}
                    autoComplete="off"
                    list="archive-model-options"
                    onChange={(event) => {
                      setStructuredModel(event.target.value);
                      setStructuredColor("");
                      setStructuredSearchError("");
                    }}
                    placeholder={structuredYear ? "Select model" : "Choose year first"}
                    value={structuredModel}
                  />
                  <datalist id="archive-model-options">
                    {structuredModelOptions.map((item) => (
                      <option key={item.id} value={item.name} />
                    ))}
                  </datalist>
                </label>
                <label>
                  <span>3 COLOR</span>
                  <input
                    aria-invalid={Boolean(structuredSearchError)}
                    autoComplete="off"
                    disabled={!structuredModelMatch || !structuredColorOptions.length}
                    list="archive-color-options"
                    onChange={(event) => {
                      setStructuredColor(event.target.value);
                      setStructuredSearchError("");
                    }}
                    placeholder={
                      structuredModelMatch && !structuredColorOptions.length
                        ? "No verified colors yet"
                        : "Any verified color"
                    }
                    value={structuredColor}
                  />
                  <datalist id="archive-color-options">
                    {structuredColorOptions.map((record) => (
                      <option
                        key={record.id}
                        label={record.subtitle}
                        value={structuredColorChoiceLabel(record)}
                      />
                    ))}
                  </datalist>
                </label>
                <button type="submit">OPEN</button>
              </form>
            ) : (
              <div className="archive-regex-search">
                <label>
                  <span>REGEX WILDCARD ACROSS EVERY FIELD</span>
                  <input
                    aria-invalid={Boolean(allFieldSearch.error)}
                    autoComplete="off"
                    onChange={(event) => setAllFieldQuery(event.target.value)}
                    placeholder="forest.*green|9C1"
                    value={allFieldQuery}
                  />
                </label>
                <small>
                  Searches model, year, era/platform, color, code, restriction,
                  fleet/specialty notes, source, revision, locator, and clearly
                  labeled secondary retailer leads. Secondary leads are research
                  only and never open a model-year route. Examples: {" "}
                  <code>forest.*green</code>, <code>^200[1-7]$</code>, or {" "}
                  <code>/tahoe|suburban/i</code>.
                </small>
              </div>
            )}

            {structuredSearchError ? (
              <p aria-live="polite" className="archive-search-error" role="alert">
                {structuredSearchError}
              </p>
            ) : null}
            {searchMode === "all-fields" && allFieldSearch.error ? (
              <p aria-live="polite" className="archive-search-error" role="alert">
                {allFieldSearch.error}
              </p>
            ) : null}
            {searchMode === "all-fields" &&
            allFieldQuery.trim() &&
            !allFieldSearch.error ? (
              <div className="archive-search-results">
                <div aria-live="polite" className="archive-search-result-count">
                  {allFieldSearch.total.toLocaleString("en-US")} MATCH
                  {allFieldSearch.total === 1 ? "" : "ES"}
                  {allFieldSearch.total > allFieldSearch.records.length
                    ? ` / FIRST ${allFieldSearch.records.length} SHOWN`
                    : ""}
                </div>
                {allFieldSearch.records.map((record) => (
                  <button
                    disabled={record.researchOnly}
                    key={record.id}
                    onClick={() => {
                      if (!record.researchOnly) {
                        openArchiveRecord(record.modelId, record.year, record.colorId);
                      }
                    }}
                    title={record.researchOnly ? "Research lead only; no Chevrolet model-year route is asserted." : undefined}
                    type="button"
                  >
                    <strong>{record.title}</strong>
                    <small>{record.subtitle}</small>
                  </button>
                ))}
                {!allFieldSearch.records.length ? (
                  <p>No catalog, color, platform, restriction, or source field matched.</p>
                ) : null}
              </div>
            ) : null}
          </section>

          {view === "models" ? (
            <>
              <h1 className="pageheader">Chevrolet Models (USA, all model years)</h1>
              <div className="profile-grid" aria-label="Choose a model">
                {models.map((item) => (
                  <button
                    className={`profile-tile ${modelHasAuditedRows(item) ? "" : "pending"}`}
                    key={item.id}
                    onClick={() => chooseModel(item.id)}
                    type="button"
                  >
                    <VehicleProfileSvg
                      accent={modelAccent(item)}
                      label={item.name}
                      modelId={item.id}
                      vehicleClass={item.vehicleClass}
                      year={modelProfileYear(item)}
                    />
                    <strong>{item.name}</strong>
                    {!modelHasAuditedRows(item) ? <small>COLOR RESEARCH QUEUE</small> : null}
                  </button>
                ))}
              </div>
              <div className="ia-accuracy-note">
                Choose a model. Choose a year from its catalogued runs. Every
                catalogued model year opens.
                Color rows appear only when a source chart has been reviewed.
              </div>
            </>
          ) : null}

          {view === "years" ? (
            <>
              <h1 className="pageheader">
                <button className="titlelink" onClick={showModelIndex} type="button">
                  Chevrolet
                </button>{" "}
                {model.name} Years
              </h1>
              {!model.generations.length ? (
                <div className="ia-empty-panel">
                  <strong>{model.name} is still in the research queue.</strong>
                  <p>{model.pendingCopy}</p>
                  <small>Unverified is not the same as unavailable.</small>
                </div>
              ) : (
                yearIndexGenerations.map((item) => (
                  <section className="year-group" key={item.id}>
                    <h2 className="ia-subhead">
                      {item.label} · {item.range}
                    </h2>
                    <div className="profile-grid" aria-label={`Choose a ${model.name} year`}>
                      {item.years.map((itemYear) => {
                        const yearGenerations = generationsForYear(model, itemYear);
                        const profileGeneration = generationForRecord(
                          model,
                          itemYear,
                        );
                        const count = yearGenerations
                          .flatMap((itemGeneration) => itemGeneration.colors)
                          .filter((color) => color.availability[itemYear]).length;
                        const reviewedNoChart = yearGenerations.some(
                          (itemGeneration) =>
                            itemGeneration.listingCount === 0 &&
                            Boolean(itemGeneration.sources[itemYear]),
                        );
                        return (
                          <button
                            aria-label={
                              count
                                ? `${itemYear} ${count} chart listings`
                                : reviewedNoChart
                                  ? `${itemYear} official source reviewed, no chart found`
                                  : `${itemYear} color chart unverified`
                            }
                            className="profile-tile year-tile"
                            key={itemYear}
                            onClick={() => chooseYear(itemYear)}
                            type="button"
                          >
                            <VehicleProfileSvg
                              accent={
                                profileGeneration
                                  ? generationAccent(profileGeneration, itemYear)
                                  : "#737f95"
                              }
                              label={`${model.name} ${itemYear}`}
                              modelId={model.id}
                              vehicleClass={model.vehicleClass}
                              year={itemYear}
                            />
                            <strong>{itemYear}</strong>
                            <small>
                              {count
                                ? `${count} COLORS`
                                : reviewedNoChart
                                  ? "REVIEWED · NO CHART"
                                  : "UNVERIFIED"}
                            </small>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))
              )}
            </>
          ) : null}

          {view === "archive" && generation ? (
            <>
              <div className="generation-profile">
                <VehicleProfileSvg
                  accent={selectedColor?.swatch}
                  label={`${model.name} ${generation.range}`}
                  modelId={model.id}
                  vehicleClass={model.vehicleClass}
                  year={year}
                />
              </div>

              <h1 className="pageheader archive-title">
                <button
                  aria-label={previousYear ? `Open ${previousYear}` : "No previous year"}
                  className="title-arrow"
                  disabled={!previousYear}
                  onClick={() => previousYear && chooseYear(previousYear)}
                  type="button"
                >
                  ◄
                </button>
                <span>
                  <button className="titlelink" onClick={showYearIndex} type="button">
                    Chevrolet {model.name}
                  </button>{" "}
                  {year}
                </span>
                <button
                  aria-label={nextYear ? `Open ${nextYear}` : "No next year"}
                  className="title-arrow"
                  disabled={!nextYear}
                  onClick={() => nextYear && chooseYear(nextYear)}
                  type="button"
                >
                  ►
                </button>
              </h1>

              <div
                className="year-thumb-strip"
                aria-label={`Choose a ${model.name} year in ${generation.label}`}
              >
                {displayedYearThumbnails.map((itemYear) => {
                  const itemGeneration = generationForRecord(model, itemYear);
                  if (!itemGeneration) return null;
                  return (
                    <button
                      aria-pressed={itemYear === year}
                      className={itemYear === year ? "active" : ""}
                      key={itemYear}
                      onClick={() => chooseYear(itemYear)}
                      type="button"
                    >
                      <VehicleProfileSvg
                        accent={generationAccent(itemGeneration, itemYear)}
                        label={`${model.name} ${itemYear}`}
                        modelId={model.id}
                        vehicleClass={model.vehicleClass}
                        year={itemYear}
                      />
                      <strong>{itemYear}</strong>
                    </button>
                  );
                })}
              </div>

              <details
                className="ia-details"
                open={
                  !yearSource ||
                  yearSourceIsIncompleteSubset ||
                  yearSourceIsReviewedNoChart
                }
              >
                <summary>▼ Archive status & source</summary>
                <div>
                  <strong>{model.status}</strong>
                  <div className="platform-facts">
                    <span>BASE / ERA</span>
                    <strong>{generation.label}</strong>
                    {generation.platformAliases?.length ? (
                      <small>{generation.platformAliases.join(" · ")}</small>
                    ) : null}
                    {generation.platformNotes ? <p>{generation.platformNotes}</p> : null}
                  </div>
                  <p>{generation.revisionNote}</p>
                  {yearSource ? (
                    <>
                      <dl>
                        <div>
                          <dt>Chart</dt>
                          <dd>{yearSource.chart}</dd>
                        </div>
                        <div>
                          <dt>Locator</dt>
                          <dd>{yearSource.locator}</dd>
                        </div>
                        <div>
                          <dt>Revision</dt>
                          <dd>{yearSource.revision}</dd>
                        </div>
                      </dl>
                      {yearSourceIsReviewedNoChart ? (
                        <div className="catalog-source-links">
                          <strong>REVIEWED SOURCE EVIDENCE</strong>
                          {sourceCitations(yearSource).map((source, index) => (
                            <a
                              href={source.archiveUrl ?? source.url}
                              key={source.sourceId ?? `${source.url}:${index}`}
                              rel="noreferrer"
                              target="_blank"
                            >
                              {index === 0
                                ? "RETAINED OFFICIAL KIT"
                                : `COMPARISON · ${source.publisher ?? source.name}${
                                    source.carrier ? ` VIA ${source.carrier}` : ""
                                  }`} {" "}
                              ↗
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <p className="year-unverified">
                        The exterior-color chart for {year} has not been completely
                        reviewed. This year stays visible because unverified is not
                        unavailable.
                      </p>
                      {generation.catalogSources?.length ? (
                        <div className="catalog-source-links">
                          <strong>MODEL-YEAR EVIDENCE</strong>
                          {generation.catalogSources.map((url, index) => (
                            <a href={url} key={url} rel="noreferrer" target="_blank">
                              SOURCE {index + 1} ↗
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </details>

              {modelReferencePhotos.length ? (
                <section aria-labelledby="commons-archive-heading" id="model-photos">
                  <div className="colorcharttitle" id="commons-archive-heading">
                    WIKIMEDIA COMMONS PHOTO ARCHIVE
                  </div>
                  <div className="ia-box commons-photo-archive">
                    <p className="photo-disclaimer">
                      These are archived identification references, not evidence of
                      factory paint or original finish. The site serves pinned GitHub
                      Release copies; Commons remains the attribution source.
                    </p>
                    <div className="archive-photo-grid">
                      {modelReferencePhotos.map((photo) => {
                        const exactYear = isExactYearPhoto(photo, model.id, year);
                        return (
                          <article className="archive-photo-card" key={photo.id}>
                            <img
                              alt={photo.alt}
                              decoding="async"
                              loading="lazy"
                              src={photo.src}
                            />
                            <div>
                              <strong>
                                {exactYear
                                  ? `${year} MODEL-YEAR MATCH`
                                  : "MODEL REFERENCE"}
                              </strong>
                              <span>
                                {exactYear
                                  ? "Year stated in Commons metadata"
                                  : photo.year
                                    ? `Photographed vehicle identified as ${photo.year}`
                                    : "Exact model year not established"}
                              </span>
                              <span>{photo.attribution}</span>
                              <nav aria-label={`Links for ${photo.originalFilename}`}>
                                <a href={photo.sourceUrl} rel="noreferrer" target="_blank">
                                  COMMONS SOURCE ↗
                                </a>
                                <a href={photo.licenseUrl} rel="noreferrer" target="_blank">
                                  LICENSE ↗
                                </a>
                                <a
                                  href={photo.archiveOriginalUrl}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  ARCHIVED ORIGINAL ↗
                                </a>
                              </nav>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                    <a
                      className="release-archive-link"
                      href={archivedPhotoStats.releaseUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      OPEN PHOTO-ARCHIVE RELEASE ↗
                    </a>
                  </div>
                </section>
              ) : null}

              <section aria-labelledby="matrix-heading" className="colorcharts" id="matrix">
                <div className="colorcharttitle">
                  <span id="matrix-heading">PAINT COLORS</span>
                  <button onClick={() => setShowAll((current) => !current)} type="button">
                    {showAll ? `${year} ONLY` : "ALL YEARS"}
                  </button>
                </div>
                <div className="colorchart-scroll">
                  <table
                    aria-label={`${year} ${model.name} color timeline`}
                    className="colorchartmain"
                  >
                    <caption>
                      {showAll
                        ? `${colors.length} color timeline rows across ${matrix.range}`
                        : `${visibleColors.length} colors listed for ${year}`}
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">COLOR RECORD</th>
                        <th scope="col">
                          <div
                            className="timeline-years"
                            style={{
                              gridTemplateColumns: `repeat(${years.length}, minmax(0, 1fr))`,
                            }}
                          >
                            {years.map((itemYear) => (
                              <button
                                aria-pressed={itemYear === year}
                                className={itemYear === year ? "selected" : ""}
                                key={itemYear}
                                onClick={() => chooseYear(itemYear)}
                                type="button"
                              >
                                {shortYear(itemYear)}
                              </button>
                            ))}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {!visibleColors.length ? (
                        <tr className="colorchart-empty">
                          <td colSpan={2}>
                            {yearSourceIsReviewedNoChart
                              ? `NO VERIFIED COLOR ROWS FOR ${year}. THE OFFICIAL KIT WAS REVIEWED, BUT ITS COLOR TABLE IS ABSENT.`
                              : `NO VERIFIED COLOR ROWS FOR ${year}. SOURCE REVIEW IS IN PROGRESS.`}
                          </td>
                        </tr>
                      ) : null}
                      {visibleColors.map((color) => {
                        const selectedValue = color.availability[year];
                        return (
                          <tr
                            className={selectedMatrixColor?.matrixKey === color.matrixKey ? "selected-row" : ""}
                            data-color-id={color.id}
                            key={color.matrixKey}
                          >
                            <th scope="row">
                              <button
                                onClick={() => chooseMatrixColor(color)}
                                title={`${color.name}, code ${color.rowCode}`}
                                type="button"
                              >
                                <span className="paint-name">{color.name}</span>
                                <span className="paint-meta">
                                  {color.name.toLowerCase().includes("metallic") ? (
                                    <span className="metallic-badge">METALLIC</span>
                                  ) : null}
                                  <span className="code-badge">{color.rowCode}</span>
                                </span>
                                {selectedValue?.restriction ? (
                                  <small>{selectedValue.restriction}</small>
                                ) : null}
                              </button>
                            </th>
                            <td>
                              <div
                                className="timeline-track"
                                style={{
                                  gridTemplateColumns: `repeat(${years.length}, minmax(0, 1fr))`,
                                }}
                              >
                                <span
                                  aria-hidden="true"
                                  className="selected-year-band"
                                  style={{ gridColumn: `${years.indexOf(year) + 1}` }}
                                />
                                {buildArchiveTimelineSegments(color, years).map((segment) => (
                                  <button
                                    aria-label={`${segment.years.join(" through ")}: ${segment.label}, code ${segment.code}${segment.restriction ? `, ${segment.restriction}` : ""}`}
                                    className={`timeline-bar ${segment.state}`}
                                    key={`${segment.start}-${segment.end}-${segment.code}`}
                                    onClick={() => chooseMatrixColor(color, segment.years[0])}
                                    style={{
                                      backgroundColor: color.swatch,
                                      gridColumn: `${segment.start + 1} / ${segment.end + 2}`,
                                    }}
                                    title={`${segment.label}, code ${segment.code}${segment.restriction ? ` · ${segment.restriction}` : ""}`}
                                    type="button"
                                  >
                                    <span>{rangeLabel(segment)}</span>
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="ia-accuracy-note">
                  {yearAccuracyNote}
                </p>
              </section>

              {selectedColor ? (
                <>
                  <section aria-label="Selected color record" id="color-record">
                    <div className="colorcharttitle">COLOR RECORD</div>
                    <div className="ia-box color-record">
                      <div
                        aria-label={`Interpretive swatch for ${selectedColor.name}`}
                        className="record-swatch"
                        role="img"
                        style={{ background: selectedColor.swatch }}
                      >
                        <span>{selectedColor.name}</span>
                        <strong>PAINT CODE: {selectedColor.availability[year]?.code ?? selectedColor.rowCode}</strong>
                      </div>
                      <p>
                        {selectedColor.note ??
                          "Chart spelling and order code are retained exactly by model year."}
                      </p>
                      <div className="color-year-buttons">
                        {years.map((itemYear) => {
                          const value = selectedMatrixColor?.availability[itemYear];
                          const sourceColorId =
                            selectedMatrixColor?.sourceColorIdsByYear[itemYear];
                          if (!value || !sourceColorId) return null;
                          return (
                            <button
                              aria-pressed={itemYear === year}
                              className={itemYear === year ? "active" : ""}
                              key={itemYear}
                              onClick={() =>
                                openArchiveRecord(
                                  model.id,
                                  itemYear,
                                  sourceColorId,
                                )
                              }
                              title={`${value.label}, code ${value.code}${value.restriction ? ` · ${value.restriction}` : ""}`}
                              type="button"
                            >
                              {itemYear}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </section>

                  <section id="evidence">
                    <div className="colorcharttitle">CLAIM-LEVEL EVIDENCE</div>
                    <div className="ia-box evidence-box">
                      {selectedClaimSources.map((source, index) => (
                        <article key={source.sourceId ?? `${source.url}:${index}`}>
                          <strong>{source.chart}</strong>
                          <p>{source.locator}</p>
                          <dl>
                            <div>
                              <dt>Document</dt>
                              <dd>{source.name}</dd>
                            </div>
                            {source.publisher ? (
                              <div>
                                <dt>Publisher</dt>
                                <dd>{source.publisher}</dd>
                              </div>
                            ) : null}
                            {source.carrier ? (
                              <div>
                                <dt>Carrier</dt>
                                <dd>{source.carrier}</dd>
                              </div>
                            ) : null}
                            {source.reuseLicense ? (
                              <div>
                                <dt>Reuse license</dt>
                                <dd>{source.reuseLicense}</dd>
                              </div>
                            ) : null}
                            <div>
                              <dt>Revision</dt>
                              <dd>{source.revision}</dd>
                            </div>
                            <div>
                              <dt>Claim</dt>
                              <dd>
                                {selectedAvailability
                                  ? `${selectedAvailability.label}, code ${selectedAvailability.code}`
                                  : "Not listed in the completely reviewed chart"}
                              </dd>
                            </div>
                          </dl>
                          {source.availabilityScope ? (
                            <p>{source.availabilityScope}</p>
                          ) : null}
                          {source.limitations?.map((limitation) => (
                            <p key={limitation}>{limitation}</p>
                          ))}
                          <a
                            href={source.archiveUrl ?? source.url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {source.archiveUrl
                              ? `OPEN RETAINED SOURCE ${index + 1}`
                              : `OPEN SOURCE REFERENCE ${index + 1}`} {" "}
                            ↗
                          </a>
                          {source.officialUrl &&
                          source.officialUrl !== (source.archiveUrl ?? source.url) ? (
                            <a
                              href={source.officialUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              OFFICIAL URL REFERENCE ↗
                            </a>
                          ) : null}
                          {source.originalUrl &&
                          source.originalUrl !== source.officialUrl &&
                          source.originalUrl !== source.historicalOfficialUrl ? (
                            <a
                              href={source.originalUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              ORIGINAL SOURCE URL ↗
                            </a>
                          ) : null}
                          {source.historicalOfficialUrl &&
                          source.historicalOfficialUrl !== source.url &&
                          source.historicalOfficialUrl !== source.officialUrl ? (
                            <a
                              href={source.historicalOfficialUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              HISTORICAL GM URL REFERENCE ↗
                            </a>
                          ) : null}
                          {source.retrievalUrl &&
                          source.retrievalUrl !== source.url &&
                          source.retrievalUrl !== source.originalUrl &&
                          source.retrievalUrl !== source.officialUrl &&
                          source.retrievalUrl !== source.historicalOfficialUrl ? (
                            <a
                              href={source.retrievalUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              ARCHIVAL RETRIEVAL URL ↗
                            </a>
                          ) : null}
                          {source.landingUrl &&
                          source.landingUrl !== source.url &&
                          source.landingUrl !== source.originalUrl &&
                          source.landingUrl !== source.officialUrl &&
                          source.landingUrl !== source.historicalOfficialUrl &&
                          source.landingUrl !== source.retrievalUrl ? (
                            <a
                              href={source.landingUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              SOURCE LANDING PAGE ↗
                            </a>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </section>

                  {selectedColor.availability[year] ? (
                    <section id="photos">
                      <div className="colorcharttitle">EXAMPLE PHOTOS</div>
                      <div className="ia-box photo-box">
                        <p className="photo-disclaimer">
                          Photos help identification. They never prove factory
                          availability or original paint.
                        </p>
                        <div className="photo-stack">
                          {staticPhotos.map((photo) => {
                            const optionId = `archive-${photo.id}`;
                            return (
                              <article className="ia-photo-card" key={optionId}>
                                <input
                                  checked={selectedPhotos.includes(optionId)}
                                  id={optionId}
                                  onChange={() => togglePhoto(optionId)}
                                  type="checkbox"
                                />
                                <label htmlFor={optionId}>
                                  <img
                                    alt={photo.alt}
                                    decoding="async"
                                    loading="lazy"
                                    src={photo.src}
                                  />
                                  <span className="photo-overlay">
                                    <small>{year} CHEVROLET</small>
                                    <strong>{model.name.toUpperCase()}</strong>
                                    <span>{selectedColor.name.toUpperCase()}</span>
                                    <b>
                                      PAINT CODE: {selectedColor.availability[year].code}
                                    </b>
                                  </span>
                                </label>
                                <div className="photo-meta">
                                  <strong>
                                    {photo.status === "reviewed"
                                      ? "REVIEWED ILLUSTRATION"
                                      : "CANDIDATE ILLUSTRATION"}
                                  </strong>
                                  <span>ARCHIVE ID: {photo.id}</span>
                                  <span>{photo.attribution}</span>
                                  {photo.note ? <span>{photo.note}</span> : null}
                                  <span>
                                    {photo.sourceUrl ? (
                                      <a href={photo.sourceUrl} rel="noreferrer" target="_blank">
                                        SOURCE ↗
                                      </a>
                                    ) : null}
                                    {photo.licenseUrl ? (
                                      <a href={photo.licenseUrl} rel="noreferrer" target="_blank">
                                        LICENSE ↗
                                      </a>
                                    ) : null}
                                    <a
                                      href={photo.archiveOriginalUrl}
                                      rel="noreferrer"
                                      target="_blank"
                                    >
                                      ARCHIVED ORIGINAL ↗
                                    </a>
                                  </span>
                                </div>
                              </article>
                            );
                          })}

                          {apiPhotos.map((photo) => {
                            return (
                              <article className="ia-photo-card" key={`published-${photo.id}`}>
                                <div className="published-photo-reference">
                                  <img
                                    alt={`${selectedColor.name} upload ${photo.fileName}`}
                                    src={photo.imageUrl}
                                  />
                                  <span className="photo-overlay">
                                    <small>{year} CHEVROLET</small>
                                    <strong>{model.name.toUpperCase()}</strong>
                                    <span>{selectedColor.name.toUpperCase()}</span>
                                    <b>PAINT CODE: {selectedColor.availability[year].code}</b>
                                  </span>
                                </div>
                                <span className="photo-meta">
                                  PUBLISHED COMMUNITY REFERENCE · {photo.credit} · {photo.license}
                                </span>
                              </article>
                            );
                          })}

                          {visibleStagedPhotos.map((photo) => (
                            <label className="ia-photo-card staged" key={photo.optionId}>
                              <input
                                checked={selectedPhotos.includes(photo.optionId)}
                                onChange={() => togglePhoto(photo.optionId)}
                                type="checkbox"
                              />
                              {photo.previewUrl ? (
                                <img
                                  alt={`${selectedColor.name} local upload ${photo.fileName}`}
                                  src={photo.previewUrl}
                                />
                              ) : (
                                <span
                                  className="photo-placeholder"
                                  style={{ background: selectedColor.swatch }}
                                >
                                  PREVIEW REMAINS IN THE ORIGINAL BROWSER SESSION
                                </span>
                              )}
                              <span className="photo-meta">
                                PRIVATE STAGED RECEIPT · {photo.fileName}
                              </span>
                            </label>
                          ))}

                          {!staticPhotos.length &&
                          !apiPhotos.length &&
                          !visibleStagedPhotos.length ? (
                            <div
                              className="empty-photo"
                              style={{ background: selectedColor.swatch }}
                            >
                              <strong>NO REVIEWED PHOTO YET</strong>
                              <span>THE CRAWLER AND COMMUNITY QUEUE FEED THIS RECORD</span>
                            </div>
                          ) : null}
                        </div>
                        <div className="photo-choice-controls">
                          <span>
                            {selectedSubmissionCount
                              ? `${selectedSubmissionCount} SELECTED`
                              : "CHECK ONE OR MORE ARCHIVED OR STAGED PHOTOS"}
                          </span>
                          <button
                            className="ia-action"
                            disabled={queueing || selectedSubmissionCount === 0}
                            onClick={queueSelection}
                            type="button"
                          >
                            {queueing ? "SAVING…" : "SAVE PHOTO CHOICES"}
                          </button>
                        </div>
                        <p aria-live="polite" className="live-message">
                          {photoMessage}
                        </p>
                      </div>
                    </section>
                  ) : null}

                  {selectedColor.availability[year] ? (
                    <section>
                      <div className="colorcharttitle">CONTRIBUTE A PHOTO</div>
                      <form className="ia-box upload-form" onSubmit={uploadPhoto}>
                        <p>
                          No account or password required. Files remain private
                          until review and GitHub publication.
                        </p>
                        <label>
                          IMAGE FILE
                          <input
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            name="photo"
                            required
                            type="file"
                          />
                          <small>JPEG, PNG, GIF, OR WEBP · MAXIMUM 8 MB</small>
                        </label>
                        <label>
                          CREDIT OR PHOTOGRAPHER
                          <input
                            name="credit"
                            placeholder="Your name, collection, or unknown"
                            required
                          />
                        </label>
                        <label>
                          RIGHTS
                          <select
                            defaultValue="Permission granted for archive use"
                            name="license"
                          >
                            <option>Permission granted for archive use</option>
                            <option>CC BY 4.0</option>
                            <option>CC BY-SA 4.0</option>
                            <option>Public domain</option>
                            <option>Rights review required</option>
                          </select>
                        </label>
                        <button className="ia-action" disabled={uploading} type="submit">
                          {uploading ? "UPLOADING…" : "STAGE PHOTOGRAPH"}
                        </button>
                      </form>
                    </section>
                  ) : null}

                  <section>
                    <div className="colorcharttitle">OFFICIAL SOURCES</div>
                    <div className="source-kit-list">
                      {matrix.reviewedYears.flatMap((itemYear) =>
                        sourceCitations(matrix.sources[itemYear]).map((source, index) => (
                          <a
                            href={source.archiveUrl ?? source.url}
                            key={`${itemYear}:${source.sourceId ?? source.url}:${index}`}
                            rel="noreferrer"
                            target="_blank"
                          >
                            <span className="source-cover">
                              <small>CHEVROLET</small>
                              <strong>{itemYear}</strong>
                              <span>{model.name}</span>
                              <b>{source.name.toUpperCase()}</b>
                            </span>
                            <span>{itemYear} Chevrolet {model.name} source</span>
                            <small>{source.locator}</small>
                          </a>
                        )),
                      )}
                    </div>
                  </section>
                </>
              ) : null}
            </>
          ) : null}

          <footer className="ia-footer">
            Chevrolet Color Archive // official-source research tool // errors
            can exist, verify the linked chart //{" "}
            <a href="https://github.com/ipadmom/chevrolet-color-archive">
              public source
            </a>
          </footer>
        </div>
      </div>
    </main>
  );
}
