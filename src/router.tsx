import { createBrowserRouter } from "react-router";
import Cesium from "./Cesium";

export const router = createBrowserRouter([{
    path: "/",
    element: <Cesium />
}])