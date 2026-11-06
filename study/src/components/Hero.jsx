import { Link } from "react-router-dom";

function Hero() {
  return (
    <section className="hero">

      <div className="hero-content">

        <span className="badge">
           Your Smart Learning Partner
        </span>

        <h1>
          Learn Smarter,
          <span> Achieve Bigger</span>
        </h1>

        <p>
          AI-powered study platform for every learner.
          Search, Learn, Practice and Grow — all in one place.
        </p>

        <div className="search-box">

          <input
            type="text"
            placeholder="Search any topic... (e.g. React, Java)"
          />

          <button>
            Search 
          </button>

        </div>

        <div className="hero-actions">
          <Link to="/signup" className="hero-cta">
            Get Started 
          </Link>
        </div>

      </div>

    </section>
  );
}

export default Hero;