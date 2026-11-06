import { Link } from "react-router-dom";

const features = [
  {
    icon: "🤖",
    title: "AI Assistant",
    desc: "Get instant answers",
    path: "/ai-assistant"
  },
  {
    icon: "📄",
    title: "PDF Analyzer",
    desc: "Get PDF Summary",
    path: "/pdf-analyzer"
  },
  {
    icon: "⏱️",
    title: "Study Timer",
    desc: "Track your study time",
    path: "/study-timer"
  },
  {
    icon: "📅",
    title: "Study Planner",
    desc: "Plan your study",
    path: "/study-planner"
  },
  {
    icon: "📝",
    title: "Quiz Generator",
    desc: "Test your knowledge",
    path: "/quiz"
  },
  {
    icon: "📚",
    title: "My Notes",
    desc: "Save and organize",
    path: "/notes"
  }
];

function Features() {
  return (
    <section className="features" id="features">

      <h2>Everything You Need to Learn</h2>

      <p>All your study tools in one place.</p>

      <div className="feature-grid">

        {features.map((item) => (

          <Link className="feature-card" key={item.path} to={item.path}>

            <div className="feature-icon">
              {item.icon}
            </div>

            <h3>{item.title}</h3>

            <p>{item.desc}</p>

          </Link>

        ))}

      </div>

    </section>
  );
}

export default Features;