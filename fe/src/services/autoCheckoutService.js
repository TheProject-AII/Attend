import { registerPlugin } from "@capacitor/core";

const MockLocation = registerPlugin("MockLocation");

export const enableBackgroundLocation = async () => {
  return MockLocation.openBackgroundLocationSettings();
};
