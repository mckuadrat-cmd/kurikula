import { useState, useEffect } from "react";

export function AppNavbar() {
  const [formattedDate, setFormattedDate] = useState("");

  useEffect(() => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "long",
      year: "numeric",
      weekday: "long",
    };
    setFormattedDate(today.toLocaleDateString("id-ID", options));
  }, []);

  return (
    <header className="bg-neu sticky top-0 z-40 select-none">
      <div className="flex items-center justify-between px-8 py-4">
        <div className="flex-1">
          <span className="text-xs font-black text-[#3C405B]/85 uppercase tracking-wider">
            Kurikula - Smart Teacher Platform
          </span>
        </div>

        <div className="text-right">
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider">
            {formattedDate || "Senin, 15 Juni 2026"}
          </p>
        </div>
      </div>
    </header>
  );
}