import f150 from "@/assets/vehicles/ford-f150-lightning.png";
import equinox from "@/assets/vehicles/chevy-equinox-ev.png";
import jeep from "@/assets/vehicles/jeep-grand-cherokee.png";
import rav4 from "@/assets/vehicles/toyota-rav4.png";
import crv from "@/assets/vehicles/honda-crv.png";
import rivian from "@/assets/vehicles/rivian-r1s.png";
import id4 from "@/assets/vehicles/vw-id4.png";
import tucson from "@/assets/vehicles/hyundai-tucson.png";
import rogue from "@/assets/vehicles/nissan-rogue.png";
import modely from "@/assets/vehicles/tesla-model-y.png";

// Generic body-style jellybeans — fallbacks so every carline has a silhouette
import genericPickup from "@/assets/vehicles/generic-pickup.png";
import genericHdPickup from "@/assets/vehicles/generic-hd-pickup.png";
import genericFullsizeSuv from "@/assets/vehicles/generic-fullsize-suv.png";
import genericMidsizeSuv from "@/assets/vehicles/generic-midsize-suv.png";
import genericCompactSuv from "@/assets/vehicles/generic-compact-suv.png";
import genericSedan from "@/assets/vehicles/generic-sedan.png";
import genericMinivan from "@/assets/vehicles/generic-minivan.png";
import genericVan from "@/assets/vehicles/generic-van.png";
import genericCoupe from "@/assets/vehicles/generic-coupe.png";

// Map program id -> jellybean image (hero carlines with bespoke art)
const heroImages: Record<string, string> = {
  "p-001": f150,
  "p-002": equinox,
  "p-003": jeep,
  "p-004": rav4,
  "p-005": crv,
  "p-006": rivian,
  "p-007": id4,
  "p-008": tucson,
  "p-009": rogue,
  "p-010": modely,
};

// Keep a legacy export for consumers that only care about the hero mapping.
export const vehicleImages = heroImages;

type BodyStyle =
  | "pickup"
  | "hd-pickup"
  | "fullsize-suv"
  | "midsize-suv"
  | "compact-suv"
  | "sedan"
  | "minivan"
  | "van"
  | "coupe";

const styleImage: Record<BodyStyle, string> = {
  pickup: genericPickup,
  "hd-pickup": genericHdPickup,
  "fullsize-suv": genericFullsizeSuv,
  "midsize-suv": genericMidsizeSuv,
  "compact-suv": genericCompactSuv,
  sedan: genericSedan,
  minivan: genericMinivan,
  van: genericVan,
  coupe: genericCoupe,
};

function classifyBodyStyle(name: string): BodyStyle {
  const n = name.toLowerCase();
  // Heavy-duty pickups
  if (/(f-250|f-350|super duty|silverado hd|sierra hd|2500|3500|ram heavy|titan xd)/.test(n))
    return "hd-pickup";
  // Pickups
  if (
    /(f-150|silverado|sierra|ram 1500|tacoma|tundra|ranger|maverick|colorado|canyon|frontier|titan|ridgeline|hummer ev|cybertruck|edv|amarok|gladiator|r1t|r2t|r3t)/.test(
      n,
    )
  )
    return "pickup";
  // Commercial vans
  if (/(transit|promaster|edv|delivery van|cargo van|staria|fleet van|e-transit)/.test(n))
    return "van";
  // Minivans
  if (/(pacifica|voyager|odyssey|sienna|carnival|id\.buzz)/.test(n)) return "minivan";
  // Sports coupes / low performance
  if (
    /(mustang|charger|challenger|corvette|camaro|gr86|supra|roadster|integra|prelude|semi|robotaxi|model s|plaid|coupe|tonale)/.test(
      n,
    )
  )
    return "coupe";
  // Sedans
  if (
    /(camry|corolla|accord|civic|altima|sentra|maxima|jetta|passat|golf|elantra|sonata|k5|ct5|ct4|ats|malibu|fusion|es|g80|g70|ioniq 6|model 3|charger daytona|arteon|crown)/.test(
      n,
    )
  )
    return "sedan";
  // Full-size / three-row SUVs
  if (
    /(escalade|navigator|expedition|suburban|tahoe|yukon|sequoia|wagoneer|grand wagoneer|land cruiser|armada|palisade|telluride|atlas|touareg|q7|qx80|explorer|traverse|pilot|passport|highlander|4runner|pathfinder|durango|aviator|nautilus|enclave|mdx|tx|gx|lx|r1s|r2s|hummer ev suv)/.test(
      n,
    )
  )
    return "fullsize-suv";
  // Compact crossovers
  if (
    /(kona|venue|hr-v|kicks|juke|corsair|puma|taos|t-cross|t-roc|corolla cross|bronco sport|escape|trailblazer|encore|q3|q4)/.test(
      n,
    )
  )
    return "compact-suv";
  // Default: midsize SUV/crossover
  return "midsize-suv";
}

export function vehicleImage(programId: string, name?: string): string {
  if (heroImages[programId]) return heroImages[programId];
  if (!name) return styleImage["midsize-suv"];
  return styleImage[classifyBodyStyle(name)];
}
