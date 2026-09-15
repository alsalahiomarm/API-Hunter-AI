import {
  Bot,
  Search,
  AudioLines,
  Database,
  Wrench,
  Boxes,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@apihunter/db";

const ICONS: Record<Category, LucideIcon> = {
  AI_MODELS: Bot,
  SEARCH_TOOLS: Search,
  AUDIO_IMAGE: AudioLines,
  DATABASES: Database,
  DEV_TOOLS: Wrench,
  OTHER: Boxes,
};

export default function CategoryIcon({
  category,
  className = "h-4 w-4",
}: {
  category: Category;
  className?: string;
}) {
  const Icon = ICONS[category] ?? Boxes;
  return <Icon className={className} />;
}