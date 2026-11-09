import { Capacitor, registerPlugin } from "@capacitor/core";

const MockLocation = registerPlugin("MockLocation");

export const getCurrentLocation = async () => {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
    const result = await MockLocation.checkMockLocation();

    // GPS HP belum aktif
    if (result.locationEnabled === false) {
      await MockLocation.openLocationSettings();

      throw new Error(
        "Location HP belum aktif. Aktifkan GPS, lalu kembali ke aplikasi.",
      );
    }

    if (!result.checked) {
      throw new Error("Lokasi belum berhasil diperoleh.");
    }

    if (result.isMock) {
      throw new Error("Fake GPS terdeteksi. Matikan aplikasi lokasi palsu.");
    }

    return {
      latitude: result.latitude,
      longitude: result.longitude,
      accuracy: result.accuracy,
      isMock: result.isMock,
    };
  }

  // iOS / Web
  if (!navigator.geolocation) {
    throw new Error("GPS tidak didukung perangkat ini.");
  }

  const position = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    isMock: false,
  };
};

// Haversine Formula
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};
