import { useEffect, useState, useRef } from "react";
import Swal from "sweetalert2";

import HeroCard from "../../components/attendance/HeroCard";
import AttendanceDialog from "../../components/attendance/AttendanceDialog";
// import announcementService from "../../services/infoService";
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
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [insideRadius, setInsideRadius] = useState(null);
  const [refreshingLocation, setRefreshingLocation] = useState(false);
  const [dialogAction, setDialogAction] = useState(null);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listener;

    const setupListener = async () => {
      listener = await App.addListener(
        "appStateChange",
        async ({ isActive }) => {
          if (isActive) {
            console.log("Aplikasi aktif kembali, refresh GPS...");

            await loadLocation();
          }
        },
      );
    };

    setupListener();

    return () => {
      listener?.remove();
    };
  }, []);
  useEffect(() => {
    loadOffice();
    loadAnnouncements();

    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!office) return;

    loadLocation();
    loadToday();
  }, [office]);

  useEffect(() => {
    if (!openDialog) return;

    if (insideRadius === false) {
      setAttendanceType("WFH");
    } else {
      setAttendanceType("OFFICE");
    }

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

      console.log("ANNOUNCEMENT RESPONSE:", result);

      const data = Array.isArray(result)
        ? result
        : Array.isArray(result?.data)
          ? result.data
          : [];

      console.log("TOTAL ANNOUNCEMENTS:", data.length);

      setAnnouncements(data);
    } catch (err) {
      console.error("LOAD ANNOUNCEMENTS ERROR:", err.response?.data || err);

      setAnnouncements([]);
    }
  };

  const handleCheckIn = async (image) => {
    if (!image) return;

    // Cegah klik berulang.
    if (submittingCheckInRef.current) return;

    submittingCheckInRef.current = true;
    setLoading(true);

    try {
      // Ambil GPS terbaru.
      const currentLocation = await loadLocation();

      if (!currentLocation) return;

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
        html: `
        <b>${result.name}</b><br>
        Distance: ${result.distance} meters
      `,
        timer: 2000,
        showConfirmButton: false,
      });

      await loadToday();
      await loadLocation();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        err.message ||
        "Check-in failed.";

      Swal.fire({
        icon: "error",
        title: "Check-in Failed",
        text: message,
      });
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

    // Ambil GPS terbaru setiap melakukan absensi
    const currentLocation = await loadLocation();

    if (!currentLocation) {
      return;
    }

    try {
      setLoading(true);

      // =====================================
      // FORM CHECK OUT
      // =====================================

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
      setLoading(false);
    }
  };

  // get cordinat
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
      console.error("GPS Error Detail:", JSON.stringify(err, null, 2));
      console.error("GPS Error Message:", err?.message);
      console.error("GPS Error Code:", err?.code);

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
          text =
            err.message || "An error occurred while retrieving your location.";
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

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], filename, {
      type: mime,
    });
  };

  const loadToday = async () => {
    try {
      const result = await attendanceService.getToday();

      const today = result.data;

      setTodayData(today);

      if (today.checkIn && !today.checkOut) {
        setStatus("checked-in");
      } else if (today.checkIn && today.checkOut) {
        setStatus("checked-out");
      } else {
        setStatus("idle");
      }

      return today;
    } catch (err) {
      console.error(err);

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
        onOpenAttendance={() => {
          setDialogAction(status === "checked-in" ? "CHECK_OUT" : "CHECK_IN");

          setOpenDialog(true);
        }}
      />
      {/* <Box sx={{ mt: 3 }}>
                <LocationCard />
            </Box> */}
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
