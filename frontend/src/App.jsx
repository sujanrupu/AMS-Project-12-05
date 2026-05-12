import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index    from "./pages/Index";
import Tickets  from "./pages/Tickets";
import Runbooks from "./pages/Runbooks";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<Index />}    />
        <Route path="/tickets"   element={<Tickets />}  />
        <Route path="/runbooks"  element={<Runbooks />} />
      </Routes>
    </BrowserRouter>
  );
}