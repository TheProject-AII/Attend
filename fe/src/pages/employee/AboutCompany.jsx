import {
  Box,
  Card,
  CardContent,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Chip,
} from "@mui/material";

import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import { useNavigate } from "react-router-dom";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Button } from "@mui/material";

const businessPillars = [
  {
    title: "Keuangan",
    description:
      "Layanan investasi, pengelolaan modal, dan konsultasi keuangan.",
    icon: <AccountBalanceRoundedIcon />,
  },
  {
    title: "LPK",
    description: "Pelatihan dan pengembangan sumber daya manusia.",
    icon: <SchoolRoundedIcon />,
  },
  {
    title: "Mobilitas",
    description: "Investasi dan kemitraan di bidang transportasi dan otomotif.",
    icon: <DirectionsCarRoundedIcon />,
  },
];

// Daftar department awal.
// Sesuaikan dengan struktur organisasi resmi perusahaan.
const departments = [
  {
    name: "HRGA",
    fullName: "Human Resources & General Affairs",
    description:
      "Mengelola sumber daya manusia, administrasi karyawan, dan kebutuhan umum perusahaan.",
  },
  {
    name: "IT",
    fullName: "Information Technology",
    description:
      "Mengelola sistem informasi, infrastruktur teknologi, aplikasi, dan dukungan IT.",
  },
  {
    name: "Finance & Accounting",
    fullName: "Finance & Accounting",
    description:
      "Mengelola keuangan, pencatatan transaksi, anggaran, dan laporan keuangan.",
  },
  {
    name: "Business Development",
    fullName: "Business Development",
    description:
      "Mengembangkan peluang bisnis, kemitraan, dan hubungan strategis perusahaan.",
  },
  {
    name: "Operations",
    fullName: "Operations",
    description:
      "Mengelola dan memastikan kegiatan operasional perusahaan berjalan dengan baik.",
  },
];

function SectionAccordion({ title, children }) {
  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "10px !important",
        "&:before": { display: "none" },
        overflow: "hidden",
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreRoundedIcon />}
        sx={{ minHeight: 54, "& .MuiAccordionSummary-content": { my: 1.5 } }}
      >
        <Typography fontWeight={700} fontSize={14}>
          {title}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, pb: 2 }}>{children}</AccordionDetails>
    </Accordion>
  );
}

export default function AboutCompany() {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 2, pb: 12 }}>
      <Button
        onClick={() => navigate(-1)}
        startIcon={<ArrowBackRoundedIcon />}
        sx={{ mb: 2, textTransform: "none" }}
      >
        Kembali
      </Button>

      {/* COMPANY HEADER */}
      <Card sx={{ borderRadius: 2, mb: 2 }}>
        <CardContent sx={{ p: 3, textAlign: "center" }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              mx: "auto",
              mb: 1.5,
              borderRadius: 3,
              bgcolor: "primary.main",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BusinessRoundedIcon sx={{ fontSize: 40 }} />
          </Box>

          <Typography fontSize={18} fontWeight={800}>
            PT. Asia Investment Indonesia
          </Typography>

          <Typography color="text.secondary" variant="body2" mt={1}>
            Cross-Border Investment and Business Development Advisory
          </Typography>

          <Chip
            label="Established July 2023"
            color="primary"
            variant="outlined"
            size="small"
            sx={{ mt: 2 }}
          />
        </CardContent>
      </Card>

      <Box display="flex" flexDirection="column" gap={1.5}>
        {/* ABOUT */}
        <SectionAccordion title="Profil Perusahaan">
          <Typography variant="body2" color="text.secondary" lineHeight={1.8}>
            PT. Asia Investment Indonesia merupakan perusahaan investasi bisnis
            dan konsultasi yang menghubungkan Indonesia dan Jepang. Perusahaan
            didirikan di Jakarta pada Juli 2023.
          </Typography>
        </SectionAccordion>

        {/* BUSINESS */}
        <SectionAccordion title="Bidang Usaha">
          {businessPillars.map((item, index) => (
            <Box key={item.title}>
              <Box display="flex" gap={1.5} py={1.5}>
                <Box color="primary.main">{item.icon}</Box>
                <Box flex={1}>
                  <Typography fontWeight={700} fontSize={14}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    {item.description}
                  </Typography>
                </Box>
              </Box>
              {index !== businessPillars.length - 1 && <Divider />}
            </Box>
          ))}
        </SectionAccordion>

        {/* MANAGEMENT */}
        <SectionAccordion title="Struktur Manajemen">
          <Box display="flex" flexDirection="column" alignItems="center">
            <Box
              sx={{
                width: "100%",
                p: 2,
                borderRadius: 2,
                bgcolor: "primary.main",
                color: "white",
                textAlign: "center",
              }}
            >
              <PersonOutlineRoundedIcon sx={{ fontSize: 30 }} />
              <Typography fontWeight={700}>Direktur</Typography>
              <Typography variant="caption">Pimpinan Perusahaan</Typography>
              <Typography variant="caption" display="block" mt={0.5}>
                Nama pejabat dapat ditambahkan
              </Typography>
            </Box>

            <Box
              sx={{
                height: 25,
                borderLeft: "2px solid",
                borderColor: "divider",
              }}
            />
          </Box>

          {departments.map((department) => (
            <Accordion
              key={department.name}
              disableGutters
              elevation={0}
              sx={{
                mb: 1,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "8px !important",
                "&:before": { display: "none" },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                <Box display="flex" alignItems="center" gap={1.5}>
                  <GroupsRoundedIcon color="primary" />
                  <Box>
                    <Typography fontWeight={700} fontSize={13}>
                      {department.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {department.fullName}
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>

              <AccordionDetails>
                <Typography variant="body2" color="text.secondary">
                  {department.description}
                </Typography>

                <Divider sx={{ my: 1.5 }} />

                <Typography fontSize={12} color="text.secondary">
                  Kepala Department
                </Typography>
                <Typography fontWeight={600} fontSize={13}>
                  Belum ditambahkan
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </SectionAccordion>

        {/* OFFICE AND CONTACT */}
        <SectionAccordion title="Informasi Kantor & Kontak">
          {/* KANTOR HOLDING */}
          {/* KANTOR HOLDING */}
          <Box display="flex" gap={1.5} mb={2}>
            <LocationOnOutlinedIcon color="primary" />

            <Box flex={1}>
              <Typography fontWeight={700} fontSize={13}>
                Holding Office
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                lineHeight={1.7}
              >
                Plaza Asia, Lantai 16
                <br />
                Jl. Jend. Sudirman Kav. 59
                <br />
                Senayan, Jakarta Selatan
                <br />
                DKI Jakarta 12190
                <br />
                Indonesia
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* KANTOR JAKARTA */}
          <Box display="flex" gap={1.5} mb={2}>
            <LocationOnOutlinedIcon color="primary" />

            <Box flex={1}>
              <Typography fontWeight={700} fontSize={13}>
                Operational Office
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Summitmas, Lantai 2 (Start Up Office)
                <br />
                Jl. Jend. Sudirman, Jakarta Selatan
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* KONTAK */}
          <Box display="flex" gap={1.5} mb={2}>
            <PhoneOutlinedIcon color="primary" />
            <Box flex={1}>
              <Typography fontWeight={600} fontSize={13}>
                Telepon / WhatsApp
              </Typography>
              <Typography variant="body2" color="text.secondary">
                0821-1331-6140
              </Typography>
            </Box>
          </Box>

          <Box display="flex" gap={1.5} mb={2}>
            <EmailOutlinedIcon color="primary" />
            <Box flex={1}>
              <Typography fontWeight={600} fontSize={13}>
                Email
              </Typography>
              <Typography variant="body2" color="text.secondary">
                umezawa@so-mak.com
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Button
            fullWidth
            variant="outlined"
            startIcon={<LanguageRoundedIcon />}
            onClick={() =>
              window.open(
                "https://asiainvestment.id/",
                "_blank",
                "noopener,noreferrer",
              )
            }
            sx={{ borderRadius: 2, textTransform: "none" }}
          >
            Website Perusahaan
          </Button>
        </SectionAccordion>
      </Box>

      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          mt: 3,
          mb: 2,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          ©{new Date().getFullYear()} PRIDE. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
}
