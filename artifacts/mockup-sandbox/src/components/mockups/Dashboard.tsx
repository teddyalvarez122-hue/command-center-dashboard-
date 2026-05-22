import { useEffect, useState } from "react";

function useSydneyTime() {
  const [time, setTime] = useState("");
  useEffect(() => {
    function tick() {
      setTime(
        new Date().toLocaleTimeString("en-AU", {
          timeZone: "Australia/Sydney",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export default function Dashboard() {
  const sydneyTime = useSydneyTime();

  return (
    <div
      className="min-h-screen w-full overflow-y-auto px-4 py-8"
      style={{ backgroundColor: "#0A0A0A", fontFamily: "monospace" }}
    >
      <div className="mx-auto max-w-lg space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <p
              className="text-[10px] tracking-[2px] font-semibold"
              style={{ color: "#555" }}
            >
              COMMAND CENTER
            </p>
            <p
              className="text-3xl font-bold tracking-tight leading-none"
              style={{ color: "#00FF88", fontFamily: "monospace" }}
            >
              {sydneyTime}
            </p>
            <p
              className="text-[10px] tracking-[1px]"
              style={{ color: "#555" }}
            >
              Sydney, Australia
            </p>
          </div>
          <span
            className="text-[10px] tracking-[1.5px] cursor-pointer hover:opacity-70 transition-opacity mt-1"
            style={{ color: "#555" }}
          >
            DISCONNECT
          </span>
        </div>

        {/* ERG THIS WEEK widget */}
        <div
          className="flex items-center rounded-xl border px-4 py-3.5"
          style={{ backgroundColor: "#111", borderColor: "#222" }}
        >
          <div className="flex-1 space-y-2">
            <p
              className="text-[9px] tracking-[2px] font-semibold"
              style={{ color: "#555" }}
            >
              ERG THIS WEEK
            </p>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-start gap-0.5">
                <span
                  className="text-xl font-bold tracking-tight"
                  style={{ color: "#00FF88", fontFamily: "monospace" }}
                >
                  0
                </span>
                <span className="text-[9px]" style={{ color: "#555" }}>
                  sessions
                </span>
              </div>
              <div
                className="w-px h-7 rounded"
                style={{ backgroundColor: "#222" }}
              />
              <div className="flex flex-col items-start gap-0.5">
                <span
                  className="text-xl font-bold tracking-tight"
                  style={{ color: "#e5e5e5", fontFamily: "monospace" }}
                >
                  0
                </span>
                <span className="text-[9px]" style={{ color: "#555" }}>
                  meters
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* THIS WEEK — BY SPORT */}
        <div>
          <p
            className="text-[10px] tracking-[2px] font-semibold mb-2.5"
            style={{ color: "#555" }}
          >
            THIS WEEK — BY SPORT
          </p>
          <div
            className="rounded-xl border border-dashed px-10 py-10 flex flex-col items-center gap-2"
            style={{ borderColor: "#222" }}
          >
            <span className="text-[15px] font-medium" style={{ color: "#555" }}>
              No activities this week
            </span>
            <span className="text-[12px]" style={{ color: "#444" }}>
              Pull to refresh
            </span>
          </div>
        </div>

        {/* RECENT ACTIVITIES */}
        <div>
          <p
            className="text-[10px] tracking-[2px] font-semibold mb-2.5"
            style={{ color: "#555" }}
          >
            RECENT ACTIVITIES
          </p>
          <div
            className="rounded-xl border border-dashed px-10 py-10 flex flex-col items-center gap-2"
            style={{ borderColor: "#222" }}
          >
            <span className="text-[15px] font-medium" style={{ color: "#555" }}>
              No activities found
            </span>
            <span className="text-[12px]" style={{ color: "#444" }}>
              Pull to refresh
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
