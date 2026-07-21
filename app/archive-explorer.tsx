"use client";
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  defaultColorId,
  defaultModelId,
  defaultYear,
  models,
  staticPhotoCandidates,
} from "./archive-data";
import type {
  ArchiveColor,
  ArchiveModel,
  Generation,
  PhotoCandidate,
} from "./archive-data";

type ArchiveView = "models" | "years" | "archive";

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

type TimelineSegment = {
  code: string;
  end: number;
  label: string;
  restriction?: string;
  start: number;
  state: "listed" | "restricted";
  years: string[];
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

function profilePhoto(modelId: string, year?: string) {
  if (modelId !== "camaro") return undefined;
  const exact = staticPhotoCandidates.find(
    (photo) => photo.year === year && photo.status === "reviewed",
  );
  if (year) return exact;
  return (
    staticPhotoCandidates.find((photo) => photo.status === "reviewed") ??
    staticPhotoCandidates[0]
  );
}

function VehicleProfile({
  accent = "#737f95",
  label,
  photo,
}: {
  accent?: string;
  label: string;
  photo?: PhotoCandidate;
}) {
  if (photo) {
    return <img alt={photo.alt} className="vehicle-profile" src={photo.src} />;
  }

  return (
    <svg
      aria-label={`${label} profile illustration`}
      className="vehicle-profile"
      role="img"
      viewBox="0 0 140 64"
    >
      <rect fill="#f7f7f7" height="64" width="140" />
      <path
        d="M12 42h5l5-12c2-5 6-8 12-9l44-5c7-1 13 1 18 6l9 9 17 4c4 1 6 4 6 8v4h-8a11 11 0 0 0-21 0H43a11 11 0 0 0-21 0H12z"
        fill={accent}
        opacity=".92"
        stroke="#444d5e"
        strokeWidth="1.5"
      />
      <path
        d="m38 24 38-5c5-1 10 1 14 5l6 7H31l4-6c1-1 2-1 3-1Z"
        fill="#dce1e8"
        stroke="#444d5e"
        strokeWidth="1"
      />
      <circle cx="32" cy="47" fill="#fff" r="8" stroke="#444d5e" strokeWidth="3" />
      <circle cx="109" cy="47" fill="#fff" r="8" stroke="#444d5e" strokeWidth="3" />
      <text
        fill="#444d5e"
        fontFamily="Arial, sans-serif"
        fontSize="7"
        fontWeight="700"
        textAnchor="middle"
        x="70"
        y="61"
      >
        {label.toUpperCase()}
      </text>
    </svg>
  );
}

function timelineSegments(color: ArchiveColor, years: string[]) {
  const segments: TimelineSegment[] = [];

  for (let index = 0; index < years.length; index += 1) {
    const itemYear = years[index];
    const value = color.availability[itemYear];
    if (!value) continue;
    const previous = segments.at(-1);
    const matchesPrevious =
      previous &&
      previous.end === index - 1 &&
      previous.code === value.code &&
      previous.label === value.label &&
      previous.state === value.state &&
      previous.restriction === value.restriction;

    if (matchesPrevious) {
      previous.end = index;
      previous.years.push(itemYear);
    } else {
      segments.push({
        code: value.code,
        end: index,
        label: value.label,
        restriction: value.restriction,
        start: index,
        state: value.state,
        years: [itemYear],
      });
    }
  }
  return segments;
}

function rangeLabel(segment: TimelineSegment) {
  const first = shortYear(segment.years[0]);
  const last = shortYear(segment.years.at(-1) ?? segment.years[0]);
  return first === last ? first : `${first}-${last}`;
}

function modelAccent(model: ArchiveModel) {
  const firstColor = model.generations[0]?.colors[0];
  return firstColor?.swatch ?? "#737f95";
}

function generationAccent(generation: Generation, year: string) {
  return (
    generation.colors.find((color) => color.availability[year])?.swatch ??
    "#737f95"
  );
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
  const previewUrls = useRef(new Set<string>());

  const model = models.find((item) => item.id === modelId) ?? models[0];
  const generation =
    model.generations.find((item) => item.years.includes(year)) ??
    model.generations[0];
  const modelYears = model.generations.flatMap((item) =>
    item.years.map((modelYear) => ({ generation: item, year: modelYear })),
  );
  const years = generation?.years ?? [];
  const colors = generation?.colors ?? [];
  const visibleColors = showAll
    ? colors
    : colors.filter((color) => color.availability[year]);
  const selectedColor =
    colors.find((color) => color.id === colorId) ??
    colors.find((color) => color.availability[year]) ??
    colors[0];
  const staticPhotos = staticPhotoCandidates.filter(
    (photo) => photo.colorId === selectedColor?.id && photo.year === year,
  );
  const visibleStagedPhotos = stagedPhotos.filter(
    (photo) =>
      photo.model === model.id &&
      photo.year === year &&
      photo.colorId === selectedColor?.id,
  );
  const selectedYearIndex = modelYears.findIndex((item) => item.year === year);
  const previousYear = modelYears[selectedYearIndex - 1]?.year;
  const nextYear = modelYears[selectedYearIndex + 1]?.year;

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

      const requestedYear = params.get("year");
      const requestedGeneration = requestedModel.generations.find((item) =>
        item.years.includes(requestedYear ?? ""),
      );
      if (!requestedYear || !requestedGeneration) {
        setView("years");
        return;
      }

      setYear(requestedYear);
      const requestedColor = requestedGeneration.colors.find(
        (color) => color.id === params.get("color"),
      );
      const firstListed = requestedGeneration.colors.find(
        (color) => color.availability[requestedYear],
      );
      if (requestedColor?.availability[requestedYear]) {
        setColorId(requestedColor.id);
      } else if (firstListed) {
        setColorId(firstListed.id);
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
      if (nextColor) setColorId(nextColor.id);
    }
    window.history.replaceState(null, "", `#model=${nextModelId}`);
  }

  function chooseYear(nextYear: string) {
    const nextGeneration = model.generations.find((item) =>
      item.years.includes(nextYear),
    );
    const nextColors = nextGeneration?.colors ?? [];
    const stillAvailable = nextColors.find(
      (color) =>
        color.id === selectedColor?.id && color.availability[nextYear],
    );
    const firstListed = nextColors.find((color) => color.availability[nextYear]);
    const nextColor = stillAvailable ?? firstListed;

    setYear(nextYear);
    setView("archive");
    setSidebarOpen(false);
    setShowAll(true);
    clearLocalPhotoState();
    if (nextColor) setColorId(nextColor.id);

    const params = new URLSearchParams({
      model: model.id,
      year: nextYear,
    });
    if (nextColor) params.set("color", nextColor.id);
    window.history.replaceState(null, "", `#${params.toString()}`);
  }

  function chooseColor(nextColorId: string) {
    setColorId(nextColorId);
    clearLocalPhotoState();
    const params = new URLSearchParams({
      color: nextColorId,
      model: model.id,
      year,
    });
    window.history.replaceState(null, "", `#${params.toString()}`);
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
    const photo =
      staticPhotoCandidates.find((candidate) => candidate.status === "reviewed") ??
      staticPhotoCandidates[0];
    if (!photo) {
      chooseModel("camaro");
      return;
    }

    setModelId("camaro");
    setYear(photo.year);
    setColorId(photo.colorId);
    setView("archive");
    setSidebarOpen(false);
    setShowAll(true);
    clearLocalPhotoState();
    const params = new URLSearchParams({
      color: photo.colorId,
      model: "camaro",
      year: photo.year,
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
    const preferenceCount = selectedPhotos.filter((id) =>
      id.startsWith("preference-"),
    ).length;
    if (!selectedPhotos.length) {
      setPhotoMessage("Choose at least one photo or staged upload first.");
      return;
    }
    if (!receipts.length) {
      setPhotoMessage(
        `${preferenceCount} published photo choice${preferenceCount === 1 ? "" : "s"} kept in this browser. No review submission was made.`,
      );
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
          receipts,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setPhotoMessage(
          payload.error ??
            "The selection could not be queued. The archive record is unchanged.",
        );
        return;
      }
      const queuedOptions = new Set(
        selectedStaged.map((photo) => photo.optionId),
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
      setPhotoMessage(
        "Selection queued for the VPS review and GitHub publishing pipeline.",
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
        <span className="ia-top-count">{archiveListingCount} LISTINGS</span>
      </header>

      <nav
        aria-label="Archive navigation"
        className={`ia-sidebar ${sidebarOpen ? "open" : ""}`}
      >
        <button className="ia-sidebar-home" onClick={showModelIndex} type="button">
          Chevrolet Models
        </button>
        <div className="ia-sidebar-label">AUDITED MODELS</div>
        {models.map((item) => (
          <button
            aria-current={item.id === model.id && view !== "models" ? "page" : undefined}
            className={item.id === model.id && view !== "models" ? "active" : ""}
            key={item.id}
            onClick={() => chooseModel(item.id)}
            type="button"
          >
            <span
              aria-hidden="true"
              className="ia-sidebar-swatch"
              style={{ background: modelAccent(item) }}
            />
            <span>
              <strong>{item.name}</strong>
              <small>{item.generations.length ? item.era : "research queue"}</small>
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
        <button onClick={openPhotoQueue} type="button">
          Photo contribution queue
        </button>
        <div className="ia-sidebar-summary">
          <strong>{archiveListingCount}</strong> source-linked listings
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
          {view === "models" ? (
            <>
              <h1 className="pageheader">Chevrolet Models (USA audited archive)</h1>
              <div className="profile-grid" aria-label="Choose a model">
                {models.map((item) => (
                  <button
                    className={`profile-tile ${item.generations.length ? "" : "pending"}`}
                    key={item.id}
                    onClick={() => chooseModel(item.id)}
                    type="button"
                  >
                    <VehicleProfile
                      accent={modelAccent(item)}
                      label={item.name}
                      photo={profilePhoto(item.id)}
                    />
                    <strong>{item.name}</strong>
                    {!item.generations.length ? <small>RESEARCH QUEUE</small> : null}
                  </button>
                ))}
              </div>
              <div className="ia-accuracy-note">
                Choose a model, then a year. Only chart-complete years open a
                color timeline.
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
                model.generations.map((item) => (
                  <section className="year-group" key={item.id}>
                    <h2 className="ia-subhead">
                      {item.label} · {item.range}
                    </h2>
                    <div className="profile-grid" aria-label={`Choose a ${model.name} year`}>
                      {item.years.map((itemYear) => {
                        const count = item.colors.filter(
                          (color) => color.availability[itemYear],
                        ).length;
                        return (
                          <button
                            aria-label={`${itemYear} ${count} chart listings`}
                            className="profile-tile year-tile"
                            key={itemYear}
                            onClick={() => chooseYear(itemYear)}
                            type="button"
                          >
                            <VehicleProfile
                              accent={generationAccent(item, itemYear)}
                              label={`${model.name} ${itemYear}`}
                              photo={profilePhoto(model.id, itemYear)}
                            />
                            <strong>{itemYear}</strong>
                            <small>{count} COLORS</small>
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
                <VehicleProfile
                  accent={selectedColor?.swatch}
                  label={`${model.name} ${generation.range}`}
                  photo={profilePhoto(model.id, year)}
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

              <div className="year-thumb-strip" aria-label="Choose a year">
                {generation.years.map((itemYear) => (
                  <button
                    aria-pressed={itemYear === year}
                    className={itemYear === year ? "active" : ""}
                    key={itemYear}
                    onClick={() => chooseYear(itemYear)}
                    type="button"
                  >
                    <VehicleProfile
                      accent={generationAccent(generation, itemYear)}
                      label={`${model.name} ${itemYear}`}
                      photo={profilePhoto(model.id, itemYear)}
                    />
                    <strong>{itemYear}</strong>
                  </button>
                ))}
              </div>

              <details className="ia-details">
                <summary>▼ Archive status & source</summary>
                <div>
                  <strong>{model.status}</strong>
                  <p>{generation.revisionNote}</p>
                  <dl>
                    <div>
                      <dt>Chart</dt>
                      <dd>{generation.sources[year].chart}</dd>
                    </div>
                    <div>
                      <dt>Locator</dt>
                      <dd>{generation.sources[year].locator}</dd>
                    </div>
                    <div>
                      <dt>Revision</dt>
                      <dd>{generation.sources[year].revision}</dd>
                    </div>
                  </dl>
                </div>
              </details>

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
                        ? `${colors.length} color timeline rows across ${generation.range}`
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
                      {visibleColors.map((color) => {
                        const selectedValue = color.availability[year];
                        return (
                          <tr
                            className={selectedColor?.id === color.id ? "selected-row" : ""}
                            data-color-id={color.id}
                            key={color.id}
                          >
                            <th scope="row">
                              <button onClick={() => chooseColor(color.id)} type="button">
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
                                {timelineSegments(color, years).map((segment) => (
                                  <button
                                    aria-label={`${segment.years.join(" through ")}: ${segment.label}, code ${segment.code}${segment.restriction ? `, ${segment.restriction}` : ""}`}
                                    className={`timeline-bar ${segment.state}`}
                                    key={`${segment.start}-${segment.end}-${segment.code}`}
                                    onClick={() => chooseColor(color.id)}
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
                  ALL AVAILABILITY CLAIMS CITE COMPLETE OFFICIAL GM CHARTS. THE
                  SELECTED YEAR IS SHADED. STRIPED BARS CARRY A MODEL, PACKAGE, OR
                  SOURCE QUALIFICATION.
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
                          const value = selectedColor.availability[itemYear];
                          if (!value) return null;
                          return (
                            <button
                              aria-pressed={itemYear === year}
                              className={itemYear === year ? "active" : ""}
                              key={itemYear}
                              onClick={() => chooseYear(itemYear)}
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
                      <strong>{generation.sources[year].chart}</strong>
                      <p>{generation.sources[year].locator}</p>
                      <dl>
                        <div>
                          <dt>Publisher</dt>
                          <dd>{generation.sources[year].name}</dd>
                        </div>
                        <div>
                          <dt>Revision</dt>
                          <dd>{generation.sources[year].revision}</dd>
                        </div>
                        <div>
                          <dt>Claim</dt>
                          <dd>
                            {selectedColor.availability[year]
                              ? `${selectedColor.availability[year].label}, code ${selectedColor.availability[year].code}`
                              : "Not listed in the completely reviewed chart"}
                          </dd>
                        </div>
                      </dl>
                      <a
                        href={generation.sources[year].url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        OPEN OFFICIAL GM PDF ↗
                      </a>
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
                            const optionId = `preference-static-${photo.id}`;
                            return (
                              <article className="ia-photo-card" key={optionId}>
                                <input
                                  checked={selectedPhotos.includes(optionId)}
                                  id={optionId}
                                  onChange={() => togglePhoto(optionId)}
                                  type="checkbox"
                                />
                                <label htmlFor={optionId}>
                                  <img alt={photo.alt} src={photo.src} />
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
                                  <span>{photo.credit} · {photo.license}</span>
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
                                  </span>
                                </div>
                              </article>
                            );
                          })}

                          {apiPhotos.map((photo) => {
                            const optionId = `preference-${photo.id}`;
                            return (
                              <label className="ia-photo-card" key={optionId}>
                                <input
                                  checked={selectedPhotos.includes(optionId)}
                                  onChange={() => togglePhoto(optionId)}
                                  type="checkbox"
                                />
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
                                <span className="photo-meta">
                                  {photo.credit} · {photo.license}
                                </span>
                              </label>
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
                        <button
                          className="ia-action"
                          disabled={queueing}
                          onClick={queueSelection}
                          type="button"
                        >
                          {queueing ? "QUEUEING…" : "KEEP CHOICES / QUEUE UPLOADS"}
                        </button>
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
                      <p aria-live="polite" className="live-message">
                        {photoMessage}
                      </p>
                    </section>
                  ) : null}

                  <section>
                    <div className="colorcharttitle">OFFICIAL SOURCE KITS</div>
                    <div className="source-kit-list">
                      {years.map((itemYear) => (
                        <a
                          href={generation.sources[itemYear].url}
                          key={itemYear}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <span className="source-cover">
                            <small>CHEVROLET</small>
                            <strong>{itemYear}</strong>
                            <span>{model.name}</span>
                            <b>VEHICLE INFORMATION KIT</b>
                          </span>
                          <span>{itemYear} Chevrolet {model.name} source kit</span>
                          <small>{generation.sources[itemYear].locator}</small>
                        </a>
                      ))}
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
