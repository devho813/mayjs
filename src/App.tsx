import React from "react";
import "./App.css";
import GlobalNavigation from "./components/GlobalNavigation";
import Routes from "./components/Routes";
import { BrowserRouter as Router} from "react-router-dom";

function App() {
  return (
    <Router>
      <GlobalNavigation />
      <Routes />
    </Router>
  );
}

export default App;
