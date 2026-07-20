const RIGHTS_CLEAR_LICENSES = [
  /\bcc0\b/i,
  /\bpublic domain\b/i,
  /\bcc[- ]?by(?:[- ](?:1\.0|2\.0|2\.5|3\.0|4\.0))?\b/i,
  /\bcc[- ]?by[- ]sa(?:[- ](?:1\.0|2\.0|2\.5|3\.0|4\.0))?\b/i,
];

const RESTRICTED_LICENSE_MARKERS = [
  /\bnoncommercial\b/i,
  /\bno derivatives\b/i,
  /\bcc[- ]?by[- ]nc\b/i,
  /\bcc[- ]?by[- ]nd\b/i,
  /\ball rights reserved\b/i,
];

const MANUAL_REVIEW_MARKERS = [
  /\bgfdl\b/i,
  /\bfair use\b/i,
  /\bcopyrighted\b/i,
];

export function decodeHtmlEntities(value = "") {
  return String(value)
    .replace(/&#(\d+);/g, (_, decimal) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, hexadecimal) =>
      String.fromCodePoint(Number.parseInt(hexadecimal, 16)),
    )
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'");
}

export function htmlToText(value = "") {
  return decodeHtmlEntities(
    String(value)
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function compactLicenseText({ shortName, usageTerms, licenseUrl } = {}) {
  return [shortName, usageTerms, licenseUrl]
    .filter(Boolean)
    .map(htmlToText)
    .join(" ")
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function evaluateRights(license = {}) {
  const combined = compactLicenseText(license);

  if (!combined) {
    return {
      status: "manual-review",
      downloadAllowed: false,
      reason: "No usable license metadata was returned by Wikimedia Commons.",
    };
  }

  if (RESTRICTED_LICENSE_MARKERS.some((pattern) => pattern.test(combined))) {
    return {
      status: "blocked",
      downloadAllowed: false,
      reason:
        "The license metadata includes a noncommercial, no-derivatives, or reserved-rights restriction.",
    };
  }

  if (RIGHTS_CLEAR_LICENSES.some((pattern) => pattern.test(combined))) {
    return {
      status: "rights-clear",
      downloadAllowed: true,
      reason:
        "The license metadata identifies a public-domain, CC0, CC BY, or CC BY-SA work.",
    };
  }

  if (MANUAL_REVIEW_MARKERS.some((pattern) => pattern.test(combined))) {
    return {
      status: "manual-review",
      downloadAllowed: false,
      reason:
        "The reported license requires obligations or factual review beyond the automatic download gate.",
    };
  }

  return {
    status: "manual-review",
    downloadAllowed: false,
    reason: `The reported license is not on the automatic allowlist: ${combined}`,
  };
}

