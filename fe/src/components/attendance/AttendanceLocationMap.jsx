import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const createMarkerIcon = (color) =>
  L.divIcon({
    className: "attendance-marker",
    html: `
      <div style="
        background:${color};
        width:20px;
        height:20px;
        border:3px solid white;
        border-radius:50%;
        box-shadow:0 2px 8px #0005;
      "></div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

const checkInIcon = createMarkerIcon("#16a34a");
const checkOutIcon = createMarkerIcon("#dc2626");
const autoCheckoutIcon = createMarkerIcon("#f59e0b");

function FitBounds({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 1) {
      map.setView(positions[0], 17);
    } else if (positions.length > 1) {
      map.fitBounds(positions, {
        padding: [40, 40],
        maxZoom: 17,
      });
    }
  }, [map, positions]);

  return null;
}

export default function AttendanceLocationMap({
  checkInLat,
  checkInLng,
  checkOutLat,
  checkOutLng,
  autoCheckoutLat,
  autoCheckoutLng,
  autoCheckoutTime,
  gpsCapturedAt,
}) {
  const validCoordinate = (lat, lng) =>
    lat !== null &&
    lat !== undefined &&
    lat !== "" &&
    lng !== null &&
    lng !== undefined &&
    lng !== "" &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng)) &&
    Math.abs(Number(lat)) <= 90 &&
    Math.abs(Number(lng)) <= 180;

  const hasCheckIn = validCoordinate(checkInLat, checkInLng);
  const hasCheckOut = validCoordinate(checkOutLat, checkOutLng);
  const hasAutoCheckout = validCoordinate(autoCheckoutLat, autoCheckoutLng);

  if (!hasCheckIn && !hasCheckOut && !hasAutoCheckout) {
    return <div>Attendance location is unavailable.</div>;
  }

  const inPosition = hasCheckIn
    ? [Number(checkInLat), Number(checkInLng)]
    : null;

  const outPosition = hasCheckOut
    ? [Number(checkOutLat), Number(checkOutLng)]
    : null;

  const autoPosition = hasAutoCheckout
    ? [Number(autoCheckoutLat), Number(autoCheckoutLng)]
    : null;

  const positions = [inPosition, outPosition, autoPosition].filter(Boolean);

  return (
    <div>
      <MapContainer
        center={positions[0]}
        zoom={16}
        scrollWheelZoom={false}
        style={{
          height: 320,
          width: "100%",
          borderRadius: 12,
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds positions={positions} />

        {hasCheckIn && (
          <Marker position={inPosition} icon={checkInIcon}>
            <Popup>
              <strong>Check In</strong>
              <br />
              {inPosition.join(", ")}
            </Popup>
          </Marker>
        )}

        {hasCheckOut && (
          <Marker position={outPosition} icon={checkOutIcon} zIndexOffset={100}>
            <Popup>
              <strong>Check Out</strong>
              <br />
              {outPosition.join(", ")}
            </Popup>
          </Marker>
        )}

        {hasAutoCheckout && (
          <Marker
            position={autoPosition}
            icon={autoCheckoutIcon}
            zIndexOffset={200}
          >
            <Popup>
              <strong>Auto Checkout</strong>
              <br />
              {autoPosition.join(", ")}
              <br />
              Waktu: {autoCheckoutTime || "-"}
              <br />
              GPS Captured: {gpsCapturedAt || "-"}
            </Popup>
          </Marker>
        )}
      </MapContainer>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          marginTop: 12,
          fontSize: 13,
        }}
      >
        <span>🟢 Check In</span>
        <span>🔴 Check Out</span>
        <span>🟠 Auto Checkout</span>
      </div>
    </div>
  );
}
