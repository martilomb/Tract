import wireHarness from "@/assets/parts/wire-harness.png";
import bcm from "@/assets/parts/bcm.png";
import inverter from "@/assets/parts/inverter.png";
import spdjb from "@/assets/parts/spdjb.png";

// Map commodity name -> product photo
export const commodityImages: Record<string, string> = {
  "Wire Harness": wireHarness,
  SPDJB: spdjb,
  Inverter: inverter,
  "Body Control Module (BCM)": bcm,
  "Power Distribution Module": spdjb,
  "Infotainment Head Unit": bcm,
  "Battery Management System": inverter,
  "ADAS Camera Module": bcm,
  "HVAC Controller": bcm,
  "Telematics Control Unit": bcm,
};

export function commodityImage(name: string): string | undefined {
  return commodityImages[name];
}
