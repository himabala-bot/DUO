import { AnimatedHikeCard, Stat } from "@/components/ui/card-25";
import { Clock, Zap, Mountain } from "lucide-react";

export default function AnimatedHikeCardDemo() {
  const hikeProps = {
    title: "Mountain Hike",
    images: [
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?q=80&w=2070&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop",
    ],
    stats: [
      {
        icon: <Clock className="h-4 w-4" />,
        label: "~6 Hours",
      },
      {
        icon: <Mountain className="h-4 w-4" />,
        label: "8 km",
      },
      {
        icon: <Zap className="h-4 w-4" />,
        label: "Medium",
      },
    ] as Stat[],
    description:
      "Hiking on a mountain blends physical challenge with natural beauty, offering sweeping views and a profound sense of accomplishment.",
    href: "#",
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <AnimatedHikeCard {...hikeProps} />
    </div>
  );
}
