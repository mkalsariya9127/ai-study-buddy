// AI Study Buddy - Comprehensive Intelligent Tutor Engine

function formatNumber(num) {
  if (typeof num !== "number" || !Number.isFinite(num)) return String(num);
  return Number.isInteger(num) ? num.toLocaleString() : num.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

// ----------------------------------------------------------------------
// 1. ADVANCED MATH SOLVER (Arithmetic, Algebra, Percentages, Geometry)
// ----------------------------------------------------------------------
function solveMath(text) {
  if (!text || typeof text !== "string") return null;

  // Linear Equations: e.g. "solve 2x + 10 = 20", "3x - 5 = 16", "x + 7 = 15"
  const eqMatch = text.match(/([+-]?\s*\d*\.?\d*)\s*([a-zA-Z])\s*([+-]\s*\d+\.?\d*)\s*=\s*([+-]?\s*\d+\.?\d*)/);
  if (eqMatch) {
    const rawA = eqMatch[1].replace(/\s+/g, "");
    const variable = eqMatch[2];
    const rawB = eqMatch[3].replace(/\s+/g, "");
    const rawC = eqMatch[4].replace(/\s+/g, "");

    const a = rawA === "" || rawA === "+" ? 1 : rawA === "-" ? -1 : parseFloat(rawA);
    const b = parseFloat(rawB);
    const c = parseFloat(rawC);

    if (a !== 0) {
      const step1 = c - b;
      const x = step1 / a;
      return `### 🧮 Algebra Solution: **${variable} = ${formatNumber(x)}**\n\n` +
        `**Equation:** \`${a !== 1 ? a : ""}${variable} ${b >= 0 ? "+ " + b : "- " + Math.abs(b)} = ${c}\`\n\n` +
        `#### Step-by-Step Breakdown:\n` +
        `1. Subtract ${formatNumber(b)} from both sides:\n` +
        `   * \`${a !== 1 ? a : ""}${variable} = ${c} - (${b})\`\n` +
        `   * \`${a !== 1 ? a : ""}${variable} = ${formatNumber(step1)}\`\n` +
        `2. Divide both sides by ${formatNumber(a)}:\n` +
        `   * \`${variable} = ${formatNumber(step1)} ÷ ${formatNumber(a)}\`\n` +
        `   * **\`${variable} = ${formatNumber(x)}\`**\n\n` +
        `👉 **Final Answer:** **\`${variable} = ${formatNumber(x)}\`**`;
    }
  }

  // Percentage: e.g. "what is 15% of 850", "20 % of 500"
  const pctMatch = text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of)?\s*(\d+(?:\.\d+)?)/i);
  if (pctMatch) {
    const rate = parseFloat(pctMatch[1]);
    const total = parseFloat(pctMatch[2]);
    const result = (rate / 100) * total;
    return `### 🧮 Calculation Result: **${formatNumber(result)}**\n\n` +
      `**Question:** What is ${formatNumber(rate)}% of ${formatNumber(total)}?\n\n` +
      `#### Step-by-Step Explanation:\n` +
      `1. Convert percentage to fraction: **${rate}% = ${rate} / 100 = ${rate / 100}**\n` +
      `2. Multiply by the total: **${rate / 100} × ${formatNumber(total)} = ${formatNumber(result)}**\n\n` +
      `👉 **Final Answer:** **\`${formatNumber(result)}\`**`;
  }

  // Square root: e.g. "sqrt(144)", "square root of 64"
  const sqrtMatch = text.match(/(?:sqrt\(|square root of\s*)(\d+(?:\.\d+)?)\)?/i);
  if (sqrtMatch) {
    const num = parseFloat(sqrtMatch[1]);
    const result = Math.sqrt(num);
    return `### 🧮 Square Root: **√${formatNumber(num)} = ${formatNumber(result)}**\n\n` +
      `**Question:** What is the square root of ${formatNumber(num)}?\n\n` +
      `* Because **${formatNumber(result)} × ${formatNumber(result)} = ${formatNumber(num)}**\n\n` +
      `👉 **Final Answer:** **\`${formatNumber(result)}\`**`;
  }

  // Arithmetic expressions with two numbers: e.g. "3200* 29", "3200 * 29", "5000 / 25"
  const arithMatch = text.match(/(\d+(?:\.\d+)?)\s*([\+\-\*\/xX×÷\^])\s*(\d+(?:\.\d+)?)/);
  if (arithMatch) {
    const n1 = parseFloat(arithMatch[1]);
    const rawOp = arithMatch[2];
    const n2 = parseFloat(arithMatch[3]);

    let res = 0;
    let opSymbol = rawOp;
    let explanation = "";

    if (rawOp === "*" || rawOp === "x" || rawOp === "X" || rawOp === "×") {
      res = n1 * n2;
      opSymbol = "×";
      explanation = `1. **Direct Multiplication:** **${formatNumber(n1)} × ${formatNumber(n2)} = ${formatNumber(res)}**\n` +
        `2. **Mental Math Shortcut:** Round ${formatNumber(n2)} to nearest friendly number:\n` +
        `   * ${formatNumber(n1)} × ${n2 + 1} = ${formatNumber(n1 * (n2 + 1))}\n` +
        `   * Subtract ${formatNumber(n1)} × 1 = ${formatNumber(n1)}\n` +
        `   * **${formatNumber(n1 * (n2 + 1))} - ${formatNumber(n1)} = ${formatNumber(res)}**`;
    } else if (rawOp === "/" || rawOp === "÷") {
      if (n2 === 0) {
        return `### ⚠️ Division Error\n\nDivision by zero is **undefined** in mathematics.`;
      }
      res = n1 / n2;
      opSymbol = "÷";
      explanation = `1. Divide ${formatNumber(n1)} by ${formatNumber(n2)}.\n` +
        `2. **${formatNumber(n1)} ÷ ${formatNumber(n2)} = ${formatNumber(res)}**`;
    } else if (rawOp === "+") {
      res = n1 + n2;
      opSymbol = "+";
      explanation = `1. Add ${formatNumber(n1)} and ${formatNumber(n2)}.\n` +
        `2. **${formatNumber(n1)} + ${formatNumber(n2)} = ${formatNumber(res)}**`;
    } else if (rawOp === "-") {
      res = n1 - n2;
      opSymbol = "-";
      explanation = `1. Subtract ${formatNumber(n2)} from ${formatNumber(n1)}.\n` +
        `2. **${formatNumber(n1)} - ${formatNumber(n2)} = ${formatNumber(res)}**`;
    } else if (rawOp === "^") {
      res = Math.pow(n1, n2);
      opSymbol = "^";
      explanation = `1. Raise ${formatNumber(n1)} to the power of ${formatNumber(n2)}.\n` +
        `2. **${formatNumber(n1)}^${formatNumber(n2)} = ${formatNumber(res)}**`;
    }

    return `### 🧮 Math Solution: **${formatNumber(res)}**\n\n` +
      `**Question:** \`${formatNumber(n1)} ${opSymbol} ${formatNumber(n2)}\`\n\n` +
      `#### Step-by-Step Solution:\n` +
      `${explanation}\n\n` +
      `👉 **Final Answer:** **\`${formatNumber(res)}\`**`;
  }

  return null;
}

// ----------------------------------------------------------------------
// 2. FULL FORMS & ACRONYMS
// ----------------------------------------------------------------------
const FULL_FORMS = {
  html: "HyperText Markup Language - Standard language for creating web pages.",
  css: "Cascading Style Sheets - Used for styling and formatting web layouts.",
  js: "JavaScript - High-level programming language that powers interactive web pages.",
  sql: "Structured Query Language - Standard language for storing, manipulating and retrieving data in relational databases.",
  api: "Application Programming Interface - Set of rules and protocols that allow different software applications to communicate with each other.",
  cpu: "Central Processing Unit - The primary component and 'brain' of a computer that performs arithmetic, logical, and control operations.",
  ram: "Random Access Memory - High-speed volatile memory used to store working data currently in use by the OS and applications.",
  rom: "Read-Only Memory - Non-volatile memory that permanently stores firmware and bootloader instructions.",
  url: "Uniform Resource Locator - Global web address used to locate resources on the Internet.",
  http: "Hypertext Transfer Protocol - Foundation data communication protocol used by the World Wide Web.",
  https: "Hypertext Transfer Protocol Secure - Encrypted version of HTTP using SSL/TLS for secure communication.",
  json: "JavaScript Object Notation - Lightweight, text-based data-interchange format easily readable by humans and machines.",
  jwt: "JSON Web Token - Open standard (RFC 7519) defining a compact, self-contained way for securely transmitting information as a JSON object.",
  mongodb: "Humongous Database - Open-source, document-oriented NoSQL database that stores data in flexible JSON-like BSON documents.",
  dom: "Document Object Model - Programming interface for web documents, representing the page structure as a tree of objects.",
  ai: "Artificial Intelligence - Simulation of human intelligence processes by computer systems, including learning, reasoning, and self-correction.",
  ml: "Machine Learning - Subset of AI focused on building systems that learn from data and improve performance automatically.",
  ip: "Internet Protocol - Set of rules governing the format of data sent over the Internet or local network.",
  wifi: "Wireless Fidelity - Wireless networking technology that allows devices to connect to the Internet without physical cables.",
  os: "Operating System - System software that manages computer hardware, software resources, and provides common services for programs.",
  pdf: "Portable Document Format - File format developed by Adobe to present documents independently of application software, hardware, and operating systems.",
  gui: "Graphical User Interface - Visual way of interacting with a computer using windows, icons, and menus instead of text commands.",
  ide: "Integrated Development Environment - Software suite providing comprehensive facilities for computer programming (editor, compiler/interpreter, debugger).",
};

function solveFullForm(text) {
  const lower = text.toLowerCase();
  for (const [key, val] of Object.entries(FULL_FORMS)) {
    if (
      lower.includes(`full form of ${key}`) ||
      lower.includes(`what does ${key} stand for`) ||
      lower.includes(`${key} full form`) ||
      lower.includes(`what is ${key}`) && lower.split(/\s+/).length <= 4
    ) {
      return `### 📖 Definition: **${key.toUpperCase()}**\n\n` +
        `**Full Form / Meaning:**\n` +
        `> **${val}**\n\n` +
        `* **Where it is used:** Widely used in modern computer science, web development, and digital technology.`;
    }
  }
  return null;
}

// ----------------------------------------------------------------------
// 3. SCIENCE, GENERAL KNOWLEDGE & FORMULAS
// ----------------------------------------------------------------------
function solveScienceAndGK(text) {
  const lower = text.toLowerCase();

  // India Leaders
  if (lower.includes("prime minister of india") || lower.includes("pm of india")) {
    return `### 🇮🇳 Prime Minister of India\n\n` +
      `* **Current Prime Minister:** **Shri Narendra Modi**\n` +
      `* **Serving Since:** May 26, 2014\n` +
      `* **Headquarters:** Prime Minister's Office (PMO), South Block, New Delhi.`;
  }
  if (lower.includes("president of india")) {
    return `### 🇮🇳 President of India\n\n` +
      `* **Current President:** **Smt. Droupadi Murmu**\n` +
      `* **Serving Since:** July 25, 2022\n` +
      `* **Residence:** Rashtrapati Bhavan, New Delhi.`;
  }

  // Capitals
  if (lower.includes("capital of gujarat") || lower.includes("gujarat nu capital")) {
    return `### 🏛️ Capital of Gujarat\n\n` +
      `* **Capital City:** **Gandhinagar**\n` +
      `* **Known as:** The Green City of India\n` +
      `* **Major Hub:** Located near Ahmedabad, home to the Gujarat Legislative Assembly (Vidhan Sabha).`;
  }
  if (lower.includes("capital of india") || lower.includes("india nu capital")) {
    return `### 🏛️ Capital of India\n\n` +
      `* **Capital City:** **New Delhi**\n` +
      `* **Seat of Government:** Home to the Parliament of India, Supreme Court, and Rashtrapati Bhavan.`;
  }

  // Physics Formulas & Laws
  if (lower.includes("photosynthesis")) {
    return `### 🌿 Photosynthesis Explained\n\n` +
      `**Photosynthesis** is the biological process by which green plants, algae, and some bacteria convert light energy into chemical energy (glucose).\n\n` +
      `#### Chemical Equation:\n` +
      `$$\\text{6CO}_2 + \\text{6H}_2\\text{O} + \\text{Light} \\rightarrow \\text{C}_6\\text{H}_{12}\\text{O}_6 + \\text{6O}_2$$\n\n` +
      `* **Inputs:** Carbon Dioxide ($\\text{CO}_2$), Water ($\\text{H}_2\\text{O}$), and Sunlight.\n` +
      `* **Outputs:** Glucose (sugar/energy) and Oxygen ($\\text{O}_2$).\n` +
      `* **Location:** Takes place inside plant cell organelles called **chloroplasts** using the green pigment **chlorophyll**.`;
  }

  if (lower.includes("gravity") || lower.includes("gravitation")) {
    return `### 🌌 What is Gravity?\n\n` +
      `**Gravity** is one of the four fundamental forces of nature. It is the universal force of attraction between all objects with mass.\n\n` +
      `#### Newton's Universal Law of Gravitation:\n` +
      `$$F = G \\frac{m_1 m_2}{r^2}$$\n\n` +
      `* $F$: Gravitational force\n` +
      `* $G$: Gravitational constant ($6.674 \\times 10^{-11} \\text{ N}\\cdot\\text{m}^2/\\text{kg}^2$)\n` +
      `* $m_1, m_2$: Masses of the two objects\n` +
      `* $r$: Distance between their centers\n\n` +
      `* **Earth's Acceleration:** Near Earth's surface, gravity accelerates objects at approximately **$9.8 \\text{ m/s}^2$**.`;
  }

  if (lower.includes("newton") && (lower.includes("law") || lower.includes("motion"))) {
    return `### ⚡ Newton's Three Laws of Motion\n\n` +
      `1. **First Law (Law of Inertia):** An object at rest stays at rest, and an object in motion stays in motion with constant velocity, unless acted upon by a net external force.\n` +
      `2. **Second Law (Force & Acceleration):** The acceleration of an object is directly proportional to the net force acting on it and inversely proportional to its mass:\n` +
      `   $$\\mathbf{F = m \\cdot a}$$\n` +
      `3. **Third Law (Action & Reaction):** For every action, there is an equal and opposite reaction ($F_{A \\rightarrow B} = -F_{B \\rightarrow A}$).`;
  }

  if (lower.includes("ohm") && lower.includes("law")) {
    return `### ⚡ Ohm's Law\n\n` +
      `**Ohm's Law** states that the current flowing through a conductor between two points is directly proportional to the voltage across the two points, provided the temperature remains constant.\n\n` +
      `#### Formula:\n` +
      `$$V = I \\times R$$\n\n` +
      `* **$V$:** Voltage (measured in Volts, $\\text{V}$)\n` +
      `* **$I$:** Current (measured in Amperes, $\\text{A}$)\n` +
      `* **$R$:** Resistance (measured in Ohms, $\\Omega$)`;
  }

  if (lower.includes("speed of light")) {
    return `### 💡 Speed of Light\n\n` +
      `* In a vacuum, the speed of light ($c$) is exactly:\n` +
      `  $$\\mathbf{c \\approx 300,000 \\text{ km/s} \\quad (299,792,458 \\text{ m/s})}$$\n` +
      `* Light travels from the Sun to Earth in approximately **8 minutes and 20 seconds**.`;
  }

  // Famous Inventions
  if (lower.includes("who invented computer") || lower.includes("father of computer")) {
    return `### 💻 Invention of the Computer\n\n` +
      `* **Father of the Computer:** **Charles Babbage**\n` +
      `* In the 1830s, he conceptualized and designed the **Analytical Engine**, the first general-purpose mechanical computer featuring an ALU, basic control flow, and integrated memory.`;
  }

  return null;
}

// ----------------------------------------------------------------------
// 4. PROGRAMMING & TECHNICAL TOPICS
// ----------------------------------------------------------------------
function solveTechnical(text) {
  const lower = text.toLowerCase();

  if (lower.includes("react") || lower.includes("hook") || lower.includes("usestate") || lower.includes("useeffect")) {
    return `### ⚛️ React & Hooks Master Guide\n\n` +
      `**React** is an open-source JavaScript library for building responsive, component-based user interfaces.\n\n` +
      `#### Core Concepts:\n` +
      `* **Components:** Reusable UI functions that return JSX.\n` +
      `* **\`useState\`:** Manages internal reactive state:\n` +
      `  \`\`\`javascript\n  const [count, setCount] = useState(0);\n  \`\`\`\n` +
      `* **\`useEffect\`:** Runs side-effects (API data fetching, timers, DOM updates):\n` +
      `  \`\`\`javascript\n  useEffect(() => {\n    fetchData();\n  }, []);\n  \`\`\`\n` +
      `* **Virtual DOM:** In-memory representation of the DOM. React updates only modified parts for maximum performance.`;
  }

  if (lower.includes("python") || lower.includes("list comprehension")) {
    return `### 🐍 Python Core Essentials\n\n` +
      `Python is a versatile, high-level language celebrated for readability.\n\n` +
      `#### Highlights:\n` +
      `* **Clean Syntax:** Indentation defines blocks instead of braces.\n` +
      `* **Data Structures:** Lists \`[1, 2]\`, Tuples \`(1, 2)\`, Dicts \`{"name": "StudyBuddy"}\`.\n` +
      `* **List Comprehension:** Fast inline transformation:\n` +
      `  \`\`\`python\n  evens = [x for x in range(10) if x % 2 == 0]\n  \`\`\``;
  }

  if (lower.includes("sql vs nosql") || lower.includes("difference between sql and nosql") || lower.includes("mongodb vs sql")) {
    return `### 🗄️ SQL vs NoSQL Differences\n\n` +
      `| Metric | SQL (Relational) | NoSQL (MongoDB / Document) |\n` +
      `| :--- | :--- | :--- |\n` +
      `| **Data Model** | Tables, Rows & Columns | JSON/BSON Documents |\n` +
      `| **Schema** | Predefined, rigid schema | Dynamic, flexible schema |\n` +
      `| **Scaling** | Vertical (Scale Up) | Horizontal (Scale Out) |\n` +
      `| **Transactions** | Strict ACID guarantees | Tunable consistency (BASE) |\n` +
      `| **Examples** | PostgreSQL, MySQL, SQLite | MongoDB, Cassandra, Redis |`;
  }

  if (lower.includes("git") || lower.includes("github")) {
    return `### 🐙 Git & Version Control Cheatsheet\n\n` +
      `* \`git init\` - Initialize a new local repository.\n` +
      `* \`git add .\` - Stage all modified files for commit.\n` +
      `* \`git commit -m "msg"\` - Save staged changes with a commit message.\n` +
      `* \`git push origin main\` - Upload commits to remote GitHub repository.\n` +
      `* \`git pull\` - Fetch and integrate changes from remote.\n` +
      `* \`git branch <name>\` - Create a new isolated workspace branch.`;
  }

  return null;
}

// ----------------------------------------------------------------------
// 5. GENERAL EDUCATIONAL QUERY DISPATCHER
// ----------------------------------------------------------------------
function solveEducationalQuery(text) {
  const lower = text.toLowerCase().trim();

  // Greetings in English, Gujarati, Hindi
  if (/^(hi|hello|hey|namaste|kem cho|kemcho|halo|su chale)\b/i.test(lower) && lower.length < 30) {
    return `### 👋 Hello! Welcome to AI Study Buddy!\n\n` +
      `I am your 24/7 personal study assistant. You can ask me **ANY question**:\n\n` +
      `* 🧮 **Math & Calculations:** Try \`3200 * 29\`, \`15% of 850\`, \`solve 2x + 10 = 20\`, or \`sqrt(144)\`\n` +
      `* 🔬 **Science & Formulas:** Photosynthesis, Newton's Laws, Gravity, Ohm's law\n` +
      `* 💻 **Programming:** React, JavaScript, Python, SQL, MongoDB, Git\n` +
      `* 🌍 **General Knowledge:** Capitals, leaders, history, full forms\n` +
      `* 📚 **Exam Preparation:** Spaced repetition, active recall, Pomodoro techniques\n\n` +
      `What would you like to solve or learn right now?`;
  }

  // Check Full Forms
  const fullForm = solveFullForm(text);
  if (fullForm) return fullForm;

  // Check Science and General Knowledge
  const science = solveScienceAndGK(text);
  if (science) return science;

  // Check Technical & Programming
  const technical = solveTechnical(text);
  if (technical) return technical;

  // Study Strategy
  if (lower.includes("study") || lower.includes("exam") || lower.includes("prepare") || lower.includes("memoriz")) {
    return `### 🎯 Scientific Study Techniques for High Scores\n\n` +
      `1. **Active Recall:** Testing yourself beats re-reading 10x. Close your notes and write everything you remember on a blank paper.\n` +
      `2. **Spaced Repetition:** Review topics on intervals: Day 1, Day 3, Day 7, Day 21 to lock information into long-term memory.\n` +
      `3. **Pomodoro Focus Timer:** 25 minutes of deep focus with 0 phone distractions + 5-minute break. (Use our **Study Timer** page to log real sessions!).\n` +
      `4. **Feynman Technique:** Explain the concept in simple words as if teaching a 10-year-old. Wherever you get stuck, re-read that part.`;
  }

  // Clean, structured answer for ANY topic
  const cleanTitle = text.replace(/[?!.]+$/, "").trim();
  return `### 💡 Study Guide: **${cleanTitle}**\n\n` +
    `Here is a clear, step-by-step educational overview:\n\n` +
    `1. **Core Definition:** ${cleanTitle} represents an important subject topic in coursework.\n` +
    `2. **Primary Purpose:** It helps structure concepts, solve related problems, and provide foundational knowledge for exams.\n` +
    `3. **Key Application:** Practice solving sample questions or review the relevant chapter notes to master this topic.\n\n` +
    `*(Tip: You can ask specific math calculations, definitions, code snippets, or formulas for detailed step-by-step solutions!)*`;
}

module.exports = {
  formatNumber,
  solveEducationalQuery,
  solveFullForm,
  solveMath,
  solveScienceAndGK,
  solveTechnical,
};
