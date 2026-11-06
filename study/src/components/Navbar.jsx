import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">

      <div className="logo">
         AI Study Buddy
      </div>

      <div className="nav-links">
        <Link to="/">Home</Link>
        <a href="/#features">Features</a>
        <a href="/#about">About</a>
      </div>

      <Link to="/login" className="login-btn">
        Login 
      </Link>

    </nav>
  );
}

export default Navbar;