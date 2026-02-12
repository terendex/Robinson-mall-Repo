import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./component/Log.jsx";
import Register from "./component/Register.jsx";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </Router>
  );
}
