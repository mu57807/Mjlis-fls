import {
  Activity, ArrowBigDown, Ban, Car, ClipboardCheck, ClipboardList, Clock, Construction,
  Cylinder, Drill, Ear, Flame, FlaskConical, Footprints, Forklift, Glasses, Gauge, Hammer,
  Hand, HardHat, HeartPulse, Lightbulb, Link, LockKeyhole, Megaphone, OctagonX, Radio,
  ScanEye, Bomb, Shield, Thermometer, TrafficCone, TriangleAlert, User, UserCheck, Users,
  Wind, Wrench, Zap, Crosshair, Cross, Waves, Anchor, type LucideIcon,
} from "lucide-react";
import type { IconName } from "@/lib/catalog";

// One drawing per icon name in catalog.ts. The video templates (Phase 2)
// use this same map, so the review screen shows exactly what the video will.
export const ICON_COMPONENTS: Record<IconName, LucideIcon> = {
  hard_hat: HardHat,
  safety_glasses: Glasses,
  gloves: Hand,
  hearing_protection: Ear,
  safety_boots: Footprints,
  harness: Link,
  ppe: Shield,
  scaffold: Construction,
  lifting: Anchor,
  forklift: Forklift,
  vehicle: Car,
  tools: Wrench,
  hammer: Hammer,
  drill: Drill,
  pipe_valve: Waves,
  pressure: Gauge,
  gas_cylinder: Cylinder,
  fire: Flame,
  explosion: Bomb,
  gas_leak: Wind,
  chemical: FlaskConical,
  electrical: Zap,
  isolation_lock: LockKeyhole,
  weather_wind: Wind,
  heat: Thermometer,
  warning: TriangleAlert,
  stop: OctagonX,
  barrier: TrafficCone,
  line_of_fire: Crosshair,
  dropped_object: ArrowBigDown,
  permit: ClipboardList,
  checklist: ClipboardCheck,
  inspection: ScanEye,
  supervisor: UserCheck,
  worker: User,
  team: Users,
  communication: Megaphone,
  radio: Radio,
  first_aid: Cross,
  medical: HeartPulse,
  time_pressure: Clock,
  lesson: Lightbulb,
  near_miss: Activity,
};

export function SafetyIcon({
  name,
  className,
  strokeWidth = 2,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = ICON_COMPONENTS[name] ?? Ban;
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden />;
}
