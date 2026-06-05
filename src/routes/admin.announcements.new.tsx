import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useRMS } from "@/lib/store";

export const Route = createFileRoute("/admin/announcements/new")({
  component: AdminannouncementsnewPage,
});

function AdminannouncementsnewPage() {
  const add = useRMS((s) => s.addAnnouncement);
  const router = useRouter();

  // Form states
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(() =>
    new Date().toLocaleDateString("en-GB").replace(/\//g, "-"),
  );
  const [message, setMessage] = useState("");
  const [fileName, setFileName] = useState("No file chosen");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      alert("Please enter a subject");
      return;
    }
    if (!message.trim()) {
      alert("Please enter a message");
      return;
    }

    add({
      id: "",
      subject,
      message,
      date,
    });
    router.navigate({ to: "/admin/announcements" });
  };

  return (
    <div className="bg-white rounded-lg border border-slate-300 p-8 max-w-3xl shadow-sm">
      <h2 className="text-[28px] text-[#0d7a70] font-normal mb-8 border-b pb-4">
        Add Announcement
      </h2>

      <form
        onSubmit={handleSend}
        className="grid grid-cols-[140px_1fr] gap-x-6 gap-y-5 items-start max-w-2xl text-sm"
      >
        {/* Subject */}
        <div className="text-stone-600 pt-1.5">Subject:</div>
        <div>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="border border-black rounded px-3 py-1.5 text-sm w-full max-w-[380px] focus:outline-none focus:ring-1 focus:ring-teal-500"
            required
          />
        </div>

        {/* Date */}
        <div className="text-stone-600 pt-1.5">Date:</div>
        <div>
          <input
            type="text"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-black rounded px-3 py-1.5 text-sm w-full max-w-[380px] focus:outline-none focus:ring-1 focus:ring-teal-500"
            required
          />
        </div>

        {/* File */}
        <div className="text-stone-600 pt-1.5">File:</div>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer bg-stone-100 hover:bg-stone-200 border border-black rounded px-4 py-1.5 text-sm font-semibold text-stone-700 transition-colors inline-block focus:outline-none">
            Choose File
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setFileName(file ? file.name : "No file chosen");
              }}
            />
          </label>
          <span className="text-sm text-stone-600">{fileName}</span>
        </div>

        {/* Message */}
        <div className="text-stone-600 pt-1.5">Message:</div>
        <div>
          <textarea
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="border border-black rounded px-3 py-1.5 text-sm w-full max-w-[380px] h-32 focus:outline-none focus:ring-1 focus:ring-teal-500"
            required
          />
        </div>

        {/* Buttons */}
        <div></div>
        <div className="flex gap-2.5 pt-4">
          <button
            type="submit"
            className="bg-[#0d7a70] text-white hover:bg-[#0b665d] px-4 py-2 font-semibold text-sm rounded shadow-sm transition-colors focus:outline-none"
          >
            Send
          </button>
          <button
            type="button"
            onClick={() => router.navigate({ to: "/admin/announcements" })}
            className="bg-[#0d7a70] text-white hover:bg-[#0b665d] px-4 py-2 font-semibold text-sm rounded shadow-sm transition-colors focus:outline-none"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
