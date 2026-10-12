import {
  MailIcon,
  PeopleIcon,
  CalendarIcon,
  DocumentIcon,
  GiftIcon,
  StarIcon,
  HomeIcon,
  CreditCardIcon,
  MessagesIcon,
  HeartIcon,
} from "@/components/icons";

// Maps an email_templates.icon string (set per-template in migration 0050's
// seed data) to the actual icon component shown on the template grid.
// "chat" reuses MessagesIcon — it's a real speech-bubble icon that's no
// longer used anywhere else now that the sidebar's "Messages" slot points
// at MailIcon instead. Anything unrecognised (a future template with a typo
// in its icon column, say) falls back to MailIcon rather than crashing.
const TEMPLATE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  mail: MailIcon,
  people: PeopleIcon,
  calendar: CalendarIcon,
  document: DocumentIcon,
  gift: GiftIcon,
  star: StarIcon,
  home: HomeIcon,
  creditcard: CreditCardIcon,
  chat: MessagesIcon,
  heart: HeartIcon,
};

export function TemplateIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = TEMPLATE_ICONS[icon] ?? MailIcon;
  return <Icon className={className} />;
}
