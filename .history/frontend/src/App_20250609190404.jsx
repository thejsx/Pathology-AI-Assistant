
import Phone from "./pages/Phone.jsx";
import Viewer from "./pages/Viewer.jsx";

export default function App() {
  const role = new URLSearchParams(location.search).get("role");
  if (role === "phone") return <Phone />;
  if (role === "viewer") return <Viewer />;
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