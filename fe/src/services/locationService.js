export const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {

        if (!navigator.geolocation) {
            reject({
                code: 0,
                message: "Browser tidak mendukung GPS."
            });
            return;
        }

        navigator.geolocation.getCurrentPosition(

            (position) => {

                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });

            },

            (error) => {

                reject(error);

            },

            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }

        );

    });
};
// Haversine Formula
export const calculateDistance = (lat1, lon1, lat2, lon2) => {

    const R = 6371000;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};