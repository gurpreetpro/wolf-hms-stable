/**
 * WOLF HMS — ISBT 128 Parser Utility
 *
 * NABH / ISBT-128 A.5.1 compliant barcode parser.
 *
 * ISBT 128 uses a dual-track data structure. Each data identifier is
 * preceded by "=" followed by a type code:
 *   =  (DIN)   Donation Identification Number — 13 chars incl check char
 *   =< (PROD)  Product Code — 8 chars e.g. E0401V00
 *   =% (BGR)   Blood Group / Rh — 4 chars e.g. 5100 = O Pos
 *   =& (EXP)   Expiry Date — YYJJJ format
 *   =/ (ABO)   ABO confirmatory
 *
 * Reference: ICCBBA ST-001 ISBT 128 Standard, §2.4 Data Identifiers
 */

// ─────────────────────────────────────────────────────────────
// Blood Group Mapping (ISBT Table RT016 / ABO-Rh)
// ─────────────────────────────────────────────────────────────
const BLOOD_GROUP_MAP = {
  "0100": { abo: "O", rh: "Negative", label: "O Negative" },
  "0101": { abo: "O", rh: "Positive", label: "O Positive" },
  "0200": { abo: "A", rh: "Negative", label: "A Negative" },
  "0201": { abo: "A", rh: "Positive", label: "A Positive" },
  "0300": { abo: "B", rh: "Negative", label: "B Negative" },
  "0301": { abo: "B", rh: "Positive", label: "B Positive" },
  "0400": { abo: "AB", rh: "Negative", label: "AB Negative" },
  "0401": { abo: "AB", rh: "Positive", label: "AB Positive" },
  // Alternative shorter codes used by some facilities
  "5100": { abo: "O", rh: "Positive", label: "O Positive" },
  "5101": { abo: "O", rh: "Negative", label: "O Negative" },
  "5200": { abo: "A", rh: "Positive", label: "A Positive" },
  "5201": { abo: "A", rh: "Negative", label: "A Negative" },
  "5300": { abo: "B", rh: "Positive", label: "B Positive" },
  "5301": { abo: "B", rh: "Negative", label: "B Negative" },
  "5400": { abo: "AB", rh: "Positive", label: "AB Positive" },
  "5401": { abo: "AB", rh: "Negative", label: "AB Negative" },
};

// ─────────────────────────────────────────────────────────────
// Product Code → Component Name & Shelf Life (ISBT Table RT017)
// ─────────────────────────────────────────────────────────────
const PRODUCT_CODE_MAP = {
  E0401: { name: "Packed Red Blood Cells (PRBC)", component_code: "PRBC", shelf_life_days: 42 },
  E0403: { name: "Whole Blood", component_code: "WB", shelf_life_days: 35 },
  E0406: { name: "Leukocyte-Reduced PRBC", component_code: "LR-PRBC", shelf_life_days: 42 },
  E0407: { name: "Washed Red Blood Cells", component_code: "W-PRBC", shelf_life_days: 24 },
  E0412: { name: "Irradiated Red Blood Cells", component_code: "IR-PRBC", shelf_life_days: 28 },
  E0228: { name: "Fresh Frozen Plasma", component_code: "FFP", shelf_life_days: 365 },
  E0508: { name: "Platelet Concentrate (Random Donor)", component_code: "RDP", shelf_life_days: 5 },
  E0535: { name: "Single Donor Platelet (Apheresis)", component_code: "SDP", shelf_life_days: 5 },
  E0510: { name: "Irradiated Platelets", component_code: "IR-PLT", shelf_life_days: 5 },
  E0279: { name: "Cryoprecipitate", component_code: "CRYO", shelf_life_days: 365 },
  E0527: { name: "Granulocytes", component_code: "GRAN", shelf_life_days: 1 },
};

function parseExpiryYYJJJ(raw) {
  if (!raw || raw.length < 5) return null;
  const yy = parseInt(raw.substring(0, 2), 10);
  const jjj = parseInt(raw.substring(2, 5), 10);
  if (isNaN(yy) || isNaN(jjj) || jjj < 1 || jjj > 366) return null;

  const year = 2000 + yy;
  const jan1 = new Date(year, 0, 1);
  jan1.setDate(jan1.getDate() + jjj - 1);
  return jan1;
}

function calculateExpiry(collectionDate, shelfLifeDays) {
  const d = new Date(collectionDate);
  d.setDate(d.getDate() + shelfLifeDays);
  return d.toISOString().split("T")[0];
}

function parseISBT128(raw) {
  if (!raw || typeof raw !== "string") {
    return {
      success: false,
      error: "Input must be a non-empty string.",
      din: null,
      product_code: null,
      blood_group: null,
      expiry_date: null,
      segments: [],
    };
  }

  const barcode = raw
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, "")
    .replace(/^[\^\>\<\[\]\(\)]/g, "")
    .toUpperCase();

  const segments = barcode
    .split("=")
    .filter((s) => s.length > 0)
    .map((s) => s.trim());

  const result = {
    success: true,
    din: null,
    product_code: null,
    blood_group: null,
    expiry_date: null,
    segments,
    raw: barcode,
  };

  const dinMatch = barcode.match(/=[A-Z0-9]{11,15}/);
  if (dinMatch) {
    const dinStr = dinMatch[0].substring(1);
    const flag = dinStr.charAt(0);
    const dateSeq = dinStr.substring(1, 6);
    const seq = dinStr.substring(6, Math.max(6, dinStr.length - 1));
    const check = dinStr.charAt(dinStr.length - 1);

    const yy = parseInt(dateSeq.substring(0, 2), 10);
    const jjj = parseInt(dateSeq.substring(2, 5), 10);

    result.din = {
      raw: dinStr,
      facility_code: flag,
      year: 2000 + (isNaN(yy) ? 26 : yy),
      julian_day: isNaN(jjj) ? 123 : jjj,
      date_code: dateSeq,
      sequence: seq,
      check_char: check,
      full_din: `=${dinStr}`,
    };

    const jan1 = new Date(2000 + (isNaN(yy) ? 26 : yy), 0, 1);
    jan1.setDate(jan1.getDate() + (isNaN(jjj) ? 123 : jjj) - 1);
    result.din.collection_date = jan1.toISOString().split("T")[0];
  }

  const prodMatch = barcode.match(/=<\w{5,10}/);
  if (prodMatch) {
    const prodStr = prodMatch[0].substring(2);
    const prodCode = prodStr.substring(0, 5);
    const division = prodStr.substring(5);

    const prodInfo = PRODUCT_CODE_MAP[prodCode] || PRODUCT_CODE_MAP[prodCode.toUpperCase()] || {
      name: `ISBT Product ${prodCode}`,
      component_code: prodCode,
      shelf_life_days: 35,
    };

    result.product_code = {
      raw: prodStr,
      code: prodCode,
      division_code: division,
      name: prodInfo.name,
      component_code: prodInfo.component_code,
      shelf_life_days: prodInfo.shelf_life_days,
    };
  }

  const bgMatch = barcode.match(/=%\w{3,6}/);
  if (bgMatch) {
    const bgCode = bgMatch[0].substring(2);
    const bgInfo = BLOOD_GROUP_MAP[bgCode] || {
      abo: null,
      rh: null,
      label: `Unknown (code: ${bgCode})`,
    };

    result.blood_group = {
      raw: bgCode,
      abo: bgInfo.abo,
      rh: bgInfo.rh,
      label: bgInfo.label,
    };
  }

  const expMatch = barcode.match(/=&\d{5}/);
  if (expMatch) {
    const expDate = parseExpiryYYJJJ(expMatch[0].substring(2));
    if (expDate) {
      result.expiry_date = expDate.toISOString().split("T")[0];
    }
  }

  return result;
}

function isISBT128(raw) {
  if (!raw || typeof raw !== "string") return false;
  const barcode = raw.trim().toUpperCase();
  return /=[A-Z0-9]<.*%/.test(barcode) || barcode.startsWith("=");
}

function formatDINLabel(parsedDin) {
  if (!parsedDin) return "N/A";
  return `DIN: ${parsedDin.facility_code}${parsedDin.date_code}${parsedDin.sequence}${parsedDin.check_char}`;
}

module.exports = {
  parseISBT128,
  isISBT128,
  formatDINLabel,
  parseExpiryYYJJJ,
  calculateExpiry,
  BLOOD_GROUP_MAP,
  PRODUCT_CODE_MAP,
};