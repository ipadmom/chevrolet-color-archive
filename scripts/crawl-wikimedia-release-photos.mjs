#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const DEFAULT_RELEASE_TAG = "photo-archive-v1";
const DEFAULT_OWNER = "ipadmom";
const DEFAULT_REPOSITORY = "chevrolet-color-archive";
const USER_AGENT =
  "ChevroletColorArchive/0.1 (archival photo research; https://github.com/ipadmom/chevrolet-color-archive)";
const PUBLIC_DOMAIN_URL =
  "https://commons.wikimedia.org/wiki/Commons:Public_domain";
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/tiff",
]);

const VERIFIED_EXACT_YEARS = new Map([
  ["camaro", range(1967, 1992)],
  ["chevelle", range(1964, 1967)],
  ["corvette", range(1954, 1962)],
  ["suburban", [1977]],
  ["tahoe", [1995, 1996, 2001]],
]);

const LEGACY_STATIC_CANDIDATES = [
  {
    id: "commons-1969-camaro-ss396",
    pageTitle: "File:1969 Chevrolet Camaro SS396 (21176690299).jpg",
    modelId: "camaro",
    year: 1969,
    colorId: "hugger-orange",
    priorStatus: "candidate",
    note: "External reference in the original static candidate set; attribution was pending.",
  },
  {
    id: "commons-1976-camaro-silver-f880311b",
    pageTitle: "File:'76 Chevrolet Camaro (Auto classique Laval '10).jpg",
    modelId: "camaro",
    year: 1976,
    colorId: "camaro-second-generation-silver-1976",
    priorStatus: "reviewed",
    note: "Exact year and visible silver were reviewed; factory paint remains unverified.",
  },
  {
    id: "commons-1979-camaro-blue-09e19346",
    pageTitle:
      "File:1979 Chevrolet Camaro Z-28, blue, right side, Golden Super Cruise 2026-07-04.jpg",
    modelId: "camaro",
    year: 1979,
    colorId: "camaro-second-generation-dark-blue-metallic-1973",
    priorStatus: "candidate",
    note: "Blue 1979 Z-28; the factory paint-code classification remains unverified.",
  },
  {
    id: "commons-1980-camaro-red-69ba1917",
    pageTitle: "File:1980 Chevrolet Camaro.jpg",
    modelId: "camaro",
    year: 1980,
    colorId: "camaro-second-generation-red-1975",
    priorStatus: "reviewed",
    note: "Exact year and red body were reviewed; factory paint remains unverified.",
  },
  {
    id: "commons-1981-camaro-black-cc3ffcaf",
    pageTitle: "File:'81 Chevrolet Camaro (Orange Julep).JPG",
    modelId: "camaro",
    year: 1981,
    colorId: "camaro-second-generation-black-1976",
    priorStatus: "candidate",
    note: "Exact year and black body are credible; this remains a fallback candidate.",
  },
];

const HARD_REJECT_TERMS = [
  "advertisement",
  "badge",
  "brochure",
  "dashboard",
  "diecast",
  "drawing",
  "emblem",
  "engine bay",
  "hot wheels",
  "interior",
  "logo",
  "manual",
  "scale model",
  "toy car",
  "wreck",
  "wrecked",
];

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function parseArgs(argv) {
  const options = {
    catalog: path.join(ROOT, "data", "catalog", "chevrolet-us-nameplates.json"),
    manifest: path.join(ROOT, "data", "photos", "commons-release-manifest.json"),
    assetDir: path.join(ROOT, "tmp", "commons-release-assets"),
    owner: DEFAULT_OWNER,
    repository: DEFAULT_REPOSITORY,
    releaseTag: DEFAULT_RELEASE_TAG,
    representatives: 2,
    exactYearLimit: 1,
    searchLimit: 14,
    modelLimit: Number.POSITIVE_INFINITY,
    concurrency: 4,
    downloadConcurrency: 2,
    delayMs: 125,
    maxBytes: 80 * 1024 * 1024,
    download: true,
    refresh: false,
    modelIds: null,
  };

  const numeric = new Set([
    "representatives",
    "exact-year-limit",
    "search-limit",
    "model-limit",
    "concurrency",
    "download-concurrency",
    "delay-ms",
    "max-bytes",
  ]);
  const strings = new Set([
    "catalog",
    "manifest",
    "asset-dir",
    "owner",
    "repository",
    "release-tag",
    "models",
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      printHelp();
      process.exit(0);
    }
    if (argument === "--no-download") {
      options.download = false;
      continue;
    }
    if (argument === "--refresh") {
      options.refresh = true;
      continue;
    }
    if (!argument.startsWith("--")) {
      throw new Error("Unexpected argument: " + argument);
    }
    const key = argument.slice(2);
    if (!numeric.has(key) && !strings.has(key)) {
      throw new Error("Unknown option: " + argument);
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error("Missing value for " + argument);
    }
    index += 1;
    if (numeric.has(key)) {
      const number = Number(value);
      if (!Number.isFinite(number) || number < 0) {
        throw new Error("Invalid number for " + argument + ": " + value);
      }
      const optionKey = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      options[optionKey] = number;
    } else if (key === "models") {
      options.modelIds = new Set(
        value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      );
    } else {
      const optionKey = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      options[optionKey] = value;
    }
  }

  for (const key of ["catalog", "manifest", "assetDir"]) {
    if (!path.isAbsolute(options[key])) {
      options[key] = path.resolve(ROOT, options[key]);
    }
  }
  options.representatives = Math.min(Math.floor(options.representatives), 2);
  options.exactYearLimit = Math.min(Math.floor(options.exactYearLimit), 2);
  options.searchLimit = Math.min(Math.max(Math.floor(options.searchLimit), 1), 50);
  options.concurrency = Math.min(Math.max(Math.floor(options.concurrency), 1), 8);
  options.downloadConcurrency = Math.min(
    Math.max(Math.floor(options.downloadConcurrency), 1),
    4,
  );
  options.modelLimit = Math.floor(options.modelLimit);
  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/crawl-wikimedia-release-photos.mjs [options]

Discovers license-compatible Chevrolet photographs on Wikimedia Commons,
downloads the original bytes into ignored release staging, and writes a
review manifest. It never uploads assets or emits Commons hotlinks for site use.

Options:
  --models id,id          Restrict the catalog model IDs
  --model-limit N         Stop after N selected catalog models
  --representatives N     Strong representative photos per model (max 2)
  --exact-year-limit N    Photos per verified exact model year (max 2)
  --search-limit N        Commons results inspected per query (max 50)
  --concurrency N         Concurrent Commons API workers (max 8)
  --download-concurrency N  Concurrent original downloads (max 4, default 2)
  --delay-ms N            Delay after each Commons API request
  --max-bytes N           Reject originals larger than N bytes
  --asset-dir PATH        Ignored release staging directory
  --manifest PATH         Output review manifest
  --release-tag TAG       Deterministic GitHub Release tag
  --owner OWNER           GitHub owner used for pinned asset URLs
  --repository REPO       GitHub repository used for pinned asset URLs
  --refresh               Redownload existing staged assets
  --no-download           Discovery-only audit (no publishable SHA-256)
`);
}

function htmlToText(value = "") {
  return String(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, number) =>
      String.fromCodePoint(Number.parseInt(number, 10)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, number) =>
      String.fromCodePoint(Number.parseInt(number, 16)),
    )
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function metadataValue(extmetadata, key) {
  return String(extmetadata?.[key]?.value ?? "").trim();
}

function normalizedText(value) {
  return htmlToText(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function licenseDecision(extmetadata) {
  const shortName = htmlToText(metadataValue(extmetadata, "LicenseShortName"));
  const usageTerms = htmlToText(metadataValue(extmetadata, "UsageTerms"));
  const rawCode = htmlToText(metadataValue(extmetadata, "License"));
  const rawUrl = metadataValue(extmetadata, "LicenseUrl");
  const combined = [shortName, usageTerms, rawCode, rawUrl]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!combined) {
    return { allowed: false, reason: "missing license metadata" };
  }
  if (
    /(?:noncommercial|no derivatives|all rights reserved|fair use|cc[- _]?by[- _]?(?:nc|nd)|licenses\/(?:by-nc|by-nd|by-nc-sa|by-nc-nd)\/)/i.test(
      combined,
    )
  ) {
    return { allowed: false, reason: "restricted license" };
  }

  const publicDomain =
    /\b(public domain|cc0|public domain mark)\b/i.test(combined) ||
    /(?:^|\s)pd[-_ ][a-z0-9]/i.test(shortName + " " + rawCode);
  if (publicDomain) {
    return {
      allowed: true,
      family: /cc0/i.test(combined) ? "CC0" : "public-domain",
      name: shortName || usageTerms || rawCode || "Public domain",
      url: rawUrl || PUBLIC_DOMAIN_URL,
      urlSource: rawUrl ? "commons-extmetadata" : "public-domain-fallback",
    };
  }

  const urlMatch = rawUrl.match(
    /^https:\/\/creativecommons\.org\/licenses\/(by|by-sa)\/(1\.0|2\.0|2\.5|3\.0|4\.0)\/?$/i,
  );
  const nameMatch = (shortName + " " + usageTerms + " " + rawCode).match(
    /\bcc[- _]?by([- _]?sa)?[- _]?(1\.0|2\.0|2\.5|3\.0|4\.0)\b/i,
  );
  if (!urlMatch && !nameMatch) {
    return { allowed: false, reason: "license is not on the PD/CC allowlist" };
  }

  const variant = (urlMatch?.[1] || (nameMatch?.[1] ? "by-sa" : "by")).toLowerCase();
  const version = urlMatch?.[2] || nameMatch?.[2];
  return {
    allowed: true,
    family: variant === "by-sa" ? "CC-BY-SA" : "CC-BY",
    name:
      shortName ||
      (variant === "by-sa" ? "CC BY-SA " + version : "CC BY " + version),
    url:
      rawUrl ||
      "https://creativecommons.org/licenses/" + variant + "/" + version + "/",
    urlSource: rawUrl ? "commons-extmetadata" : "license-name-fallback",
  };
}

function modelYears(model) {
  const years = new Set();
  for (const item of model.model_year_ranges ?? []) {
    for (let year = item.start; year <= item.end; year += 1) years.add(year);
  }
  return years;
}

function modelTerms(model) {
  return [model.name, ...(model.aliases ?? [])]
    .map(normalizedText)
    .filter((term) => term.length >= 2)
    .filter((term, index, all) => all.indexOf(term) === index);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function yearEvidence(model, fields) {
  const validYears = modelYears(model);
  const names = [model.name, ...(model.aliases ?? [])]
    .map((name) =>
      escapeRegExp(name)
        .replace(/\\[\s/-]+/g, "[\\s/-]+")
        .replace(/\s+/g, "[\\s_-]+"),
    )
    .filter(Boolean);
  const modelPattern = "(?:" + names.join("|") + ")";
  const chevroletModel = "Chevrolet[\\s_-]+" + modelPattern;
  const fullYear = "(19\\d{2}|20[0-2]\\d)";
  const shortYear = "['’](\\d{2})";
  const patterns = [
    { regex: new RegExp("\\b" + fullYear + "[\\s_-]+" + chevroletModel, "i"), group: 1 },
    { regex: new RegExp("\\b" + chevroletModel + "[\\s_-]+" + fullYear + "\\b", "i"), group: 1 },
    { regex: new RegExp(shortYear + "[\\s_-]+" + chevroletModel, "i"), group: 1, short: true },
  ];

  for (const field of fields) {
    const value = htmlToText(field.value);
    for (const pattern of patterns) {
      const match = value.match(pattern.regex);
      if (!match) continue;
      let year = Number(match[pattern.group]);
      if (pattern.short) year += year <= 26 ? 2000 : 1900;
      if (validYears.has(year)) {
        return {
          year,
          source: field.source,
          evidence: match[0],
        };
      }
    }
  }
  return null;
}

function fallbackPageUrl(title) {
  return (
    "https://commons.wikimedia.org/wiki/" +
    encodeURIComponent(title).replaceAll("%3A", ":")
  );
}

function originalFilename(page, imageInfo) {
  const fromTitle = String(page.title ?? "").replace(/^File:/i, "").trim();
  if (fromTitle) return fromTitle;
  try {
    return decodeURIComponent(new URL(imageInfo.url).pathname.split("/").at(-1));
  } catch {
    return "commons-photo";
  }
}

function makeCandidate(page, model, query, queryKind, targetYear, options) {
  const imageInfo = page.imageinfo?.[0];
  if (!imageInfo?.url) return { rejected: "missing original URL" };
  if (!ALLOWED_MIME.has(String(imageInfo.mime ?? "").toLowerCase())) {
    return { rejected: "unsupported MIME" };
  }
  if (!Number.isFinite(imageInfo.size) || imageInfo.size <= 0) {
    return { rejected: "missing byte length" };
  }
  if (imageInfo.size > options.maxBytes) return { rejected: "original exceeds max bytes" };
  if (
    !Number.isFinite(imageInfo.width) ||
    !Number.isFinite(imageInfo.height) ||
    imageInfo.width < 640 ||
    imageInfo.height < 400
  ) {
    return { rejected: "dimensions below 640x400" };
  }

  const extmetadata = imageInfo.extmetadata ?? {};
  const rights = licenseDecision(extmetadata);
  if (!rights.allowed) return { rejected: rights.reason };

  const objectName = htmlToText(metadataValue(extmetadata, "ObjectName"));
  const title = objectName || originalFilename(page, imageInfo).replace(/\.[^.]+$/, "");
  const description = htmlToText(metadataValue(extmetadata, "ImageDescription"));
  const categories = htmlToText(metadataValue(extmetadata, "Categories"));
  const authorRawHtml = metadataValue(extmetadata, "Artist");
  const author = htmlToText(authorRawHtml);
  if (!author) return { rejected: "missing author/artist metadata" };
  const creditRawHtml = metadataValue(extmetadata, "Credit");
  const credit = htmlToText(creditRawHtml);
  const combined = normalizedText([title, description, categories].join(" "));
  if (!combined.includes("chevrolet")) return { rejected: "Chevrolet not explicit" };

  const terms = modelTerms(model);
  const matchingTerms = terms.filter((term) => combined.includes(term));
  if (matchingTerms.length === 0) return { rejected: "model name/alias not explicit" };
  const rejectScope = normalizedText([title, categories].join(" "));
  if (HARD_REJECT_TERMS.some((term) => rejectScope.includes(term))) {
    return { rejected: "non-vehicle-photo term" };
  }

  const titleNormalized = normalizedText(title);
  const descriptionNormalized = normalizedText(description);
  const primary = normalizedText(model.name);
  const year = yearEvidence(model, [
    { source: "title", value: title },
    { source: "description", value: description },
    { source: "commons-categories", value: categories },
  ]);
  if (queryKind === "exact_year" && year?.year !== targetYear) {
    return { rejected: "target year is not explicit in metadata" };
  }

  let score = 0;
  if (titleNormalized.includes(primary)) score += 60;
  else if (matchingTerms.some((term) => titleNormalized.includes(term))) score += 45;
  if (titleNormalized.includes("chevrolet")) score += 30;
  if (descriptionNormalized.includes(primary)) score += 18;
  if (descriptionNormalized.includes("chevrolet")) score += 8;
  if (imageInfo.width >= 1280 && imageInfo.height >= 720) score += 8;
  else score += 4;
  if (imageInfo.width / imageInfo.height >= 1.15) score += 4;
  if (year) score += 8;
  if (queryKind === "exact_year") score += 50;
  if (/\b(quality image|featured picture|valued image)\b/i.test(combined)) score += 5;
  if (/\b(race|racing|competition|modified|custom|police)\b/i.test(combined)) score -= 14;
  if (/\b(close up|closeup|detail)\b/i.test(combined)) score -= 18;

  const sha1 = String(imageInfo.sha1 ?? "").trim().toLowerCase() || null;
  const identity = sha1
    ? "commons-sha1-" + sha1.slice(0, 20)
    : "commons-page-" + page.pageid;
  return {
    candidate: {
      id: identity,
      dedupeKey: sha1 ? "sha1:" + sha1 : "pageid:" + page.pageid,
      provider: "Wikimedia Commons",
      providerPageId: page.pageid ?? null,
      sourcePageUrl:
        page.fullurl || imageInfo.descriptionurl || fallbackPageUrl(page.title),
      sourceOriginalUrl: imageInfo.url,
      sourceTimestamp: imageInfo.timestamp || null,
      originalFilename: originalFilename(page, imageInfo),
      title,
      description,
      author,
      authorRawHtml: authorRawHtml || null,
      credit: credit || null,
      creditRawHtml: creditRawHtml || null,
      license: rights.name,
      licenseFamily: rights.family,
      licenseUrl: rights.url,
      licenseUrlSource: rights.urlSource,
      usageTerms: htmlToText(metadataValue(extmetadata, "UsageTerms")) || null,
      attributionRequired:
        metadataValue(extmetadata, "AttributionRequired").toLowerCase() !== "false",
      attribution: [author, title, rights.name].filter(Boolean).join(" - "),
      explicitYear: year?.year ?? null,
      explicitYearSource: year?.source ?? null,
      explicitYearEvidence: year?.evidence ?? null,
      commonsSha1: sha1,
      mime: imageInfo.mime,
      bytes: imageInfo.size,
      width: imageInfo.width,
      height: imageInfo.height,
      matchingTerms,
      modelQueries: [query],
      score,
    },
  };
}

function mergeCandidates(candidates) {
  const merged = new Map();
  for (const candidate of candidates) {
    const prior = merged.get(candidate.dedupeKey);
    if (!prior) {
      merged.set(candidate.dedupeKey, structuredClone(candidate));
      continue;
    }
    prior.score = Math.max(prior.score, candidate.score);
    prior.modelQueries = [...new Set([...prior.modelQueries, ...candidate.modelQueries])];
  }
  return [...merged.values()].sort(
    (left, right) =>
      right.score - left.score ||
      (left.providerPageId ?? Number.MAX_SAFE_INTEGER) -
        (right.providerPageId ?? Number.MAX_SAFE_INTEGER) ||
      left.title.localeCompare(right.title),
  );
}

function buildSearchUrl(query, limit) {
  const url = new URL(COMMONS_API);
  const params = {
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: String(limit),
    prop: "imageinfo|info",
    inprop: "url",
    iiprop: "url|mime|size|sha1|timestamp|extmetadata",
    iiurlwidth: "1600",
    origin: "*",
  };
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url;
}

function buildTitlesUrl(titles) {
  const url = new URL(COMMONS_API);
  const params = {
    action: "query",
    format: "json",
    formatversion: "2",
    titles: titles.join("|"),
    prop: "imageinfo|info",
    inprop: "url",
    iiprop: "url|mime|size|sha1|timestamp|extmetadata",
    iiurlwidth: "1600",
    redirects: "1",
    origin: "*",
  };
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url;
}

async function fetchWithRetry(url, options = {}, attempts = 7) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          accept: options.accept ?? "application/json",
          "user-agent": USER_AGENT,
          ...(options.headers ?? {}),
        },
      });
      if (response.ok) return response;
      const error = new Error(
        "HTTP " + response.status + " " + response.statusText + " for " + url,
      );
      if (response.status !== 429 && response.status < 500) throw error;
      lastError = error;
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("retry-after"));
        const cooldown = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : Math.min(30_000 * (attempt + 1), 120_000);
        await sleep(cooldown);
        continue;
      }
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
    await sleep(750 * 2 ** attempt);
  }
  throw lastError;
}

async function commonsSearch(query, options, runStats) {
  const url = buildSearchUrl(query, options.searchLimit);
  const response = await fetchWithRetry(url.href);
  const raw = await response.json();
  runStats.apiRequests += 1;
  await sleep(options.delayMs);
  return raw.query?.pages ?? [];
}

async function commonsTitles(titles, options, runStats) {
  const response = await fetchWithRetry(buildTitlesUrl(titles).href);
  const raw = await response.json();
  runStats.apiRequests += 1;
  await sleep(options.delayMs);
  return raw.query?.pages ?? [];
}

async function discoverModel(model, options, runStats) {
  const primaryQuery = 'intitle:"Chevrolet ' + model.name + '" filetype:bitmap';
  const queryRecords = [];
  const accepted = [];

  async function inspect(query, kind, targetYear = null) {
    try {
      const pages = await commonsSearch(query, options, runStats);
      const rejections = {};
      let rightsEligible = 0;
      for (const page of pages) {
        const normalized = makeCandidate(
          page,
          model,
          query,
          kind,
          targetYear,
          options,
        );
        if (normalized.candidate) {
          rightsEligible += 1;
          accepted.push(normalized.candidate);
        } else {
          rejections[normalized.rejected] = (rejections[normalized.rejected] ?? 0) + 1;
        }
      }
      queryRecords.push({
        kind,
        target_year: targetYear,
        query,
        returned: pages.length,
        eligible: rightsEligible,
        rejections,
      });
    } catch (error) {
      queryRecords.push({
        kind,
        target_year: targetYear,
        query,
        returned: 0,
        eligible: 0,
        error: String(error?.message ?? error),
      });
      runStats.apiErrors += 1;
    }
  }

  await inspect(primaryQuery, "representative");
  let representativePool = mergeCandidates(accepted).filter((item) => item.score >= 70);
  if (representativePool.length < options.representatives) {
    const fallback = (model.aliases ?? []).find(
      (alias) => normalizedText(alias) !== normalizedText(model.name),
    );
    if (fallback) {
      await inspect('intitle:"Chevrolet ' + fallback + '" filetype:bitmap', "representative");
      representativePool = mergeCandidates(accepted).filter((item) => item.score >= 70);
    }
  }

  const representatives = representativePool.slice(0, options.representatives);
  const exactYears = [];
  for (const year of VERIFIED_EXACT_YEARS.get(model.id) ?? []) {
    const beforeCount = accepted.length;
    const query = '"' + year + " Chevrolet " + model.name + '" filetype:bitmap';
    await inspect(query, "exact_year", year);
    const yearPool = mergeCandidates(accepted.slice(beforeCount))
      .filter((item) => item.explicitYear === year)
      .filter((item) => item.score >= 110)
      .slice(0, options.exactYearLimit);
    exactYears.push({ year, candidates: yearPool, query });
  }

  return { model, queryRecords, representatives, exactYears };
}

function extensionFor(candidate) {
  const titleExtension = path.extname(candidate.originalFilename).toLowerCase();
  if (/^\.(?:jpe?g|png|webp|gif|tiff?)$/.test(titleExtension)) {
    return titleExtension === ".jpeg" ? ".jpg" : titleExtension;
  }
  return {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/tiff": ".tif",
  }[candidate.mime];
}

function safeAssetName(candidate) {
  const extension = extensionFor(candidate) || ".bin";
  const stem = path
    .basename(candidate.originalFilename, path.extname(candidate.originalFilename))
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  const page = candidate.providerPageId ?? "page";
  const sourceHash = candidate.commonsSha1?.slice(0, 12) ??
    createHash("sha256").update(candidate.sourceOriginalUrl).digest("hex").slice(0, 12);
  return "commons-" + page + "-" + sourceHash + "-" + (stem || "photo") + extension;
}

async function sha256File(file) {
  const bytes = await readFile(file);
  return {
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
  };
}

async function stageCandidate(candidate, options, runStats) {
  const assetName = safeAssetName(candidate);
  const destination = path.join(options.assetDir, assetName);
  let result;
  if (!options.refresh) {
    try {
      const fileStat = await stat(destination);
      if (fileStat.isFile() && fileStat.size === candidate.bytes) {
        result = await sha256File(destination);
        runStats.reusedAssets += 1;
      }
    } catch {
      // Missing staged file is the normal first-run case.
    }
  }

  if (!result) {
    const sourceUrl = new URL(candidate.sourceOriginalUrl);
    if (sourceUrl.protocol !== "https:" || sourceUrl.hostname !== "upload.wikimedia.org") {
      throw new Error("Blocked non-Commons original URL: " + sourceUrl.href);
    }
    const response = await fetchWithRetry(sourceUrl.href, {
      accept: candidate.mime,
      headers: { accept: candidate.mime },
    });
    const responseMime = String(response.headers.get("content-type") ?? "")
      .split(";")[0]
      .toLowerCase();
    if (!ALLOWED_MIME.has(responseMime)) {
      throw new Error("Unexpected download MIME " + responseMime + " for " + sourceUrl.href);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length !== candidate.bytes) {
      throw new Error(
        "Commons size changed for " + candidate.id + ": API " + candidate.bytes +
          ", download " + bytes.length,
      );
    }
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const temporary = destination + ".tmp-" + process.pid;
    await writeFile(temporary, bytes, { flag: "wx" });
    await rename(temporary, destination);
    result = { sha256, bytes: bytes.length };
    runStats.downloadedAssets += 1;
  }

  return {
    ...candidate,
    status: "unreviewed_candidate",
    sha256: result.sha256,
    stagedBytes: result.bytes,
    releaseTag: options.releaseTag,
    releaseAssetName: assetName,
    releaseAssetUrl:
      "https://github.com/" + options.owner + "/" + options.repository +
      "/releases/download/" + encodeURIComponent(options.releaseTag) + "/" +
      encodeURIComponent(assetName),
    siteAssetUrl:
      "https://github.com/" + options.owner + "/" + options.repository +
      "/releases/download/" + encodeURIComponent(options.releaseTag) + "/" +
      encodeURIComponent(assetName),
    localPath: path.relative(ROOT, destination).replaceAll(path.sep, "/"),
  };
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function addSelection(assetMap, candidate, selection) {
  const prior = assetMap.get(candidate.dedupeKey);
  if (prior) {
    prior.modelQueries = [...new Set([...prior.modelQueries, ...candidate.modelQueries])];
    prior.selectionContexts.push(selection);
    return prior;
  }
  const asset = {
    ...candidate,
    selectionContexts: [selection],
  };
  assetMap.set(candidate.dedupeKey, asset);
  return asset;
}

async function addLegacySelections(assetMap, catalogById, options, runStats) {
  const pages = await commonsTitles(
    LEGACY_STATIC_CANDIDATES.map((item) => item.pageTitle),
    options,
    runStats,
  );
  const pageByNormalizedTitle = new Map(
    pages.map((page) => [normalizedText(String(page.title).replace(/^File:/i, "")), page]),
  );
  const coverage = [];
  for (const legacy of LEGACY_STATIC_CANDIDATES) {
    const page = pageByNormalizedTitle.get(
      normalizedText(legacy.pageTitle.replace(/^File:/i, "")),
    );
    const model = catalogById.get(legacy.modelId);
    if (!page || !model) {
      coverage.push({ legacy_id: legacy.id, staged: false, reason: "Commons page not returned" });
      continue;
    }
    const normalized = makeCandidate(
      page,
      model,
      "exact legacy page title: " + legacy.pageTitle,
      "legacy_static_candidate",
      legacy.year,
      options,
    );
    if (!normalized.candidate) {
      coverage.push({ legacy_id: legacy.id, staged: false, reason: normalized.rejected });
      continue;
    }
    if (normalized.candidate.explicitYear !== legacy.year) {
      coverage.push({ legacy_id: legacy.id, staged: false, reason: "legacy year not explicit" });
      continue;
    }
    addSelection(assetMap, normalized.candidate, {
      kind: "legacy_static_candidate",
      model_id: legacy.modelId,
      exact_year: legacy.year,
      legacy_id: legacy.id,
      legacy_color_id: legacy.colorId,
      legacy_prior_status: legacy.priorStatus,
      legacy_note: legacy.note,
    });
    coverage.push({
      legacy_id: legacy.id,
      staged: true,
      candidate_id: normalized.candidate.id,
    });
  }
  return coverage;
}

function modelManifestRecord(discovery, assetMap) {
  const representativeIds = [];
  const exactYears = [];
  for (const candidate of discovery.representatives) {
    representativeIds.push(assetMap.get(candidate.dedupeKey)?.id);
  }
  for (const item of discovery.exactYears) {
    exactYears.push({
      year: item.year,
      asset_ids: item.candidates
        .map((candidate) => assetMap.get(candidate.dedupeKey)?.id)
        .filter(Boolean),
      query: item.query,
    });
  }
  const assetIds = [...new Set([
    ...representativeIds,
    ...exactYears.flatMap((item) => item.asset_ids),
    ...[...assetMap.values()]
      .filter((asset) =>
        asset.selectionContexts.some((context) => context.model_id === discovery.model.id),
      )
      .map((asset) => asset.id),
  ])].filter(Boolean);
  return {
    model_id: discovery.model.id,
    name: discovery.model.name,
    vehicle_class: discovery.model.vehicle_class,
    model_year_ranges: discovery.model.model_year_ranges,
    search_queries: discovery.queryRecords,
    representative_asset_ids: representativeIds.filter(Boolean),
    exact_year_candidates: exactYears,
    asset_ids: assetIds,
  };
}

async function writeJsonAtomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = file + ".tmp-" + process.pid;
  await writeFile(temporary, JSON.stringify(value, null, 2) + "\n", "utf8");
  await rename(temporary, file);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const catalog = JSON.parse(await readFile(options.catalog, "utf8"));
  let models = catalog.models ?? [];
  if (options.modelIds) {
    const missing = [...options.modelIds].filter(
      (id) => !models.some((model) => model.id === id),
    );
    if (missing.length) throw new Error("Unknown model IDs: " + missing.join(", "));
    models = models.filter((model) => options.modelIds.has(model.id));
  }
  models = models.slice(0, options.modelLimit);
  const catalogById = new Map((catalog.models ?? []).map((model) => [model.id, model]));
  const runStats = {
    apiRequests: 0,
    apiErrors: 0,
    downloadedAssets: 0,
    reusedAssets: 0,
  };
  const startedAt = new Date().toISOString();

  await mkdir(options.assetDir, { recursive: true });
  console.log(
    "Discovering Commons photos for " + models.length + " Chevrolet models...",
  );
  const discoveries = await mapLimit(models, options.concurrency, async (model, index) => {
    const result = await discoverModel(model, options, runStats);
    console.log(
      "[" + (index + 1) + "/" + models.length + "] " + model.name + ": " +
        result.representatives.length + " representative, " +
        result.exactYears.reduce((sum, item) => sum + item.candidates.length, 0) +
        " exact-year",
    );
    return result;
  });

  const assetMap = new Map();
  for (const discovery of discoveries) {
    for (const candidate of discovery.representatives) {
      addSelection(assetMap, candidate, {
        kind: "representative",
        model_id: discovery.model.id,
        exact_year: candidate.explicitYear,
      });
    }
    for (const exactYear of discovery.exactYears) {
      for (const candidate of exactYear.candidates) {
        addSelection(assetMap, candidate, {
          kind: "exact_year",
          model_id: discovery.model.id,
          exact_year: exactYear.year,
        });
      }
    }
  }

  const legacyCoverage = await addLegacySelections(
    assetMap,
    catalogById,
    options,
    runStats,
  );
  const legacyFailures = legacyCoverage.filter((item) => !item.staged);
  if (legacyFailures.length) {
    throw new Error(
      "Legacy static candidate migration is incomplete: " +
        legacyFailures.map((item) => item.legacy_id + " (" + item.reason + ")").join(", "),
    );
  }

  const selected = [...assetMap.values()].sort(
    (left, right) =>
      (left.providerPageId ?? Number.MAX_SAFE_INTEGER) -
        (right.providerPageId ?? Number.MAX_SAFE_INTEGER) ||
      left.id.localeCompare(right.id),
  );
  console.log("Staging " + selected.length + " unique Commons originals...");
  let stagedAssets;
  if (options.download) {
    stagedAssets = await mapLimit(
      selected,
      options.downloadConcurrency,
      async (candidate, index) => {
      const staged = await stageCandidate(candidate, options, runStats);
      if ((index + 1) % 20 === 0 || index + 1 === selected.length) {
        console.log("Staged " + (index + 1) + "/" + selected.length);
      }
      return staged;
      },
    );
  } else {
    stagedAssets = selected.map((candidate) => ({
      ...candidate,
      status: "unreviewed_candidate",
      sha256: null,
      stagedBytes: 0,
      releaseTag: options.releaseTag,
      releaseAssetName: safeAssetName(candidate),
      releaseAssetUrl: null,
      siteAssetUrl: null,
      localPath: null,
    }));
  }

  const stagedByKey = new Map(stagedAssets.map((asset) => [asset.dedupeKey, asset]));
  for (const discovery of discoveries) {
    discovery.representatives = discovery.representatives.map(
      (candidate) => stagedByKey.get(candidate.dedupeKey) ?? candidate,
    );
    discovery.exactYears = discovery.exactYears.map((item) => ({
      ...item,
      candidates: item.candidates.map(
        (candidate) => stagedByKey.get(candidate.dedupeKey) ?? candidate,
      ),
    }));
  }
  for (const key of assetMap.keys()) {
    const staged = stagedByKey.get(key);
    if (staged) assetMap.set(key, staged);
  }

  const totalBytes = stagedAssets.reduce((sum, asset) => sum + asset.stagedBytes, 0);
  const selectedAssetNames = new Set(stagedAssets.map((asset) => asset.releaseAssetName));
  const directoryFiles = [];
  for (const entry of await readdir(options.assetDir, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name.includes(".tmp-")) continue;
    const fileStat = await stat(path.join(options.assetDir, entry.name));
    directoryFiles.push({ name: entry.name, bytes: fileStat.size });
  }
  const unreferencedFiles = directoryFiles.filter(
    (entry) => !selectedAssetNames.has(entry.name),
  );
  const finishedAt = new Date().toISOString();
  const manifest = {
    schema_version: 1,
    archive: "Chevrolet Color Archive",
    generated_at: finishedAt,
    scope: {
      market: catalog.market,
      catalog_models_available: catalog.models?.length ?? 0,
      catalog_models_searched: models.length,
      representative_limit_per_model: options.representatives,
      exact_year_limit: options.exactYearLimit,
      verified_exact_year_targets: Object.fromEntries(VERIFIED_EXACT_YEARS),
    },
    provider: {
      name: "Wikimedia Commons",
      api: COMMONS_API,
      metadata_contract: "MediaWiki imageinfo plus extmetadata",
    },
    github_release: {
      owner: options.owner,
      repository: options.repository,
      tag: options.releaseTag,
      published: false,
      base_url:
        "https://github.com/" + options.owner + "/" + options.repository +
        "/releases/download/" + encodeURIComponent(options.releaseTag) + "/",
    },
    policy: {
      status: "unreviewed_candidate",
      hotlinks_allowed: false,
      site_url_field: "site_asset_url",
      source_original_url_use: "archival acquisition and attribution only",
      automatic_license_allowlist: [
        "Public domain",
        "CC0",
        "CC BY 1.0/2.0/2.5/3.0/4.0",
        "CC BY-SA 1.0/2.0/2.5/3.0/4.0",
      ],
      exact_year_rule:
        "A model year is recorded only when adjacent Chevrolet/model text in Commons title, description, or categories states it explicitly.",
      review_required_before_site_publication: true,
    },
    run: {
      started_at: startedAt,
      finished_at: finishedAt,
      api_requests: runStats.apiRequests,
      api_errors: runStats.apiErrors,
      unique_assets_selected: stagedAssets.length,
      assets_downloaded: runStats.downloadedAssets,
      assets_reused: runStats.reusedAssets,
      staged_asset_count: options.download ? stagedAssets.length : 0,
      staged_total_bytes: options.download ? totalBytes : 0,
      staged_directory: path.relative(ROOT, options.assetDir).replaceAll(path.sep, "/"),
      staging_directory_file_count: options.download ? directoryFiles.length : 0,
      staging_directory_total_bytes: options.download
        ? directoryFiles.reduce((sum, entry) => sum + entry.bytes, 0)
        : 0,
      unreferenced_staged_file_count: options.download ? unreferencedFiles.length : 0,
      unreferenced_staged_total_bytes: options.download
        ? unreferencedFiles.reduce((sum, entry) => sum + entry.bytes, 0)
        : 0,
      upload_rule: "Upload only release_asset_name values listed in assets.",
    },
    legacy_static_candidate_migration: legacyCoverage,
    models: discoveries.map((discovery) => modelManifestRecord(discovery, assetMap)),
    assets: stagedAssets.map((asset) => ({
      candidate_id: asset.id,
      status: asset.status,
      selection_kinds: [...new Set(asset.selectionContexts.map((item) => item.kind))],
      selection_contexts: asset.selectionContexts,
      model_ids: [...new Set(asset.selectionContexts.map((item) => item.model_id))],
      explicit_year: asset.explicitYear,
      explicit_year_source: asset.explicitYearSource,
      explicit_year_evidence: asset.explicitYearEvidence,
      source_page_url: asset.sourcePageUrl,
      source_original_url: asset.sourceOriginalUrl,
      source_timestamp: asset.sourceTimestamp,
      author: asset.author,
      author_raw_html: asset.authorRawHtml,
      credit: asset.credit,
      credit_raw_html: asset.creditRawHtml,
      license: asset.license,
      license_family: asset.licenseFamily,
      license_url: asset.licenseUrl,
      license_url_source: asset.licenseUrlSource,
      usage_terms: asset.usageTerms,
      attribution_required: asset.attributionRequired,
      attribution: asset.attribution,
      description: asset.description,
      model_queries: asset.modelQueries,
      score: asset.score,
      sha256: asset.sha256,
      commons_sha1: asset.commonsSha1,
      mime: asset.mime,
      width: asset.width,
      height: asset.height,
      bytes: asset.stagedBytes,
      original_filename: asset.originalFilename,
      release_tag: asset.releaseTag,
      release_asset_name: asset.releaseAssetName,
      release_asset_url: asset.releaseAssetUrl,
      site_asset_url: asset.siteAssetUrl,
      local_path: asset.localPath,
    })),
  };
  await writeJsonAtomic(options.manifest, manifest);
  console.log(
    JSON.stringify(
      {
        manifest: path.relative(ROOT, options.manifest).replaceAll(path.sep, "/"),
        catalog_models_searched: models.length,
        staged_asset_count: manifest.run.staged_asset_count,
        staged_total_bytes: manifest.run.staged_total_bytes,
        staged_total_mib: Number((manifest.run.staged_total_bytes / 1024 / 1024).toFixed(2)),
        legacy_static_candidates_staged: legacyCoverage.length,
        api_requests: runStats.apiRequests,
        api_errors: runStats.apiErrors,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exitCode = 1;
});
