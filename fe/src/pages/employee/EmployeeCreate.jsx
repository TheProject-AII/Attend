import { useEffect, useRef, useState } from "react";

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";

import SaveIcon from "@mui/icons-material/Save";
import attendanceService from "../../services/attService";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

export default function EmployeeCreate({
  open,
  onClose,
  onSuccess,
  employee = null,
  mode = "create",
}) {
  const [saving, setSaving] = useState(false);
  const [currentPhotoName, setCurrentPhotoName] = useState("");
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({
    nik: "",
    name: "",
    email: "",
    phone: "",
    department: "",
    position: "",
    role_id: "",
    join_date: "",
    address: "",
    job_description: "", // TAMBAHAN
    employee_type: "TETAP",

    contract_start_date: "",
    contract_end_date: "",

    office_location_id: "",
    supervisor_id: "",

    photo: null,
    ktp: null,
    npwp: null,
    bpjs_kesehatan: null,
    bpjs_tk: null,
    kk: null,
  });

  useEffect(() => {
    if (open) {
      loadRoles();
    }
  }, [open]);

  const FileUploadField = ({
    label,
    buttonText,
    file,
    name,
    onChange,
    accept = "image/jpeg,image/png,image/webp",
  }) => (
    <Box sx={{ width: "100%" }}>
      <Typography
        sx={{
          fontSize: 14,
          fontWeight: 600,
          mb: 1,
          color: "#374151",
        }}
      >
        {label}
      </Typography>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          width: "100%",
        }}
      >
        <Button
          variant="outlined"
          component="label"
          sx={{
            minWidth: 130,
            height: 42,
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          {buttonText}

          <input
            hidden
            type="file"
            name={name}
            accept={accept}
            onChange={onChange}
          />
        </Button>

        <Typography
          variant="body2"
          title={file?.name || ""}
          sx={{
            minWidth: 0,
            flex: 1,
            color: file ? "#374151" : "#9CA3AF",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {file?.name || "No file selected"}
        </Typography>
      </Box>
    </Box>
  );

  useEffect(() => {
    if (mode === "edit" && employee) {
      setForm({
        nik: employee.nik || "",
        name: employee.name || "",
        email: employee.email || "",
        phone: employee.phone || "",
        department: employee.department || "",
        position: employee.position || "",
        role_id: employee.role_id || "",
        join_date: employee.join_date
          ? dayjs(employee.join_date).format("YYYY-MM-DD")
          : "",
        address: employee.address || "",

        employee_type: employee.employee_type || "TETAP",
        job_description: employee.job_description || "",
        contract_start_date: employee.contract_start_date
          ? dayjs(employee.contract_start_date).format("YYYY-MM-DD")
          : "",

        contract_end_date: employee.contract_end_date
          ? dayjs(employee.contract_end_date).format("YYYY-MM-DD")
          : "",

        office_location_id: employee.office_location_id || "",

        supervisor_id: employee.supervisor_id || "",

        // Existing file fields are left empty.
        photo: null,
        ktp: null,
        npwp: null,
        bpjs_kesehatan: null,
        bpjs_tk: null,
        kk: null,
      });
    }
  }, [mode, employee]);

  useEffect(() => {
    if (!open) return;

    const photoPath = employee?.photo || "";

    setCurrentPhotoName(photoPath ? photoPath.split("/").pop() : "");
  }, [open, employee]);
  const generatedPassword =
    form.nik.length >= 4 ? `mui${form.nik.slice(-4)}` : "";

  const openDatePicker = (e) => {
    if (e.currentTarget.showPicker) {
      e.currentTarget.showPicker();
    }
  };
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const loadRoles = async () => {
    try {
      const result = await attendanceService.getRoles();

      if (result.success) {
        setRoles(result.data || []);
      }
    } catch (err) {
      console.error("GET ROLES ERROR:", err);
    }
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const file = files?.[0] || null;

    setForm((prev) => ({
      ...prev,
      [name]: file,
    }));

    if (name === "photo") {
      setPreviewPhotoUrl((oldUrl) => {
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        return file ? URL.createObjectURL(file) : "";
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      const formData = new FormData();

      formData.append("nik", form.nik);
      formData.append("name", form.name);
      formData.append("email", form.email);
      formData.append("phone", form.phone);
      formData.append("department", form.department);
      formData.append("position", form.position);
      formData.append("role_id", form.role_id);
      formData.append("join_date", form.join_date);
      formData.append("address", form.address);
      formData.append("employee_type", form.employee_type);
      formData.append("job_description", form.job_description);
      if (form.employee_type === "KONTRAK") {
        formData.append("contract_start_date", form.contract_start_date);

        formData.append("contract_end_date", form.contract_end_date);
      }

      if (form.office_location_id) {
        formData.append("office_location_id", form.office_location_id);
      }

      if (form.supervisor_id) {
        formData.append("supervisor_id", form.supervisor_id);
      }

      if (form.photo) {
        formData.append("photo", form.photo);
      }

      if (form.ktp) {
        formData.append("ktp", form.ktp);
      }

      if (form.npwp) {
        formData.append("npwp", form.npwp);
      }

      if (form.bpjs_kesehatan) {
        formData.append("bpjs_kesehatan", form.bpjs_kesehatan);
      }

      if (form.bpjs_tk) {
        formData.append("bpjs_tk", form.bpjs_tk);
      }

      if (form.kk) {
        formData.append("kk", form.kk);
      }

      const result =
        mode === "edit"
          ? await attendanceService.updateEmployee(employee.id, formData)
          : await attendanceService.createEmployee(formData);
      if (!result?.success) {
        throw new Error(
          result?.message || "Failed to save employee information.",
        );
      }

      alert(
        mode === "edit"
          ? "Employee information updated successfully."
          : "Employee added successfully.",
      );

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("CREATE EMPLOYEE ERROR:", err);
      alert(
        err.response?.data?.message ||
          err.message ||
          "Failed to save employee information.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>
        <DialogTitle
          sx={{
            pt: 3,
            pb: 2,
          }}
        >
          <Typography
            sx={{
              fontSize: "22px",
              fontWeight: 800,
              color: "#111827",
              lineHeight: 1.3,
            }}
          >
            {mode === "edit" ? "Edit Employee" : "Add Employee"}
          </Typography>

          <Typography
            variant="body2"
            sx={{
              mt: 0.5,
              color: "#6B7280",
              fontWeight: 400,
            }}
          >
            {mode === "edit"
              ? "Update employee information"
              : "Enter employee information and login credentials"}
          </Typography>
        </DialogTitle>
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Grid container spacing={2}>
            {/* PHOTO */}

            {/* EMPLOYEE PHOTO */}
            <Grid size={{ xs: 12, md: 6 }}>
              <FileUploadField
                label="Employee Photo"
                buttonText="Choose Photo"
                name="photo"
                file={
                  form.photo ||
                  (currentPhotoName ? { name: currentPhotoName } : null)
                }
                onChange={handleFileChange}
              />
            </Grid>

            {/* NATIONAL ID PHOTO */}
            <Grid size={{ xs: 12, md: 6 }}>
              <FileUploadField
                label="National ID Photo"
                buttonText="Choose ID"
                name="ktp"
                file={form.ktp}
                onChange={handleFileChange}
              />
            </Grid>
            {/* FAMILY CARD PHOTO */}
            <Grid size={{ xs: 12, md: 6 }}>
              <FileUploadField
                label="Family Card Photo"
                buttonText="Choose Family Card"
                name="kk"
                file={form.kk}
                onChange={handleFileChange}
              />
            </Grid>

            {/* TAX ID PHOTO */}
            <Grid size={{ xs: 12, md: 6 }}>
              <FileUploadField
                label="Tax ID Photo"
                buttonText="Choose Tax ID"
                name="npwp"
                file={form.npwp}
                onChange={handleFileChange}
              />
            </Grid>

            {/* HEALTH INSURANCE PHOTO */}
            <Grid size={{ xs: 12, md: 6 }}>
              <FileUploadField
                label="Health Insurance Photo"
                buttonText="Choose Insurance Document"
                name="bpjs_kesehatan"
                file={form.bpjs_kesehatan}
                onChange={handleFileChange}
              />
            </Grid>

            {/* EMPLOYMENT INSURANCE PHOTO */}
            <Grid size={{ xs: 12, md: 6 }}>
              <FileUploadField
                label="Employment Insurance Photo"
                buttonText="Choose Employment Insurance"
                name="bpjs_tk"
                file={form.bpjs_tk}
                onChange={handleFileChange}
              />
            </Grid>

            {/* NIK */}

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                label="NIK KTP"
                name="nik"
                value={form.nik}
                onChange={handleChange}
                inputProps={{
                  maxLength: 16,
                }}
              />
            </Grid>

            {/* NAME */}

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                label="Full Name"
                name="name"
                value={form.name}
                onChange={handleChange}
              />
            </Grid>

            {/* EMAIL */}

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                type="email"
                label="Email"
                name="email"
                value={form.email}
                onChange={handleChange}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              {mode === "create" && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Initial Password"
                    value={generatedPassword}
                    disabled
                    helperText="Generated from the last 4 digits of the ID number"
                  />
                </Grid>
              )}
            </Grid>

            {/* PHONE */}

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Phone Number"
                name="phone"
                value={form.phone}
                onChange={handleChange}
              />
            </Grid>

            {/* DEPARTMENT */}

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                label="Department"
                name="department"
                value={form.department}
                onChange={handleChange}
              />
            </Grid>

            {/* POSITION */}

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                select
                label="Position"
                name="role_id"
                value={form.role_id}
                onChange={(e) => {
                  const selectedRoleId = e.target.value;

                  const selectedRole = roles.find(
                    (role) => String(role.id) === String(selectedRoleId),
                  );

                  setForm((prev) => ({
                    ...prev,
                    role_id: selectedRoleId,
                    position: selectedRole?.name || "",
                  }));
                }}
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* JOIN DATE */}

            <Grid size={{ xs: 12, md: 6 }}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Start Date"
                  value={form.join_date ? dayjs(form.join_date) : null}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      join_date: value ? value.format("YYYY-MM-DD") : "",
                    }))
                  }
                  format="DD/MM/YYYY"
                  slotProps={{
                    textField: {
                      fullWidth: true,
                    },
                  }}
                />
              </LocalizationProvider>
            </Grid>

            {/* TYPE */}

            {/* EMPLOYEE TYPE */}

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                select
                label="Employee Type"
                name="employee_type"
                value={form.employee_type}
                onChange={handleChange}
              >
                <MenuItem value="TETAP">Permanent Employee</MenuItem>

                <MenuItem value="KONTRAK">Contract Employee</MenuItem>
              </TextField>
            </Grid>

            {/* RIGHT SIDE SPACER */}

            <Grid size={{ xs: 12, md: 6 }} />

            {/* CONTRACT DATES */}

            {form.employee_type === "KONTRAK" && (
              <>
                <Grid size={{ xs: 12, md: 6 }}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Contract Start Date"
                      value={
                        form.contract_start_date
                          ? dayjs(form.contract_start_date)
                          : null
                      }
                      onChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          contract_start_date: value
                            ? value.format("YYYY-MM-DD")
                            : "",
                        }))
                      }
                      format="DD/MM/YYYY"
                      slotProps={{
                        textField: {
                          fullWidth: true,
                        },
                      }}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Contract End Date"
                      value={
                        form.contract_end_date
                          ? dayjs(form.contract_end_date)
                          : null
                      }
                      onChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          contract_end_date: value
                            ? value.format("YYYY-MM-DD")
                            : "",
                        }))
                      }
                      format="DD/MM/YYYY"
                      slotProps={{
                        textField: {
                          fullWidth: true,
                        },
                      }}
                    />
                  </LocalizationProvider>
                </Grid>
              </>
            )}

            {/* ADDRESS */}

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Address"
                name="address"
                value={form.address}
                onChange={handleChange}
              />
            </Grid>

            {/* JOB DESCRIPTION */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                maxRows={8}
                label="Job Description"
                name="job_description"
                value={form.job_description}
                onChange={handleChange}
                placeholder="Enter the employee's duties and responsibilities"
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 2,
          }}
        >
          <Button onClick={handleClose}>Cancel</Button>

          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Employee"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
