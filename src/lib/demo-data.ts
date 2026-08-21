// Mock domain data for the Tract platform.
// Explicit synthetic fixtures for local demonstration mode only.

export type RecoveryStatus = "under" | "on-track" | "over" | "at-risk";

export interface Program {
  id: string;
  code: string; // OEM program code
  name: string; // Carline / vehicle program
  oem: string;
  platform: string;
  sop: string; // Start of production
  eop: string; // End of production
  totalAmortized: number; // Total negotiated $ to recover
  recoveredToDate: number;
  forecastRecovery: number; // development scenario total by EOP
  contractedVolume: number;
  actualVolume: number;
  forecastVolume: number;
  status: RecoveryStatus;
  partsCount: number;
}

export const programs: Program[] = [
  {
    id: "p-001",
    code: "CX-482",
    name: "Ford F-150 Lightning",
    oem: "Ford",
    platform: "TE1 BEV",
    sop: "2024-03-01",
    eop: "2029-08-31",
    totalAmortized: 124_000_000,
    recoveredToDate: 48_200_000,
    forecastRecovery: 137_000_000,
    contractedVolume: 480_000,
    actualVolume: 168_400,
    forecastVolume: 531_000,
    status: "over",
    partsCount: 142,
  },
  {
    id: "p-002",
    code: "GM-D2XX",
    name: "Chevrolet Equinox EV",
    oem: "GM",
    platform: "BEV3",
    sop: "2024-01-15",
    eop: "2030-06-30",
    totalAmortized: 89_000_000,
    recoveredToDate: 51_400_000,
    forecastRecovery: 100_000_000,
    contractedVolume: 620_000,
    actualVolume: 268_200,
    forecastVolume: 702_000,
    status: "over",
    partsCount: 98,
  },
  {
    id: "p-003",
    code: "STL-KL",
    name: "Jeep Grand Cherokee",
    oem: "Stellantis",
    platform: "WL / KL",
    sop: "2022-09-01",
    eop: "2028-12-31",
    totalAmortized: 62_000_000,
    recoveredToDate: 59_400_000,
    forecastRecovery: 66_000_000,
    contractedVolume: 540_000,
    actualVolume: 512_000,
    forecastVolume: 574_000,
    status: "over",
    partsCount: 74,
  },
  {
    id: "p-004",
    code: "TY-TNGA-K",
    name: "Toyota RAV4 Hybrid",
    oem: "Toyota",
    platform: "TNGA-K",
    sop: "2023-05-01",
    eop: "2029-04-30",
    totalAmortized: 148_000_000,
    recoveredToDate: 79_200_000,
    forecastRecovery: 165_000_000,
    contractedVolume: 900_000,
    actualVolume: 468_000,
    forecastVolume: 1_004_000,
    status: "over",
    partsCount: 211,
  },
  {
    id: "p-005",
    code: "HN-CR",
    name: "Honda CR-V",
    oem: "Honda",
    platform: "Global Compact",
    sop: "2023-08-01",
    eop: "2029-07-31",
    totalAmortized: 51_000_000,
    recoveredToDate: 12_400_000,
    forecastRecovery: 47_000_000,
    contractedVolume: 380_000,
    actualVolume: 89_400,
    forecastVolume: 350_000,
    status: "under",
    partsCount: 63,
  },
  {
    id: "p-006",
    code: "RIV-R1",
    name: "Rivian R1S / R1T",
    oem: "Rivian",
    platform: "R1 Skateboard",
    sop: "2023-02-01",
    eop: "2028-12-31",
    totalAmortized: 38_000_000,
    recoveredToDate: 8_900_000,
    forecastRecovery: 35_000_000,
    contractedVolume: 210_000,
    actualVolume: 48_200,
    forecastVolume: 193_000,
    status: "under",
    partsCount: 39,
  },
  {
    id: "p-007",
    code: "VW-MEB",
    name: "Volkswagen ID.4",
    oem: "Volkswagen",
    platform: "MEB",
    sop: "2023-01-01",
    eop: "2029-06-30",
    totalAmortized: 72_000_000,
    recoveredToDate: 31_800_000,
    forecastRecovery: 79_500_000,
    contractedVolume: 410_000,
    actualVolume: 198_000,
    forecastVolume: 452_000,
    status: "over",
    partsCount: 86,
  },
  {
    id: "p-008",
    code: "HY-N3",
    name: "Hyundai Tucson",
    oem: "Hyundai",
    platform: "N3",
    sop: "2022-11-01",
    eop: "2028-10-31",
    totalAmortized: 94_000_000,
    recoveredToDate: 52_600_000,
    forecastRecovery: 103_400_000,
    contractedVolume: 720_000,
    actualVolume: 402_000,
    forecastVolume: 788_000,
    status: "over",
    partsCount: 117,
  },
  {
    id: "p-009",
    code: "NS-P32",
    name: "Nissan Rogue",
    oem: "Nissan",
    platform: "CMF-C/D",
    sop: "2023-04-01",
    eop: "2029-03-31",
    totalAmortized: 66_000_000,
    recoveredToDate: 24_100_000,
    forecastRecovery: 71_800_000,
    contractedVolume: 540_000,
    actualVolume: 198_000,
    forecastVolume: 585_000,
    status: "over",
    partsCount: 82,
  },
  {
    id: "p-010",
    code: "TSL-M3",
    name: "Tesla Model Y",
    oem: "Tesla",
    platform: "3/Y Platform",
    sop: "2022-06-01",
    eop: "2028-05-31",
    totalAmortized: 108_000_000,
    recoveredToDate: 71_200_000,
    forecastRecovery: 121_400_000,
    contractedVolume: 940_000,
    actualVolume: 618_000,
    forecastVolume: 1_042_000,
    status: "over",
    partsCount: 156,
  },
];

// ---- Extended program roster ----------------------------------------------
// A supplier the size of Adient Electronics ships onto dozens of carlines
// across every major OEM. The list below expands the roster to ~60 programs
// so filtering by commodity still yields a meaningful book of business.
type ExtraSeed = {
  code: string;
  name: string;
  oem: string;
  platform: string;
  sop: string;
  eop: string;
  status: RecoveryStatus;
  totalAmortized: number; // in $M for readability
  attainment: number; // actual / contracted so far, 0..1
  contracted: number; // total contracted volume
  parts: number;
};

const EXTRA_PROGRAMS: ExtraSeed[] = [
  // Ford
  {
    code: "FD-CX727",
    name: "Ford Mustang Mach-E",
    oem: "Ford",
    platform: "GE1 BEV",
    sop: "2023-02-01",
    eop: "2029-01-31",
    status: "over",
    totalAmortized: 96,
    attainment: 0.58,
    contracted: 420_000,
    parts: 118,
  },
  {
    code: "FD-U725",
    name: "Ford Bronco",
    oem: "Ford",
    platform: "T6",
    sop: "2022-08-01",
    eop: "2028-12-31",
    status: "on-track",
    totalAmortized: 78,
    attainment: 0.61,
    contracted: 380_000,
    parts: 92,
  },
  {
    code: "FD-U611",
    name: "Ford Explorer",
    oem: "Ford",
    platform: "CD6",
    sop: "2023-04-01",
    eop: "2029-03-31",
    status: "over",
    totalAmortized: 84,
    attainment: 0.54,
    contracted: 460_000,
    parts: 104,
  },
  {
    code: "FD-CX430",
    name: "Ford Escape Hybrid",
    oem: "Ford",
    platform: "C2",
    sop: "2023-01-01",
    eop: "2028-06-30",
    status: "under",
    totalAmortized: 46,
    attainment: 0.39,
    contracted: 300_000,
    parts: 61,
  },
  // GM
  {
    code: "GM-BT1",
    name: "Chevrolet Silverado EV",
    oem: "GM",
    platform: "BT1",
    sop: "2024-05-01",
    eop: "2030-04-30",
    status: "over",
    totalAmortized: 142,
    attainment: 0.19,
    contracted: 540_000,
    parts: 172,
  },
  {
    code: "GM-LY",
    name: "Cadillac Lyriq",
    oem: "GM",
    platform: "BEV3",
    sop: "2023-06-01",
    eop: "2029-05-31",
    status: "over",
    totalAmortized: 74,
    attainment: 0.44,
    contracted: 260_000,
    parts: 88,
  },
  {
    code: "GM-HMR",
    name: "GMC Hummer EV",
    oem: "GM",
    platform: "BT1",
    sop: "2022-12-01",
    eop: "2028-11-30",
    status: "on-track",
    totalAmortized: 58,
    attainment: 0.52,
    contracted: 120_000,
    parts: 66,
  },
  {
    code: "GM-BLZ",
    name: "Chevrolet Blazer EV",
    oem: "GM",
    platform: "BEV3",
    sop: "2024-02-01",
    eop: "2030-01-31",
    status: "under",
    totalAmortized: 62,
    attainment: 0.24,
    contracted: 320_000,
    parts: 71,
  },
  {
    code: "GM-K2",
    name: "GMC Sierra 1500",
    oem: "GM",
    platform: "T1XX",
    sop: "2022-04-01",
    eop: "2028-03-31",
    status: "over",
    totalAmortized: 108,
    attainment: 0.66,
    contracted: 720_000,
    parts: 137,
  },
  // Stellantis
  {
    code: "STL-DT",
    name: "Ram 1500 REV",
    oem: "Stellantis",
    platform: "STLA Frame",
    sop: "2024-11-01",
    eop: "2030-10-31",
    status: "on-track",
    totalAmortized: 118,
    attainment: 0.12,
    contracted: 500_000,
    parts: 129,
  },
  {
    code: "STL-LB",
    name: "Dodge Charger Daytona",
    oem: "Stellantis",
    platform: "STLA Large",
    sop: "2024-08-01",
    eop: "2030-07-31",
    status: "over",
    totalAmortized: 66,
    attainment: 0.18,
    contracted: 210_000,
    parts: 74,
  },
  {
    code: "STL-RU",
    name: "Chrysler Pacifica",
    oem: "Stellantis",
    platform: "RU",
    sop: "2022-03-01",
    eop: "2027-12-31",
    status: "at-risk",
    totalAmortized: 42,
    attainment: 0.48,
    contracted: 260_000,
    parts: 55,
  },
  {
    code: "STL-WS",
    name: "Jeep Wagoneer",
    oem: "Stellantis",
    platform: "WS",
    sop: "2023-01-01",
    eop: "2029-06-30",
    status: "over",
    totalAmortized: 88,
    attainment: 0.51,
    contracted: 340_000,
    parts: 96,
  },
  {
    code: "STL-DX",
    name: "Jeep Wrangler 4xe",
    oem: "Stellantis",
    platform: "JL",
    sop: "2022-09-01",
    eop: "2028-08-31",
    status: "on-track",
    totalAmortized: 54,
    attainment: 0.64,
    contracted: 300_000,
    parts: 68,
  },
  // Toyota
  {
    code: "TY-K1",
    name: "Toyota Camry",
    oem: "Toyota",
    platform: "TNGA-K",
    sop: "2024-03-01",
    eop: "2030-02-28",
    status: "over",
    totalAmortized: 104,
    attainment: 0.22,
    contracted: 700_000,
    parts: 128,
  },
  {
    code: "TY-HL",
    name: "Toyota Highlander",
    oem: "Toyota",
    platform: "TNGA-K",
    sop: "2023-07-01",
    eop: "2029-06-30",
    status: "over",
    totalAmortized: 96,
    attainment: 0.41,
    contracted: 520_000,
    parts: 111,
  },
  {
    code: "TY-N",
    name: "Toyota Tacoma",
    oem: "Toyota",
    platform: "TNGA-F",
    sop: "2023-11-01",
    eop: "2030-10-31",
    status: "over",
    totalAmortized: 128,
    attainment: 0.28,
    contracted: 640_000,
    parts: 149,
  },
  {
    code: "TY-BZ4",
    name: "Toyota bZ4X",
    oem: "Toyota",
    platform: "e-TNGA",
    sop: "2023-05-01",
    eop: "2028-12-31",
    status: "under",
    totalAmortized: 44,
    attainment: 0.36,
    contracted: 180_000,
    parts: 52,
  },
  // Honda
  {
    code: "HN-AC",
    name: "Honda Accord",
    oem: "Honda",
    platform: "Global Mid",
    sop: "2023-01-01",
    eop: "2028-12-31",
    status: "on-track",
    totalAmortized: 72,
    attainment: 0.57,
    contracted: 480_000,
    parts: 84,
  },
  {
    code: "HN-PL",
    name: "Honda Pilot",
    oem: "Honda",
    platform: "Global Large",
    sop: "2023-06-01",
    eop: "2029-05-31",
    status: "over",
    totalAmortized: 68,
    attainment: 0.47,
    contracted: 320_000,
    parts: 79,
  },
  {
    code: "HN-PR",
    name: "Honda Prologue",
    oem: "Honda",
    platform: "BEV3 (JV)",
    sop: "2024-03-01",
    eop: "2029-12-31",
    status: "over",
    totalAmortized: 58,
    attainment: 0.21,
    contracted: 220_000,
    parts: 61,
  },
  {
    code: "HN-OD",
    name: "Honda Odyssey",
    oem: "Honda",
    platform: "Global Large",
    sop: "2022-10-01",
    eop: "2028-09-30",
    status: "on-track",
    totalAmortized: 34,
    attainment: 0.63,
    contracted: 210_000,
    parts: 42,
  },
  // Rivian
  {
    code: "RIV-R2",
    name: "Rivian R2",
    oem: "Rivian",
    platform: "R2 Midsize",
    sop: "2026-01-01",
    eop: "2032-12-31",
    status: "on-track",
    totalAmortized: 92,
    attainment: 0.04,
    contracted: 380_000,
    parts: 104,
  },
  {
    code: "RIV-EDV",
    name: "Rivian EDV",
    oem: "Rivian",
    platform: "Skateboard",
    sop: "2022-07-01",
    eop: "2028-06-30",
    status: "at-risk",
    totalAmortized: 30,
    attainment: 0.42,
    contracted: 180_000,
    parts: 38,
  },
  // Volkswagen
  {
    code: "VW-ID7",
    name: "Volkswagen ID.7",
    oem: "Volkswagen",
    platform: "MEB",
    sop: "2024-06-01",
    eop: "2030-05-31",
    status: "over",
    totalAmortized: 66,
    attainment: 0.17,
    contracted: 260_000,
    parts: 74,
  },
  {
    code: "VW-CA1",
    name: "Volkswagen Atlas",
    oem: "Volkswagen",
    platform: "MQB",
    sop: "2023-02-01",
    eop: "2028-12-31",
    status: "on-track",
    totalAmortized: 52,
    attainment: 0.56,
    contracted: 240_000,
    parts: 63,
  },
  {
    code: "VW-AD1",
    name: "Volkswagen Tiguan",
    oem: "Volkswagen",
    platform: "MQB Evo",
    sop: "2024-01-01",
    eop: "2030-06-30",
    status: "over",
    totalAmortized: 71,
    attainment: 0.24,
    contracted: 420_000,
    parts: 82,
  },
  {
    code: "VW-ID.BZ",
    name: "Volkswagen ID.Buzz",
    oem: "Volkswagen",
    platform: "MEB",
    sop: "2024-09-01",
    eop: "2030-08-31",
    status: "under",
    totalAmortized: 48,
    attainment: 0.14,
    contracted: 160_000,
    parts: 55,
  },
  // Hyundai
  {
    code: "HY-IO5",
    name: "Hyundai IONIQ 5",
    oem: "Hyundai",
    platform: "E-GMP",
    sop: "2022-05-01",
    eop: "2028-04-30",
    status: "over",
    totalAmortized: 82,
    attainment: 0.62,
    contracted: 380_000,
    parts: 91,
  },
  {
    code: "HY-IO6",
    name: "Hyundai IONIQ 6",
    oem: "Hyundai",
    platform: "E-GMP",
    sop: "2023-03-01",
    eop: "2029-02-28",
    status: "on-track",
    totalAmortized: 56,
    attainment: 0.44,
    contracted: 220_000,
    parts: 63,
  },
  {
    code: "HY-SF",
    name: "Hyundai Santa Fe",
    oem: "Hyundai",
    platform: "N3",
    sop: "2024-01-01",
    eop: "2030-06-30",
    status: "over",
    totalAmortized: 74,
    attainment: 0.22,
    contracted: 380_000,
    parts: 88,
  },
  {
    code: "HY-PA",
    name: "Hyundai Palisade",
    oem: "Hyundai",
    platform: "LX2",
    sop: "2022-11-01",
    eop: "2028-10-31",
    status: "over",
    totalAmortized: 62,
    attainment: 0.58,
    contracted: 290_000,
    parts: 70,
  },
  // Nissan
  {
    code: "NS-AR",
    name: "Nissan Ariya",
    oem: "Nissan",
    platform: "CMF-EV",
    sop: "2023-01-01",
    eop: "2029-12-31",
    status: "under",
    totalAmortized: 58,
    attainment: 0.34,
    contracted: 240_000,
    parts: 66,
  },
  {
    code: "NS-AL",
    name: "Nissan Altima",
    oem: "Nissan",
    platform: "CMF-C/D",
    sop: "2022-09-01",
    eop: "2028-08-31",
    status: "on-track",
    totalAmortized: 44,
    attainment: 0.61,
    contracted: 300_000,
    parts: 52,
  },
  {
    code: "NS-PF",
    name: "Nissan Pathfinder",
    oem: "Nissan",
    platform: "D24",
    sop: "2023-04-01",
    eop: "2029-03-31",
    status: "over",
    totalAmortized: 52,
    attainment: 0.47,
    contracted: 240_000,
    parts: 61,
  },
  {
    code: "NS-SE",
    name: "Nissan Sentra",
    oem: "Nissan",
    platform: "CMF-C",
    sop: "2022-06-01",
    eop: "2028-05-31",
    status: "on-track",
    totalAmortized: 36,
    attainment: 0.65,
    contracted: 320_000,
    parts: 44,
  },
  // Tesla
  {
    code: "TSL-M3S",
    name: "Tesla Model 3",
    oem: "Tesla",
    platform: "3/Y",
    sop: "2022-04-01",
    eop: "2028-03-31",
    status: "over",
    totalAmortized: 96,
    attainment: 0.68,
    contracted: 820_000,
    parts: 132,
  },
  {
    code: "TSL-MS",
    name: "Tesla Model S",
    oem: "Tesla",
    platform: "S/X",
    sop: "2022-09-01",
    eop: "2028-08-31",
    status: "on-track",
    totalAmortized: 42,
    attainment: 0.6,
    contracted: 120_000,
    parts: 48,
  },
  {
    code: "TSL-MX",
    name: "Tesla Model X",
    oem: "Tesla",
    platform: "S/X",
    sop: "2022-09-01",
    eop: "2028-08-31",
    status: "on-track",
    totalAmortized: 40,
    attainment: 0.58,
    contracted: 100_000,
    parts: 46,
  },
  {
    code: "TSL-CT",
    name: "Tesla Cybertruck",
    oem: "Tesla",
    platform: "Cybertruck",
    sop: "2024-04-01",
    eop: "2030-03-31",
    status: "over",
    totalAmortized: 118,
    attainment: 0.14,
    contracted: 380_000,
    parts: 141,
  },
];

EXTRA_PROGRAMS.forEach((e) => {
  const idx = programs.length + 1;
  const id = `p-${String(idx).padStart(3, "0")}`;
  const total = e.totalAmortized * 1_000_000;
  const recRatio =
    e.status === "over"
      ? 0.42 + seeded(idx + 1) * 0.12
      : e.status === "on-track"
        ? 0.36 + seeded(idx + 1) * 0.1
        : e.status === "under"
          ? 0.22 + seeded(idx + 1) * 0.08
          : 0.14 + seeded(idx + 1) * 0.08;
  const forecastRatio =
    e.status === "over"
      ? 1.06 + seeded(idx + 5) * 0.09
      : e.status === "on-track"
        ? 0.99 + seeded(idx + 5) * 0.03
        : e.status === "under"
          ? 0.82 + seeded(idx + 5) * 0.08
          : 0.55 + seeded(idx + 5) * 0.15;
  const actualVolume = Math.round(e.contracted * e.attainment);
  const forecastVolume = Math.round(e.contracted * forecastRatio);
  programs.push({
    id,
    code: e.code,
    name: e.name,
    oem: e.oem,
    platform: e.platform,
    sop: e.sop,
    eop: e.eop,
    totalAmortized: total,
    recoveredToDate: Math.round(total * recRatio),
    forecastRecovery: Math.round(total * forecastRatio),
    contractedVolume: e.contracted,
    actualVolume,
    forecastVolume,
    status: e.status,
    partsCount: e.parts,
  });
});

// ---- Pad each OEM up to 20 carlines with synthetic entries ----
const OEM_MODEL_POOL: Record<string, { names: string[]; platforms: string[]; codePrefix: string }> =
  {
    Ford: {
      codePrefix: "FD",
      platforms: ["CD6", "C2", "T6", "P702", "GE1 BEV", "TE1 BEV"],
      names: [
        "Edge",
        "Maverick",
        "Ranger",
        "Transit",
        "Expedition",
        "F-250 Super Duty",
        "F-350 Super Duty",
        "E-Transit",
        "Puma",
        "Kuga",
        "Territory",
        "Fusion",
        "Nautilus",
        "Corsair",
        "Aviator",
        "Navigator",
      ],
    },
    GM: {
      codePrefix: "GM",
      platforms: ["T1XX", "BT1", "BEV3", "VSS-R", "C1XX", "E2XX"],
      names: [
        "Chevrolet Equinox",
        "Chevrolet Traverse",
        "Chevrolet Colorado",
        "Chevrolet Tahoe",
        "Chevrolet Suburban",
        "Chevrolet Trailblazer",
        "Chevrolet Malibu",
        "Chevrolet Camaro",
        "GMC Canyon",
        "GMC Yukon",
        "GMC Acadia",
        "GMC Terrain",
        "Cadillac Escalade IQ",
        "Cadillac XT5",
        "Cadillac CT5",
        "Buick Envision",
        "Buick Enclave",
      ],
    },
    Stellantis: {
      codePrefix: "STL",
      platforms: ["STLA Large", "STLA Medium", "STLA Frame", "STLA Small", "JL", "WK"],
      names: [
        "Jeep Grand Wagoneer",
        "Jeep Compass",
        "Jeep Cherokee",
        "Jeep Gladiator",
        "Jeep Recon",
        "Dodge Durango",
        "Dodge Hornet",
        "Ram ProMaster",
        "Ram 2500",
        "Ram 3500",
        "Chrysler Voyager",
        "Alfa Romeo Tonale",
        "Alfa Romeo Stelvio",
        "Fiat 500e",
        "Maserati Grecale",
      ],
    },
    Toyota: {
      codePrefix: "TY",
      platforms: ["TNGA-K", "TNGA-C", "TNGA-F", "e-TNGA", "GA-B"],
      names: [
        "Corolla",
        "Corolla Cross",
        "Crown",
        "Prius",
        "Sequoia",
        "Sienna",
        "4Runner",
        "Land Cruiser",
        "GR86",
        "Venza",
        "Lexus RX",
        "Lexus TX",
        "Lexus GX",
        "Lexus NX",
        "Lexus RZ",
        "Lexus ES",
      ],
    },
    Honda: {
      codePrefix: "HN",
      platforms: ["Global Mid", "Global Large", "Global Small", "BEV3 (JV)"],
      names: [
        "Civic",
        "HR-V",
        "Passport",
        "Ridgeline",
        "CR-V Hybrid",
        "Insight",
        "Fit",
        "Acura MDX",
        "Acura RDX",
        "Acura TLX",
        "Acura Integra",
        "Acura ZDX",
        "Prelude",
        "Odyssey Hybrid",
        "Pilot TrailSport",
        "Passport TrailSport",
      ],
    },
    Rivian: {
      codePrefix: "RIV",
      platforms: ["R1 Skateboard", "R2 Midsize", "R3 Compact", "EDV Skateboard"],
      names: [
        "R1T Gen2",
        "R1S Gen2",
        "R2S",
        "R2T",
        "R3",
        "R3X",
        "EDV 500",
        "EDV 700",
        "Commercial Van 500",
        "Commercial Van 700",
        "R1T Quad-Motor",
        "R1S Quad-Motor",
        "R2 Performance",
        "R3 Performance",
        "Adventure Fleet",
        "Amazon Delivery Van v2",
        "R1T Adventure",
        "R1S Adventure",
      ],
    },
    Volkswagen: {
      codePrefix: "VW",
      platforms: ["MEB", "MQB Evo", "MQB", "PPE", "SSP"],
      names: [
        "Golf",
        "Passat",
        "Jetta",
        "Taos",
        "Arteon",
        "T-Roc",
        "T-Cross",
        "Touareg",
        "Polo",
        "Amarok",
        "Audi Q4 e-tron",
        "Audi Q6 e-tron",
        "Audi A4",
        "Audi A6",
        "Audi Q5",
        "Audi Q7",
        "Porsche Macan EV",
        "Skoda Enyaq",
      ],
    },
    Hyundai: {
      codePrefix: "HY",
      platforms: ["E-GMP", "N3", "K3", "SmartStream", "LX2"],
      names: [
        "Elantra",
        "Sonata",
        "Kona",
        "Kona EV",
        "Venue",
        "Tucson Hybrid",
        "Nexo",
        "Staria",
        "Kia EV6",
        "Kia EV9",
        "Kia Sportage",
        "Kia Sorento",
        "Kia Telluride",
        "Kia Carnival",
        "Kia K5",
        "Kia Niro",
        "Genesis GV60",
        "Genesis GV70",
        "Genesis G80",
      ],
    },
    Nissan: {
      codePrefix: "NS",
      platforms: ["CMF-C/D", "CMF-EV", "F-Alpha", "CMF-B"],
      names: [
        "Rogue Sport",
        "Murano",
        "Armada",
        "Frontier",
        "Titan",
        "Kicks",
        "Leaf",
        "Versa",
        "Maxima",
        "Infiniti QX60",
        "Infiniti QX55",
        "Infiniti QX50",
        "Infiniti QX80",
        "Infiniti Q50",
        "Infiniti QX30",
        "Note",
        "Juke",
        "X-Trail",
      ],
    },
    Tesla: {
      codePrefix: "TSL",
      platforms: ["3/Y", "S/X", "Cybertruck", "Semi", "Roadster Gen2"],
      names: [
        "Model Y Juniper",
        "Model 3 Highland",
        "Semi",
        "Roadster Gen2",
        "Model Y Performance",
        "Model 3 Performance",
        "Cybertruck Cyberbeast",
        "Model S Plaid",
        "Model X Plaid",
        "Robotaxi",
        "Model 2",
        "Compact EV",
        "Model Y LR",
        "Model 3 LR",
        "Semi 500",
        "Semi 300",
        "Cybertruck AWD",
        "Fleet Van",
      ],
    },
  };

const OEMS_TO_PAD = Object.keys(OEM_MODEL_POOL);
const TARGET_PER_OEM = 20;

for (const oem of OEMS_TO_PAD) {
  const existing = programs.filter((p) => p.oem === oem).length;
  const need = Math.max(0, TARGET_PER_OEM - existing);
  const pool = OEM_MODEL_POOL[oem];
  for (let k = 0; k < need; k++) {
    const idx = programs.length + 1;
    const id = `p-${String(idx).padStart(3, "0")}`;
    const nameSeed = pool.names[k % pool.names.length];
    const name =
      oem === "Ford" ||
      oem === "Rivian" ||
      oem === "Tesla" ||
      oem === "Volkswagen" ||
      oem === "Hyundai" ||
      oem === "Nissan" ||
      oem === "Toyota" ||
      oem === "Honda"
        ? nameSeed.includes(" ")
          ? nameSeed
          : `${oem} ${nameSeed}`
        : nameSeed;
    const platform = pool.platforms[k % pool.platforms.length];
    const code = `${pool.codePrefix}-${(1000 + idx).toString(36).toUpperCase()}`;
    const r1 = seeded(idx * 3 + 1);
    const r2 = seeded(idx * 3 + 2);
    const r3 = seeded(idx * 3 + 3);
    const status: RecoveryStatus =
      r1 < 0.15 ? "over" : r1 < 0.7 ? "on-track" : r1 < 0.9 ? "under" : "at-risk";
    const sopYear = 2022 + Math.floor(r2 * 3); // 2022..2024
    const sopMonth = 1 + Math.floor(r3 * 12);
    const sop = `${sopYear}-${String(sopMonth).padStart(2, "0")}-01`;
    const eop = `${sopYear + 6}-12-31`;
    const totalM = 30 + Math.round(r2 * 130); // 30..160
    const total = totalM * 1_000_000;
    const contracted = 120_000 + Math.round(r3 * 600_000);
    const attainment = 0.15 + r2 * 0.55;
    const actualVolume = Math.round(contracted * attainment);
    const recRatio =
      status === "over"
        ? 0.42 + r1 * 0.12
        : status === "on-track"
          ? 0.36 + r1 * 0.1
          : status === "under"
            ? 0.22 + r1 * 0.08
            : 0.14 + r1 * 0.08;
    const forecastRatio =
      status === "over"
        ? 1.06 + r2 * 0.09
        : status === "on-track"
          ? 0.99 + r2 * 0.03
          : status === "under"
            ? 0.82 + r2 * 0.08
            : 0.55 + r2 * 0.15;
    const forecastVolume = Math.round(contracted * forecastRatio);
    programs.push({
      id,
      code,
      name,
      oem,
      platform,
      sop,
      eop,
      totalAmortized: total,
      recoveredToDate: Math.round(total * recRatio),
      forecastRecovery: Math.round(total * forecastRatio),
      contractedVolume: contracted,
      actualVolume,
      forecastVolume,
      status,
      partsCount: 30 + Math.round(r3 * 130),
    });
  }
}

export interface Part {
  id: string;
  partNumber: string;
  description: string;
  programId: string;
  programName: string;
  oem: string;
  piecePrice: number;
  amortizedPerPiece: number;
  contractedVolume: number;
  shippedVolume: number;
  forecastVolume: number;
  totalAmortized: number;
  recoveredToDate: number;
  status: RecoveryStatus;
  breakEvenDate: string;
}

const partDescriptions = [
  "Front Bumper Reinforcement",
  "B-Pillar Inner Assembly",
  "Rear Rail LH",
  "Rear Rail RH",
  "Dash Panel Cross Member",
  "Battery Tray Weldment",
  "Rocker Outer Panel",
  "Hood Inner Structure",
  "Tailgate Reinforcement",
  "Shock Tower Assembly",
  "Cowl Top Panel",
  "Floor Pan Rear",
  "Wheelhouse Outer",
  "Front Rail Extension",
  "A-Pillar Reinforcement",
];

function seeded(n: number) {
  const x = Math.sin(n) * 10000;
  return x - Math.floor(x);
}

// Fixed distribution: 70% on-track, 15% over, 10% under, 5% at-risk
const PART_COUNT = 260;
const STATUS_ORDER: RecoveryStatus[] = (() => {
  const arr: RecoveryStatus[] = [];
  const nOnTrack = Math.round(PART_COUNT * 0.7);
  const nOver = Math.round(PART_COUNT * 0.15);
  const nUnder = Math.round(PART_COUNT * 0.1);
  const nAtRisk = PART_COUNT - nOnTrack - nOver - nUnder;
  for (let i = 0; i < nOnTrack; i++) arr.push("on-track");
  for (let i = 0; i < nOver; i++) arr.push("over");
  for (let i = 0; i < nUnder; i++) arr.push("under");
  for (let i = 0; i < nAtRisk; i++) arr.push("at-risk");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(seeded(i + 100) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
})();

export const parts: Part[] = Array.from({ length: PART_COUNT }, (_, i) => {
  const program = programs[i % programs.length];
  const r = seeded(i + 1);
  const contracted = Math.round((80_000 + r * 220_000) / 1000) * 1000;
  const amortPer = +(1.2 + seeded(i + 19) * 8.4).toFixed(2);
  const total = Math.round(contracted * amortPer);
  const status = STATUS_ORDER[i];
  const fpct =
    status === "over"
      ? 1.08 + seeded(i + 31) * 0.12
      : status === "on-track"
        ? 0.97 + seeded(i + 31) * 0.06
        : status === "under"
          ? 0.8 + seeded(i + 31) * 0.1
          : 0.45 + seeded(i + 31) * 0.25;
  const forecast = Math.round(contracted * fpct);
  const progress = 0.22 + seeded(i + 41) * 0.5;
  const shipped = Math.round(forecast * progress);
  const recovered = Math.round(shipped * amortPer);
  return {
    id: `pt-${String(i + 1).padStart(4, "0")}`,
    partNumber: `${program.oem.slice(0, 2).toUpperCase()}-${String(10245 + i * 37).padStart(6, "0")}-${String.fromCharCode(65 + (i % 6))}`,
    description: partDescriptions[i % partDescriptions.length],
    programId: program.id,
    programName: program.name,
    oem: program.oem,
    piecePrice: +(24 + seeded(i + 3) * 180).toFixed(2),
    amortizedPerPiece: amortPer,
    contractedVolume: contracted,
    shippedVolume: shipped,
    forecastVolume: forecast,
    totalAmortized: total,
    recoveredToDate: recovered,
    status,
    breakEvenDate: `202${5 + (i % 4)}-${String(1 + (i % 12)).padStart(2, "0")}-15`,
  };
});

// DCR (Design Change Request) content — deterministic per part
export interface DCRInfo {
  dcrNumber: string;
  initiator: string;
  dateInitiated: string;
  investigator: string;
  investigatorOrg: string;
  moduleComponent: string;
  subject: string;
  reasons: string[];
  proposedChanges: string[];
  edtCost: number;
  piecePriceImpact: number;
  totalVolume: number;
  timing: string;
  supplierSalesman: string;
  supplierSalesmanEmail: string;
  supplierEngineer: string;
  supplierEngineerEmail: string;
  notes: string;
}

const initiators = [
  "Randall Chinoski",
  "Gerard Grabowski",
  "Maria Alvarez",
  "David Chen",
  "Sarah Kowalski",
  "James O'Brien",
  "Priya Ramanathan",
  "Michael Torres",
];
const investigatorOrgs = [
  "Lear Corporation",
  "Magna International",
  "Aptiv PLC",
  "Continental AG",
  "Denso Corp",
  "Bosch",
];
const reasonBank = [
  "Immobilizer changes due to testing results.",
  "Inferred Ignition changes due to testing results.",
  "Method 2 Configuration changes due to testing results.",
  "Personalization changes due to design review.",
  "Corrosion resistance upgrade required per OEM validation.",
  "Weight reduction directive from vehicle program office.",
  "Tolerance stack-up correction identified in PPAP.",
  "Material substitution required for supply continuity.",
  "Crash performance re-optimization per IIHS update.",
  "NVH improvement requested after B-sample testing.",
];
const changeBank = [
  "Update tooling geometry per revised CAD release.",
  "Implement stamping die revision on progression 4.",
  "Change base material to HSLA 420 from HSLA 340.",
  "Add secondary weld nut to reinforcement bracket.",
  "Modify e-coat masking to cover new fastener holes.",
  "Re-route wire harness clip locations by 12mm.",
  "Increase gauge from 1.4mm to 1.6mm at reinforcement.",
  "Apply new adhesive spec 3M-08115 in place of 08110.",
];

export function getDCR(part: Part): DCRInfo {
  const idx = parseInt(part.id.slice(3));
  const s = (o: number) => seeded(idx + o);
  const numReasons = 2 + Math.floor(s(1) * 3);
  const numChanges = 2 + Math.floor(s(2) * 3);
  const reasons = Array.from(
    { length: numReasons },
    (_, k) => reasonBank[(idx + k * 3) % reasonBank.length],
  );
  const proposed = Array.from(
    { length: numChanges },
    (_, k) => changeBank[(idx + k * 2) % changeBank.length],
  );
  const dateY = 2024 + (idx % 2);
  const dateM = 1 + (idx % 12);
  const dateD = 1 + (idx % 27);
  const edtCost = Math.round((15_000 + s(3) * 285_000) / 100) * 100;
  const salesman = initiators[idx % initiators.length];
  const engineer = initiators[(idx + 3) % initiators.length];
  return {
    dcrNumber: `DCR-${String(100 + idx).padStart(4, "0")}`,
    initiator: initiators[idx % initiators.length],
    dateInitiated: `${String(dateM).padStart(2, "0")}/${String(dateD).padStart(2, "0")}/${dateY}`,
    investigator: initiators[(idx + 1) % initiators.length],
    investigatorOrg: investigatorOrgs[idx % investigatorOrgs.length],
    moduleComponent: part.description,
    subject: `${part.description} — revision ${String.fromCharCode(65 + (idx % 5))}`,
    reasons,
    proposedChanges: proposed,
    edtCost,
    piecePriceImpact: part.amortizedPerPiece,
    totalVolume: part.contractedVolume,
    timing: `Validation completed ${String(dateM).padStart(2, "0")}-${String(dateD).padStart(2, "0")}-${dateY}; assuming a ${String((dateM % 12) + 1).padStart(2, "0")}-15-${dateY} kickoff.`,
    supplierSalesman: salesman,
    supplierSalesmanEmail: `${salesman.toLowerCase().replace(/[^a-z]/g, ".")}@supplier.com`,
    supplierEngineer: engineer,
    supplierEngineerEmail: `${engineer.toLowerCase().replace(/[^a-z]/g, ".")}@supplier.com`,
    notes: `Please quote ${part.partNumber} items as add-ons to the current program bundle. Once approved, changes will be included in the next scheduled release. Pricing Impact: $${edtCost.toLocaleString()} ED&T; amortized into the piece price @ $${part.amortizedPerPiece.toFixed(2)} per part over ${part.contractedVolume.toLocaleString()} total volume.`,
  };
}

// Monthly recovery timeline for a program
export function monthlyRecoverySeries(programId: string) {
  const program = programs.find((p) => p.id === programId) ?? programs[0];
  const months = 36;
  const monthly = program.totalAmortized / months;
  const data: {
    month: string;
    actual: number | null;
    forecast: number;
    contracted: number;
  }[] = [];
  let actualCum = 0;
  let forecastCum = 0;
  for (let i = 0; i < months; i++) {
    const d = new Date(2024, i, 1);
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    const contracted = monthly * (i + 1);
    const isPast = i < 14;
    if (isPast) {
      const noise = 0.7 + seeded(i + 5) * 0.7;
      actualCum += monthly * noise * (program.status === "over" ? 1.15 : 0.85);
      forecastCum = actualCum;
      data.push({ month: label, actual: actualCum, forecast: forecastCum, contracted });
    } else {
      const trend = program.status === "over" ? 1.12 : program.status === "at-risk" ? 0.65 : 0.92;
      forecastCum += monthly * trend * (0.9 + seeded(i + 11) * 0.3);
      data.push({ month: label, actual: null, forecast: forecastCum, contracted });
    }
  }
  return data;
}

// OEM values in $M for chart legibility
export const oemSummary = [
  { oem: "Ford", recovered: 48.2, forecast: 137, contracted: 124 },
  { oem: "GM", recovered: 51.4, forecast: 100, contracted: 89 },
  { oem: "Stellantis", recovered: 59.4, forecast: 66, contracted: 62 },
  { oem: "Toyota", recovered: 79.2, forecast: 165, contracted: 148 },
  { oem: "Honda", recovered: 12.4, forecast: 47, contracted: 51 },
  { oem: "Rivian", recovered: 8.9, forecast: 35, contracted: 38 },
];

// Synthetic over-recovery balance grouped by review state. These buckets do
// not authorize or imply any accounting disposition.
export interface OverRecoveryBucket {
  key: "at-risk" | "pending" | "available";
  label: string;
  amount: number;
  description: string;
}

export const overRecoveryBreakdown: OverRecoveryBucket[] = [
  {
    key: "at-risk",
    label: "Exception review",
    amount: 3_600_000,
    description: "Open volume or contract-evidence exceptions.",
  },
  {
    key: "pending",
    label: "Evidence pending",
    amount: 8_400_000,
    description: "Required source or contract evidence has not been approved.",
  },
  {
    key: "available",
    label: "Disposition review",
    amount: 6_000_000,
    description: "Evidence assembled; accounting disposition remains unconfirmed.",
  },
];

export const overRecoveryTimeline = [
  { period: "Q1 24", quarter: 0.9, cumulative: 0.9 },
  { period: "Q2 24", quarter: 1.4, cumulative: 2.3 },
  { period: "Q3 24", quarter: 1.9, cumulative: 4.2 },
  { period: "Q4 24", quarter: 2.4, cumulative: 6.6 },
  { period: "Q1 25", quarter: 3.1, cumulative: 9.7 },
  { period: "Q2 25", quarter: 3.8, cumulative: 13.5 },
  { period: "Q3 25", quarter: 4.5, cumulative: 18.0 },
];

export const statusMeta: Record<RecoveryStatus, { label: string; className: string; dot: string }> =
  {
    under: {
      label: "Under-recovering",
      className: "bg-warning/15 text-warning border-warning/30",
      dot: "bg-warning",
    },
    "on-track": {
      label: "On track",
      className: "bg-success/15 text-success border-success/30",
      dot: "bg-success",
    },
    over: {
      label: "Over-recovering",
      className: "bg-brand/15 text-brand border-brand/30",
      dot: "bg-brand",
    },
    "at-risk": {
      label: "At risk",
      className: "bg-destructive/15 text-destructive border-destructive/30",
      dot: "bg-destructive",
    },
  };

export function formatMoney(n: number, opts: { compact?: boolean } = {}) {
  if (opts.compact) {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`;
    if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  }
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function formatNumber(n: number) {
  return n.toLocaleString("en-US");
}

// Deterministic development exceptions derived from the synthetic fixtures.
export const scenarioInsights = [
  {
    id: "i1",
    severity: "high" as const,
    title: "F-150 Lightning volumes tracking 35% below contract",
    body: "The development scenario projects a $1.5M under-recovery by EOP. Review contract evidence before considering a claim.",
    programId: "p-001",
    delta: -1_500_000,
  },
  {
    id: "i2",
    severity: "medium" as const,
    title: "RAV4 Hybrid over-recovery accelerating",
    body: "Staged actual volume exceeds contracted volume by 4%. The $600K over-recovery scenario requires accounting review.",
    programId: "p-004",
    delta: 600_000,
  },
  {
    id: "i3",
    severity: "high" as const,
    title: "Honda CR-V at risk of $1.3M shortfall",
    body: "The development scenario is 25% below contract volume through 2029. Review the executed contract before assigning claim eligibility.",
    programId: "p-005",
    delta: -1_280_000,
  },
  {
    id: "i4",
    severity: "low" as const,
    title: "Equinox EV break-even reached on 22 parts",
    body: "22 part numbers have crossed amortization break-even. Future shipments generate margin — update accrual model.",
    programId: "p-002",
    delta: 420_000,
  },
];

// ---- Model years & per-year recovery status ----
// Every carline runs across ~5 consecutive model years derived from its SOP,
// clamped to the program's production window.
export const programModelYears: Record<string, number[]> = {};
for (const p of programs) {
  const sopYear = new Date(p.sop).getFullYear();
  const eopYear = new Date(p.eop).getFullYear();
  const startMY = Math.max(sopYear, 2022);
  const endMY = Math.min(eopYear, startMY + 4);
  const years: number[] = [];
  for (let y = startMY; y <= endMY; y++) years.push(y);
  programModelYears[p.id] = years.length ? years : [sopYear];
}

export type YearBucket =
  | "closed-over" // closed demonstration year with over-recovery
  | "closed-claim" // 2022 closed, under-recovered → pursuing OEM claim
  | "achieved" // 2023/24 recovered to target
  | "over" // 2023/24 over-recovered
  | "shipping" // 2025/26 in flight, on-track
  | "shipping-risk" // 2025/26 in flight, trending under
  | "not-in-production"; // program didn't ship that year

export interface YearlyStatus {
  year: number;
  bucket: YearBucket;
  amortizedTarget: number; // $ that should be recovered for this year
  recovered: number; // $ actually recovered for this year
  delta: number; // recovered − target (positive = over)
  volumeAttainmentPct: number;
}

const YEARS = [2022, 2023, 2024, 2025, 2026] as const;

export function getYearlyStatus(program: Program): YearlyStatus[] {
  const sopYear = new Date(program.sop).getFullYear();
  const eopYear = new Date(program.eop).getFullYear();
  const activeYears = YEARS.filter((y) => y >= sopYear && y <= eopYear);
  // Distribute total amortization evenly across the full production window,
  // then bucket by the fixed demonstration reporting year.
  const totalYears = Math.max(1, eopYear - sopYear + 1);
  const perYear = program.totalAmortized / totalYears;
  const idx = parseInt(program.id.slice(2)) || 1;
  const seedFor = (y: number) => {
    const x = Math.sin(idx * 13 + y) * 10000;
    return x - Math.floor(x);
  };

  return YEARS.map((year) => {
    if (!activeYears.includes(year)) {
      return {
        year,
        bucket: "not-in-production" as YearBucket,
        amortizedTarget: 0,
        recovered: 0,
        delta: 0,
        volumeAttainmentPct: 0,
      };
    }
    const s = seedFor(year);
    let ratio = 1;
    let bucket: YearBucket = "achieved";
    if (year <= 2022) {
      // Closed demonstration year: mostly over-recovered, a few under-recovered.
      const overSide =
        program.status === "under" || program.status === "at-risk" ? s < 0.7 : s < 0.25;
      if (overSide) {
        ratio = 0.72 + s * 0.15; // under-recovered
        bucket = "closed-claim";
      } else {
        ratio = 1.06 + s * 0.14; // over-recovered; disposition not inferred
        bucket = "closed-over";
      }
    } else if (year === 2023 || year === 2024) {
      // Near-achieved or over-recovering.
      if (program.status === "over" ? s < 0.65 : s < 0.35) {
        ratio = 1.04 + s * 0.12;
        bucket = "over";
      } else {
        ratio = 0.96 + s * 0.05;
        bucket = "achieved";
      }
    } else {
      // 2025 / 2026 still shipping — partial year progress vs. target.
      const progress = year === 2025 ? 0.62 + s * 0.18 : 0.22 + s * 0.15;
      ratio = progress;
      bucket =
        program.status === "under" || program.status === "at-risk" ? "shipping-risk" : "shipping";
    }
    const recovered = Math.round(perYear * ratio);
    return {
      year,
      bucket,
      amortizedTarget: Math.round(perYear),
      recovered,
      delta: recovered - Math.round(perYear),
      volumeAttainmentPct: Math.round(ratio * 100),
    };
  });
}

export const yearBucketMeta: Record<
  YearBucket,
  { label: string; short: string; className: string; dot: string }
> = {
  "closed-over": {
    label: "Closed · Over-recovered",
    short: "Over",
    className: "bg-success/15 text-success border-success/30",
    dot: "bg-success",
  },
  "closed-claim": {
    label: "Closed · Pursuing OEM claim",
    short: "Claim",
    className: "bg-destructive/15 text-destructive border-destructive/30",
    dot: "bg-destructive",
  },
  achieved: {
    label: "Achieved target",
    short: "Achieved",
    className: "bg-success/15 text-success border-success/30",
    dot: "bg-success",
  },
  over: {
    label: "Over-recovering",
    short: "Over",
    className: "bg-brand/15 text-brand border-brand/30",
    dot: "bg-brand",
  },
  shipping: {
    label: "Shipping toward target",
    short: "Shipping",
    className: "bg-secondary text-foreground border-border",
    dot: "bg-muted-foreground",
  },
  "shipping-risk": {
    label: "Shipping · trending under",
    short: "At risk",
    className: "bg-warning/15 text-warning border-warning/30",
    dot: "bg-warning",
  },
  "not-in-production": {
    label: "Not in production",
    short: "—",
    className: "bg-transparent text-muted-foreground/60 border-dashed border-border",
    dot: "bg-transparent",
  },
};
