import { useEffect, useState, useRef, useCallback } from "react";
import Swal from "sweetalert2";

import HeroCard from "../../components/attendance/HeroCard";
import AttendanceDialog from "../../components/attendance/AttendanceDialog";
import announcementService from "../../services/announcementService";
import AnnouncementSlider from "../../components/attendance/AnnouncementSlider";
import attendanceService from "../../services/attService";
import {
  getCurrentLocation,
  calculateDistance,
} from "../../services/locationService";
import officeService from "../../services/officeService";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

import {
  saveOfflineAttendance,
  getPendingOfflineAttendance,
  syncPendingOfflineAttendance,
} from "../../services/offlineAttendanceService";
import {
  saveOfflineAttendancePhoto,
  deleteOfflineAttendancePhoto,
} from "../../services/offlinePhotoService";

export default function Attendance() {
  const [openDialog, setOpenDialog] = useState(false);
  const [attendanceType, setAttendanceType] = useState("OFFICE");
  const [notes, setNotes] = useState("");
  const [office, setOffice] = useState(null);
  const [todayData, setTodayData] = useState(null);
  const [time, setTime] = useState(new Date());
  const [gpsReady, setGpsReady] = useState(false);
  const [status, setStatus] = useState("idle");
  const [location, setLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [photo, setPhoto] = useState(null);
  const cameraRef = useRef(null);
  const submittingCheckInRef = useRef(false);
  const submittingCheckOutRef = useRef(false);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [insideRadius, setInsideRadius] = useState(null);
  const [refreshingLocation, setRefreshingLocation] = useState(false);
  const [dialogAction, setDialogAction] = useState(null);
  const syncingRef = useRef(false);

  const getCurrentUserId = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const id =
        user.id ?? user.user_id ?? user.employee_id ?? user.employee?.id;
      return id ? Number(id) : null;
    } catch {
      return null;
    }
  };

  // Kunci cache dipisahkan per karyawan dan tanggal Jakarta agar data
  // absensi kemarin atau milik akun lain tidak dipakai untuk hari ini.
  const getTodayDateKey = (date = new Date()) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);

  const getTodayCacheKey = () => {
    const userId = getCurrentUserId();
    if (!userId) return null;
    return `hris_attendance_today_${userId}_${getTodayDateKey()}`;
  };

  const saveTodayCache = (data) => {
    const key = getTodayCacheKey();
    if (!key || !data) return;
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ data, cachedAt: new Date().toISOString() }),
      );
    } catch (error) {
      console.error("SAVE TODAY ATTENDANCE CACHE:", error);
    }
  };

  const getTodayCache = () => {
    const key = getTodayCacheKey();
    if (!key) return null;
    try {
      const cached = JSON.parse(localStorage.getItem(key) || "null");
      return cached?.data || null;
    } catch (error) {
      console.error("READ TODAY ATTENDANCE CACHE:", error);
      return null;
    }
  };

  const applyTodayData = (today) => {
    if (!today) return;
    setTodayData(today);
    if (today.checkIn && !today.checkOut) {
      setStatus("checked-in");
    } else if (today.checkIn && today.checkOut) {
      setStatus("checked-out");
    } else {
      setStatus("idle");
    }
  };

  const refreshTodayFromLocalQueue = useCallback(async () => {
    try {
      const pending = await getPendingOfflineAttendance();
      const userId = getCurrentUserId();
      const ownPending = (pending || []).filter(
        (item) => !userId || Number(item.employee_id) === userId,
      );
      const todayKey = getTodayDateKey();

      const todays = ownPending.filter((item) => {
        const date = new Date(item.occurred_at);
        if (Number.isNaN(date.getTime())) return false;
        return getTodayDateKey(date) === todayKey;
      });

      const checkIn = todays.find(
        (item) => item.attendance_action === "CHECK_IN",
      );
      const checkOut = todays.find(
        (item) => item.attendance_action === "CHECK_OUT",
      );

      // Check-in online mungkin tidak ada di antrean SQLite. Karena itu,
      // antrean lokal hanya menimpa field yang memang punya transaksi offline.
      if (checkIn || checkOut) {
        setTodayData((previous) => {
          const merged = {
            ...(previous || getTodayCache() || {}),
            ...(checkIn ? { checkIn: checkIn.occurred_at } : {}),
            ...(checkOut ? { checkOut: checkOut.occurred_at } : {}),
            offlinePending: true,
          };
          saveTodayCache(merged);
          return merged;
        });

        setStatus((previousStatus) => {
          if (checkOut) return "checked-out";
          if (checkIn) return "checked-in";
          return previousStatus;
        });
      }
    } catch (error) {
      console.error("OFFLINE ATTENDANCE LOCAL REFRESH:", error);
    }
  }, []);

  const runOfflineSync = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    try {
      const result = await syncPendingOfflineAttendance();
      if (result) {
        await loadToday();
        await refreshTodayFromLocalQueue();
      }
    } catch (error) {
      console.error("OFFLINE ATTENDANCE SYNC:", error);
    } finally {
      syncingRef.current = false;
    }
  }, [refreshTodayFromLocalQueue]);

  useEffect(() => {
    loadOffice();
    loadAnnouncements();

    const timer = setInterval(() => setTime(new Date()), 1000);
    const handleOnline = () => runOfflineSync();

    window.addEventListener("online", handleOnline);
    runOfflineSync();

    return () => {
      clearInterval(timer);
      window.removeEventListener("online", handleOnline);
    };
  }, [runOfflineSync]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listener;
    const setupListener = async () => {
      listener = await App.addListener(
        "appStateChange",
        async ({ isActive }) => {
          if (isActive) {
            await loadLocation();
            await runOfflineSync();
          }
        },
      );
    };

    setupListener();
    return () => listener?.remove();
  }, [runOfflineSync]);

  // Pulihkan status absensi dari cache dan antrean lokal tanpa menunggu
  // API office. API office bisa gagal saat perangkat sedang offline.
  useEffect(() => {
    const cachedToday = getTodayCache();
    if (cachedToday) applyTodayData(cachedToday);

    loadToday();
    refreshTodayFromLocalQueue();
  }, [refreshTodayFromLocalQueue]);

  // GPS tetap dapat dibaca perangkat meskipun API office belum tersedia.
  useEffect(() => {
    loadLocation();
  }, [office]);

  useEffect(() => {
    if (!openDialog) return;
    setAttendanceType(insideRadius === false ? "WFH" : "OFFICE");
    setNotes("");
  }, [openDialog, insideRadius]);

  const loadOffice = async () => {
    try {
      const officeData = await officeService.getOffice();
      setOffice(officeData);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const result = await announcementService.getActive();
      const data = Array.isArray(result)
        ? result
        : Array.isArray(result?.data)
          ? result.data
          : [];
      setAnnouncements(data);
    } catch (err) {
      console.error("LOAD ANNOUNCEMENTS ERROR:", err.response?.data || err);
      setAnnouncements([]);
    }
  };

  const saveAttendanceOffline = async ({ action, image, currentLocation }) => {
    const employeeId = getCurrentUserId();
    if (!employeeId) {
      throw new Error(
        "ID karyawan tidak ditemukan di data login. Silakan login ulang saat internet tersedia.",
      );
    }

    const savedPhoto = await saveOfflineAttendancePhoto(image);
    try {
      // Gunakan camelCase sesuai kontrak offlineAttendanceService.
      await saveOfflineAttendance({
        employeeId,
        action,
        occurredAt: new Date().toISOString(),
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        gpsAccuracy: currentLocation.accuracy ?? null,
        isMockLocation: Boolean(currentLocation.isMock),
        attendanceType: action === "CHECK_IN" ? attendanceType : null,
        notes: action === "CHECK_IN" ? notes : null,
        photoPath: savedPhoto.path,
      });
    } catch (error) {
      // Jika antrean SQLite gagal disimpan, hapus foto agar tidak yatim.
      try {
        await deleteOfflineAttendancePhoto(savedPhoto.path);
      } catch (cleanupError) {
        console.error(
          "[OFFLINE PHOTO] Gagal membersihkan foto yatim:",
          cleanupError,
        );
      }
      throw error;
    }

    setOpenDialog(false);
    setPhoto(null);
    if (action === "CHECK_IN") {
      const updated = {
        ...(todayData || {}),
        checkIn: new Date().toISOString(),
        checkOut: null,
        offlinePending: true,
      };
      setTodayData(updated);
      saveTodayCache(updated);
      setStatus("checked-in");
    } else {
      const updated = {
        ...(todayData || getTodayCache() || {}),
        checkOut: new Date().toISOString(),
        offlinePending: true,
      };
      setTodayData(updated);
      saveTodayCache(updated);
      setStatus("checked-out");
    }

    await Swal.fire({
      icon: "success",
      title:
        action === "CHECK_IN" ? "Check-in tersimpan" : "Check-out tersimpan",
      text: "Absensi disimpan di perangkat dan akan disinkronkan otomatis saat internet kembali.",
      confirmButtonText: "OK",
    });
  };

  const isNetworkError = (error) => {
    const message = String(error?.message || "").toLowerCase();
    const code = String(error?.code || "").toUpperCase();

    return (
      !navigator.onLine ||
      (!error?.response &&
        (code === "ERR_NETWORK" ||
          code === "ERR_INTERNET_DISCONNECTED" ||
          code === "ECONNABORTED" ||
          error?.name === "TypeError" ||
          message.includes("network error") ||
          message.includes("failed to fetch") ||
          message.includes("internet disconnected") ||
          message.includes("network request failed") ||
          message.includes("err_internet_disconnected")))
    );
  };

  const handleCheckIn = async (image) => {
    if (!image) return;
    if (submittingCheckInRef.current) return;

    submittingCheckInRef.current = true;
    setLoading(true);

    try {
      const currentLocation = await loadLocation();
      if (!currentLocation) return;

      if (!navigator.onLine) {
        await saveAttendanceOffline({
          action: "CHECK_IN",
          image,
          currentLocation,
        });
        return;
      }

      const file = dataURLtoFile(image, "selfie.jpg");
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("latitude", currentLocation.latitude);
      formData.append("longitude", currentLocation.longitude);
      formData.append("gps_accuracy", currentLocation.accuracy ?? "");
      formData.append(
        "is_mock_location",
        String(currentLocation.isMock ?? false),
      );
      formData.append("attendance_type", attendanceType);
      formData.append("notes", notes);

      const result = await attendanceService.checkIn(formData);

      setOpenDialog(false);
      setPhoto(null);
      setAttendanceType("OFFICE");
      setNotes("");

      Swal.fire({
        icon: "success",
        title: "Check-in Successful",
        html: `<b>${result.name}</b><br>Distance: ${result.distance} meters`,
        timer: 2000,
        showConfirmButton: false,
      });

      await loadToday();
      await loadLocation();
    } catch (err) {
      console.error("CHECK IN ERROR:", err.response?.data || err);

      if (isNetworkError(err)) {
        try {
          const currentLocation = location || (await getCurrentLocation());
          await saveAttendanceOffline({
            action: "CHECK_IN",
            image,
            currentLocation,
          });
          return;
        } catch (offlineError) {
          console.error("SAVE OFFLINE CHECK-IN ERROR:", offlineError);
          cameraRef.current?.showError(
            offlineError.message || "Gagal menyimpan absensi offline.",
          );
          return;
        }
      }

      const message =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        err.message ||
        "Check-in failed. Please try again.";
      cameraRef.current?.showError(message);
    } finally {
      submittingCheckInRef.current = false;
      setLoading(false);
    }
  };

  const handleCheckOut = async (image) => {
    if (!image) {
      cameraRef.current?.showError("Please take a photo of your face.");
      return;
    }
    if (submittingCheckOutRef.current) return;

    submittingCheckOutRef.current = true;
    setLoading(true);

    try {
      const currentLocation = await loadLocation();
      if (!currentLocation) return;

      if (!navigator.onLine) {
        await saveAttendanceOffline({
          action: "CHECK_OUT",
          image,
          currentLocation,
        });
        return;
      }

      const formData = new FormData();
      const file = dataURLtoFile(image, "selfie-checkout.jpg");
      formData.append("photo", file);
      formData.append("latitude", currentLocation.latitude);
      formData.append("longitude", currentLocation.longitude);
      formData.append("gps_accuracy", currentLocation.accuracy ?? "");
      formData.append(
        "is_mock_location",
        String(currentLocation.isMock ?? false),
      );

      const result = await attendanceService.checkOut(formData);

      setOpenDialog(false);
      setPhoto(null);
      await loadToday();
      await loadLocation();

      Swal.fire({
        icon: "success",
        title: "Success",
        text: result.message,
      });
    } catch (err) {
      console.error("CHECK OUT ERROR:", err);

      if (isNetworkError(err)) {
        try {
          const currentLocation = location || (await getCurrentLocation());
          await saveAttendanceOffline({
            action: "CHECK_OUT",
            image,
            currentLocation,
          });
          return;
        } catch (offlineError) {
          console.error("SAVE OFFLINE CHECK-OUT ERROR:", offlineError);
          Swal.fire({
            icon: "error",
            title: "Offline Save Failed",
            text: offlineError.message || "Gagal menyimpan absensi offline.",
          });
          return;
        }
      }

      const message =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        err.message ||
        "Check-out failed.";

      Swal.fire({
        icon: "error",
        title: "Check-out Failed",
        text: message,
      });
    } finally {
      submittingCheckOutRef.current = false;
      setLoading(false);
    }
  };

  const loadLocation = async () => {
    setRefreshingLocation(true);
    try {
      const current = await getCurrentLocation();
      setLocation(current);

      if (!office) {
        setGpsReady(true);
        return current;
      }

      const meter = calculateDistance(
        current.latitude,
        current.longitude,
        Number(office.latitude),
        Number(office.longitude),
      );

      setDistance(meter);
      setInsideRadius(meter <= Number(office.radius));
      setGpsReady(true);
      return current;
    } catch (err) {
      console.error("GPS Error Detail:", err);
      setLocation(null);
      setGpsReady(false);
      setInsideRadius(null);

      let title = "Failed to Get Location";
      let text = err.message || "Please try again.";

      switch (err.code) {
        case 1:
          title = "Location Permission Denied";
          text = "Allow location access for this app in Settings.";
          break;
        case 2:
          title = "GPS Is Not Active";
          text = "Turn on GPS, then press the refresh button.";
          break;
        case 3:
          title = "GPS Timeout";
          text =
            "Unable to retrieve your location. Make sure GPS is enabled and try again.";
          break;
        default:
          title = "Location Unavailable";
      }

      await Swal.fire({
        icon: "warning",
        title,
        text,
        confirmButtonText: "OK",
      });
      return null;
    } finally {
      setRefreshingLocation(false);
    }
  };

  const dataURLtoFile = (dataurl, filename) => {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  };

  const loadToday = async () => {
    // Pulihkan cache lebih dulu agar status Check Out langsung tampil
    // walaupun request ke server sedang gagal/timeout.
    const cachedToday = getTodayCache();
    if (cachedToday) {
      applyTodayData(cachedToday);
    }

    try {
      const result = await attendanceService.getToday();
      const today = result?.data;

      if (!today) {
        throw new Error("Data absensi hari ini tidak tersedia dari server.");
      }

      // Snapshot server menjadi sumber terbaru ketika koneksi tersedia.
      saveTodayCache(today);
      applyTodayData(today);
      return today;
    } catch (err) {
      console.error("LOAD TODAY ERROR:", err);

      if (cachedToday) {
        console.info("Memulihkan status absensi dari cache lokal hari ini.");
        applyTodayData(cachedToday);
        return cachedToday;
      }

      return null;
    }
  };

  return (
    <>
      <HeroCard
        time={time}
        status={status}
        insideRadius={insideRadius}
        loading={loading}
        todayData={todayData}
        gpsReady={gpsReady}
        onRetryLocation={loadLocation}
        refreshingLocation={refreshingLocation}
        onOpenAttendance={async () => {
          const isCheckingOut = status === "checked-in";

          if (isCheckingOut && todayData?.checkIn) {
            const checkInDate = new Date(todayData.checkIn);
            const elapsedMilliseconds = time.getTime() - checkInDate.getTime();
            const nineHoursMilliseconds = 9 * 60 * 60 * 1000;
            const hasValidCheckIn = !Number.isNaN(checkInDate.getTime());
            const hasReachedNineHours =
              hasValidCheckIn && elapsedMilliseconds >= nineHoursMilliseconds;

            if (!hasReachedNineHours) {
              const confirmation = await Swal.fire({
                icon: "warning",
                title: "Attention",
                text: "Your work hours are still under 8 hours, are you sure you want to check out?",
                showCancelButton: true,
                confirmButtonText: "Yes, Check Out",
                cancelButtonText: "No",
                confirmButtonColor: "#d32f2f",
                cancelButtonColor: "#757575",
                reverseButtons: true,
              });
              if (!confirmation.isConfirmed) return;
            }
          }

          setDialogAction(isCheckingOut ? "CHECK_OUT" : "CHECK_IN");
          setOpenDialog(true);
        }}
      />

      <AnnouncementSlider announcements={announcements} />

      <AttendanceDialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setPhoto(null);
        }}
        insideRadius={insideRadius}
        attendanceType={attendanceType}
        setAttendanceType={setAttendanceType}
        cameraRef={cameraRef}
        notes={notes}
        setNotes={setNotes}
        photo={photo}
        setPhoto={setPhoto}
        loading={loading}
        status={status}
        onConfirm={
          dialogAction === "CHECK_OUT" ? handleCheckOut : handleCheckIn
        }
      />
    </>
  );
}
