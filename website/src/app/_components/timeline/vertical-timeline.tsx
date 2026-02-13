"use client";

import { TimelineItem } from "./timeline-item";

const TIMELINE_DATA = [
  {
    year: "2022",
    stats: [
      { value: "100.000", label: "Árboles plantados" },
      { value: "70", label: "Hectáreas protegidas" },
    ],
  },
  {
    year: "2023",
    stats: [
      { value: "300.000", label: "Árboles plantando" },
      { value: "5,000", label: "Hectáreas protegiendo" },
    ],
  },
];

export function VerticalTimeline() {
  return (
    <div className="flex h-full flex-col justify-center py-12">
      <div className="space-y-0">
        {TIMELINE_DATA.map((item, index) => (
          <TimelineItem key={item.year} year={item.year} stats={item.stats} />
        ))}
      </div>
    </div>
  );
}
