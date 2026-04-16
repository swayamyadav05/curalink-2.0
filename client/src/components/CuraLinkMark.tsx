interface CuraLinkMarkProps {
  className?: string;
}

export const CuraLinkMark = ({
  className = "h-5 w-5",
}: CuraLinkMarkProps) => {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6 16h5l2.4-4.6 3.7 8.6 2.5-4.6H26"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
      <path
        d="M16 7.5v4.2M13.9 9.6h4.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
      <circle
        cx="16"
        cy="16"
        r="13"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
};
