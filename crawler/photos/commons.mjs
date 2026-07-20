import { createHash } from "node:crypto";

import { evaluateRights, htmlToText } from "./rights.mjs";

export const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

function metadataValue(extmetadata, key) {
  return extmetadata?.[key]?.value ?? "";
}

function normalizedSha1(value) {
  const sha1 = String(value ?? "").trim().toLowerCase();
  return sha1 || null;
}

function fallbackPageUrl(title) {
  return `https://commons.wikimedia.org/wiki/${encodeURIComponent(title).replaceAll(
    "%3A",
    ":",
  )}`;
}

function candidateIdentity(page, imageInfo) {
  const sha1 = normalizedSha1(imageInfo.sha1);
  if (sha1) {
    return {
      id: `commons-sha1-${sha1.slice(0, 20)}`,
      dedupeKey: `sha1:${sha1}`,
    };
  }

  if (Number.isInteger(page.pageid)) {
    return {
      id: `commons-page-${page.pageid}`,
      dedupeKey: `pageid:${page.pageid}`,
    };
  }

  const url = String(imageInfo.url ?? page.fullurl ?? page.title ?? "");
  const hash = createHash("sha256").update(url).digest("hex");
  return {
    id: `commons-url-${hash.slice(0, 20)}`,
    dedupeKey: `url:${hash}`,
  };
}

export function normalizeCommonsPage({
  page,
  context,
  searchQuery,
  retrievedAt,
  rawSourceRef,
}) {
  const imageInfo = page.imageinfo?.[0];
  if (!imageInfo?.url) {
    return null;
  }

  const extmetadata = imageInfo.extmetadata ?? {};
  const shortName = htmlToText(metadataValue(extmetadata, "LicenseShortName"));
  const usageTerms = htmlToText(metadataValue(extmetadata, "UsageTerms"));
  const licenseUrl = String(
    metadataValue(extmetadata, "LicenseUrl") ||
      metadataValue(extmetadata, "License") ||
      "",
  ).trim();
  const license = {
    shortName,
    usageTerms,
    licenseUrl,
    attributionRequired:
      String(metadataValue(extmetadata, "AttributionRequired")).toLowerCase() !==
      "false",
  };
  const rights = evaluateRights(license);
  const rawCreatorHtml = metadataValue(extmetadata, "Artist");
  const rawCreditHtml = metadataValue(extmetadata, "Credit");
  const titleText =
    htmlToText(metadataValue(extmetadata, "ObjectName")) ||
    String(page.title ?? "").replace(/^File:/i, "");
  const creatorText = htmlToText(rawCreatorHtml) || "Creator not identified";
  const creditText = htmlToText(rawCreditHtml);
  const attributionText = [creatorText, titleText, shortName]
    .filter(Boolean)
    .join(" - ");
  const identity = candidateIdentity(page, imageInfo);

  return {
    ...identity,
    provider: "Wikimedia Commons",
    providerPageId: page.pageid ?? null,
    title: titleText,
    originalPageUrl:
      page.fullurl || imageInfo.descriptionurl || fallbackPageUrl(page.title),
    fileUrl: imageInfo.url,
    thumbnailUrl: imageInfo.thumburl || null,
    creator: {
      display: creatorText,
      rawHtml: rawCreatorHtml || null,
    },
    license: {
      ...license,
      raw: {
        licenseShortName: metadataValue(extmetadata, "LicenseShortName") || null,
        usageTerms: metadataValue(extmetadata, "UsageTerms") || null,
        licenseUrl: metadataValue(extmetadata, "LicenseUrl") || null,
      },
    },
    attribution: {
      text: attributionText,
      credit: creditText || null,
      rawCreditHtml: rawCreditHtml || null,
    },
    dimensions: {
      width: Number.isFinite(imageInfo.width) ? imageInfo.width : null,
      height: Number.isFinite(imageInfo.height) ? imageInfo.height : null,
    },
    bytes: Number.isFinite(imageInfo.size) ? imageInfo.size : null,
    mime: imageInfo.mime || null,
    sha1: normalizedSha1(imageInfo.sha1),
    sourceTimestamp: imageInfo.timestamp || null,
    searchQueries: [searchQuery],
    retrievedAt,
    context,
    rights,
    rawSourceRefs: rawSourceRef ? [rawSourceRef] : [],
  };
}

export function buildCommonsApiUrl({
  query,
  limit,
  continuation,
  endpoint = COMMONS_API,
}) {
  const url = new URL(endpoint);
  const params = {
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: String(Math.min(Math.max(limit, 1), 50)),
    prop: "imageinfo|info",
    inprop: "url",
    iiprop: "url|mime|size|sha1|timestamp|extmetadata",
    iiurlwidth: "1600",
    origin: "*",
  };

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  for (const [key, value] of Object.entries(continuation ?? {})) {
    url.searchParams.set(key, String(value));
  }

  return url;
}

export async function discoverCommonsCandidates({
  query,
  context,
  limit = 12,
  endpoint = COMMONS_API,
  fetchImpl = fetch,
  onRawResponse,
  now = () => new Date().toISOString(),
}) {
  const candidates = [];
  const retrievalTime = now();
  let continuation;
  let pageNumber = 0;

  do {
    pageNumber += 1;
    const remaining = Math.max(limit - candidates.length, 1);
    const url = buildCommonsApiUrl({
      query,
      limit: Math.min(remaining, 50),
      continuation,
      endpoint,
    });
    const response = await fetchImpl(url, {
      headers: {
        accept: "application/json",
        "user-agent":
          "ChevroletColorArchive/0.1 (photo candidate research; Wikimedia Commons API)",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Wikimedia Commons API returned ${response.status} ${response.statusText}`,
      );
    }

    const raw = await response.json();
    const rawSourceRef = onRawResponse
      ? await onRawResponse({
          raw,
          query,
          pageNumber,
          requestUrl: url.href,
          retrievedAt: retrievalTime,
        })
      : null;

    for (const page of raw.query?.pages ?? []) {
      const normalized = normalizeCommonsPage({
        page,
        context,
        searchQuery: query,
        retrievedAt: retrievalTime,
        rawSourceRef,
      });
      if (normalized) {
        candidates.push(normalized);
      }
      if (candidates.length >= limit) {
        break;
      }
    }

    continuation =
      candidates.length < limit && raw.continue ? raw.continue : undefined;
  } while (continuation);

  return {
    candidates,
    retrievedAt: retrievalTime,
    requestCount: pageNumber,
  };
}

