import { CuraLinkMark } from "./CuraLinkMark";

interface HeaderProps {
  compact?: boolean;
}

export const Header = ({ compact = false }: HeaderProps) => {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={`inline-flex items-center justify-center border border-[#dbeafe] bg-blue-50 text-brand dark:border-[#1f1f1f] dark:bg-[#141414] ${
          compact ? "h-9 w-9 rounded-lg" : "h-10 w-10 rounded-xl"
        }`}>
        <CuraLinkMark className={compact ? "h-4 w-4" : "h-5 w-5"} />
      </div>

      <div className="min-w-0">
        <p
          className={`truncate font-semibold tracking-tight text-[#111827] dark:text-[#f5f5f5] ${
            compact ? "text-base" : "text-lg"
          }`}>
          CuraLink
        </p>
        <p
          className={`text-[#6b7280] dark:text-[#9ca3af] ${
            compact ? "hidden text-[11px] sm:block" : "text-xs"
          }`}>
          AI medical research assistant
        </p>
      </div>
    </div>
  );
};
