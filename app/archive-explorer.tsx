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
import type { ArchiveColor, PhotoCandidate } from "./archive-data";

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

const modelSteps = ["Choose model", "Choose year", "Read timeline"];
const apiBase = (process.env.NEXT_PUBLIC_ARCHIVE_API_BASE ?? "").replace(/\/$/, "");
const stagedStorageKey = "chevrolet-color-archive:staged-receipts:v1";
const receiptPattern = /^[A-Za-z0-9_-]{43}$/;
const publishedGenerations = models.flatMap((model) =>
  model.generations.map((generation) => ({ model, generation })),
);
const archiveListingCount = publishedGenerations.reduce(
  (total, { generation }) => total + generation.listingCount,
  0,
);
const archiveCoverageLabel = publishedGenerations
  .map(({ model, generation }) => `${model.name} ${generation.range}`)
  .join(" · ");

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

function apiUrl(path: string) {
  return `${apiBase}${path}`;
}

function availabilityLabel(color: ArchiveColor, year: string) {
  return color.availability[year];
}

export function ArchiveExplorer() {
  const [modelId, setModelId] = useState(defaultModelId);
  const [year, setYear] = useState(defaultYear);
  const [colorId, setColorId] = useState(defaultColorId);
  const [showAll, setShowAll] = useState(false);
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
    colors.find((color) => color.id === colorId) ?? visibleColors[0] ?? colors[0];

  const staticPhotos = staticPhotoCandidates.filter(
    (photo) => photo.colorId === selectedColor?.id && photo.year === year,
  );
  const visibleStagedPhotos = stagedPhotos.filter(
    (photo) =>
      photo.model === model.id &&
      photo.year === year &&
      photo.colorId === selectedColor?.id,
  );

  useEffect(() => {
    if (!selectedColor) return;
    const controller = new AbortController();
    fetch(
      apiUrl(`/api/photos?model=${encodeURIComponent(model.id)}&year=${encodeURIComponent(year)}&color_id=${encodeURIComponent(selectedColor.id)}`),
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
  }, [model.id, selectedColor, year]);

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
    setShowAll(false);
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
  }

  function chooseYear(nextYear: string) {
    const nextGeneration = model.generations.find((item) =>
      item.years.includes(nextYear),
    );
    const nextColors = nextGeneration?.colors ?? [];
    setYear(nextYear);
    setShowAll(false);
    clearLocalPhotoState();
    const firstListed = nextColors.find((color) => color.availability[nextYear]);
    if (
      !nextColors.find(
        (color) =>
          color.id === selectedColor?.id && color.availability[nextYear],
      ) &&
      firstListed
    ) {
      setColorId(firstListed.id);
    }
  }

  function chooseColor(nextColorId: string) {
    setColorId(nextColorId);
    clearLocalPhotoState();
  }

  function togglePhoto(id: string) {
    setSelectedPhotos((current) =>
      current.includes(id)
        ? current.filter((candidateId) => candidateId !== id)
        : [...current, id],
    );
  }

  async function queueSelection() {
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
      setPhotoMessage("Choose a staged upload first.");
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
      const queuedOptions = new Set(selectedStaged.map((photo) => photo.optionId));
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
      const response = await fetch(apiUrl("/api/photos"), { method: "POST", body });
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
      const {
        candidate,
        receipt,
        receiptExpiresAt,
      } = payload;
      if (
        !candidate ||
        !receipt ||
        !receiptPattern.test(receipt) ||
        !receiptExpiresAt ||
        Number.isNaN(Date.parse(receiptExpiresAt))
      ) {
        setPhotoMessage("Upload succeeded, but no valid selection receipt was returned.");
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
    <main>
      <header className="masthead">
        <a className="wordmark" href="#top" aria-label="Chevrolet Color Archive home">
          <span className="bowtie" aria-hidden="true" />
          <span>Chevrolet Color Archive</span>
        </a>
        <nav aria-label="Page sections">
          <a href="#matrix">Timeline</a>
          <a href="#evidence">Evidence</a>
          <a href="#photos">Photos</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div>
          <p className="eyebrow">Factory paint, documented year by year</p>
          <h1>Find the right Chevrolet color.</h1>
          <p className="hero-copy">
            Pick a model and year, then follow each documented color across the
            fully audited chart block. Every claim links back to its source.
          </p>
        </div>
        <div className="coverage-card" aria-label="Current archive coverage">
          <strong>{archiveListingCount}</strong>
          <span>source-linked chart listings</span>
          <small>{archiveCoverageLabel}</small>
        </div>
      </section>

      <ol className="step-strip" aria-label="Archive workflow">
        {modelSteps.map((step, index) => (
          <li key={step}>
            <span>{index + 1}</span>
            {step}
          </li>
        ))}
      </ol>

      <section className="workspace-section" aria-labelledby="model-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Step 1</p>
            <h2 id="model-heading">Choose a model</h2>
          </div>
          <p>Published matrices contain only chart-complete years.</p>
        </div>
        <div className="model-grid">
          {models.map((item) => (
            <button
              aria-pressed={item.id === model.id}
              className={`model-card ${item.id === model.id ? "active" : ""}`}
              key={item.id}
              onClick={() => chooseModel(item.id)}
              type="button"
            >
              <span>
                <strong>{item.name}</strong>
                <small>{item.era}</small>
              </span>
              <em>{item.status}</em>
            </button>
          ))}
        </div>
      </section>

      {!generation ? (
        <section className="pending-panel" aria-live="polite">
          <p className="eyebrow">Audit queue</p>
          <h2>{model.name} is not published yet.</h2>
          <p>{model.pendingCopy}</p>
          <span>Unverified is not the same as unavailable.</span>
        </section>
      ) : (
        <>
          <section className="year-section" aria-labelledby="year-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Step 2</p>
                <h2 id="year-heading">Choose a year</h2>
              </div>
              <p>{generation.label}, {generation.range}</p>
            </div>
            <div className="year-rail">
              {modelYears.map(({ generation: yearGeneration, year: item }) => {
                const count = yearGeneration.colors.filter(
                  (color) => color.availability[item],
                ).length;
                return (
                  <button
                    aria-pressed={year === item}
                    className={year === item ? "active" : ""}
                    key={`${yearGeneration.id}-${item}`}
                    onClick={() => chooseYear(item)}
                    type="button"
                  >
                    <span>{item}</span>
                    <small>{count} chart listings</small>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="matrix-section" id="matrix" aria-labelledby="matrix-heading">
            <div className="section-heading matrix-title">
              <div>
                <p className="eyebrow">Step 3</p>
                <h2 id="matrix-heading">{year} {model.name} color timeline</h2>
                <p>
                  Every row shows the full {generation.range} record. The selected
                  year is highlighted.
                </p>
              </div>
              <button
                className="quiet-button"
                onClick={() => setShowAll((value) => !value)}
                type="button"
              >
                {showAll ? `Show ${year} colors` : `Show all ${colors.length} timeline rows`}
              </button>
            </div>

            <div className="legend" aria-label="Timeline legend">
              <span><i className="dot listed" /> Listed</span>
              <span><i className="dot restricted" /> Restricted</span>
              <span><i className="dot absent" /> Not listed in cited chart</span>
            </div>

            <div className="table-frame">
              <table>
                <caption>
                  {showAll
                    ? `${colors.length} normalized color records, ${generation.listingCount} chart listings`
                    : `${visibleColors.length} colors listed for ${year}`}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Color record</th>
                    {years.map((item) => (
                      <th className={item === year ? "selected-year" : ""} key={item} scope="col">
                        {item}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleColors.map((color) => (
                    <tr
                      className={selectedColor?.id === color.id ? "selected-row" : ""}
                      data-color-id={color.id}
                      key={color.id}
                      onClick={() => chooseColor(color.id)}
                    >
                      <th scope="row">
                        <button type="button" onClick={() => chooseColor(color.id)}>
                          <i style={{ background: color.swatch }} />
                          <span>
                            <strong>{color.name}</strong>
                            <small>{color.rowCode}</small>
                          </span>
                        </button>
                      </th>
                      {years.map((item) => {
                        const value = availabilityLabel(color, item);
                        return (
                          <td
                            className={`${item === year ? "selected-year" : ""} ${value?.state ?? "not-listed"}`}
                            key={item}
                          >
                            {value ? (
                              <>
                                <strong>{value.code}</strong>
                                <span>{value.label}</span>
                                {value.restriction && <small>{value.restriction}</small>}
                              </>
                            ) : (
                              <span className="not-listed-copy">Not listed</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="revision-note">{generation.revisionNote}</p>
          </section>

          {selectedColor && (
            <section className="record-grid" aria-label="Selected color record">
              <article className="record-card">
                <div
                  role="img"
                  className="large-swatch"
                  style={{ background: selectedColor.swatch }}
                  aria-label={`Interpretive swatch for ${selectedColor.name}`}
                />
                <div>
                  <p className="eyebrow">{model.name} color record</p>
                  <h2>{selectedColor.name}</h2>
                  <p>{selectedColor.note ?? "Chart spelling and order code are retained exactly by model year."}</p>
                  <dl>
                    {years.map((item) => {
                      const value = selectedColor.availability[item];
                      return (
                        <div key={item}>
                          <dt>{item}</dt>
                          <dd>
                            {value
                              ? `${value.code} · ${value.label}${value.restriction ? ` · ${value.restriction}` : ""}`
                              : "Not listed in cited chart"}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              </article>

              <article className="source-card" id="evidence">
                <p className="eyebrow">Claim-level evidence</p>
                <h2>{year} source</h2>
                <strong>{generation.sources[year].chart}</strong>
                <p>{generation.sources[year].locator}</p>
                <dl>
                  <div><dt>Publisher</dt><dd>{generation.sources[year].name}</dd></div>
                  <div><dt>Revision</dt><dd>{generation.sources[year].revision}</dd></div>
                  <div>
                    <dt>Claim</dt>
                    <dd>
                      {selectedColor.availability[year]
                        ? `${selectedColor.availability[year].label}, code ${selectedColor.availability[year].code}`
                        : "Not listed in the completely reviewed chart"}
                    </dd>
                  </div>
                </dl>
                <a href={generation.sources[year].url} rel="noreferrer" target="_blank">
                  Open official GM PDF <span aria-hidden="true">↗</span>
                </a>
              </article>
            </section>
          )}

          {selectedColor && selectedColor.availability[year] ? (
            <section className="photo-section" id="photos" aria-labelledby="photos-heading">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Photo review</p>
                  <h2 id="photos-heading">{year} {selectedColor.name}</h2>
                </div>
                <p>Photos help identification. They never prove factory availability.</p>
              </div>

              <div className="photo-layout">
                <div>
                  <div className="photo-grid">
                    {staticPhotos.map((photo: PhotoCandidate) => (
                      <article className="photo-option reference-photo" key={photo.id}>
                        <img alt={photo.alt} src={photo.src} />
                        <span>
                          <strong>Rights reference</strong>
                          <small>{photo.credit}</small>
                          <small>{photo.license}</small>
                          <small>Reference only, not a queue selection</small>
                        </span>
                      </article>
                    ))}
                    {apiPhotos.map((photo) => {
                      const optionId = `preference-${photo.id}`;
                      return (
                        <label className="photo-option" key={optionId}>
                          <input
                            checked={selectedPhotos.includes(optionId)}
                            onChange={() => togglePhoto(optionId)}
                            type="checkbox"
                          />
                          <img alt={`${selectedColor.name} upload ${photo.fileName}`} src={photo.imageUrl} />
                          <span>
                            <strong>{photo.fileName}</strong>
                            <small>{photo.credit}</small>
                            <small>{photo.license}</small>
                            <small>Published choice, kept in this browser</small>
                          </span>
                        </label>
                      );
                    })}
                    {visibleStagedPhotos.map((photo) => (
                      <label className="photo-option" key={photo.optionId}>
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
                            aria-label={`Preview unavailable for ${photo.fileName}`}
                            className="photo-preview-placeholder"
                            role="img"
                            style={{ background: selectedColor.swatch }}
                          >
                            Preview stays in the original browser session
                          </span>
                        )}
                        <span>
                          <strong>{photo.fileName}</strong>
                          <small>{photo.credit}</small>
                          <small>Private staged receipt, not a public image</small>
                          <small>
                            Receipt expires{" "}
                            {new Date(photo.receiptExpiresAt).toLocaleString()}
                          </small>
                        </span>
                      </label>
                    ))}
                    {!staticPhotos.length &&
                      !apiPhotos.length &&
                      !visibleStagedPhotos.length && (
                      <div className="empty-photo">
                        <span style={{ background: selectedColor.swatch }} />
                        <strong>No reviewed photo candidates yet</strong>
                        <p>The crawler queue and community uploads feed this panel.</p>
                      </div>
                    )}
                  </div>
                  <button
                    className="primary-button"
                    disabled={queueing}
                    onClick={queueSelection}
                    type="button"
                  >
                    {queueing ? "Queueing…" : "Queue staged uploads"}
                  </button>
                </div>

                <form className="upload-card" onSubmit={uploadPhoto}>
                  <p className="eyebrow">Contribute</p>
                  <h3>Upload your photograph</h3>
                  <p>
                    No account or password required. Uploads stay out of the
                    public gallery until the review and GitHub publication step.
                  </p>
                  <label>
                    Image file
                    <input
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      name="photo"
                      required
                      type="file"
                    />
                    <small>JPEG, PNG, GIF, or WebP. Maximum 8 MB.</small>
                  </label>
                  <label>
                    Credit or photographer
                    <input name="credit" placeholder="Your name, collection, or unknown" required />
                  </label>
                  <label>
                    Rights
                    <select defaultValue="Permission granted for archive use" name="license">
                      <option>Permission granted for archive use</option>
                      <option>CC BY 4.0</option>
                      <option>CC BY-SA 4.0</option>
                      <option>Public domain</option>
                      <option>Rights review required</option>
                    </select>
                  </label>
                  <button className="primary-button" disabled={uploading} type="submit">
                    {uploading ? "Uploading…" : "Stage photograph"}
                  </button>
                </form>
              </div>
              <p className="live-message" aria-live="polite">{photoMessage}</p>
            </section>
          ) : selectedColor ? (
            <section className="photo-section" id="photos" aria-labelledby="photos-heading">
              <div className="pending-panel">
                <p className="eyebrow">Photo review</p>
                <h2 id="photos-heading">No {year} photo queue for this record.</h2>
                <p>
                  {selectedColor.name} is not listed in the cited {year} chart, so
                  uploads cannot be attached to that model-year combination.
                </p>
              </div>
            </section>
          ) : null}
        </>
      )}

      <footer>
        <strong>Chevrolet Color Archive</strong>
        <span>Facts cite charts. Swatches and photographs are interpretive aids.</span>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  );
}
