"use client";
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useState } from "react";
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

const modelSteps = ["Choose model", "Choose year", "Read timeline"];

function availabilityLabel(color: ArchiveColor, year: string) {
  return color.availability[year];
}

export function ArchiveExplorer() {
  const [modelId, setModelId] = useState(defaultModelId);
  const [year, setYear] = useState(defaultYear);
  const [colorId, setColorId] = useState(defaultColorId);
  const [showAll, setShowAll] = useState(false);
  const [apiPhotos, setApiPhotos] = useState<ApiPhoto[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [photoMessage, setPhotoMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  const model = models.find((item) => item.id === modelId) ?? models[0];
  const generation = model.generations[0];
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

  useEffect(() => {
    if (!selectedColor) return;
    fetch(
      `/api/photos?model=${encodeURIComponent(model.id)}&year=${encodeURIComponent(year)}&color_id=${encodeURIComponent(selectedColor.id)}`,
    )
      .then(async (response) => {
        if (!response.ok) return [];
        return (await response.json()) as ApiPhoto[];
      })
      .then(setApiPhotos)
      .catch(() => setApiPhotos([]));
  }, [model.id, selectedColor, year]);

  function chooseModel(nextModelId: string) {
    setModelId(nextModelId);
    setShowAll(false);
    setApiPhotos([]);
    setSelectedPhotos([]);
    setPhotoMessage("");
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
    setYear(nextYear);
    setShowAll(false);
    setApiPhotos([]);
    setSelectedPhotos([]);
    setPhotoMessage("");
    const firstListed = colors.find((color) => color.availability[nextYear]);
    if (!selectedColor?.availability[nextYear] && firstListed) {
      setColorId(firstListed.id);
    }
  }

  function chooseColor(nextColorId: string) {
    setColorId(nextColorId);
    setApiPhotos([]);
    setSelectedPhotos([]);
    setPhotoMessage("");
  }

  function togglePhoto(id: string) {
    setSelectedPhotos((current) =>
      current.includes(id)
        ? current.filter((candidateId) => candidateId !== id)
        : [...current, id],
    );
  }

  async function queueSelection() {
    const storedIds = selectedPhotos
      .filter((id) => id.startsWith("upload-"))
      .map((id) => Number(id.replace("upload-", "")))
      .filter(Number.isFinite);
    if (!selectedPhotos.length) {
      setPhotoMessage("Choose at least one candidate first.");
      return;
    }
    if (!storedIds.length) {
      setPhotoMessage(
        `${selectedPhotos.length} reference candidate selected locally. Static web candidates need rights review before publication.`,
      );
      return;
    }
    const response = await fetch("/api/selections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: model.id,
        year,
        colorId: selectedColor.id,
        candidateIds: storedIds,
      }),
    });
    setPhotoMessage(
      response.ok
        ? "Selection queued for the VPS review and GitHub publishing pipeline."
        : "The selection could not be queued. The archive record is unchanged.",
    );
  }

  async function uploadPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    body.set("model", model.id);
    body.set("year", year);
    body.set("colorId", selectedColor.id);
    body.set("colorName", selectedColor.name);
    setUploading(true);
    setPhotoMessage("");
    try {
      const response = await fetch("/api/photos", { method: "POST", body });
      const payload = (await response.json()) as ApiPhoto & { error?: string };
      if (!response.ok) {
        setPhotoMessage(payload.error ?? "Upload failed.");
        return;
      }
      setApiPhotos((current) => [payload, ...current]);
      setSelectedPhotos((current) => [`upload-${payload.id}`, ...current]);
      form.reset();
      setPhotoMessage("Photograph staged. It is not published until selected and reviewed.");
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
            Pick a model and year, then read every documented factory color across
            a complete timeline. Each claim links back to its chart.
          </p>
        </div>
        <div className="coverage-card" aria-label="Current archive coverage">
          <strong>48</strong>
          <span>verified chart listings</span>
          <small>1967–1969 Camaro</small>
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
              {years.map((item) => {
                const count = colors.filter((color) => color.availability[item]).length;
                return (
                  <button
                    aria-pressed={year === item}
                    className={year === item ? "active" : ""}
                    key={item}
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

          {selectedColor && (
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
                      <label className="photo-option" key={photo.id}>
                        <input
                          checked={selectedPhotos.includes(photo.id)}
                          onChange={() => togglePhoto(photo.id)}
                          type="checkbox"
                        />
                        <img alt={photo.alt} src={photo.src} />
                        <span>
                          <strong>Web candidate</strong>
                          <small>{photo.credit}</small>
                          <small>{photo.license}</small>
                        </span>
                      </label>
                    ))}
                    {apiPhotos.map((photo) => {
                      const optionId = `upload-${photo.id}`;
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
                          </span>
                        </label>
                      );
                    })}
                    {!staticPhotos.length && !apiPhotos.length && (
                      <div className="empty-photo">
                        <span style={{ background: selectedColor.swatch }} />
                        <strong>No reviewed photo candidates yet</strong>
                        <p>The crawler queue and community uploads feed this panel.</p>
                      </div>
                    )}
                  </div>
                  <button className="primary-button" onClick={queueSelection} type="button">
                    Queue selected photos
                  </button>
                </div>

                <form className="upload-card" onSubmit={uploadPhoto}>
                  <p className="eyebrow">Contribute</p>
                  <h3>Upload your photograph</h3>
                  <p>No account or password required. Uploads are staged before GitHub publication.</p>
                  <label>
                    Image file
                    <input
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      name="photo"
                      required
                      type="file"
                    />
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
          )}
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
