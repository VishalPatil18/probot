export function LivePipelineSection() {
  return (
    <section className="border-b border-border-base bg-white">
      <div className="mx-auto max-w-[1180px] px-6 py-20">
        <div className="max-w-2xl mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-3">
            Live pipeline
          </p>
          <h2 className="font-display text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05]">
            Your career data in. The right answer out.
          </h2>
          <p className="text-muted text-lg leading-relaxed mt-4 max-w-xl">
            Everything you add is embedded into a private vector store. When
            a recruiter asks, ProBot retrieves what&apos;s relevant and
            replies in your voice - in real time.
          </p>
        </div>

        <div className="relative rounded-2xl border border-border-base shadow-soft overflow-hidden bg-bg-app/40">
          <div className="absolute inset-0 grid-pattern pointer-events-none" />
          <svg
            className="il-stage relative block w-full h-auto"
            viewBox="0 0 1180 460"
            role="img"
            aria-label="Animation: résumé, LinkedIn and portfolio data flowing into ProBot's AI engine, which answers a recruiter's question in a chat window."
          >
            <defs>
              <linearGradient id="il-blue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="oklch(0.60 0.1737 245.16)" />
                <stop offset="1" stopColor="oklch(0.55 0.193 251.78)" />
              </linearGradient>
              <radialGradient id="il-orbglow" cx="0.5" cy="0.5" r="0.5">
                <stop
                  offset="0"
                  stopColor="oklch(0.62 0.17 248)"
                  stopOpacity="0.45"
                />
                <stop
                  offset="1"
                  stopColor="oklch(0.62 0.17 248)"
                  stopOpacity="0"
                />
              </radialGradient>
              <radialGradient id="il-orbsheen" cx="0.35" cy="0.3" r="0.8">
                <stop offset="0" stopColor="#fff" stopOpacity="0.4" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
              <path id="il-pA" d="M242,110 C 360,110 432,206 546,222" />
              <path id="il-pB" d="M242,230 C 384,230 440,230 544,230" />
              <path id="il-pC" d="M242,350 C 360,350 432,254 546,238" />
              <path id="il-pD" d="M656,230 C 706,230 724,210 760,210" />
            </defs>

            <use href="#il-pA" className="il-wire" />
            <use href="#il-pB" className="il-wire" />
            <use href="#il-pC" className="il-wire" />
            <use href="#il-pD" className="il-wire" />

            {/* A: Resume */}
            <g className="il-float">
              <rect
                x="30"
                y="78"
                width="212"
                height="64"
                rx="14"
                fill="#fff"
                stroke="oklch(0.90 0.008 264)"
              />
              <rect
                x="46"
                y="92"
                width="36"
                height="36"
                rx="10"
                fill="oklch(0.93 0.04 252)"
              />
              <rect
                x="56"
                y="100"
                width="16"
                height="20"
                rx="3"
                fill="none"
                stroke="oklch(0.55 0.193 251.78)"
                strokeWidth="2"
              />
              <line
                x1="59"
                y1="106"
                x2="69"
                y2="106"
                stroke="oklch(0.55 0.193 251.78)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="59"
                y1="110"
                x2="69"
                y2="110"
                stroke="oklch(0.55 0.193 251.78)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="59"
                y1="114"
                x2="65"
                y2="114"
                stroke="oklch(0.55 0.193 251.78)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <text
                x="96"
                y="106"
                className="il-t-display"
                fontSize="16"
                fontWeight="700"
                fill="oklch(0.19 0.02 261)"
              >
                Resume.pdf
              </text>
              <text
                x="96"
                y="124"
                fontSize="11.5"
                fill="oklch(0.46 0.02 262)"
              >
                2 pages · parsed
              </text>
            </g>
            {/* B: LinkedIn */}
            <g className="il-float d1">
              <rect
                x="30"
                y="198"
                width="212"
                height="64"
                rx="14"
                fill="#fff"
                stroke="oklch(0.90 0.008 264)"
              />
              <rect
                x="46"
                y="212"
                width="36"
                height="36"
                rx="10"
                fill="oklch(0.93 0.04 252)"
              />
              <text
                x="55"
                y="237"
                className="il-t-display"
                fontSize="18"
                fontWeight="800"
                fill="oklch(0.55 0.193 251.78)"
              >
                in
              </text>
              <text
                x="96"
                y="226"
                className="il-t-display"
                fontSize="16"
                fontWeight="700"
                fill="oklch(0.19 0.02 261)"
              >
                LinkedIn
              </text>
              <text
                x="96"
                y="244"
                fontSize="11.5"
                fill="oklch(0.46 0.02 262)"
              >
                profile pdf
              </text>
            </g>
            {/* C: Portfolio */}
            <g className="il-float d2">
              <rect
                x="30"
                y="318"
                width="212"
                height="64"
                rx="14"
                fill="#fff"
                stroke="oklch(0.90 0.008 264)"
              />
              <rect
                x="46"
                y="332"
                width="36"
                height="36"
                rx="10"
                fill="oklch(0.93 0.04 252)"
              />
              <circle
                cx="64"
                cy="350"
                r="9"
                fill="none"
                stroke="oklch(0.55 0.193 251.78)"
                strokeWidth="2"
              />
              <ellipse
                cx="64"
                cy="350"
                rx="4"
                ry="9"
                fill="none"
                stroke="oklch(0.55 0.193 251.78)"
                strokeWidth="2"
              />
              <line
                x1="55"
                y1="350"
                x2="73"
                y2="350"
                stroke="oklch(0.55 0.193 251.78)"
                strokeWidth="2"
              />
              <text
                x="96"
                y="346"
                className="il-t-display"
                fontSize="16"
                fontWeight="700"
                fill="oklch(0.19 0.02 261)"
              >
                Portfolio
              </text>
              <text
                x="96"
                y="364"
                fontSize="11.5"
                fill="oklch(0.46 0.02 262)"
              >
                projects &amp; links
              </text>
            </g>

            {/* Travelling particles */}
            {[
              { id: "il-pA", begin: "0s" },
              { id: "il-pA", begin: "1.1s" },
              { id: "il-pB", begin: "0.5s" },
              { id: "il-pB", begin: "1.6s" },
              { id: "il-pC", begin: "0.3s" },
              { id: "il-pC", begin: "1.4s" },
            ].map((p, i) => (
              <circle key={i} className="il-particle" r="4">
                <animateMotion
                  dur="2.2s"
                  repeatCount="indefinite"
                  begin={p.begin}
                >
                  <mpath href={`#${p.id}`} />
                </animateMotion>
              </circle>
            ))}
            <circle className="il-particle" r="4.5">
              <animateMotion
                dur="1.6s"
                repeatCount="indefinite"
                begin="0.2s"
              >
                <mpath href="#il-pD" />
              </animateMotion>
            </circle>

            {/* AI Orb */}
            <circle
              className="il-orb-glow"
              cx="600"
              cy="230"
              r="120"
              fill="url(#il-orbglow)"
            />
            <circle className="il-ring" cx="600" cy="230" />
            <circle className="il-ring r2" cx="600" cy="230" />
            <circle
              cx="600"
              cy="230"
              r="58"
              fill="url(#il-blue)"
              stroke="oklch(0.48 0.16 253)"
            />
            <circle cx="600" cy="230" r="58" fill="url(#il-orbsheen)" />
            <g className="il-eyes">
              <circle cx="585" cy="230" r="10" fill="#fff" />
              <circle cx="615" cy="230" r="10" fill="#fff" opacity="0.65" />
            </g>
            <text
              x="600"
              y="320"
              textAnchor="middle"
              className="il-t-display"
              fontSize="15"
              fontWeight="700"
              fill="oklch(0.19 0.02 261)"
            >
              Private vector store
            </text>
            <text
              x="600"
              y="340"
              textAnchor="middle"
              fontSize="11.5"
              fill="oklch(0.46 0.02 262)"
            >
              your knowledge, embedded
            </text>

            {/* Chat panel */}
            <rect
              x="760"
              y="62"
              width="388"
              height="332"
              rx="20"
              fill="#fff"
              stroke="oklch(0.90 0.008 264)"
            />
            <circle cx="800" cy="104" r="20" fill="url(#il-blue)" />
            <circle cx="794" cy="104" r="4.5" fill="#fff" />
            <circle cx="807" cy="104" r="4.5" fill="#fff" opacity="0.65" />
            <text
              x="832"
              y="100"
              className="il-t-display"
              fontSize="15"
              fontWeight="700"
              fill="oklch(0.19 0.02 261)"
            >
              AI Assistant
            </text>
            <circle cx="836" cy="118" r="3.5" fill="oklch(0.62 0.16 150)" />
            <text
              x="846"
              y="122"
              fontSize="11.5"
              fill="oklch(0.46 0.02 262)"
            >
              online · replies instantly
            </text>
            <line
              x1="780"
              y1="140"
              x2="1130"
              y2="140"
              stroke="oklch(0.90 0.008 264)"
            />

            <g>
              <rect
                x="780"
                y="158"
                width="252"
                height="42"
                rx="13"
                fill="oklch(0.96 0.004 264)"
              />
              <text
                x="796"
                y="184"
                fontSize="13"
                fill="oklch(0.19 0.02 261)"
              >
                Has Vishal ever led a team?
              </text>
            </g>

            <g className="il-typing-grp">
              <rect
                x="812"
                y="222"
                width="84"
                height="40"
                rx="14"
                fill="oklch(0.96 0.004 264)"
              />
              <circle
                className="il-dot"
                cx="836"
                cy="242"
                r="4"
                fill="oklch(0.46 0.02 262)"
              />
              <circle
                className="il-dot b"
                cx="854"
                cy="242"
                r="4"
                fill="oklch(0.46 0.02 262)"
              />
              <circle
                className="il-dot c"
                cx="872"
                cy="242"
                r="4"
                fill="oklch(0.46 0.02 262)"
              />
            </g>

            <g className="il-answer-grp">
              <rect
                x="812"
                y="220"
                width="320"
                height="128"
                rx="14"
                fill="url(#il-blue)"
              />
              <text x="832" y="252" fontSize="13" fill="#fff">
                Yes - he led GDSC as Lead and ran
              </text>
              <text x="832" y="276" fontSize="13" fill="#fff">
                the Community of Coders core team,
              </text>
              <text x="832" y="300" fontSize="13" fill="#fff">
                mentoring 30+ student developers. 🎯
              </text>
              <text x="832" y="330" fontSize="11" fill="#fff" opacity="0.7">
                Source: positions_of_responsibility · 0.91
              </text>
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
