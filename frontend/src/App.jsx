
import Phone from "./pages/Phone.jsx";
import Viewer from "./pages/Viewer.jsx";
import useGlobalStore from "../GlobalStore.js";
import { useEffect } from "react";

export default function App() {
  // Fetch the latest case when the app starts
  const { fetchLatestCase } = useGlobalStore();

  // useEffect to fetch the latest case when the component mounts
  // This ensures that the latest case is fetched only once when the app starts
  useEffect(() => {
    fetchLatestCase();
  }, [fetchLatestCase]);

  const role = new URLSearchParams(location.search).get("role");
  if (role === "phone")
    return (
        <Phone />
    );
  if (role === "viewer")
    return (
        <Viewer />
    );
  return (
    <div style={{ fontFamily: "sans-serif", padding: "1rem" }}>
      <h1>Microscope App</h1>
      <p>
        Add <code>?role=phone</code> on your **phone**<br />
        Add <code>?role=viewer</code> on your **PC**
      </p>
    </div>
  );
}