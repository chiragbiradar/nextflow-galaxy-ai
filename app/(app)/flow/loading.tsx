export default function FlowLoading() {
  return (
    <div className="w-full min-h-screen flex flex-col bg-white">
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-8">
        <div className="relative">
          {/* Pulsing gradient glow */}
          <div className="absolute inset-0 blur-3xl pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 opacity-30 motion-safe:animate-pulse" />
          </div>

          <div className="relative z-10 flex flex-col items-center space-y-8">
            {/* Galaxy spinner */}
            <div role="status" aria-label="Loading" className="relative w-32 h-32">
              <svg
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full motion-safe:animate-spin text-indigo-500"
                aria-hidden="true"
              >
                <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.2" />
                <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="3.5" fill="none" opacity="0.3" />
                <circle cx="50" cy="50" r="28" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.4" />
                <circle cx="50" cy="50" r="18" stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.5" />
                <circle cx="50" cy="50" r="5" fill="currentColor" opacity="0.8" />
                <path
                  d="M 50 2 A 48 48 0 0 1 98 50"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                >
                  <animateTransform
                    attributeName="transform"
                    attributeType="XML"
                    type="rotate"
                    from="0 50 50"
                    to="360 50 50"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </path>
              </svg>
              <span className="sr-only">Loading content, please wait...</span>
            </div>

            {/* Message */}
            <div className="max-w-md text-center px-6">
              <p className="text-lg md:text-xl font-medium text-gray-600 motion-safe:transition-all motion-safe:duration-300">
                Good things take time... especially getting to 1 billion users 😉
              </p>
            </div>

            {/* Bouncing dots */}
            <div className="flex space-x-1" aria-hidden="true">
              <div className="w-2 h-2 bg-indigo-400/60 rounded-full motion-safe:animate-bounce" style={{ animationDelay: "0s", animationDuration: "1.4s" }} />
              <div className="w-2 h-2 bg-indigo-400/60 rounded-full motion-safe:animate-bounce" style={{ animationDelay: "0.15s", animationDuration: "1.4s" }} />
              <div className="w-2 h-2 bg-indigo-400/60 rounded-full motion-safe:animate-bounce" style={{ animationDelay: "0.3s", animationDuration: "1.4s" }} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
