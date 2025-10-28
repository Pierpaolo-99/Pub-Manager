import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./routes/protectedRoute";
import { AuthProvider } from "./context/Authcontext";
import Login from "./pages/auth/login";
import Home from "./pages/home";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home/>}/>
          <Route path="/login" element={<Login />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["admin"]}>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
