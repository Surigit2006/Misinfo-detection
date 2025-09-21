import { useState, useEffect, useRef } from "react";
import { FiSend } from "react-icons/fi";
import { motion } from "framer-motion";

interface Message {
  sender: "user" | "bot";
  text: string;
  typing?: boolean;
}

export default function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [darkMode, setDarkMode] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load dark mode
  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved) setDarkMode(saved === "true");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", darkMode.toString());
  }, [darkMode]);

  const [isTyping, setIsTyping] = useState(false);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const typeBotMessage = async (verdict: string, locations: any[]) => {
    setIsTyping(true);
    let reasons =
      locations && locations.length > 0
        ? locations.map((loc: any) => loc.reason).join(",  ")
        : "";
    let botText = reasons ? `${verdict} , ${reasons}` : verdict;

    let currentText = "";
    for (let i = 0; i < botText.length; i++) {
      currentText += botText[i];
      setMessages((prev) => [
        ...prev.filter(
          (_, idx) =>
            !(idx === prev.length - 1 && prev[prev.length - 1].sender === "bot")
        ),
        { sender: "bot", text: currentText + "|" },
      ]);
      await new Promise((r) => setTimeout(r, 15));
    }

    setMessages((prev) => [
      ...prev.filter(
        (_, idx) =>
          !(idx === prev.length - 1 && prev[prev.length - 1].sender === "bot")
      ),
      { sender: "bot", text: botText },
    ]);

    setIsTyping(false);
  };

  // Add typing indicator for bot
  const handleSend = async () => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { sender: "user", text: input }]);
    setInput("");

    try {
      const response = await fetch("https://misinfo-detection-backend.onrender.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input }),
      });
      const data = await response.json();
      await typeBotMessage(data.verdict, data.locations);
    } catch {
      await typeBotMessage("Error connecting to backend", []);
    }
  };
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="font-uistack flex h-screen bg-zinc-800 text-gray-100">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-64 bg-zinc-900 border-r border-gray-700 flex-shrink-0 p-4  sticky top-0 h-screen overflow-y-auto">
        <div className="flex-1 min-w-0">
          <div className="mx-auto w-full max-w-4xl px-4">
            <h2 className="text-xl font-bold text-gray-100 text-left text-nowrap hyphens-none break-keep">
              Breaking Ai
            </h2>
            {/* Everything under the title is stacked vertically */}
            <div className="mt-4 space-y-6">
              {/* Functions under the title */}
              <section>
                <h3 className="text-sm font-semibold text-gray-200 tracking-wide">
                  Functions available
                </h3>
                <ul className="mt-2 space-y-2 text-sm text-gray-300 list-disc list-inside">
                  <li>Text.</li>
                  <li>Article url.</li>
                  <li>Image url.</li>
                  <li>Youtube url.</li>
                </ul>
              </section>

              <hr className="border-gray-700" />

              <section>
                <h3 className="text-sm font-semibold text-gray-200 tracking-wide">
                  User Guidance
                </h3>
                <ul className="mt-2 space-y-2 text-sm text-gray-300 list-disc list-inside">
                  <li>Enter text or paste a URL.</li>
                  <li>Press the arrow button to send.</li>
                  <li>Don`t use for other purposes.</li>
                </ul>
              </section>

              <hr className="border-gray-700" />

              <section>
                <h3 className="text-sm font-semibold text-gray-200 tracking-wide">
                  Advisory
                </h3>
                <ul className="mt-2 space-y-2 text-sm text-gray-300 list-disc list-inside">
                  <li>
                    It is a prototype deployment, sometimes it may fail due as
                    we have used basic gemini api.
                  </li>
                </ul>
              </section>
              <hr className="border-gray-700" />

              <section>
                <h3 className="text-sm font-semibold text-gray-200 tracking-wide">
                  About us
                </h3>
                <ul className="mt-2 space-y-2 text-sm text-gray-300 list-disc list-inside">
                  <li>
                    Breaking AI is an innovative platform dedicated to
                    fact-checking and misinformation detection using advanced
                    artificial intelligence. Our mission is to analyze and
                    verify content from videos, text, and other sources in real
                    time, helping users separate truth from misinformation.
                  </li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex-1 flex flex-col relative">
        {/* Full-width header (not aligned to the chat column) */}
        <header className="w-full bg-zinc-800 backdrop-blur-sm border-b border-gray-700 px-4 py-3 ">
          <div className="flex items-center justify-between">
            <h1 className="text-gray-100 font-semibold">Misinfo Detector</h1>
            {/* Sidebar toggle in the header/brand area */}
            <button
              className="md:hidden text-gray-100 tracking-wide"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open sidebar"
            >
              Click for Info
            </button>

            {/* header actions if any */}
          </div>
        </header>
        {/* Mobile drawer + backdrop */}
        {/* Backdrop */}
        <div
          onClick={() => setDrawerOpen(false)}
          className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden ${
            drawerOpen ? "opacity-100 visible" : "opacity-0 invisible"
          }`}
        />

        {/* Panel */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 bg-zinc-900 border-r border-gray-700 p-4
              transform transition-transform duration-300 md:hidden
              ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-100">Breaking AI</h2>
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-2 rounded hover:bg-white/5 text-gray-200"
              aria-label="Close sidebar"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 space-y-6">
            {/* Functions */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-200 tracking-wide">
                Functions available
              </h3>
              <ul className="text-sm text-gray-300 list-disc list-inside space-y-2">
                <li>Text.</li>
                <li>Article url.</li>
                <li>Image url.</li>
                <li>Youtube url.</li>
              </ul>
              <hr className="border-gray-700" />
            </section>

            {/* User Guidance */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-200 tracking-wide">
                User Guidance
              </h3>
              <ul className="text-sm text-gray-300 list-disc list-inside space-y-2">
                <li>Enter text or paste a URL.</li>
                <li>Press the arrow button to send.</li>
                <li>Don’t use for other purposes.</li>
              </ul>
              <hr className="border-gray-700" />
            </section>

            {/* Advisory */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-200 tracking-wide">
                Advisory
              </h3>
              <p className="text-sm text-gray-300">
                It is a prototype deployment; sometimes it may fail as a basic
                model is used.
              </p>
              <hr className="border-gray-700" />
            </section>

            {/* About us */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-200 tracking-wide">
                About us
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                Breaking AI is an innovative platform dedicated to fact-checking
                and misinformation detection using advanced artificial
                intelligence. Our mission is to analyze and verify content from
                videos, text, and other sources in real time, helping users
                separate truth from misinformation.
              </p>
            </section>
          </div>
        </aside>

        {/* Messages — centered column independent from header */}
        <div className="flex-1 overflow-y-auto leading-relaxed">
          <div className="mx-auto w-full max-w-4xl px-4 pt-4 pb-4 scroll-pb-24 space-y-4">
            {messages.map((msg, idx) => {
              const next = messages[idx + 1];
              const isQ = msg.sender === "user";
              const followedByA = next && next.sender === "bot";
              const pairGap = isQ && followedByA ? "mb-8 md:mb-10" : "mb-0";

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex w-full ${
                    isQ ? "justify-end" : "justify-start"
                  } ${pairGap}`}
                >
                  {isQ ? (
                    <div className="max-w-[70%]">
                      <div className="bg-zinc-700 text-gray-100 px-5 py-3 rounded-2xl">
                        {msg.text}
                      </div>
                    </div>
                  ) : msg.typing ? (
                    <div className="max-w-[70%] flex items-center gap-1 my-6">
                      <span className="dot animate-bounce bg-gray-400 rounded-full w-2 h-2" />
                      <span className="dot animate-bounce bg-gray-400 rounded-full w-2 h-2 delay-75" />
                      <span className="dot animate-bounce bg-gray-400 rounded-full w-2 h-2 delay-150" />
                    </div>
                  ) : (
                    <div className="max-w-[70%]">
                      <div className="bg-transparent leading-relaxed">
                        {msg.text}
                      </div>
                      {/* spacer lines after the bot response */}
                      <div className="h-10 md:h-12" />
                    </div>
                  )}
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} className="scroll-mb-24" />
          </div>
        </div>

        {/* Composer — same centered column as messages, not the header */}
        <div className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 ">
          <div className="mx-auto w-full max-w-4xl px-4 my-4">
            <div className="rounded-full bg-zinc-zinc-700 border border-gray-500 shadow-md flex items-center gap-2 p-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 rounded-full bg-transparent text-gray-100 placeholder-gray-500 focus:outline-none"
              />
              <button
                onClick={handleSend}
                className="p-3 bg-gray-400 hover:bg-gray-400 text-black rounded-full transition shadow-md"
              >
                <FiSend size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
