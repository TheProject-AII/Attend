import Webcam from "react-webcam";
import { useRef, useState, useEffect } from "react";
import attendanceService from "../services/attService";

const [location, setLocation] = useState(null);

useEffect(() => {

    navigator.geolocation.getCurrentPosition(

        (pos) => {

            setLocation({

                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude

            });

        },

        (err) => {

            console.log(err);

        }

    );

}, []);