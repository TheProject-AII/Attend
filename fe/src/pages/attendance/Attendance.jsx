import { useEffect, useState, useRef } from "react";
import Swal from "sweetalert2";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
} from "@mui/material";

import HeroCard from "../../components/attendance/HeroCard";
import AttendanceDialog from "../../components/attendance/AttendanceDialog";
// import announcementService from "../../services/infoService";
import announcementService from "../../services/announcementService";
import AnnouncementSlider from "../../components/attendance/AnnouncementSlider";
import attendanceService from "../../services/attService";
import overtimeService from "../../services/overtimeService";
import {
  getCurrentLocation,
  calculateDistance,
} from "../../services/locationService";

import officeService from "../../services/officeService";

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
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [insideRadius, setInsideRadius] = useState(null);
  const [refreshingLocation, setRefreshingLocation] = useState(false);
  const [dialogAction, setDialogAction] = useState(null);
  //lebih dari 9 jam lembur?
  const [overtimeDialog, setOvertimeDialog] = useState(false);

  const [overtimeDate, setOvertimeDate] = useState("");
  const [overtimeStart, setOvertimeStart] = useState("");
  const [overtimeEnd, setOvertimeEnd] = useState("");
  const [overtimeReason, setOvertimeReason] = useState("");

  const getLocalTimeFromTimestamp = (timestamp) => {
    if (!timestamp) return "";

    const timePart = timestamp.split("T")[1]?.substring(0, 5);

    return timePart || "";
  };

  const formatTimeWIB = (dateString) => {
    if (!dateString) return "-";

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(date);
  };

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
    if (!image) {
      return;
    }

    let currentLocation = location;

    if (!currentLocation) {
      currentLocation = await loadLocation();
    }

    if (!currentLocation) {
      Swal.fire({
        icon: "error",
        title: "Location",
        text: "Unable to retrieve your location.",
      });

      return;
    }

    setLoading(true);

    try {
      const file = dataURLtoFile(image, "selfie.jpg");

      const formData = new FormData();

      formData.append("photo", file);
      console.log("[SELFIE DEBUG]", {
        imageExists: !!image,
        imageLength: image?.length,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });
      formData.append("latitude", currentLocation.latitude);

      formData.append("longitude", currentLocation.longitude);

      formData.append("attendance_type", attendanceType);

      formData.append("notes", notes);

      const result = await attendanceService.checkIn(formData);

      // Close the camera dialog.
      setOpenDialog(false);
      setPhoto(null);
      setAttendanceType("OFFICE");
      setNotes("");

      // Show the success alert after the API request completes.
      Swal.fire({
        icon: "success",
        title: "Check-in Successful",
        html: `
        <b>${result.office}</b><br>
        Distance: ${result.distance} meters
    `,
        timer: 2000,
        showConfirmButton: false,
      });

      // Refresh attendance data.
      await loadToday();

      // No need to retrieve GPS again here.
      // await loadLocation();

      await loadLocation();
      // Reset dialog
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Check-in failed.";

      // Show face-matching errors in CameraCard instead of a popup.
      const errorCode = err.response?.data?.code;

      const isFaceError =
        errorCode === "FACE_AI_UNAVAILABLE" ||
        errorCode === "FACE_NOT_MATCHED" ||
        /wajah|face|selfie|foto referensi|pencahayaan/i.test(message);

      if (isFaceError) {
        cameraRef.current?.showError(message);
        return;
      }
      // Error lainnya tetap menggunakan SweetAlert
      Swal.fire({
        icon: "error",
        title: "Check-in Failed",
        text: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const checkOvertime = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) {
      return false;
    }

    const start = new Date(checkIn);
    const end = new Date(checkOut);

    const durationMinutes = Math.floor((end - start) / 60000);

    return durationMinutes > 9 * 60;
  };

  const handleSubmitOvertime = async () => {
    if (!overtimeReason.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Work Description Required",
        text: "Enter the work performed during overtime.",
      });

      return;
    }

    try {
      setLoading(true);

      await overtimeService.create({
        overtime_date: overtimeDate,
        start_time: overtimeStart,
        end_time: overtimeEnd,
        reason: overtimeReason,
      });

      setOvertimeDialog(false);

      setOvertimeReason("");

      Swal.fire({
        icon: "success",
        title: "Overtime Request Submitted",
        text: "Your overtime request is awaiting manager approval.",
      });
    } catch (err) {
      console.error("CREATE OVERTIME ERROR:", err);

      Swal.fire({
        icon: "error",
        title: "Overtime Request Failed",
        text:
          err.response?.data?.message || "Failed to submit overtime request.",
      });
    } finally {
      setLoading(false);
    }
  };
  const handleCheckOut = async (image) => {
    if (!image) {
      cameraRef.current?.showError("Please take a photo of your face.");
      return;
    }

    let currentLocation = location;

    if (!currentLocation) {
      currentLocation = await loadLocation();
    }

    if (!currentLocation) {
      Swal.fire({
        icon: "error",
        title: "Location",
        text: "Unable to retrieve your location.",
      });

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

      const result = await attendanceService.checkOut(formData);

      setOpenDialog(false);
      setPhoto(null);

      // =====================================
      // AMBIL DATA ABSENSI TERBARU
      // =====================================

      const today = await loadToday();

      await loadLocation();

      // =====================================
      // CEK JAM KERJA
      // =====================================

      if (today?.checkIn && today?.checkOut) {
        // ---------------------------------
        // Use the raw API time without converting the time zone.
        // ---------------------------------

        const checkInTime = formatTimeWIB(today.checkIn);

        const checkOutTime = formatTimeWIB(today.checkOut);

        // ---------------------------------
        // Convert HH:mm to total minutes.
        // ---------------------------------

        const [checkInHour, checkInMinute] = checkInTime.split(":").map(Number);

        const [checkOutHour, checkOutMinute] = checkOutTime
          .split(":")
          .map(Number);

        let checkInTotal = checkInHour * 60 + checkInMinute;

        let checkOutTotal = checkOutHour * 60 + checkOutMinute;

        // ---------------------------------
        // Handle check-out after midnight.
        // ---------------------------------

        if (checkOutTotal < checkInTotal) {
          checkOutTotal += 24 * 60;
        }

        // ---------------------------------
        // TOTAL WORKING TIME
        // ---------------------------------

        const workingMinutes = checkOutTotal - checkInTotal;

        console.log("CHECK IN:", checkInTime);

        console.log("CHECK OUT:", checkOutTime);

        console.log("TOTAL JAM KERJA:", workingMinutes, "MENIT");

        // =================================
        // MORE THAN 9 HOURS?
        // =================================

        if (workingMinutes > 9 * 60) {
          const hours = Math.floor(workingMinutes / 60);

          const minutes = workingMinutes % 60;

          // =================================
          // TANYA LEMBUR
          // =================================

          const confirm = await Swal.fire({
            icon: "question",

            title: "Overtime Request",

            html: `
                            Your working time is
                            <b>
                                ${hours} hr ${minutes} min
                            </b>.
                            <br><br>
                            Did you work overtime?
                        `,

            showCancelButton: true,

            confirmButtonText: "Yes, Submit Overtime Request",

            cancelButtonText: "No",
          });

          // =================================
          // JIKA YA
          // =================================

          if (confirm.isConfirmed) {
            // =============================
            // TANGGAL LEMBUR
            // =============================

            const todayDate = today.checkOut.split("T")[0];

            setOvertimeDate(todayDate);

            // =============================
            // JAM MULAI LEMBUR
            //
            // CHECK-IN + 9 JAM
            // =============================

            let overtimeStartTotal = checkInTotal + 9 * 60;

            // -----------------------------
            // Jika melewati tengah malam
            // -----------------------------

            overtimeStartTotal %= 24 * 60;

            const overtimeStartHour = Math.floor(overtimeStartTotal / 60);

            const overtimeStartMinute = overtimeStartTotal % 60;

            setOvertimeStart(
              `${String(overtimeStartHour).padStart(2, "0")}:${String(
                overtimeStartMinute,
              ).padStart(2, "0")}`,
            );

            // =============================
            // JAM SELESAI LEMBUR
            //
            // = JAM CHECKOUT
            // =============================

            setOvertimeEnd(checkOutTime);

            // =============================
            // RESET KETERANGAN
            // =============================

            setOvertimeReason("");

            // =============================
            // BUKA FORM LEMBUR
            // =============================

            setOvertimeDialog(true);
          }
        }
      }

      // =====================================
      // ALERT CHECK OUT BERHASIL
      // =====================================

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

      const isFaceError = /wajah|face|selfie|foto referensi|pencahayaan/i.test(
        message,
      );

      if (isFaceError) {
        cameraRef.current?.showError(message);
        return;
      }

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
      console.error("GPS Error:", err);

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
      <Dialog
        open={overtimeDialog}
        onClose={() => {
          if (!loading) {
            setOvertimeDialog(false);
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Overtime Request</DialogTitle>

        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            You have worked for more than 9 hours. Complete your overtime
            request.
          </Typography>

          <TextField
            fullWidth
            type="date"
            label="Overtime Date"
            value={overtimeDate}
            InputLabelProps={{
              shrink: true,
            }}
            disabled
            sx={{ mb: 2 }}
          />

          <Box
            sx={{
              display: "flex",
              gap: 2,
              mb: 2,
            }}
          >
            <TextField
              fullWidth
              type="time"
              label="Start Time"
              value={overtimeStart}
              InputLabelProps={{
                shrink: true,
              }}
              disabled
            />

            <TextField
              fullWidth
              type="time"
              label="End Time"
              value={overtimeEnd}
              InputLabelProps={{
                shrink: true,
              }}
              disabled
            />
          </Box>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Work / Details"
            placeholder="Describe the work performed during overtime..."
            value={overtimeReason}
            onChange={(e) => setOvertimeReason(e.target.value)}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOvertimeDialog(false)} disabled={loading}>
            Later
          </Button>

          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmitOvertime}
            disabled={loading || !overtimeReason.trim()}
          >
            {loading ? "Submitting..." : "Submit Overtime Request"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
